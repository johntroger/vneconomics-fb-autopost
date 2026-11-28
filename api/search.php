<?php
/**
 * FULL-TEXT SEARCH & MINI-RAG CONTEXT ENDPOINT (?format=context)
 */

require_once __DIR__ . '/core/bootstrap.php';

vneBootstrapApi();
vneEnforceRateLimit('search', 60, 60);

$q = vneSanitizePlainText((string)($_GET['q'] ?? ''), 120);
if (mb_strlen($q, 'UTF-8') < 2) {
    vneJsonSuccess([]);
}

$pdo = getDbConnection();
if (!$pdo) {
    vneJsonError('Không thể kết nối cơ sở dữ liệu.', 503, 'DB_UNAVAILABLE');
}

$limit = min(12, max(1, (int)($_GET['limit'] ?? 6)));
$format = $_GET['format'] ?? 'default';

$stmt = $pdo->prepare(
    "SELECT slug, title, tldr_summary, excerpt,
            MATCH(title, tldr_summary, content_html) AGAINST(:q IN NATURAL LANGUAGE MODE) AS relevance
     FROM posts
     WHERE status = 'published'
       AND MATCH(title, tldr_summary, content_html) AGAINST(:q2 IN NATURAL LANGUAGE MODE)
     ORDER BY relevance DESC
     LIMIT {$limit}"
);
$stmt->execute([':q' => $q, ':q2' => $q]);
$posts = $stmt->fetchAll();

if ($format === 'context') {
    $ctx = array_map(static fn($r) => [
        'kind'    => 'post',
        'title'   => $r['title'],
        'url'     => '/' . $r['slug'] . '/',
        'snippet' => $r['tldr_summary'] ?: $r['excerpt'],
    ], $posts);
    vneJsonSuccess($ctx);
}

vneJsonSuccess($posts);
