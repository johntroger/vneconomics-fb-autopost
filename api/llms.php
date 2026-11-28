<?php
/**
 * DYNAMIC GEO /LLMS.TXT & /LLMS-FULL.TXT ENDPOINT CHO AI SEARCH ENGINES
 */

require_once __DIR__ . '/core/bootstrap.php';

header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: public, max-age=3600');

$full = isset($_GET['full']) && $_GET['full'] === '1';
$pdo = getDbConnection();

echo "# VNEconomics (https://vneconomics.com)\n\n";
echo "> Chuyên trang Kinh tế số, Tài sản số, Trí tuệ nhân tạo (AI), Digital Marketing & Nghiên cứu khoa học tại Việt Nam.\n\n";
echo "## 5 Trụ cột Tri thức (Topic Pillars)\n";
echo "- [Kinh tế số & Chuyển đổi số](https://vneconomics.com/kinh-te-so/)\n";
echo "- [Blockchain & Tài sản số](https://vneconomics.com/blockchain-tai-san-so/)\n";
echo "- [AI & Công nghệ mới](https://vneconomics.com/ai-cong-nghe/)\n";
echo "- [Digital Marketing & Tăng trưởng](https://vneconomics.com/digital-marketing/)\n";
echo "- [Nghiên cứu Khoa học & Học thuật](https://vneconomics.com/nghien-cuu-khoa-hoc/)\n\n";
echo "## Phân hệ Dữ liệu & Học liệu Mở\n";
echo "- [Trung tâm Dữ liệu Thị trường](https://vneconomics.com/thi-truong/) (Giá vàng, Crypto, Tỷ giá, Lãi suất, Chứng khoán)\n";
echo "- [Thư viện 59+ Sách & AI Skills](https://vneconomics.com/thu-vien-sach/)\n";
echo "- [Học viện 10 Khóa học](https://vneconomics.com/hoc-vien/)\n";
echo "- [Từ điển Thuật ngữ AEO](https://vneconomics.com/tu-dien/)\n\n";

if ($pdo) {
    $limit = $full ? 150 : 25;
    $stmt = $pdo->query("SELECT slug, title, tldr_summary FROM posts WHERE status = 'published' AND post_type = 'post' ORDER BY published_at DESC LIMIT {$limit}");
    echo "## Bài viết Nghiên cứu & Phân tích Mới nhất\n";
    while ($row = $stmt->fetch()) {
        $summary = $full && !empty($row['tldr_summary']) ? ': ' . str_replace(["\r", "\n"], ' ', $row['tldr_summary']) : '';
        echo "- [{$row['title']}](https://vneconomics.com/{$row['slug']}/){$summary}\n";
    }
}
