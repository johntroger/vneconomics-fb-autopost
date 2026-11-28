<?php
/**
 * THƯ VIỆN SÁCH, TÀI LIỆU & MỞ KHÓA 0Đ (VNE POINTS / CRYPTO TESTNET)
 */

require_once __DIR__ . '/core/bootstrap.php';

vneBootstrapApi();
$pdo = getDbConnection();
if (!$pdo) {
    vneJsonError('Không thể kết nối cơ sở dữ liệu.', 503, 'DB_UNAVAILABLE');
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $slug = isset($_GET['slug']) ? vneSanitizeSlug((string)$_GET['slug']) : '';
    if ($slug !== '') {
        $stmt = $pdo->prepare(
            "SELECT id, wp_id, slug, title, category_slug, category_name, unlock_type, points_cost,
                    cover_image, short_description, description_html, faq_json, download_count
             FROM products WHERE slug = :slug AND status = 'published' LIMIT 1"
        );
        $stmt->execute([':slug' => $slug]);
        $item = $stmt->fetch();
        if (!$item) vneJsonError('Không tìm thấy tài liệu.', 404, 'NOT_FOUND');
        vneJsonSuccess($item);
    }

    $cat = isset($_GET['category']) ? vneSanitizeSlug((string)$_GET['category']) : '';
    $cacheKey = "products_list_{$cat}";
    $cached = vneCacheGet($cacheKey, 300);
    if ($cached !== null) vneJsonSuccess($cached);

    $sql = "SELECT id, slug, title, category_slug, category_name, unlock_type, points_cost, cover_image, short_description, download_count
            FROM products WHERE status = 'published'";
    $params = [];
    if ($cat !== '') {
        $sql .= " AND category_slug = :cat";
        $params[':cat'] = $cat;
    }
    $sql .= " ORDER BY id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    vneCacheSet($cacheKey, $rows);
    vneJsonSuccess($rows);
}

if ($method === 'POST') {
    vneEnforceRateLimit('unlock', 20, 60);
    $claims = vneRequireAuth();
    $body = vneReadJsonBody();
    $productId = (int)($body['product_id'] ?? 0);
    if ($productId <= 0) vneJsonError('Thiếu product_id.', 400);

    $uid = (string)$claims['sub'];
    $userStmt = $pdo->prepare("SELECT id FROM users WHERE firebase_uid = :uid LIMIT 1");
    $userStmt->execute([':uid' => $uid]);
    $user = $userStmt->fetch();
    if (!$user) vneJsonError('Tài khoản chưa được đồng bộ.', 403);
    $userId = (int)$user['id'];

    $prodStmt = $pdo->prepare("SELECT id, title, unlock_type, points_cost FROM products WHERE id = :id LIMIT 1");
    $prodStmt->execute([':id' => $productId]);
    $product = $prodStmt->fetch();
    if (!$product) vneJsonError('Tài liệu không tồn tại.', 404);

    $pdo->beginTransaction();
    try {
        $checkUnlock = $pdo->prepare("SELECT id FROM unlock_logs WHERE user_id = :u AND item_type = 'product' AND item_id = :p LIMIT 1");
        $checkUnlock->execute([':u' => $userId, ':p' => $productId]);
        if (!$checkUnlock->fetch()) {
            $cost = $product['unlock_type'] === 'free' ? 0 : (int)$product['points_cost'];
            if ($cost > 0) {
                $ptsStmt = $pdo->prepare("SELECT total_points FROM user_points WHERE user_id = :u FOR UPDATE");
                $ptsStmt->execute([':u' => $userId]);
                $pts = (int)$ptsStmt->fetchColumn();
                if ($pts < $cost) {
                    $pdo->rollBack();
                    vneJsonError("Bạn cần {$cost} VNE Points (hiện có {$pts}).", 402, 'INSUFFICIENT_POINTS');
                }
                $pdo->prepare("UPDATE user_points SET total_points = total_points - :c WHERE user_id = :u")->execute([':c' => $cost, ':u' => $userId]);
                $pdo->prepare("INSERT INTO user_point_events (user_id, points_delta, action_type, reason) VALUES (:u, :d, 'unlock_item', :r)")
                    ->execute([':u' => $userId, ':d' => -$cost, ':r' => 'Mở khóa: ' . $product['title']]);
            }
            $pdo->prepare("INSERT INTO unlock_logs (user_id, item_type, item_id, unlock_method, points_spent) VALUES (:u, 'product', :p, :m, :s)")
                ->execute([':u' => $userId, ':p' => $productId, ':m' => $cost > 0 ? 'points' : 'free', ':s' => $cost]);
        }
        $pdo->commit();
        $token = vneGenerateDownloadToken($userId, $productId, 300);
        vneJsonSuccess(['unlocked' => true, 'download_token' => $token]);
    } catch (\Throwable $e) {
        $pdo->rollBack();
        vneJsonError('Không thể xử lý mở khóa tài liệu.', 500, 'SERVER_ERROR');
    }
}

vneJsonError('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
