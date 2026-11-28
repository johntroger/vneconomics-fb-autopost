<?php
/**
 * SỔ CÁI NFT SÁCH ĐỘC BẢN 1-OF-1 (FIRST-TO-MINT WINS) - VNECONOMICS.COM
 * - Atomic flock(LOCK_EX) trên JSON fallback + PRIMARY KEY trên MySQL vne_book_nfts.
 * - Yêu cầu xác thực Firebase JWT khi triển khai production có cấu hình Firebase.
 * - Mỗi đầu sách (book_key) chỉ có DUY NHẤT 1 NFT gốc (ACTIVE_ORIGINAL).
 */

require_once __DIR__ . '/core/bootstrap.php';

$config = vneBootstrapApi();
$pdo = getDbConnection();

$storeDir = dirname(__DIR__) . '/uploads';
if (!is_dir($storeDir)) {
    @mkdir($storeDir, 0755, true);
}
$storeFile = $storeDir . '/book_nft_registry.json';

function readBookNftStoreFromHandle($fp): array {
    rewind($fp);
    $raw = stream_get_contents($fp);
    $data = $raw ? json_decode($raw, true) : null;
    if (!is_array($data) || !isset($data['books']) || !is_array($data['books'])) {
        return ['books' => []];
    }
    return $data;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $map = [];
    if (file_exists($storeFile)) {
        $raw = @file_get_contents($storeFile);
        $store = $raw ? json_decode($raw, true) : null;
        if (is_array($store) && isset($store['books']) && is_array($store['books'])) {
            foreach ($store['books'] as $b) {
                if (!empty($b['book_key'])) {
                    $map[$b['book_key']] = $b;
                }
            }
        }
    }

    if ($pdo) {
        try {
            $stmt = $pdo->query("SELECT book_key, payload_json FROM vne_book_nfts ORDER BY minted_at ASC");
            while ($row = $stmt->fetch()) {
                $decoded = json_decode($row['payload_json'], true);
                if (is_array($decoded)) {
                    $map[$row['book_key']] = $decoded;
                }
            }
        } catch (PDOException $e) {
            error_log('GET vne_book_nfts error: ' . $e->getMessage());
        }
    }

    $singleKey = vneSanitizePlainText((string)($_GET['book_key'] ?? ''), 190);
    if ($singleKey !== '') {
        vneJsonSuccess(['book' => $map[$singleKey] ?? null]);
    }

    vneJsonSuccess(['books' => array_values($map)]);
}

if ($method === 'POST') {
    vneEnforceRateLimit('book_nft_claim', 15, 60);

    $projectId = trim((string)($config['firebase']['project_id'] ?? ''));
    if ($projectId !== '' && $projectId !== 'YOUR_FIREBASE_PROJECT_ID') {
        vneRequireAuth();
    }

    $body = vneReadJsonBody();
    $action = (string)($body['action'] ?? 'claim_book');

    if ($action !== 'claim_book' || !isset($body['book']) || !is_array($body['book'])) {
        vneJsonError('Invalid book NFT claim payload.', 400);
    }

    $book = $body['book'];
    $bookKey = strtolower(vneSanitizePlainText((string)($book['book_key'] ?? $book['book_slug'] ?? ''), 190));
    $bookSlug = vneSanitizePlainText((string)($book['book_slug'] ?? $bookKey), 190);
    $verifyCode = vneSanitizePlainText((string)($book['verify_code'] ?? ''), 64);
    $ownerAddress = vneSanitizePlainText((string)($book['owner_address'] ?? ''), 160);
    $ownerName = vneSanitizePlainText((string)($book['owner_name'] ?? 'VNEconomics Reader'), 120);

    if ($bookKey === '' || $verifyCode === '' || $ownerAddress === '') {
        vneJsonError('Missing required book NFT ownership fields.', 400);
    }

    if ($pdo) {
        try {
            $check = $pdo->prepare("SELECT owner_name FROM vne_book_nfts WHERE book_key = :bk LIMIT 1");
            $check->execute([':bk' => $bookKey]);
            $existingDb = $check->fetch();
            if ($existingDb) {
                vneJsonError(
                    'Sách này đã có chủ sở hữu NFT Độc bản (' . $existingDb['owner_name'] . ').',
                    409,
                    'ALREADY_CLAIMED'
                );
            }

            $stmt = $pdo->prepare("
                INSERT INTO vne_book_nfts (book_key, book_slug, verify_code, token_id, owner_address, owner_name, payload_json)
                VALUES (:bk, :bs, :vc, :tid, :oa, :on, :json)
            ");
            $stmt->execute([
                ':bk'   => $bookKey,
                ':bs'   => $bookSlug,
                ':vc'   => $verifyCode,
                ':tid'  => vneSanitizePlainText((string)($book['token_id'] ?? '1'), 64),
                ':oa'   => $ownerAddress,
                ':on'   => $ownerName,
                ':json' => json_encode($book, JSON_UNESCAPED_UNICODE),
            ]);
            vneJsonSuccess(['claimed' => true, 'book' => $book]);
        } catch (PDOException $e) {
            if ((string)$e->getCode() === '23000') {
                vneJsonError('Sách này đã có chủ sở hữu NFT Độc bản.', 409, 'ALREADY_CLAIMED');
            }
            error_log('POST vne_book_nfts error: ' . $e->getMessage());
        }
    }

    // Atomic Write-Once JSON store with exclusive lock (prevents race condition)
    $fp = @fopen($storeFile, 'c+');
    if ($fp && flock($fp, LOCK_EX)) {
        $store = readBookNftStoreFromHandle($fp);
        foreach ($store['books'] as $existing) {
            if (($existing['book_key'] ?? '') === $bookKey && ($existing['status'] ?? 'ACTIVE_ORIGINAL') === 'ACTIVE_ORIGINAL') {
                flock($fp, LOCK_UN);
                fclose($fp);
                vneJsonError(
                    'Sách này đã có chủ sở hữu NFT Độc bản (' . ($existing['owner_name'] ?? 'Anonymous') . ').',
                    409,
                    'ALREADY_CLAIMED'
                );
            }
        }
        $store['books'][] = $book;
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($store, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
    }

    vneJsonSuccess(['claimed' => true, 'book' => $book]);
}
