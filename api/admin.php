<?php
/**
 * API QUẢN TRỊ HÀNG ĐỢI & XEM TRƯỚC CAPTION AI - VNECONOMICS
 */

date_default_timezone_set('Asia/Ho_Chi_Minh');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

defined('VNE_APP') or define('VNE_APP', true);

require_once __DIR__ . '/core/bootstrap.php';
require_once __DIR__ . '/wp_sync.php';
require_once __DIR__ . '/ai_rewriter.php';

$config = vneBootstrapApi();
vneEnforceRateLimit('admin', 30, 60);

$adminToken = trim((string)($config['security']['admin_token'] ?? ''));
$provided   = trim((string)($_SERVER['HTTP_X_ADMIN_TOKEN'] ?? ''));

if ($adminToken === '' || str_starts_with($adminToken, 'THAY_BANG_')) {
    vneJsonError('Admin Token chưa được cấu hình bảo mật trong api/config.php.', 503, 'ADMIN_TOKEN_NOT_CONFIGURED');
}
if ($provided === '' || !hash_equals($adminToken, $provided)) {
    vneJsonError('Sai hoặc thiếu header X-Admin-Token.', 403, 'FORBIDDEN');
}

$pdo    = getDbConnection();
$action = $_GET['action'] ?? $_POST['action'] ?? 'get_status';

