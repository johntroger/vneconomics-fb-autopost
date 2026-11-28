<?php
/**
 * DYNAMIC XML SITEMAP INDEX & SUB-SITEMAPS (YOAST COMPATIBLE)
 */

require_once __DIR__ . '/core/bootstrap.php';

header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: public, max-age=1800');

$baseUrl = 'https://vneconomics.com';
$type = $_GET['type'] ?? '';
$pdo = getDbConnection();

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";

if ($type === '') {
    $types = ['post', 'product', 'course', 'glossary', 'market', 'pages'];
    echo '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
    foreach ($types as $t) {
        echo "  <sitemap><loc>{$baseUrl}/{$t}-sitemap.xml</loc><lastmod>" . gmdate('c') . "</lastmod></sitemap>\n";
    }
    echo '</sitemapindex>';
    exit;
}

echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

if ($type === 'market') {
    $marketPaths = [
        '/thi-truong/',
        '/du-bao/',
        '/gia-vang/',
        '/gia-crypto/',
        '/ty-gia-ngoai-te/',
        '/lai-suat-ngan-hang/',
        '/lai-suat-vay-ngan-hang/',
        '/gia-chung-khoan/',
        '/thi-truong/vi-mo-hang-hoa/',
        '/thi-truong/defi-onchain/',
    ];
    foreach ($marketPaths as $p) {
        echo "  <url><loc>{$baseUrl}{$p}</loc><changefreq>hourly</changefreq><priority>0.9</priority></url>\n";
    }
} elseif ($type === 'pages') {
    $corePaths = [
        '/',
        '/kinh-te-so/',
        '/blockchain-tai-san-so/',
        '/ai-cong-nghe/',
        '/digital-marketing/',
        '/nghien-cuu-khoa-hoc/',
        '/thu-vien-sach/',
        '/ai-skills/',
        '/hoc-vien/',
        '/luyen-tap/',
        '/tu-dien/',
        '/ai-lab/',
        '/tin-quoc-te/',
        '/learn-and-earn/',
        '/mo-phong/san-crypto/',
        '/mo-phong/san-chung-khoan/',
        '/mo-phong/san-hang-hoa/',
        '/mo-phong/san-ngoai-hoi/',
        '/mo-phong/san-tin-chi-carbon/',
        '/mo-phong/defi-lab/',
        '/mo-phong/dao-drep/',
        '/cardano-hub/',
    ];
    foreach ($corePaths as $p) {
        echo "  <url><loc>{$baseUrl}{$p}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>\n";
    }
} elseif ($pdo) {
    if ($type === 'post') {
        $rows = $pdo->query("SELECT slug, updated_at FROM posts WHERE status = 'published' ORDER BY published_at DESC")->fetchAll();
        foreach ($rows as $r) {
            echo "  <url><loc>{$baseUrl}/{$r['slug']}/</loc><lastmod>" . gmdate('c', strtotime($r['updated_at'])) . "</lastmod></url>\n";
        }
    } elseif ($type === 'product') {
        $rows = $pdo->query("SELECT slug, updated_at FROM products WHERE status = 'published' ORDER BY id DESC")->fetchAll();
        foreach ($rows as $r) {
            echo "  <url><loc>{$baseUrl}/product/{$r['slug']}/</loc><lastmod>" . gmdate('c', strtotime($r['updated_at'])) . "</lastmod></url>\n";
        }
    } elseif ($type === 'course') {
        $rows = $pdo->query("SELECT slug, updated_at FROM courses WHERE status = 'published' ORDER BY id DESC")->fetchAll();
        foreach ($rows as $r) {
            echo "  <url><loc>{$baseUrl}/course/{$r['slug']}/</loc><lastmod>" . gmdate('c', strtotime($r['updated_at'])) . "</lastmod></url>\n";
        }
    } elseif ($type === 'glossary') {
        $rows = $pdo->query("SELECT slug, updated_at FROM glossary_terms ORDER BY id ASC")->fetchAll();
        foreach ($rows as $r) {
            echo "  <url><loc>{$baseUrl}/tu-dien/{$r['slug']}/</loc><lastmod>" . gmdate('c', strtotime($r['updated_at'])) . "</lastmod></url>\n";
        }
    }
}

echo '</urlset>';
