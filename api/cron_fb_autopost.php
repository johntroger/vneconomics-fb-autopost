<?php
/**
 * HỆ THỐNG TỰ ĐỘNG ĐĂNG BÀI FANPAGE FACEBOOK (4 KHUNG GIỜ CỐ ĐỊNH/NGÀY)
 * Khung giờ: 08:00 (vneconomics), 13:00 (marketing2student), 17:00 (vneconomics), 21:00 (marketing2student)
 *
 * Tính năng:
 * 1. Đồng bộ bài viết mới từ WP REST API (vneconomics.com & marketing2student.com)
 * 2. Luân phiên Category Round-Robin + LRU (phủ hết bài mới, hết thì xoay vòng + đổi Angle)
 * 3. Viết lại nội dung bằng Gemini API theo Template + Footer chuẩn đã chốt
 * 4. Tự động tải ảnh bìa & chuyển đổi .webp -> .jpg trước khi upload Multipart lên Facebook
 * 5. Khóa bảo vệ 2 lớp chống đăng trùng theo (Ngày, Khung giờ)
 */

date_default_timezone_set('Asia/Ho_Chi_Minh');

if (php_sapi_name() !== 'cli') {
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
}

defined('VNE_APP') or define('VNE_APP', true);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/wp_sync.php';
require_once __DIR__ . '/ai_rewriter.php';
require_once __DIR__ . '/telegram_poster.php';

$isCli = (php_sapi_name() === 'cli' || defined('STDIN'));
$config = getVneConfig();

$fbConfig   = $config['facebook'] ?? [];
$cronSecret = trim($config['security']['cron_secret'] ?? '');
$enabled    = !empty($fbConfig['enabled']);
$pageId     = trim($fbConfig['page_id'] ?? '');
$pageToken  = trim($fbConfig['page_access_token'] ?? '');
$graphVer   = trim($fbConfig['graph_version'] ?? 'v21.0');
$slotsConf  = $config['schedule_slots'] ?? [];

// Phân tích tham số CLI (--slot=08:00 --force=1) hoặc HTTP (?slot=08:00&token=...)
$cliArgs = [];
if ($isCli && !empty($argv)) {
    foreach ($argv as $arg) {
        if (preg_match('/^--([a-zA-Z0-9_]+)=(.*)$/', $arg, $m)) {
            $cliArgs[$m[1]] = $m[2];
        }
    }
}