if (!$pdo) {
    echo json_encode(['success' => false, 'message' => 'Chưa kết nối được MySQL Database. Hãy kiểm tra api/config.php.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// 1. Lấy tổng quan hệ thống, lịch 4 khung giờ, thống kê chuyên mục & log gần nhất
if ($action === 'get_status') {
    $fbConf     = $config['facebook'] ?? [];
    $geminiConf = $config['gemini'] ?? [];

    $statsBySite = $pdo->query("
        SELECT source_site,
               COUNT(*) AS total,
               SUM(CASE WHEN post_count = 0 THEN 1 ELSE 0 END) AS never_posted,
               SUM(CASE WHEN post_count > 0 THEN 1 ELSE 0 END) AS posted_before
        FROM social_post_queue
        WHERE is_active = 1
        GROUP BY source_site
    ")->fetchAll();

    $categories = $pdo->query("
        SELECT source_site, category_slug, category_label, COUNT(*) AS count,
               SUM(CASE WHEN post_count = 0 THEN 1 ELSE 0 END) AS pending
        FROM social_post_queue
        WHERE is_active = 1
        GROUP BY source_site, category_slug, category_label
        ORDER BY source_site ASC, count DESC
    ")->fetchAll();

    $logs = $pdo->query("
        SELECT id, posted_date, slot_key, source_site, category_slug, ref_slug, post_angle, fb_post_id, status, error_message, created_at
        FROM social_post_logs
        ORDER BY id DESC
        LIMIT 20
    ")->fetchAll();

    echo json_encode([
        'success' => true,
        'config'  => [
            'fb_enabled'     => !empty($fbConf['enabled']),
            'has_fb_token'   => !empty($fbConf['page_access_token']) && strpos($fbConf['page_access_token'], 'YOUR_') !== 0,
            'has_gemini_key' => !empty($geminiConf['api_key']) && strpos($geminiConf['api_key'], 'YOUR_') !== 0,
            'gemini_model'   => $geminiConf['model'] ?? 'gemini-4-hydrogen',
            'schedule_slots' => $config['schedule_slots'] ?? []
        ],
        'stats_by_site' => $statsBySite,
        'categories'    => $categories,
        'recent_logs'   => $logs,
        'server_time'   => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// 2. Đồng bộ bài viết từ WP REST API của 2 website
if ($action === 'sync_wp') {
    $quick = !empty($_GET['quick']);
    $res   = syncWordPressSites($pdo, $config, $quick);
    echo json_encode($res, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// 3. Danh sách bài trong hàng đợi kèm caption đã viết (nếu có)
if ($action === 'list_queue') {
    $site  = trim($_GET['site'] ?? '');
    $limit = max(1, min(100, (int)($_GET['limit'] ?? 30)));

    $sql = "
        SELECT q.id, q.source_site, q.category_slug, q.category_label, q.ref_slug, q.title, q.target_url, q.image_url,
               q.post_count, q.last_angle, q.last_posted_at, q.published_at,
               c.caption_text AS cached_caption, c.ai_model, c.is_manual_edited
        FROM social_post_queue q
        LEFT JOIN social_post_captions c
          ON c.queue_id = q.id AND c.angle = ((q.post_count % 3) + 1)
        WHERE q.is_active = 1
    ";
    $params = [];
    if (!empty($site)) {
        $sql .= " AND q.source_site = :site";
        $params[':site'] = $site;
    }
    $sql .= " ORDER BY q.post_count ASC, q.last_posted_at ASC, q.published_at DESC LIMIT {$limit}";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    echo json_encode([
        'success' => true,
        'items'   => $stmt->fetchAll()
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// 4. Gọi Gemini viết lại (hoặc tạo mới) caption cho 1 bài
if ($action === 'generate_caption') {
    $queueId = (int)($_POST['queue_id'] ?? $_GET['queue_id'] ?? 0);
    $stmt    = $pdo->prepare("SELECT * FROM social_post_queue WHERE id = :id LIMIT 1");
    $stmt->execute([':id' => $queueId]);
    $post = $stmt->fetch();

    if (!$post) {
        echo json_encode(['success' => false, 'message' => 'Không tìm thấy bài viết'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $angle    = ((int)$post['post_count'] % 3) + 1;
    $aiResult = rewritePostWithGemini($post, $angle, $config);
    $caption  = renderFacebookCaption($post, $aiResult['parts'], $angle);

    if ($aiResult['ok']) {
        $save = $pdo->prepare("
            INSERT INTO social_post_captions (queue_id, angle, caption_text, ai_model, is_manual_edited)
            VALUES (:qid, :angle, :cap, :model, 0)
            ON DUPLICATE KEY UPDATE caption_text = VALUES(caption_text), ai_model = VALUES(ai_model), is_manual_edited = 0
        ");
        $save->execute([
            ':qid'   => $queueId,
            ':angle' => $angle,
            ':cap'   => $caption,
            ':model' => $aiResult['model']
        ]);
    }

    echo json_encode([
        'success' => $aiResult['ok'],
        'angle'   => $angle,
        'model'   => $aiResult['model'],
        'error'   => $aiResult['error'],
        'caption' => $caption
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// 5. Lưu caption đã chỉnh sửa tay
if ($action === 'save_caption') {
    $body    = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    $queueId = (int)($body['queue_id'] ?? 0);
    $caption = trim($body['caption'] ?? '');

    $stmt = $pdo->prepare("SELECT post_count FROM social_post_queue WHERE id = :id LIMIT 1");
    $stmt->execute([':id' => $queueId]);
    $post = $stmt->fetch();

    if (!$post || empty($caption)) {
        echo json_encode(['success' => false, 'message' => 'Thiếu queue_id hoặc nội dung caption'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $angle = ((int)$post['post_count'] % 3) + 1;
    $save  = $pdo->prepare("
        INSERT INTO social_post_captions (queue_id, angle, caption_text, ai_model, is_manual_edited)
        VALUES (:qid, :angle, :cap, 'manual-edited', 1)
        ON DUPLICATE KEY UPDATE caption_text = VALUES(caption_text), ai_model = 'manual-edited', is_manual_edited = 1
    ");
    $save->execute([':qid' => $queueId, ':angle' => $angle, ':cap' => $caption]);

    echo json_encode(['success' => true, 'message' => 'Đã lưu caption chỉnh sửa'], JSON_UNESCAPED_UNICODE);
    exit;
}

// 6. Chạy test 1 khung giờ (force = 1)
if ($action === 'trigger_slot_test') {
    $slot = trim($_GET['slot'] ?? $_POST['slot'] ?? '08:00');
    $_GET['slot']  = $slot;
    $_GET['force'] = '1';
    $VNE_INTERNAL_CALL = true;

    ob_start();
    require __DIR__ . '/cron_fb_autopost.php';
    $output = ob_get_clean();

    echo $output;
    exit;
}

echo json_encode(['success' => false, 'message' => 'Action không được hỗ trợ'], JSON_UNESCAPED_UNICODE);
