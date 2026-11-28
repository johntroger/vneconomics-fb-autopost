<?php
/**
 * TỪ ĐIỂN THUẬT NGỮ AEO REST API (219+ THUẬT NGỮ)
 */

require_once __DIR__ . '/core/bootstrap.php';

vneBootstrapApi();
$pdo = getDbConnection();
if (!$pdo) {
    vneJsonError('Không thể kết nối cơ sở dữ liệu.', 503, 'DB_UNAVAILABLE');
}

$slug = isset($_GET['slug']) ? vneSanitizeSlug((string)$_GET['slug']) : '';
if ($slug !== '') {
    $cached = vneCacheGet("glossary_{$slug}", 600);
    if ($cached !== null) vneJsonSuccess($cached);

    $stmt = $pdo->prepare("SELECT * FROM glossary_terms WHERE slug = :slug LIMIT 1");
    $stmt->execute([':slug' => $slug]);
    $term = $stmt->fetch();
    if (!$term) vneJsonError('Không tìm thấy thuật ngữ.', 404, 'NOT_FOUND');

    vneCacheSet("glossary_{$slug}", $term);
    vneJsonSuccess($term);
}

$cachedList = vneCacheGet('glossary_all', 600);
if ($cachedList !== null) vneJsonSuccess($cachedList);

$rows = $pdo->query("SELECT id, slug, term, short_definition, source_label FROM glossary_terms ORDER BY term ASC")->fetchAll();
vneCacheSet('glossary_all', $rows);
vneJsonSuccess($rows);
