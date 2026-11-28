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
 * Tải nội dung URL qua cURL
 */
function httpGetRaw(string $url, int $timeout = 20): array {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_USERAGENT, 'VNEconomicsAutopost/1.0 (https://vneconomics.com)');
    $raw = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    return ['ok' => ($httpCode === 200 && !empty($raw)), 'http_code' => $httpCode, 'error' => $err ?: "HTTP {$httpCode}", 'body' => (string)$raw];
}

/**
 * Đọc chuỗi JS bắt đầu tại $quotePos (hỗ trợ "..." và `...`)
 */
function extractJsQuotedValue(string $js, int $quotePos, string $quoteChar): array {
    $len = strlen($js);
    $pos = $quotePos + 1;
    $out = '';

    while ($pos < $len) {
        $ch = $js[$pos];
        if ($ch === '\\' && $pos + 1 < $len) {
            $next = $js[$pos + 1];
            if ($next === 'n') { $out .= "\n"; }
            elseif ($next === 'r') { $out .= "\r"; }
            elseif ($next === 't') { $out .= "\t"; }
            else { $out .= $next; }
            $pos += 2;
            continue;
        }
        if ($ch === $quoteChar) {
            return [$out, $pos + 1];
        }
        $out .= $ch;
        $pos++;
    }
    return [$out, $len];
}

/**
 * Đồng bộ bài viết từ React/Vite bundle (khi site không còn dùng WordPress REST API)
 */
