<?php
/**
 * VNECONOMICS PHP 8 CORE BOOTSTRAP
 * Thiết lập security headers, CORS chuẩn origin, tắt lỗi nhạy cảm trên production,
 * và nạp kết nối DB dùng chung (giữ nguyên api/db.php cho hệ thống Autopost).
 */

defined('VNE_APP') or define('VNE_APP', true);

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/cache.php';
require_once __DIR__ . '/rate_limit.php';
require_once __DIR__ . '/sanitizer.php';
require_once __DIR__ . '/jwt_verify.php';

function vneBootstrapApi(): array {
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $isLocal = str_contains($host, 'localhost') || str_contains($host, '127.0.0.1');

    if (!$isLocal) {
        ini_set('display_errors', '0');
        error_reporting(E_ALL & ~E_DEPRECATED & ~E_STRICT);
    }

    // Security Headers tầng ứng dụng
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');

    // Kiểm soát CORS chặt chẽ theo domain cấu hình
    $config = getVneConfig();
    $allowedOrigins = $config['security']['cors_allowed_origins'] ?? [
        'https://vneconomics.com',
        'https://www.vneconomics.com'
    ];
    if ($isLocal) {
        $allowedOrigins[] = 'http://localhost:3000';
        $allowedOrigins[] = 'http://127.0.0.1:3000';
    }

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
        header("Access-Control-Allow-Origin: {$origin}");
        header('Vary: Origin');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Admin-Token, X-Turnstile-Token');
    }

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    return $config;
}

function vneGetClientIp(): string {
    $remoteAddr = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $config = function_exists('getVneConfig') ? getVneConfig() : [];
    $trustProxy = !empty($config['security']['trust_proxy_headers']);

    if ($trustProxy) {
        if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
            $cfIp = trim((string)$_SERVER['HTTP_CF_CONNECTING_IP']);
            if (filter_var($cfIp, FILTER_VALIDATE_IP)) {
                return $cfIp;
            }
        }
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $parts = explode(',', (string)$_SERVER['HTTP_X_FORWARDED_FOR']);
            $first = trim($parts[0]);
            if (filter_var($first, FILTER_VALIDATE_IP)) {
                return $first;
            }
        }
    }
    return filter_var($remoteAddr, FILTER_VALIDATE_IP) ? $remoteAddr : '0.0.0.0';
}
