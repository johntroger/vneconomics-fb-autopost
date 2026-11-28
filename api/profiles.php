<?php
declare(strict_types=1);

/**
 * VNEconomics Public Account Profile & Custom Handle API (Plesk PHP 8)
 * - Uses vneBootstrapApi() (strict CORS + security headers) & rate limiting.
 * - Requires Firebase JWT auth on POST when configured, matching email -> original_handle.
 * - Stores avatars as image files in uploads/avatars/ (no multi-MB base64 inside JSON).
 * - Uses atomic flock(LOCK_EX) on JSON fallback + MySQL vne_public_profiles when available.
 */

require_once __DIR__ . '/core/bootstrap.php';

$config = vneBootstrapApi();
$pdo = getDbConnection();

$storeDir = dirname(__DIR__) . '/data';
if (!is_dir($storeDir)) {
    @mkdir($storeDir, 0755, true);
}
$storageFile = $storeDir . '/public_profiles.json';

function readProfilesLocked($fp): array {
    rewind($fp);
    $raw = stream_get_contents($fp);
    $decoded = $raw ? json_decode($raw, true) : null;
    return is_array($decoded) ? $decoded : [];
}

function saveAvatarFromDataUri(string $dataUri, string $handle): string {
    if (!preg_match('#^data:image/(png|jpeg|jpg|webp);base64,(.+)$#i', $dataUri, $m)) {
        return '';
    }
    $ext = strtolower($m[1]) === 'jpeg' ? 'jpg' : strtolower($m[1]);
    $bin = base64_decode($m[2], true);
    if ($bin === false || strlen($bin) > 2 * 1024 * 1024) {
        vneJsonError('Ảnh đại diện không hợp lệ hoặc vượt quá 2MB.', 400, 'INVALID_AVATAR');
    }
    $avatarDir = dirname(__DIR__) . '/uploads/avatars';
    if (!is_dir($avatarDir)) {
        @mkdir($avatarDir, 0755, true);
    }
    $filename = $handle . '-' . substr(hash('sha256', $bin), 0, 10) . '.' . $ext;
    if (@file_put_contents($avatarDir . '/' . $filename, $bin, LOCK_EX) === false) {
        return '';
    }
    return '/uploads/avatars/' . $filename;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $handle = strtolower(preg_replace('/[^a-z0-9_-]/i', '', (string)($_GET['handle'] ?? '')));
    $profiles = [];

    if (file_exists($storageFile)) {
        $raw = @file_get_contents($storageFile);
        $decoded = $raw ? json_decode($raw, true) : null;
        if (is_array($decoded)) {
            $profiles = $decoded;
        }
    }

    if ($pdo) {
        try {
            if ($handle !== '') {
                $stmt = $pdo->prepare(
                    "SELECT original_handle, custom_handle, display_name, bio, location, specialty_tag, avatar_url, has_edited_once, edited_at
                     FROM vne_public_profiles
                     WHERE original_handle = :h1 OR custom_handle = :h2 LIMIT 1"
                );
                $stmt->execute([':h1' => $handle, ':h2' => $handle]);
                $row = $stmt->fetch();
                if ($row) {
                    $row['has_edited_once'] = (bool)$row['has_edited_once'];
                    vneJsonSuccess(['profile' => $row]);
                }
            } else {
                $stmt = $pdo->query(
                    "SELECT original_handle, custom_handle, display_name, bio, location, specialty_tag, avatar_url, has_edited_once, edited_at
                     FROM vne_public_profiles ORDER BY edited_at DESC LIMIT 200"
                );
                while ($row = $stmt->fetch()) {
                    $row['has_edited_once'] = (bool)$row['has_edited_once'];
                    $profiles[strtolower((string)$row['original_handle'])] = $row;
                }
            }
        } catch (PDOException $e) {
            error_log('GET vne_public_profiles error: ' . $e->getMessage());
        }
    }

    if ($handle !== '') {
        foreach ($profiles as $cfg) {
            if (
                strtolower((string)($cfg['original_handle'] ?? '')) === $handle ||
                strtolower((string)($cfg['custom_handle'] ?? '')) === $handle
            ) {
                vneJsonSuccess(['profile' => $cfg]);
            }
        }
        vneJsonSuccess(['profile' => null]);
    }

    vneJsonSuccess(['profiles' => $profiles]);
}

