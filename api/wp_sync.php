<?php
/**
 * ĐỒNG BỘ BÀI VIẾT TỪ WORDPRESS REST API (VNECONOMICS.COM & MARKETING2STUDENT.COM)
 * Có thể chạy trực tiếp qua CLI/HTTP hoặc nhúng làm thư viện từ cron_fb_autopost.php
 */

defined('VNE_APP') or define('VNE_APP', true);
require_once __DIR__ . '/db.php';

/**
 * Làm sạch HTML WordPress thành văn bản thuần gọn gàng, giữ ngắt đoạn
 */
function cleanWpHtmlToText(string $html, int $maxChars = 8000): string {
    $text = preg_replace('/<\/(p|h[1-6]|li|div|blockquote|tr)>/i', "\n", $html);
    $text = preg_replace('/<br\s*\/?>/i', "\n", $text);
    $text = strip_tags($text);
    $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $text = preg_replace("/[ \t]+/", ' ', $text);
    $text = preg_replace("/\n{3,}/", "\n\n", $text);
    $text = trim($text);

    if (mb_strlen($text, 'UTF-8') > $maxChars) {
        $text = mb_substr($text, 0, $maxChars, 'UTF-8') . '...';
    }
    return $text;
}

/**
 * Gọi WP REST API một trang cụ thể
 */
function fetchWpPostsPage(string $wpApiUrl, int $page, int $perPage): array {
    $sep = (strpos($wpApiUrl, '?') !== false) ? '&' : '?';
    $url = "{$wpApiUrl}{$sep}status=publish&per_page={$perPage}&page={$page}&_embed";

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_USERAGENT, 'VNEconomicsAutopost/1.0 (https://vneconomics.com)');
    $raw = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($httpCode !== 200 || empty($raw)) {
        return ['ok' => false, 'http_code' => $httpCode, 'error' => $err ?: "HTTP {$httpCode}", 'posts' => []];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return ['ok' => false, 'http_code' => $httpCode, 'error' => 'Invalid JSON', 'posts' => []];
    }

    return ['ok' => true, 'http_code' => 200, 'posts' => $decoded];
}

/**
 * Đồng bộ tất cả site trong cấu hình vào MySQL `social_post_queue`
 */