if (!$isCli && empty($VNE_INTERNAL_CALL)) {
    if (empty($cronSecret)) {
        http_response_code(503);
        echo json_encode(['success' => false, 'message' => 'Chưa cấu hình security.cron_secret trong config.php'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $providedToken = $_GET['token'] ?? $_POST['token'] ?? '';
    if (empty($providedToken) || $providedToken !== $cronSecret) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Truy cập bị từ chối: Sai cron_secret'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

/**
 * Xác định khung giờ (slot_key) hiện tại nếu không truyền tường minh
 */
function detectCurrentSlot(array $slotsConf, string $requestedSlot): string {
    if (!empty($requestedSlot) && isset($slotsConf[$requestedSlot])) {
        return $requestedSlot;
    }
    $hour = (int)date('G');
    if ($hour >= 6 && $hour <= 10 && isset($slotsConf['08:00'])) return '08:00';
    if ($hour >= 11 && $hour <= 14 && isset($slotsConf['13:00'])) return '13:00';
    if ($hour >= 15 && $hour <= 18 && isset($slotsConf['17:00'])) return '17:00';
    if ($hour >= 19 && $hour <= 23 && isset($slotsConf['21:00'])) return '21:00';

    $keys = array_keys($slotsConf);
    return $keys[0] ?? '08:00';
}

$requestedSlot = trim($cliArgs['slot'] ?? $_GET['slot'] ?? $_POST['slot'] ?? '');
$slotKey       = detectCurrentSlot($slotsConf, $requestedSlot);
$slotInfo      = $slotsConf[$slotKey] ?? ['source_site' => 'vneconomics', 'label' => $slotKey];
$sourceSite    = $slotInfo['source_site'];

$todayStr = date('Y-m-d');
$isForce  = !empty($cliArgs['force']) || !empty($_GET['force']) || !empty($_POST['force']);

// 1. KHÓA BẢO VỆ 2 LỚP CHỐNG ĐĂNG TRÙNG THEO (NGÀY + KHUNG GIỜ)
$lockDir = __DIR__ . '/../uploads';
if (!is_dir($lockDir)) {
    @mkdir($lockDir, 0755, true);
}
$safeSlot = str_replace(':', '', $slotKey);
$lockFile = $lockDir . "/daily_fb_autopost_lock_{$safeSlot}.json";

if (!$isForce && file_exists($lockFile)) {
    $lockData = json_decode(@file_get_contents($lockFile), true);
    if (!empty($lockData['posted_date']) && $lockData['posted_date'] === $todayStr) {
        echo json_encode([
            'success'     => true,
            'status'      => 'skipped',
            'slot'        => $slotKey,
            'message'     => "Khung giờ {$slotKey} hôm nay ({$todayStr}) đã đăng bài '{$lockData['slug']}' (FB ID: " . ($lockData['fb_post_id'] ?? 'N/A') . "). Bỏ qua để chống trùng.",
            'daily_guard' => 'ACTIVE_FILE_LOCK'
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
}

$pdo = getDbConnection();
if (!$pdo) {
    echo json_encode([
        'success' => false,
        'message' => 'Không thể kết nối MySQL Database. Vui lòng kiểm tra cấu hình db trong api/config.php.'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

if (!$isForce) {
    $checkStmt = $pdo->prepare("SELECT id, ref_slug, fb_post_id, created_at FROM social_post_logs WHERE posted_date = :today AND slot_key = :slot AND status = 'success' LIMIT 1");
    $checkStmt->execute([':today' => $todayStr, ':slot' => $slotKey]);
    $existing = $checkStmt->fetch();
    if ($existing) {
        @file_put_contents($lockFile, json_encode([
            'posted_date' => $todayStr,
            'slot_key'    => $slotKey,
            'slug'        => $existing['ref_slug'],
            'fb_post_id'  => $existing['fb_post_id'],
            'created_at'  => $existing['created_at']
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

        echo json_encode([
            'success'     => true,
            'status'      => 'skipped',
            'slot'        => $slotKey,
            'message'     => "Khung giờ {$slotKey} hôm nay ({$todayStr}) đã đăng bài '{$existing['ref_slug']}' (FB ID: {$existing['fb_post_id']}). Bỏ qua (Khóa MySQL).",
            'daily_guard' => 'ACTIVE_DB_LOCK'
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
}

// 2. ĐỒNG BỘ NHANH BÀI MỚI TỪ WORDPRESS REST API
syncWordPressSites($pdo, $config, true);

// 3. THUẬT TOÁN CHỌN BÀI: LUÂN PHIÊN CATEGORY + LRU (PHỦ ĐỀU HẾT NỘI DUNG RỒI QUAY VÒNG)
$lastCatStmt = $pdo->prepare("SELECT category_slug FROM social_post_logs WHERE source_site = :site AND status = 'success' ORDER BY id DESC LIMIT 1");
$lastCatStmt->execute([':site' => $sourceSite]);
$lastCatRow = $lastCatStmt->fetch();
$lastCategory = $lastCatRow['category_slug'] ?? '';

$chosenItem = null;

// Ưu tiên 1: Bài chưa từng đăng (post_count = 0), khác category lần gần nhất của site này
$sql1 = "SELECT * FROM social_post_queue WHERE is_active = 1 AND source_site = :site AND post_count = 0";
$params1 = [':site' => $sourceSite];
if (!empty($lastCategory)) {
    $sql1 .= " AND category_slug != :last_cat";
    $params1[':last_cat'] = $lastCategory;
}
$sql1 .= " ORDER BY published_at DESC, id ASC LIMIT 1";
$stmt1 = $pdo->prepare($sql1);
$stmt1->execute($params1);
$chosenItem = $stmt1->fetch();

// Ưu tiên 2: Nếu hết bài mới khác category -> chọn bài có post_count thấp nhất & lâu chưa đăng nhất (LRU), khác category lần gần nhất
if (!$chosenItem) {
    $sql2 = "SELECT * FROM social_post_queue WHERE is_active = 1 AND source_site = :site";
    $params2 = [':site' => $sourceSite];
    if (!empty($lastCategory)) {
        $sql2 .= " AND category_slug != :last_cat";
        $params2[':last_cat'] = $lastCategory;
    }
    $sql2 .= " ORDER BY post_count ASC, last_posted_at ASC, id ASC LIMIT 1";
    $stmt2 = $pdo->prepare($sql2);
    $stmt2->execute($params2);
    $chosenItem = $stmt2->fetch();
}

// Ưu tiên 3: Fallback (trường hợp site chỉ có 1 category)
if (!$chosenItem) {
    $stmt3 = $pdo->prepare("SELECT * FROM social_post_queue WHERE is_active = 1 AND source_site = :site ORDER BY post_count ASC, last_posted_at ASC, id ASC LIMIT 1");
    $stmt3->execute([':site' => $sourceSite]);
    $chosenItem = $stmt3->fetch();
}

if (!$chosenItem) {
    echo json_encode([
        'success' => false,
        'slot'    => $slotKey,
        'site'    => $sourceSite,
        'message' => "Không tìm thấy bài viết nào cho nguồn '{$sourceSite}' trong hàng đợi."
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// 4. LẤY HOẶC VIẾT LẠI CAPTION BẰNG GEMINI API THEO ANGLE (1, 2, 3)
$queueId   = (int)$chosenItem['id'];
$slug      = $chosenItem['ref_slug'];
$catSlug   = $chosenItem['category_slug'];
$targetUrl = $chosenItem['target_url'];
$postCount = (int)$chosenItem['post_count'];
$angle     = ($postCount % 3) + 1;

$caption    = '';
$tgCaption  = '';
$aiModel    = 'cached';
$aiError    = null;

$capStmt = $pdo->prepare("SELECT caption_text, tg_caption_text, ai_model FROM social_post_captions WHERE queue_id = :qid AND angle = :angle LIMIT 1");
$capStmt->execute([':qid' => $queueId, ':angle' => $angle]);
$cachedCap = $capStmt->fetch();

if ($cachedCap && !empty($cachedCap['caption_text'])) {
    $caption = $cachedCap['caption_text'];
    $aiModel = $cachedCap['ai_model'] . ' (cached)';

    if (!empty($cachedCap['tg_caption_text'])) {
        $tgCaption = $cachedCap['tg_caption_text'];
    } else {
        $tgAiResult = rewritePostWithGemini($chosenItem, $angle, $config);
        $tgCaption  = renderTelegramCaption($chosenItem, $tgAiResult['parts'], $angle);
        if ($tgAiResult['ok']) {
            try {
                $updTg = $pdo->prepare("UPDATE social_post_captions SET tg_caption_text = :tg_cap WHERE queue_id = :qid AND angle = :angle");
                $updTg->execute([':tg_cap' => $tgCaption, ':qid' => $queueId, ':angle' => $angle]);
            } catch (\Throwable $e) {}
        }
    }
} else {
    $aiResult  = rewritePostWithGemini($chosenItem, $angle, $config);
    $caption   = renderFacebookCaption($chosenItem, $aiResult['parts'], $angle);
    $tgCaption = renderTelegramCaption($chosenItem, $aiResult['parts'], $angle);
    $aiModel   = $aiResult['model'];
    $aiError   = $aiResult['error'];

    // Chỉ lưu cache DB nếu Gemini viết thành công (để lần sau nếu fallback sẽ thử gọi lại AI)
    if ($aiResult['ok']) {
        try {
            $saveCap = $pdo->prepare("
                INSERT INTO social_post_captions (queue_id, angle, caption_text, tg_caption_text, ai_model, is_manual_edited)
                VALUES (:qid, :angle, :cap, :tg_cap, :model, 0)
                ON DUPLICATE KEY UPDATE caption_text = VALUES(caption_text), tg_caption_text = VALUES(tg_caption_text), ai_model = VALUES(ai_model)
            ");
            $saveCap->execute([
                ':qid'    => $queueId,
                ':angle'  => $angle,
                ':cap'    => $caption,
                ':tg_cap' => $tgCaption,
                ':model'  => $aiModel
            ]);
        } catch (\Throwable $e) {}
    }
}

// 5. CHUẨN BỊ ẢNH ĐỂ ĐĂNG FACEBOOK (TẢI VỀ & CONVERT .WEBP -> .JPG NẾU CẦN)
function prepareFacebookImage(array $item, array $config): string {
    $cacheDir = __DIR__ . '/../uploads/og_cache';
    if (!is_dir($cacheDir)) {
        @mkdir($cacheDir, 0755, true);
    }

    $site     = $item['source_site'];
    $slug     = preg_replace('/[^a-zA-Z0-9_-]/', '_', $item['ref_slug']);
    $imgUrl   = trim($item['image_url'] ?? '');
    $jpgPath  = "{$cacheDir}/{$site}_{$slug}.jpg";
    $metaPath = "{$cacheDir}/{$site}_{$slug}.meta.json";

    $cachedMeta = file_exists($metaPath) ? json_decode(@file_get_contents($metaPath), true) : null;
    if (file_exists($jpgPath) && filesize($jpgPath) > 2048 && ($cachedMeta['source_url'] ?? '') === $imgUrl) {
        return $jpgPath;
    }

    if (!empty($imgUrl)) {
        $ch = curl_init($imgUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_USERAGENT, 'VNEconomicsAutopost/1.0');
        $raw = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && !empty($raw) && strlen($raw) > 1024) {
            $tmpFile = $jpgPath . '.tmp';
            @file_put_contents($tmpFile, $raw);
            $info = @getimagesize($tmpFile);

            if ($info !== false) {
                $mime = $info['mime'] ?? '';
                $converted = false;

                // Convert WebP hoặc PNG sang JPEG để Facebook Graph API nhận ổn định nhất
                if ($mime === 'image/webp' && function_exists('imagecreatefromwebp')) {
                    $im = @imagecreatefromwebp($tmpFile);
                    if ($im) {
                        $converted = @imagejpeg($im, $jpgPath, 90);
                        imagedestroy($im);
                    }
                } elseif ($mime === 'image/png' && function_exists('imagecreatefrompng')) {
                    $im = @imagecreatefrompng($tmpFile);
                    if ($im) {
                        $bg = imagecreatetruecolor(imagesx($im), imagesy($im));
                        imagefill($bg, 0, 0, imagecolorallocate($bg, 255, 255, 255));
                        imagecopy($bg, $im, 0, 0, 0, 0, imagesx($im), imagesy($im));
                        $converted = @imagejpeg($bg, $jpgPath, 90);
                        imagedestroy($im);
                        imagedestroy($bg);
                    }
                } elseif ($mime === 'image/jpeg') {
                    $converted = @rename($tmpFile, $jpgPath);
                }

                if ($converted && file_exists($jpgPath) && filesize($jpgPath) > 1024) {
                    @unlink($tmpFile);
                    @file_put_contents($metaPath, json_encode([
                        'source_url' => $imgUrl,
                        'mime_orig'  => $mime,
                        'cached_at'  => date('Y-m-d H:i:s')
                    ], JSON_UNESCAPED_UNICODE));
                    return $jpgPath;
                }
            }
            @unlink($tmpFile);
        }
    }

    $fallback = $config['sites'][$site]['fallback_image'] ?? '';
    return (!empty($fallback) && file_exists($fallback)) ? $fallback : '';
}

// 6. PRE-SCRAPE & ĐĂNG LÊN FACEBOOK GRAPH API
$fbPostId   = null;
$fbResponse = null;
$errorMsg   = null;
$status     = 'success';
$tgEnabled  = !empty($config['telegram']['enabled']);
$localImage = '';

if ($enabled || $tgEnabled) {
    $localImage = prepareFacebookImage($chosenItem, $config);
}

if (!$enabled || empty($pageId) || empty($pageToken) || strpos($pageToken, 'YOUR_') === 0) {
    $fbPostId   = 'simulated_' . $safeSlot . '_' . uniqid();
    $fbResponse = [
        'mode' => 'SIMULATED',
        'note' => 'Hệ thống chạy thử thành công. Hãy cấu hình facebook.enabled = true, page_id và page_access_token trong api/config.php để đăng lên Fanpage thật.'
    ];
} else {
    // Pre-scrape URL trên Facebook
    $scrapeUrl = "https://graph.facebook.com/{$graphVer}/?id=" . urlencode($targetUrl) . "&scrape=true&access_token=" . urlencode($pageToken);
    $ch = curl_init($scrapeUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 6);
    curl_exec($ch);
    curl_close($ch);
    usleep(1200000);

    $publishUrl = "https://graph.facebook.com/{$graphVer}/{$pageId}/photos";

    $payload = [
        'caption'      => $caption,
        'access_token' => $pageToken
    ];

    if (!empty($localImage) && class_exists('CURLFile')) {
        $payload['source'] = new CURLFile($localImage, 'image/jpeg');
    } elseif (!empty($chosenItem['image_url'])) {
        $payload['url'] = $chosenItem['image_url'];
    }

    $maxRetries = 2;
    $attempt    = 0;
    $rawResp    = '';
    $httpCode   = 0;

    while ($attempt <= $maxRetries) {
        $attempt++;
        $ch = curl_init($publishUrl);
        curl_setopt($ch, CURLOPT_POST, true);
        if (isset($payload['source'])) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        } else {
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($payload));
        }
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 25);
        $rawResp  = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && !empty($rawResp)) {
            $fbResponse = json_decode($rawResp, true);
            $fbPostId   = $fbResponse['post_id'] ?? ($fbResponse['id'] ?? null);
            break;
        } else {
            if (isset($payload['source']) && !empty($chosenItem['image_url'])) {
                unset($payload['source']);
                $payload['url'] = $chosenItem['image_url'];
            }
            if ($attempt <= $maxRetries) {
                sleep(2);
            }
        }
    }

    if (empty($fbPostId)) {
        $status   = 'failed';
        $errorMsg = "Lỗi Facebook Graph API (HTTP {$httpCode}): {$rawResp}";
    }
}

// 6B. ĐẨY BÀI ĐỒNG THỜI LÊN TELEGRAM GROUP (TÁCH BIỆT LỖI VỚI FACEBOOK)
$tgResult = postToTelegramGroup($tgCaption, $localImage, $chosenItem['image_url'] ?? '', $config, $sourceSite);
$tgStatus    = $tgResult['status'];
$tgMessageId = $tgResult['message_id'];
$tgResponse  = $tgResult['response'];
$tgError     = $tgResult['error'];

// 7. CẬP NHẬT QUEUE, GHI LOG & FILE LOCK
$now = date('Y-m-d H:i:s');
if ($status === 'success') {
    $upStmt = $pdo->prepare("
        UPDATE social_post_queue
        SET last_posted_at = :now, post_count = post_count + 1, last_angle = :angle, last_fb_post_id = :fbid
        WHERE id = :id
    ");
    $upStmt->execute([
        ':now'   => $now,
        ':angle' => $angle,
        ':fbid'  => $fbPostId,
        ':id'    => $queueId
    ]);

    @file_put_contents($lockFile, json_encode([
        'posted_date' => $todayStr,
        'slot_key'    => $slotKey,
        'source_site' => $sourceSite,
        'slug'        => $slug,
        'fb_post_id'  => $fbPostId,
        'created_at'  => $now
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

$logStmt = $pdo->prepare("
    INSERT INTO social_post_logs (
        posted_date, slot_key, source_site, category_slug, ref_slug,
        target_url, post_angle, caption_used, tg_caption_used, fb_post_id, fb_response_json,
        tg_message_id, tg_response_json, status, tg_status, error_message, tg_error_message, created_at
    ) VALUES (
        :pdate, :slot, :site, :cat, :slug,
        :url, :angle, :cap, :tg_cap, :fbid, :resp,
        :tg_mid, :tg_resp, :st, :tg_st, :err, :tg_err, :now
    )
    ON DUPLICATE KEY UPDATE
        source_site      = VALUES(source_site),
        category_slug    = VALUES(category_slug),
        ref_slug         = VALUES(ref_slug),
        target_url       = VALUES(target_url),
        post_angle       = VALUES(post_angle),
        caption_used     = VALUES(caption_used),
        tg_caption_used  = VALUES(tg_caption_used),
        fb_post_id       = VALUES(fb_post_id),
        fb_response_json = VALUES(fb_response_json),
        tg_message_id    = VALUES(tg_message_id),
        tg_response_json = VALUES(tg_response_json),
        status           = VALUES(status),
        tg_status        = VALUES(tg_status),
        error_message    = VALUES(error_message),
        tg_error_message = VALUES(tg_error_message)
");
$logStmt->execute([
    ':pdate'   => $todayStr,
    ':slot'    => $slotKey,
    ':site'    => $sourceSite,
    ':cat'     => $catSlug,
    ':slug'    => $slug,
    ':url'     => $targetUrl,
    ':angle'   => $angle,
    ':cap'     => $caption,
    ':tg_cap'  => $tgCaption,
    ':fbid'    => $fbPostId,
    ':resp'    => json_encode($fbResponse, JSON_UNESCAPED_UNICODE),
    ':tg_mid'  => $tgMessageId,
    ':tg_resp' => json_encode($tgResponse, JSON_UNESCAPED_UNICODE),
    ':st'      => $status,
    ':tg_st'   => $tgStatus,
    ':err'     => $errorMsg,
    ':tg_err'  => $tgError,
    ':now'     => $now
]);

echo json_encode([
    'success'         => ($status === 'success'),
    'posted_date'     => $todayStr,
    'slot'            => $slotKey,
    'slot_label'      => $slotInfo['label'] ?? $slotKey,
    'server_time'     => $now,
    'ai_model'        => $aiModel,
    'ai_error'        => $aiError,
    'selected_item'   => [
        'queue_id'    => $queueId,
        'source_site' => $sourceSite,
        'category'    => $catSlug,
        'slug'        => $slug,
        'title'       => $chosenItem['title'],
        'angle'       => $angle,
        'target_url'  => $targetUrl,
        'post_count'  => $postCount + 1
    ],
    'fb_post_id'      => $fbPostId,
    'caption_preview' => $caption,
    'fb_response'     => $fbResponse,
    'error'           => $errorMsg,
    'telegram'        => [
        'status'            => $tgStatus,
        'message_id'        => $tgMessageId,
        'caption_utf16_len' => tgUtf16Len($tgCaption),
        'caption_preview'   => $tgCaption,
        'response'          => $tgResponse,
        'error'             => $tgError
    ]
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