if ($method === 'POST') {
    vneEnforceRateLimit('profiles_edit', 10, 60);

    // Require Firebase JWT when configured on production
    $projectId = trim((string)($config['firebase']['project_id'] ?? ''));
    $firebaseEnabled = $projectId !== '' && $projectId !== 'YOUR_FIREBASE_PROJECT_ID';
    $authClaims = $firebaseEnabled ? vneRequireAuth() : null;

    $input = vneReadJsonBody();
    if (empty($input['original_handle']) || empty($input['custom_handle'])) {
        vneJsonError('Thiếu thông tin handle.', 400, 'INVALID_PAYLOAD');
    }

    $orig = strtolower(preg_replace('/[^a-z0-9_-]/i', '', (string)$input['original_handle']));
    $custom = strtolower(preg_replace('/[^a-z0-9_-]/i', '', (string)$input['custom_handle']));

    if ($authClaims && !empty($authClaims['email'])) {
        $emailPrefix = strtolower(preg_replace('/[^a-z0-9_-]/i', '', explode('@', (string)$authClaims['email'])[0]));
        if ($emailPrefix !== '' && $emailPrefix !== $orig) {
            vneJsonError('Bạn không có quyền chỉnh sửa handle của tài khoản khác.', 403, 'FORBIDDEN_HANDLE');
        }
    }

    if (strlen($custom) < 3 || strlen($custom) > 32) {
        vneJsonError('Mã định danh URL phải từ 3 đến 32 ký tự.', 400, 'INVALID_HANDLE_LENGTH');
    }

    $avatarInput = trim((string)($input['avatar_url'] ?? ''));
    $safeAvatar = '';
    if (str_starts_with($avatarInput, 'data:image/')) {
        $safeAvatar = saveAvatarFromDataUri($avatarInput, $custom);
    } elseif ($avatarInput !== '' && strlen($avatarInput) <= 512 && (str_starts_with($avatarInput, 'https://') || str_starts_with($avatarInput, '/uploads/'))) {
        $safeAvatar = $avatarInput;
    }

    $record = [
        'original_handle' => $orig,
        'custom_handle'   => $custom,
        'display_name'    => vneSanitizePlainText((string)($input['display_name'] ?? $custom), 120),
        'bio'             => vneSanitizePlainText((string)($input['bio'] ?? ''), 600),
        'location'        => vneSanitizePlainText((string)($input['location'] ?? 'Việt Nam'), 100),
        'specialty_tag'   => vneSanitizePlainText((string)($input['specialty_tag'] ?? 'VNEconomics Reader'), 120),
        'avatar_url'      => $safeAvatar,
        'has_edited_once' => true,
        'edited_at'       => gmdate('Y-m-d'),
    ];

    if ($pdo) {
        try {
            $check = $pdo->prepare("SELECT has_edited_once FROM vne_public_profiles WHERE original_handle = :o LIMIT 1");
            $check->execute([':o' => $orig]);
            $existingDb = $check->fetch();
            if ($existingDb && !empty($existingDb['has_edited_once'])) {
                vneJsonError('Bạn đã sử dụng 1/1 lượt đổi URL duy nhất.', 409, 'ALREADY_EDITED_ONCE');
            }

            $dup = $pdo->prepare("SELECT original_handle FROM vne_public_profiles WHERE (custom_handle = :c1 OR original_handle = :c2) AND original_handle != :o LIMIT 1");
            $dup->execute([':c1' => $custom, ':c2' => $custom, ':o' => $orig]);
            if ($dup->fetch()) {
                vneJsonError('URL này đã thuộc về thành viên khác.', 409, 'HANDLE_TAKEN');
            }

            $ins = $pdo->prepare("
                INSERT INTO vne_public_profiles (original_handle, custom_handle, display_name, bio, location, specialty_tag, avatar_url, has_edited_once, edited_at)
                VALUES (:o, :c, :dn, :bio, :loc, :tag, :av, 1, :ed)
                ON DUPLICATE KEY UPDATE
                    custom_handle = VALUES(custom_handle),
                    display_name = VALUES(display_name),
                    bio = VALUES(bio),
                    location = VALUES(location),
                    specialty_tag = VALUES(specialty_tag),
                    avatar_url = VALUES(avatar_url),
                    has_edited_once = 1,
                    edited_at = VALUES(edited_at)
            ");
            $ins->execute([
                ':o'   => $record['original_handle'],
                ':c'   => $record['custom_handle'],
                ':dn'  => $record['display_name'],
                ':bio' => $record['bio'],
                ':loc' => $record['location'],
                ':tag' => $record['specialty_tag'],
                ':av'  => $record['avatar_url'],
                ':ed'  => $record['edited_at'],
            ]);
        } catch (PDOException $e) {
            error_log('POST vne_public_profiles error: ' . $e->getMessage());
        }
    }

    // Atomic JSON mirror with exclusive flock
    $fp = @fopen($storageFile, 'c+');
    if ($fp && flock($fp, LOCK_EX)) {
        $profiles = readProfilesLocked($fp);
        if (isset($profiles[$orig]) && !empty($profiles[$orig]['has_edited_once'])) {
            flock($fp, LOCK_UN);
            fclose($fp);
            vneJsonError('Bạn đã sử dụng 1/1 lượt đổi URL duy nhất.', 409, 'ALREADY_EDITED_ONCE');
        }
        foreach ($profiles as $key => $cfg) {
            if ($key !== $orig && (
                strtolower((string)($cfg['custom_handle'] ?? '')) === $custom ||
                strtolower((string)($cfg['original_handle'] ?? '')) === $custom
            )) {
                flock($fp, LOCK_UN);
                fclose($fp);
                vneJsonError('URL này đã thuộc về thành viên khác.', 409, 'HANDLE_TAKEN');
            }
        }
        $profiles[$orig] = $record;
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($profiles, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
    }

    vneJsonSuccess(['profile' => $record]);
}

vneJsonError('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
