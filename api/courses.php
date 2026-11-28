<?php
declare(strict_types=1);

/**
 * COURSES PAGINATED REST API (SCALABLE FOR 100+ COURSES)
 * Trả danh sách khóa học nhẹ (không kèm description_html nặng) có phân trang + cache 300s,
 * và chi tiết 1 khóa học theo ?slug=...
 */

require_once __DIR__ . '/core/bootstrap.php';

vneBootstrapApi();
$pdo = getDbConnection();
if (!$pdo) {
    vneJsonError('Không thể kết nối cơ sở dữ liệu.', 503, 'DB_UNAVAILABLE');
}

$slug = isset($_GET['slug']) ? vneSanitizeSlug((string)$_GET['slug']) : '';

if ($slug !== '') {
    $cacheKey = "course_detail_{$slug}";
    $cached = vneCacheGet($cacheKey, 300);
    if ($cached !== null) {
        vneJsonSuccess($cached);
    }

    $stmt = $pdo->prepare(
        "SELECT id, wp_id, slug, title, level_label, students_count, cover_image,
                description_html, reward_points, status, created_at
         FROM courses
         WHERE slug = :slug AND status = 'published'
         LIMIT 1"
    );
    $stmt->execute([':slug' => $slug]);
    $course = $stmt->fetch();

    if (!$course) {
        vneJsonError('Không tìm thấy khóa học.', 404, 'NOT_FOUND');
    }

    vneCacheSet($cacheKey, $course);
    vneJsonSuccess($course);
}

$page = max(1, (int)($_GET['page'] ?? 1));
$limit = min(50, max(1, (int)($_GET['limit'] ?? 20)));
$offset = ($page - 1) * $limit;

$cacheKey = "courses_list_{$page}_{$limit}";
$cached = vneCacheGet($cacheKey, 300);
if ($cached !== null) {
    vneJsonSuccess($cached['items'], 200, $cached['meta']);
}

$total = (int)$pdo->query("SELECT COUNT(*) FROM courses WHERE status = 'published'")->fetchColumn();

$stmt = $pdo->prepare(
    "SELECT id, wp_id, slug, title, level_label, students_count, cover_image, reward_points
     FROM courses
     WHERE status = 'published'
     ORDER BY students_count DESC, id DESC
     LIMIT {$limit} OFFSET {$offset}"
);
$stmt->execute();
$items = $stmt->fetchAll();

$meta = [
    'page'        => $page,
    'limit'       => $limit,
    'total'       => $total,
    'total_pages' => (int)ceil($total / $limit),
];

vneCacheSet($cacheKey, ['items' => $items, 'meta' => $meta]);
vneJsonSuccess($items, 200, $meta);
