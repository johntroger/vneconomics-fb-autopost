<?php
/**
 * FULL PHP SSR / PRERENDER ENGINE CHO SEARCH BOT & AI CRAWLERS
 * Phục vụ Googlebot, Bingbot, GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot, Facebook/Zalo.
 * Bắt buộc gửi Vary: User-Agent để không cache nhầm với bản SPA của người dùng.
 */

require_once __DIR__ . '/core/bootstrap.php';

$baseUrl = 'https://vneconomics.com';
$rawRoute = trim((string)($_GET['route'] ?? ''), '/');
$cleanPath = '/' . ($rawRoute !== '' ? $rawRoute . '/' : '');

header('Content-Type: text/html; charset=utf-8');
header('Vary: User-Agent');
header('X-LiteSpeed-Cache-Control: no-cache');
header('Cache-Control: public, max-age=1800');

$pdo = getDbConnection();

// 1. Kiểm tra bảng 301 Redirects trước
if ($pdo && $rawRoute !== '') {
    try {
        $rStmt = $pdo->prepare("SELECT id, target_url, http_code FROM redirects WHERE source_path = :p AND is_active = 1 LIMIT 1");
        $rStmt->execute([':p' => $cleanPath]);
        $redir = $rStmt->fetch();
        if ($redir) {
            $pdo->prepare("UPDATE redirects SET hit_count = hit_count + 1 WHERE id = :id")->execute([':id' => $redir['id']]);
            $target = str_starts_with($redir['target_url'], 'http') ? $redir['target_url'] : ($baseUrl . $redir['target_url']);
            header("Location: {$target}", true, (int)$redir['http_code'] ?: 301);
            exit;
        }
    } catch (\Throwable $e) {}
}

$title = 'VNEconomics — Kinh tế số, Tài sản số, AI & Chuyển đổi số';
$desc = 'Chuyên trang Kinh tế số, Tài sản số, Trí tuệ nhân tạo, Digital Marketing & Nghiên cứu khoa học tại Việt Nam.';
$canonical = $baseUrl . $cleanPath;
$ogImage = $baseUrl . '/logo-vneconomics.png';
$bodyHtml = '';
$schemas = [];

