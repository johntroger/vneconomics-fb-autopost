<?php
/**
 * CẦU NỐI ĐỒNG BỘ BÀI VIẾT TỪ MYSQL MỚI VÀO HÀNG ĐỢI FACEBOOK/TELEGRAM AUTOPOST
 * Giữ nguyên cron_fb_autopost.php & wp_sync.php (cho marketing2student.com),
 * chỉ bổ sung nguồn đọc trực tiếp từ bảng `posts` của VNEconomics v2.
 */

defined('VNE_APP') or define('VNE_APP', true);
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/core/sanitizer.php';

function syncVneconomicsLocalPostsToAutopostQueue(PDO $pdo, int $limit = 100): array {
    $stmt = $pdo->prepare(
        "SELECT p.wp_id, p.id, p.slug, p.title, p.tldr_summary, p.content_html, p.featured_image, p.published_at,
                pl.name AS pillar_name
         FROM posts p
         LEFT JOIN pillars pl ON p.pillar_id = pl.id
         WHERE p.status = 'published' AND p.post_type = 'post'
         ORDER BY p.published_at DESC
         LIMIT {$limit}"
    );
    $stmt->execute();
    $rows = $stmt->fetchAll();

    $ins = $pdo->prepare(
        "INSERT INTO social_post_queue
            (source_site, wp_post_id, post_url, title, category_name, excerpt, content_text, featured_image_url, wp_published_at)
         VALUES
            ('vneconomics', :wp_id, :url, :title, :cat, :excerpt, :content_text, :img, :pub)
         ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            category_name = VALUES(category_name),
            excerpt = VALUES(excerpt),
            content_text = VALUES(content_text),
            featured_image_url = VALUES(featured_image_url)"
    );

    $synced = 0;
    foreach ($rows as $row) {
        $wpId = (int)($row['wp_id'] ?: (900000 + (int)$row['id']));
        $url = 'https://vneconomics.com/' . $row['slug'] . '/';
        $plain = vneSanitizePlainText((string)$row['content_html'], 6000);
        $img = $row['featured_image']
            ? (str_starts_with($row['featured_image'], 'http') ? $row['featured_image'] : 'https://vneconomics.com' . $row['featured_image'])
            : '';

        $ins->execute([
            ':wp_id'        => $wpId,
            ':url'          => $url,
            ':title'        => $row['title'],
            ':cat'          => $row['pillar_name'] ?: 'Kinh tế số',
            ':excerpt'      => $row['tldr_summary'] ?: mb_substr($plain, 0, 300, 'UTF-8'),
            ':content_text' => $plain,
            ':img'          => $img,
            ':pub'          => $row['published_at'],
        ]);
        $synced++;
    }

    return ['ok' => true, 'synced' => $synced];
}

if (php_sapi_name() === 'cli' || basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'local_autopost_sync.php') {
    $pdo = getDbConnection();
    if (!$pdo) {
        fwrite(STDERR, "DB connection unavailable.\n");
        exit(1);
    }
    $res = syncVneconomicsLocalPostsToAutopostQueue($pdo);
    echo json_encode($res, JSON_UNESCAPED_UNICODE) . "\n";
}