function syncWordPressSites(?PDO $pdo, array $config, bool $quickSyncOnly = false): array {
    $sites = $config['sites'] ?? [];
    $summary = [];

    if (!$pdo) {
        return ['success' => false, 'message' => 'Chưa kết nối được MySQL Database.', 'sites' => []];
    }

    $upsertStmt = $pdo->prepare("
        INSERT INTO social_post_queue (
            source_site, wp_post_id, category_slug, category_label,
            ref_slug, title, target_url, image_url, excerpt_text, content_plain, published_at, is_active
        ) VALUES (
            :site, :wp_id, :cat_slug, :cat_label,
            :slug, :title, :url, :img, :excerpt, :content, :pub_at, 1
        )
        ON DUPLICATE KEY UPDATE
            wp_post_id     = VALUES(wp_post_id),
            category_slug  = VALUES(category_slug),
            category_label = VALUES(category_label),
            title          = VALUES(title),
            target_url     = VALUES(target_url),
            image_url      = VALUES(image_url),
            excerpt_text   = VALUES(excerpt_text),
            content_plain  = VALUES(content_plain),
            published_at   = VALUES(published_at),
            is_active      = 1
    ");

    foreach ($sites as $siteKey => $siteConf) {
        $wpApiUrl = trim($siteConf['wp_api_url'] ?? '');
        if (empty($wpApiUrl)) continue;

        $maxPages = $quickSyncOnly ? 1 : max(1, (int)($siteConf['sync_pages'] ?? 3));
        $perPage  = $quickSyncOnly ? 20 : max(1, min(100, (int)($siteConf['per_page'] ?? 50)));

        $syncedCount = 0;
        $errors = [];

        for ($page = 1; $page <= $maxPages; $page++) {
            $res = fetchWpPostsPage($wpApiUrl, $page, $perPage);
            if (!$res['ok']) {
                // Hết trang hoặc lỗi
                if ($page === 1) {
                    $errors[] = "Page {$page}: " . $res['error'];
                }
                break;
            }

            $posts = $res['posts'];
            if (empty($posts)) break;

            foreach ($posts as $post) {
                $wpId = (int)($post['id'] ?? 0);
                $slug = trim($post['slug'] ?? '');
                $link = trim($post['link'] ?? '');
                $title = html_entity_decode(strip_tags($post['title']['rendered'] ?? ''), ENT_QUOTES | ENT_HTML5, 'UTF-8');
                $title = trim($title);

                if (empty($slug) || empty($link) || empty($title)) continue;

                // Category đầu tiên từ _embedded['wp:term'][0]
                $catSlug  = 'general';
                $catLabel = 'Tổng Hợp';
                if (!empty($post['_embedded']['wp:term'][0][0])) {
                    $firstTerm = $post['_embedded']['wp:term'][0][0];
                    $catSlug   = trim($firstTerm['slug'] ?? 'general');
                    $catLabel  = html_entity_decode(trim($firstTerm['name'] ?? 'Tổng Hợp'), ENT_QUOTES | ENT_HTML5, 'UTF-8');
                }

                // Ảnh đại diện (Featured Media)
                $imageUrl = '';
                if (!empty($post['_embedded']['wp:featuredmedia'][0]['source_url'])) {
                    $imageUrl = trim($post['_embedded']['wp:featuredmedia'][0]['source_url']);
                }

                $excerptPlain = cleanWpHtmlToText($post['excerpt']['rendered'] ?? '', 600);
                $contentPlain = cleanWpHtmlToText($post['content']['rendered'] ?? '', 7500);
                $publishedAt  = !empty($post['date']) ? date('Y-m-d H:i:s', strtotime($post['date'])) : null;

                $upsertStmt->execute([
                    ':site'      => $siteKey,
                    ':wp_id'     => $wpId,
                    ':cat_slug'  => mb_substr($catSlug, 0, 100, 'UTF-8'),
                    ':cat_label' => mb_substr($catLabel, 0, 150, 'UTF-8'),
                    ':slug'      => mb_substr($slug, 0, 191, 'UTF-8'),
                    ':title'     => mb_substr($title, 0, 500, 'UTF-8'),
                    ':url'       => mb_substr($link, 0, 500, 'UTF-8'),
                    ':img'       => mb_substr($imageUrl, 0, 700, 'UTF-8'),
                    ':excerpt'   => $excerptPlain,
                    ':content'   => $contentPlain,
                    ':pub_at'    => $publishedAt
                ]);
                $syncedCount++;
            }

            if (count($posts) < $perPage) {
                break; // Đã tới trang cuối
            }
        }

        $summary[$siteKey] = [
            'synced' => $syncedCount,
            'errors' => $errors
        ];
    }

    return [
        'success' => true,
        'sites'   => $summary
    ];
}

// Cho phép chạy trực tiếp qua CLI hoặc HTTP (?token=...)
if (realpath(__FILE__) === realpath($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    date_default_timezone_set('Asia/Ho_Chi_Minh');
    $isCli = (php_sapi_name() === 'cli' || defined('STDIN'));
    $config = getVneConfig();

    if (!$isCli) {
        header('Content-Type: application/json; charset=utf-8');
        $cronSecret = trim($config['security']['cron_secret'] ?? '');
        $provided   = $_GET['token'] ?? $_POST['token'] ?? '';
        if (empty($cronSecret) || $provided !== $cronSecret) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Sai hoặc thiếu token'], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    $pdo = getDbConnection();
    $quick = !empty($_GET['quick']);
    $result = syncWordPressSites($pdo, $config, $quick);
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
