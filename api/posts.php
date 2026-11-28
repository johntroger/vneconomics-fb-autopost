<?php
/**
 * POSTS & PILLARS REST API (CACHE TTL + KHÔNG TRẢ CONTENT_HTML Ở DANH SÁCH)
 */

require_once __DIR__ . '/core/bootstrap.php';

vneBootstrapApi();
$pdo = getDbConnection();
if (!$pdo) {
    vneJsonError('Không thể kết nối cơ sở dữ liệu.', 503, 'DB_UNAVAILABLE');
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'POST') {
    vneEnforceRateLimit('posts_admin_write', 20, 60);
    $config = getVneConfig();
    $expected = trim((string)($config['security']['admin_token'] ?? ''));
    $provided = trim((string)($_SERVER['HTTP_X_ADMIN_TOKEN'] ?? ''));
    if ($expected === '' || str_starts_with($expected, 'THAY_BANG_')) {
        vneJsonError('Admin Token chưa được cấu hình trong api/config.php.', 503, 'ADMIN_TOKEN_NOT_CONFIGURED');
    }
    if ($provided === '' || !hash_equals($expected, $provided)) {
        vneJsonError('Sai hoặc thiếu header X-Admin-Token.', 403, 'FORBIDDEN');
    }

    $body = vneReadJsonBody();
    $title = vneSanitizePlainText((string)($body['title'] ?? ''), 500);
    $slug = vneSanitizeSlug((string)($body['slug'] ?? ''));
    $tldr = vneSanitizePlainText((string)($body['tldr_summary'] ?? ''), 1000);
    $excerpt = vneSanitizePlainText((string)($body['excerpt'] ?? $tldr), 1000);
    $contentHtml = vneSanitizeHtml((string)($body['content_html'] ?? ''));
    $pillarSlug = vneSanitizeSlug((string)($body['pillar_slug'] ?? 'kinh-te-so'));
    $featuredImage = vneSanitizePlainText((string)($body['featured_image'] ?? ''), 500);
    $readingMinutes = max(1, min(60, (int)($body['reading_minutes'] ?? 4)));

    if ($title === '' || $slug === '' || $contentHtml === '') {
        vneJsonError('Thiếu tiêu đề, slug hoặc nội dung bài viết.', 400, 'INVALID_POST_PAYLOAD');
    }

    $pillarId = 1;
    try {
        $pStmt = $pdo->prepare("SELECT id FROM pillars WHERE slug = :ps LIMIT 1");
        $pStmt->execute([':ps' => $pillarSlug]);
        $pRow = $pStmt->fetch();
        if ($pRow && !empty($pRow['id'])) {
            $pillarId = (int)$pRow['id'];
        }
    } catch (\Throwable $e) {}

    $wpId = random_int(900000, 999999);
    $stmt = $pdo->prepare(
        "INSERT INTO posts (wp_id, post_type, slug, title, tldr_summary, excerpt, content_html, pillar_id, author_id, featured_image, seo_title, seo_desc, status, reading_minutes, published_at)
         VALUES (:wpid, 'post', :slug, :title, :tldr, :excerpt, :html, :pid, 1, :img, :seot, :seod, 'published', :mins, NOW())
         ON DUPLICATE KEY UPDATE
           title = VALUES(title),
           tldr_summary = VALUES(tldr_summary),
           excerpt = VALUES(excerpt),
           content_html = VALUES(content_html),
           pillar_id = VALUES(pillar_id),
           featured_image = VALUES(featured_image),
           seo_title = VALUES(seo_title),
           seo_desc = VALUES(seo_desc),
           reading_minutes = VALUES(reading_minutes),
           status = 'published'"
    );
    $stmt->execute([
        ':wpid' => $wpId,
        ':slug' => $slug,
        ':title' => $title,
        ':tldr' => $tldr ?: mb_substr(strip_tags($contentHtml), 0, 220, 'UTF-8'),
        ':excerpt' => $excerpt ?: mb_substr(strip_tags($contentHtml), 0, 220, 'UTF-8'),
        ':html' => $contentHtml,
        ':pid' => $pillarId,
        ':img' => $featuredImage ?: '/logo-vneconomics.png',
        ':seot' => "{$title} | VNEconomics",
        ':seod' => mb_substr($tldr ?: strip_tags($contentHtml), 0, 240, 'UTF-8'),
        ':mins' => $readingMinutes,
    ]);

    vneCacheInvalidatePrefix('posts_list_');
    vneCacheInvalidatePrefix("post_detail_{$slug}");
    vneJsonSuccess(['published' => true, 'slug' => $slug, 'url' => "https://vneconomics.com/{$slug}/"], 201);
}