function extractViteBundleArticles(string $baseUrl): array {
    $baseUrl = rtrim($baseUrl, '/');
    $home = httpGetRaw($baseUrl . '/', 15);
    if (!$home['ok']) {
        return ['ok' => false, 'error' => 'Không tải được trang chủ: ' . $home['error'], 'articles' => []];
    }

    if (!preg_match('/(\/assets\/marketing-database-[a-zA-Z0-9_-]+\.js)/', $home['body'], $m)) {
        return ['ok' => false, 'error' => 'Không tìm thấy bundle marketing-database-*.js trong HTML', 'articles' => []];
    }

    $bundleUrl = $baseUrl . $m[1];
    $bundle = httpGetRaw($bundleUrl, 30);
    if (!$bundle['ok']) {
        return ['ok' => false, 'error' => 'Không tải được JS bundle: ' . $bundle['error'], 'articles' => []];
    }

    $js = $bundle['body'];
    $articles = [];
    $offset = 0;

    // Quét tuần tự từng bài viết có dạng {id:...,wpId:...,slug:"..."
    while (preg_match('/\{id:(\d+),wpId:(\d+),slug:"([^"]+)"/', $js, $hdr, PREG_OFFSET_CAPTURE, $offset)) {
        $itemStart = $hdr[0][1];
        $wpId = (int)$hdr[2][0];
        $slug = trim($hdr[3][0]);
        $cursor = $hdr[0][1] + strlen($hdr[0][0]);

        // Tìm vị trí content: của bài viết này
        $contentPos = strpos($js, 'content:', $cursor);
        if ($contentPos === false) break;

        $metaSlice = substr($js, $itemStart, $contentPos - $itemStart);

        $extractStrField = function (string $fieldName) use ($metaSlice): string {
            $needle = $fieldName . ':';
            $p = strpos($metaSlice, $needle);
            if ($p === false) return '';
            $qPos = $p + strlen($needle);
            if ($qPos >= strlen($metaSlice)) return '';
            $qChar = $metaSlice[$qPos];
            if ($qChar !== '"' && $qChar !== '`') return '';
            [$val] = extractJsQuotedValue($metaSlice, $qPos, $qChar);
            return $val;
        };

        $title        = $extractStrField('title');
        $excerpt      = $extractStrField('excerpt');
        $catLabel     = $extractStrField('category');
        $catSlug      = $extractStrField('categorySlug');
        $featuredImg  = $extractStrField('featuredImage');
        $publishedAt  = $extractStrField('publishedAt');

        // Đọc content:`...` hoặc content:"..."
        $cQuotePos = $contentPos + 8; // strlen('content:')
        $cQuoteChar = $js[$cQuotePos] ?? '';
        $contentHtml = '';
        $nextOffset = $cQuotePos + 1;
        if ($cQuoteChar === '`' || $cQuoteChar === '"') {
            [$contentHtml, $nextOffset] = extractJsQuotedValue($js, $cQuotePos, $cQuoteChar);
        }

        if (!empty($slug) && !empty($title)) {
            $articles[] = [
                'wp_id'          => $wpId,
                'slug'           => $slug,
                'title'          => html_entity_decode(strip_tags($title), ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                'link'           => $baseUrl . '/' . ltrim($slug, '/'),
                'category_slug'  => $catSlug ?: 'general',
                'category_label' => $catLabel ?: 'Tổng Hợp',
                'image_url'      => $featuredImg,
                'excerpt_html'   => $excerpt,
                'content_html'   => $contentHtml,
                'published_at'   => !empty($publishedAt) ? date('Y-m-d H:i:s', strtotime($publishedAt)) : null
            ];
        }

        $offset = $nextOffset;
    }

    return ['ok' => !empty($articles), 'error' => empty($articles) ? 'Không parse được bài viết từ bundle' : null, 'articles' => $articles];
}

/**
 * Gọi WP REST API một trang cụ thể
 */
function fetchWpPostsPage(string $wpApiUrl, int $page, int $perPage): array {
    $sep = (strpos($wpApiUrl, '?') !== false) ? '&' : '?';
    $url = "{$wpApiUrl}{$sep}status=publish&per_page={$perPage}&page={$page}&_embed";

    $res = httpGetRaw($url, 20);
    if (!$res['ok']) {
        return ['ok' => false, 'http_code' => $res['http_code'], 'error' => $res['error'], 'posts' => []];
    }

    $decoded = json_decode($res['body'], true);
    if (!is_array($decoded)) {
        return ['ok' => false, 'http_code' => $res['http_code'], 'error' => 'Invalid JSON', 'posts' => []];
    }

    return ['ok' => true, 'http_code' => 200, 'posts' => $decoded];
}

/**
 * Đồng bộ bài viết trực tiếp từ VNEconomics v2 REST API (/api/posts.php?with_content=1)
 */
function fetchVneApiArticles(string $baseUrl, int $perPage = 30): array {
    $baseUrl = rtrim($baseUrl, '/');
    $url = "{$baseUrl}/api/posts.php?limit=" . max(1, min(50, $perPage)) . "&with_content=1";
    $res = httpGetRaw($url, 20);
    if (!$res['ok']) {
        return ['ok' => false, 'error' => $res['error'], 'articles' => []];
    }
    $decoded = json_decode($res['body'], true);
    if (!is_array($decoded) || empty($decoded['ok']) || !is_array($decoded['data'] ?? null)) {
        return ['ok' => false, 'error' => 'Invalid VNE API JSON', 'articles' => []];
    }

    $articles = [];
    foreach ($decoded['data'] as $row) {
        $slug = trim((string)($row['slug'] ?? ''));
        $title = trim((string)($row['title'] ?? ''));
        if ($slug === '' || $title === '') continue;
        $img = trim((string)($row['featured_image'] ?? ''));
        if ($img !== '' && str_starts_with($img, '/')) {
            $img = $baseUrl . $img;
        }
        $articles[] = [
            'wp_id'          => (int)($row['wp_id'] ?? $row['id'] ?? crc32($slug)),
            'category_slug'  => trim((string)($row['pillar_slug'] ?? 'kinh-te-so')),
            'category_label' => trim((string)($row['pillar_name'] ?? $row['pillar_label'] ?? 'Kinh Tế Số')),
            'slug'           => $slug,
            'title'          => $title,
            'link'           => "{$baseUrl}/{$slug}/",
            'image_url'      => $img,
            'excerpt_html'   => (string)($row['tldr_summary'] ?? $row['excerpt'] ?? ''),
            'content_html'   => (string)($row['content_html'] ?? $row['tldr_summary'] ?? ''),
            'published_at'   => !empty($row['published_at']) ? date('Y-m-d H:i:s', strtotime((string)$row['published_at'])) : date('Y-m-d H:i:s'),
        ];
    }

    return ['ok' => !empty($articles), 'error' => empty($articles) ? 'No posts returned' : '', 'articles' => $articles];
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
                // Nếu WP REST API trả HTML/lỗi ở trang 1, ưu tiên đọc từ VNEconomics v2 API (/api/posts.php), rồi mới fallback sang Vite Bundle
                if ($page === 1) {
                    $baseUrl = trim($siteConf['base_url'] ?? '');
                    if (!empty($baseUrl)) {
                        $vneRes = fetchVneApiArticles($baseUrl, $perPage);
                        if (!$vneRes['ok']) {
                            $vneRes = extractViteBundleArticles($baseUrl);
                        }
                        if ($vneRes['ok']) {
                            $items = $quickSyncOnly ? array_slice($vneRes['articles'], 0, 20) : $vneRes['articles'];
                            foreach ($items as $art) {
                                $upsertStmt->execute([
                                    ':site'      => $siteKey,
                                    ':wp_id'     => (int)$art['wp_id'],
                                    ':cat_slug'  => mb_substr($art['category_slug'], 0, 100, 'UTF-8'),
                                    ':cat_label' => mb_substr($art['category_label'], 0, 150, 'UTF-8'),
                                    ':slug'      => mb_substr($art['slug'], 0, 191, 'UTF-8'),
                                    ':title'     => mb_substr($art['title'], 0, 500, 'UTF-8'),
                                    ':url'       => mb_substr($art['link'], 0, 500, 'UTF-8'),
                                    ':img'       => mb_substr($art['image_url'], 0, 700, 'UTF-8'),
                                    ':excerpt'   => cleanWpHtmlToText($art['excerpt_html'], 600),
                                    ':content'   => cleanWpHtmlToText($art['content_html'], 7500),
                                    ':pub_at'    => $art['published_at']
                                ]);
                                $syncedCount++;
                            }
                            break;
                        } else {
                            $errors[] = "WP API ({$res['error']}) & VNE v2/Vite ({$vneRes['error']})";
                            break;
                        }
                    }
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
