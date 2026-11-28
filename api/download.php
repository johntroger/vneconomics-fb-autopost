<?php
/**
 * SIGNED DOWNLOAD GATEWAY (CHỐNG LEECH LINK TÀI LIỆU VIP / AI SKILLS)
 */

require_once __DIR__ . '/core/bootstrap.php';

vneBootstrapApi();
vneEnforceRateLimit('download', 30, 60);

$token = trim((string)($_GET['token'] ?? ''));
$verified = $token !== '' ? vneVerifyDownloadToken($token) : null;
if (!$verified) {
    vneJsonError('Link tải đã hết hạn hoặc chữ ký không hợp lệ.', 403, 'INVALID_DOWNLOAD_TOKEN');
}

$pdo = getDbConnection();
if (!$pdo) {
    vneJsonError('Không thể kết nối cơ sở dữ liệu.', 503, 'DB_UNAVAILABLE');
}

$stmt = $pdo->prepare("SELECT id, title, file_path, external_url FROM products WHERE id = :id LIMIT 1");
$stmt->execute([':id' => $verified['product_id']]);
$prod = $stmt->fetch();

if (!$prod) {
    vneJsonError('Không tìm thấy tài liệu.', 404, 'NOT_FOUND');
}

$pdo->prepare("UPDATE products SET download_count = download_count + 1 WHERE id = :id")->execute([':id' => $prod['id']]);

$target = $prod['file_path'] ?: $prod['external_url'];
if (!$target) {
    vneJsonError('Tài liệu chưa có file đính kèm.', 404, 'FILE_MISSING');
}

if (str_starts_with($target, 'http://') || str_starts_with($target, 'https://')) {
    header("Location: {$target}", true, 302);
    exit;
}

$safeRel = ltrim(str_replace(['..', '\\'], ['', '/'], $target), '/');
$absPath = realpath(__DIR__ . '/../' . $safeRel);
$allowedDirs = array_filter([
    realpath(__DIR__ . '/../uploads'),
    realpath(__DIR__ . '/../wp-content/uploads'),
]);

$isAllowed = false;
if ($absPath && is_file($absPath)) {
    foreach ($allowedDirs as $dir) {
        if (str_starts_with($absPath, $dir . DIRECTORY_SEPARATOR)) {
            $isAllowed = true;
            break;
        }
    }
}

if (!$isAllowed) {
    vneJsonError('Không tìm thấy tệp hợp lệ trong thư mục tài liệu.', 404, 'FILE_NOT_FOUND');
}

header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . basename($absPath) . '"');
header('Content-Length: ' . filesize($absPath));
readfile($absPath);
exit;
