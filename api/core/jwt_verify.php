<?php
/**
 * XÁC MINH FIREBASE ID TOKEN (JWT RS256), PHÂN QUYỀN RBAC & SIGNED DOWNLOAD TOKEN
 * Không bao giờ tin user_id/email gửi trần từ client.
 */

defined('VNE_APP') or die('Truy cập trực tiếp bị từ chối.');

function vneBase64UrlDecode(string $input): string {
    $remainder = strlen($input) % 4;
    if ($remainder) {
        $input .= str_repeat('=', 4 - $remainder);
    }
    return base64_decode(strtr($input, '-_', '+/')) ?: '';
}

function vneFetchGooglePublicKeys(): array {
    $cached = vneCacheGet('google_firebase_certs', 21600, 'auth'); // Cache 6 giờ
    if (is_array($cached) && !empty($cached)) {
        return $cached;
    }

    $url = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
    $ctx = stream_context_create(['http' => ['timeout' => 8]]);
    $raw = @file_get_contents($url, false, $ctx);
    if ($raw === false) {
        return [];
    }
    $certs = json_decode($raw, true);
    if (is_array($certs) && !empty($certs)) {
        vneCacheSet('google_firebase_certs', $certs, 'auth');
        return $certs;
    }
    return [];
}

/**
 * Xác minh Firebase ID Token RS256 -> trả về claims hoặc null nếu không hợp lệ
 */
function vneVerifyFirebaseToken(string $jwt): ?array {
    $parts = explode('.', trim($jwt));
    if (count($parts) !== 3) {
        return null;
    }

    [$headerB64, $payloadB64, $sigB64] = $parts;
    $header = json_decode(vneBase64UrlDecode($headerB64), true);
    $payload = json_decode(vneBase64UrlDecode($payloadB64), true);
    $signature = vneBase64UrlDecode($sigB64);

    if (!is_array($header) || !is_array($payload) || $signature === '') {
        return null;
    }
    if (($header['alg'] ?? '') !== 'RS256' || empty($header['kid'])) {
        return null;
    }

    $config = getVneConfig();
    $projectId = $config['firebase']['project_id'] ?? '';
    if ($projectId === '' || $projectId === 'YOUR_FIREBASE_PROJECT_ID') {
        return null;
    }

    $now = time();
    if (($payload['aud'] ?? '') !== $projectId) return null;
    if (($payload['iss'] ?? '') !== "https://securetoken.google.com/{$projectId}") return null;
    if (empty($payload['sub']) || (int)($payload['exp'] ?? 0) <= $now) return null;
    if ((int)($payload['iat'] ?? 0) > $now + 300) return null;

    $certs = vneFetchGooglePublicKeys();
    $certPem = $certs[$header['kid']] ?? '';
    if ($certPem === '') {
        return null;
    }

    $pubKey = openssl_pkey_get_public($certPem);
    if ($pubKey === false) {
        return null;
    }

    $verified = openssl_verify("{$headerB64}.{$payloadB64}", $signature, $pubKey, OPENSSL_ALGO_SHA256);
    return $verified === 1 ? $payload : null;
}

function vneGetBearerToken(): string {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(.+)/i', $header, $m)) {
        return trim($m[1]);
    }
    return '';
}

function vneRequireAuth(): array {
    $token = vneGetBearerToken();
    if ($token === '') {
        vneJsonError('Yêu cầu đăng nhập để thực hiện thao tác này.', 401, 'UNAUTHORIZED');
    }
    $claims = vneVerifyFirebaseToken($token);
    if (!$claims) {
        vneJsonError('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.', 401, 'INVALID_TOKEN');
    }
    return $claims;
}

function vneRequireAdmin(): array {
    $config = getVneConfig();
    $adminTokenHeader = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
    $expectedAdminToken = $config['security']['admin_token'] ?? '';

    $claims = vneRequireAuth();
    $allowedUids = $config['security']['admin_firebase_uids'] ?? [];
    $uid = (string)($claims['sub'] ?? '');

    $hasValidSecret = $expectedAdminToken !== ''
        && !str_contains($expectedAdminToken, 'THAY_BANG')
        && hash_equals($expectedAdminToken, $adminTokenHeader);

    if (!in_array($uid, $allowedUids, true) && !$hasValidSecret) {
        vneJsonError('Bạn không có quyền truy cập khu vực quản trị.', 403, 'FORBIDDEN');
    }
    return $claims;
}

function vneGetDownloadHmacSecret(): string {
    $config = getVneConfig();
    $secret = trim((string)($config['security']['download_hmac_secret'] ?? ($config['security']['admin_token'] ?? '')));
    if ($secret === '' || str_starts_with($secret, 'THAY_BANG_') || strlen($secret) < 16) {
        return '';
    }
    return $secret;
}

/**
 * Ký token tạm thời để tải tài liệu PDF/AI Skills (chống leech link trực tiếp)
 */
function vneGenerateDownloadToken(int $userId, int $productId, int $ttlSeconds = 300): string {
    $secret = vneGetDownloadHmacSecret();
    if ($secret === '') {
        vneJsonError('Hệ thống chưa cấu hình download_hmac_secret an toàn.', 503, 'DOWNLOAD_SECRET_MISSING');
    }
    $expires = time() + $ttlSeconds;
    $payload = "{$userId}|{$productId}|{$expires}";
    $sig = hash_hmac('sha256', $payload, $secret);
    return rtrim(strtr(base64_encode("{$payload}|{$sig}"), '+/', '-_'), '=');
}

function vneVerifyDownloadToken(string $token): ?array {
    $secret = vneGetDownloadHmacSecret();
    if ($secret === '') {
        return null;
    }
    $raw = vneBase64UrlDecode($token);
    $parts = explode('|', $raw);
    if (count($parts) !== 4) {
        return null;
    }
    [$userId, $productId, $expires, $sig] = $parts;
    if ((int)$expires < time()) {
        return null;
    }
    $expectedSig = hash_hmac('sha256', "{$userId}|{$productId}|{$expires}", $secret);
    if (!hash_equals($expectedSig, $sig)) {
        return null;
    }
    return ['user_id' => (int)$userId, 'product_id' => (int)$productId];
}
