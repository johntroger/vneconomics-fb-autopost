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
$offset = ($page - 1) * $limit;

$cacheKey = "posts_list_{$pillar}_{$page}_{$limit}";
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

$sql = "SELECT p.id, p.slug, p.title, p.tldr_summary, p.excerpt, p.featured_image,
               p.reading_minutes, p.views, p.published_at,
               pl.slug AS pillar_slug, pl.short_label AS pillar_label
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