if ($pdo) {
    $segments = $rawRoute === '' ? [] : explode('/', $rawRoute);

    // 2. Chi tiết Sản phẩm (/product/<slug>/)
    if (count($segments) >= 2 && $segments[0] === 'product') {
        $slug = vneSanitizeSlug($segments[1]);
        $stmt = $pdo->prepare("SELECT * FROM products WHERE slug = :s AND status = 'published' LIMIT 1");
        $stmt->execute([':s' => $slug]);
        $item = $stmt->fetch();
        if ($item) {
            $title = $item['title'] . ' | Thư viện VNEconomics';
            $desc = $item['short_description'] ?: $desc;
            if (!empty($item['cover_image'])) {
                $ogImage = str_starts_with($item['cover_image'], 'http') ? $item['cover_image'] : $baseUrl . $item['cover_image'];
            }
            $bodyHtml = '<article><h1>' . htmlspecialchars($item['title'], ENT_QUOTES, 'UTF-8') . '</h1>'
                . '<p>' . htmlspecialchars($desc, ENT_QUOTES, 'UTF-8') . '</p>'
                . vneSanitizeHtml((string)$item['description_html']) . '</article>';
            $schemas[] = [
                '@context'    => 'https://schema.org',
                '@type'       => 'Book',
                'name'        => $item['title'],
                'description' => $desc,
                'url'         => $canonical,
                'offers'      => ['@type' => 'Offer', 'price' => '0', 'priceCurrency' => 'VND'],
            ];
        }
    }
    // 3. Chi tiết Khóa học (/course/<slug>/)
    elseif (count($segments) >= 2 && $segments[0] === 'course') {
        $slug = vneSanitizeSlug($segments[1]);
        $stmt = $pdo->prepare("SELECT * FROM courses WHERE slug = :s AND status = 'published' LIMIT 1");
        $stmt->execute([':s' => $slug]);
        $course = $stmt->fetch();
        if ($course) {
            $title = $course['title'] . ' | Học viện VNEconomics';
            $bodyHtml = '<article><h1>' . htmlspecialchars($course['title'], ENT_QUOTES, 'UTF-8') . '</h1>'
                . vneSanitizeHtml((string)$course['description_html']) . '</article>';
            $schemas[] = [
                '@context' => 'https://schema.org',
                '@type'    => 'Course',
                'name'     => $course['title'],
                'provider' => ['@type' => 'Organization', 'name' => 'VNEconomics'],
            ];
        }
    }
    // 4. Chi tiết Từ điển AEO (/tu-dien/<slug>/)
    elseif (count($segments) >= 2 && $segments[0] === 'tu-dien') {
        $slug = vneSanitizeSlug($segments[1]);
        $stmt = $pdo->prepare("SELECT * FROM glossary_terms WHERE slug = :s LIMIT 1");
        $stmt->execute([':s' => $slug]);
        $term = $stmt->fetch();
        if ($term) {
            $title = $term['term'] . ' là gì? | Từ điển VNEconomics';
            $desc = $term['short_definition'];
            $bodyHtml = '<article><h1>' . htmlspecialchars($term['term'], ENT_QUOTES, 'UTF-8') . ' là gì?</h1>'
                . '<p><strong>' . htmlspecialchars($term['short_definition'], ENT_QUOTES, 'UTF-8') . '</strong></p>'
                . vneSanitizeHtml((string)$term['full_explanation']) . '</article>';
            $schemas[] = [
                '@context'         => 'https://schema.org',
                '@type'            => 'DefinedTerm',
                'name'             => $term['term'],
                'description'      => $term['short_definition'],
                'inDefinedTermSet' => $baseUrl . '/tu-dien/',
            ];
        }
    }
    // 4b. Sàn AI Skills (/ai-skills/ và /ai-skills/<slug>/)
    elseif (count($segments) >= 1 && $segments[0] === 'ai-skills') {
        $skillSlug = count($segments) >= 2 ? vneSanitizeSlug($segments[1]) : '';
        $title = $skillSlug !== ''
            ? ucwords(str_replace('-', ' ', $skillSlug)) . ' | Sàn AI Skills VNEconomics'
            : 'Sàn AI Skills cho AI Agents | VNEconomics';
        $desc = 'Kho AI Skills chuẩn học thuật & thực chiến dành cho Claude, Gemini, Cursor & AI Agents tại VNEconomics (mở khóa bằng 10 VNE Points, 0đ tiền thật).';
        $schemas[] = [
            '@context'            => 'https://schema.org',
            '@type'               => 'SoftwareApplication',
            'name'                => $title,
            'applicationCategory' => 'EducationalApplication',
            'operatingSystem'     => 'Web',
            'offers'              => ['@type' => 'Offer', 'price' => '0', 'priceCurrency' => 'VND'],
        ];
    }
    // 4c. Hồ sơ Công khai cá nhân (/u/<handle>)
    elseif (count($segments) >= 2 && $segments[0] === 'u') {
        $handle = strtolower(preg_replace('/[^a-z0-9_-]/i', '', $segments[1]));
        $profileRow = null;
        try {
            $pStmt = $pdo->prepare("SELECT * FROM vne_public_profiles WHERE original_handle = :h1 OR custom_handle = :h2 LIMIT 1");
            $pStmt->execute([':h1' => $handle, ':h2' => $handle]);
            $profileRow = $pStmt->fetch() ?: null;
        } catch (\Throwable $e) {}
        if ($profileRow) {
            $title = 'Hồ sơ ' . $profileRow['display_name'] . ' (@' . $profileRow['custom_handle'] . ') | VNEconomics';
            $desc = $profileRow['bio'] ?: $desc;
            if (!empty($profileRow['avatar_url'])) {
                $ogImage = str_starts_with($profileRow['avatar_url'], 'http') ? $profileRow['avatar_url'] : $baseUrl . $profileRow['avatar_url'];
            }
            $schemas[] = [
                '@context' => 'https://schema.org',
                '@type'    => 'Person',
                'name'     => $profileRow['display_name'],
                'url'      => $baseUrl . '/' . $profileRow['custom_handle'],
                'description' => $desc,
            ];
        }
    }
    // 5. Bài viết / Trang tĩnh / Hồ sơ Công khai (/<slug>/)
    elseif (count($segments) === 1) {
        $slug = vneSanitizeSlug($segments[0]);
        $stmt = $pdo->prepare(
            "SELECT p.*, u.display_name AS author_name FROM posts p LEFT JOIN users u ON p.author_id = u.id WHERE p.slug = :s AND p.status = 'published' LIMIT 1"
        );
        $stmt->execute([':s' => $slug]);
        $post = $stmt->fetch();
        if ($post) {
            $title = $post['seo_title'] ?: ($post['title'] . ' | VNEconomics');
            $desc = $post['seo_desc'] ?: ($post['tldr_summary'] ?: $desc);
            if (!empty($post['featured_image'])) {
                $ogImage = str_starts_with($post['featured_image'], 'http') ? $post['featured_image'] : $baseUrl . $post['featured_image'];
            }
            $tldr = !empty($post['tldr_summary'])
                ? '<section aria-label="Tóm tắt cốt lõi"><h2>Tóm tắt cốt lõi</h2><p>' . htmlspecialchars($post['tldr_summary'], ENT_QUOTES, 'UTF-8') . '</p></section>'
                : '';
            $bodyHtml = '<article><h1>' . htmlspecialchars($post['title'], ENT_QUOTES, 'UTF-8') . '</h1>'
                . $tldr . vneSanitizeHtml((string)$post['content_html']) . '</article>';

            $schemas[] = [
                '@context'      => 'https://schema.org',
                '@type'         => 'Article',
                'headline'      => $post['title'],
                'description'   => $desc,
                'datePublished' => $post['published_at'],
                'dateModified'  => $post['updated_at'],
                'author'        => ['@type' => 'Person', 'name' => $post['author_name'] ?: 'Ban Biên Tập VNEconomics'],
                'publisher'     => ['@type' => 'Organization', 'name' => 'VNEconomics'],
            ];

            if (!empty($post['faq_json'])) {
                $faqs = json_decode((string)$post['faq_json'], true);
                if (is_array($faqs) && !empty($faqs)) {
                    $mainEntity = array_map(static fn($f) => [
                        '@type'          => 'Question',
                        'name'           => $f['q'] ?? '',
                        'acceptedAnswer' => ['@type' => 'Answer', 'text' => $f['a'] ?? ''],
                    ], $faqs);
                    $schemas[] = ['@context' => 'https://schema.org', '@type' => 'FAQPage', 'mainEntity' => $mainEntity];
                }
            }
        } else {
            // Kiểm tra Hồ sơ công khai cá nhân ở root (/<custom_handle>)
            $profileRow = null;
            $cleanHandle = strtolower(preg_replace('/[^a-z0-9_-]/i', '', ltrim($segments[0], '@')));
            if ($cleanHandle !== '') {
                try {
                    $pStmt = $pdo->prepare("SELECT * FROM vne_public_profiles WHERE original_handle = :h1 OR custom_handle = :h2 LIMIT 1");
                    $pStmt->execute([':h1' => $cleanHandle, ':h2' => $cleanHandle]);
                    $profileRow = $pStmt->fetch() ?: null;
                } catch (\Throwable $e) {}
            }

            $knownRoutes = [
                'kinh-te-so', 'blockchain-tai-san-so', 'ai-cong-nghe', 'digital-marketing', 'nghien-cuu-khoa-hoc',
                'thu-vien-sach', 'tu-sach-cua-toi', 'hoc-vien', 'tu-dien', 'thi-truong', 'du-bao', 'mo-phong', 'tin-quoc-te',
                'learn-and-earn', 'luyen-tap', 'tai-khoan', 'cardano-hub', 'ai-lab', 'ai-skills',
                've-chung-toi', 'contact', 'hop-tac-dang-bai', 'bao-gia-quang-cao', 'terms-of-use', 'privacy-and-cookie-policy',
            ];

            if ($profileRow) {
                $title = 'Hồ sơ ' . $profileRow['display_name'] . ' (@' . $profileRow['custom_handle'] . ') | VNEconomics';
                $desc = $profileRow['bio'] ?: $desc;
                if (!empty($profileRow['avatar_url'])) {
                    $ogImage = str_starts_with($profileRow['avatar_url'], 'http') ? $profileRow['avatar_url'] : $baseUrl . $profileRow['avatar_url'];
                }
                $schemas[] = [
                    '@context'    => 'https://schema.org',
                    '@type'       => 'Person',
                    'name'        => $profileRow['display_name'],
                    'url'         => $baseUrl . '/' . $profileRow['custom_handle'],
                    'description' => $desc,
                ];
            } elseif (!in_array($slug, $knownRoutes, true)) {
                try {
                    $pdo->prepare("INSERT INTO not_found_logs (request_path, user_agent) VALUES (:p, :ua) ON DUPLICATE KEY UPDATE hit_count = hit_count + 1")
                        ->execute([':p' => $cleanPath, ':ua' => substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 250)]);
                } catch (\Throwable $e) {}
                http_response_code(404);
            }
        }
    }
}

$safeTitle = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
$safeDesc = htmlspecialchars(mb_substr(strip_tags($desc), 0, 300, 'UTF-8'), ENT_QUOTES, 'UTF-8');
$safeCanonical = htmlspecialchars($canonical, ENT_QUOTES, 'UTF-8');
$safeOgImg = htmlspecialchars($ogImage, ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title><?php echo $safeTitle; ?></title>
  <meta name="description" content="<?php echo $safeDesc; ?>">
  <link rel="canonical" href="<?php echo $safeCanonical; ?>">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="VNEconomics">
  <meta property="og:url" content="<?php echo $safeCanonical; ?>">
  <meta property="og:title" content="<?php echo $safeTitle; ?>">
  <meta property="og:description" content="<?php echo $safeDesc; ?>">
  <meta property="og:image" content="<?php echo $safeOgImg; ?>">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <?php foreach ($schemas as $sc): ?>
  <script type="application/ld+json"><?php echo json_encode($sc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?></script>
  <?php endforeach; ?>
</head>
<body>
  <main><?php echo $bodyHtml ?: "<h1>{$safeTitle}</h1><p>{$safeDesc}</p>"; ?></main>
</body>
</html>