$slug = isset($_GET['slug']) ? vneSanitizeSlug((string)$_GET['slug']) : '';

if ($slug !== '') {
    $cacheKey = "post_detail_{$slug}";
    $post = vneCacheGetOrBuild($cacheKey, 300, static function () use ($pdo, $slug) {
        $stmt = $pdo->prepare(
            "SELECT p.id, p.wp_id, p.post_type, p.slug, p.title, p.tldr_summary, p.excerpt, p.content_html,
                    p.faq_json, p.citations_json, p.featured_image, p.seo_title, p.seo_desc,
                    p.reading_minutes, p.views, p.published_at, p.updated_at,
                    pl.slug AS pillar_slug, pl.name AS pillar_name,
                    u.display_name AS author_name, u.slug AS author_slug
             FROM posts p
             LEFT JOIN pillars pl ON p.pillar_id = pl.id
             LEFT JOIN users u ON p.author_id = u.id
             WHERE p.slug = :slug AND p.status = 'published'
             LIMIT 1"
        );
        $stmt->execute([':slug' => $slug]);
        return $stmt->fetch() ?: null;
    });

    if (!$post) {
        vneJsonError('Không tìm thấy bài viết.', 404, 'NOT_FOUND');
    }

    if (!empty($post['id'])) {
        vneBufferPostView($pdo, (int)$post['id']);
    }
    vneJsonSuccess($post);
}

$pillar = isset($_GET['pillar']) ? vneSanitizeSlug((string)$_GET['pillar']) : '';
$page = max(1, (int)($_GET['page'] ?? 1));
$limit = min(50, max(1, (int)($_GET['limit'] ?? 12)));
$withContent = !empty($_GET['with_content']);
$offset = ($page - 1) * $limit;

$cacheKey = 'posts_list_' . ($withContent ? 'full_' : '') . "{$pillar}_{$page}_{$limit}";
$cached = vneCacheGet($cacheKey, 180);
if ($cached !== null) {
    vneJsonSuccess($cached['items'], 200, $cached['meta']);
}

$where = "p.status = 'published' AND p.post_type = 'post'";
$params = [];
if ($pillar !== '') {
    $where .= " AND pl.slug = :pillar";
    $params[':pillar'] = $pillar;
}

$countStmt = $pdo->prepare("SELECT COUNT(*) FROM posts p LEFT JOIN pillars pl ON p.pillar_id = pl.id WHERE {$where}");
$countStmt->execute($params);
$total = (int)$countStmt->fetchColumn();

$contentCol = $withContent ? ', p.content_html' : '';
$sql = "SELECT p.id, p.wp_id, p.slug, p.title, p.tldr_summary, p.excerpt{$contentCol}, p.featured_image,
               p.reading_minutes, p.views, p.published_at,
               pl.slug AS pillar_slug, pl.name AS pillar_name, pl.short_label AS pillar_label
        FROM posts p
        LEFT JOIN pillars pl ON p.pillar_id = pl.id
        WHERE {$where}
        ORDER BY p.published_at DESC
        LIMIT {$limit} OFFSET {$offset}";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$items = $stmt->fetchAll();

$meta = [
    'page'        => $page,
    'limit'       => $limit,
    'total'       => $total,
    'total_pages' => (int)ceil($total / $limit),
];

vneCacheSet($cacheKey, ['items' => $items, 'meta' => $meta]);
vneJsonSuccess($items, 200, $meta);
