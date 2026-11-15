<?php
/**
 * BỘ VIẾT LẠI NỘI DUNG CHUẨN FACEBOOK BẰNG GEMINI API + TEMPLATE CỐ ĐỊNH
 * Dự án: VNEconomics (vneconomics.com & marketing2student.com)
 */

defined('VNE_APP') or die('Truy cập trực tiếp bị từ chối.');

/**
 * Footer chuẩn cố định đã chốt cho Fanpage VNEconomics
 */
function getVneFacebookFooter(): string {
    return "==============================\n"
        . "VNEconomics là một dự án với mục đích chia sẻ những tri thức hữu ích về Kinh tế số và Công nghệ, đặc biệt là những kiến thức về công nghệ Blockchain, AI, & Big Data & ứng dụng của công nghệ trong Kinh tế & Kinh doanh\n"
        . "👉Tham gia cộng đồng của VNEconomics tại:\n"
        . "Website: https://vneconomics.com/\n"
        . "X (Twitter): https://x.com/vneconomics_com\n"
        . "Facebook: https://www.facebook.com/vneconomics/\n"
        . "Telegram: https://t.me/BlockchainDEco\n"
        . "Linked In: https://www.linkedin.com/company/vneconomics/";
}

/**
 * Chọn Badge chuyên mục dựa theo nguồn site và category_slug
 */
function resolveCategoryBadge(string $sourceSite, string $categorySlug, string $categoryLabel): string {
    $slug = strtolower($categorySlug);

    if ($sourceSite === 'marketing2student') {
        if (strpos($slug, 'ai') !== false || strpos($slug, 'digital') !== false || strpos($slug, 'tech') !== false) {
            return '🤖 [AI & DIGITAL MARKETING]';
        }
        return '🎯 [MARKETING THỰC CHIẾN]';
    }

    // Mặc định cho vneconomics
    if (strpos($slug, 'blockchain') !== false || strpos($slug, 'ai') !== false || strpos($slug, 'data') !== false || strpos($slug, 'cong-nghe') !== false) {
        return '⚙️ [CÔNG NGHỆ & VẬN HÀNH]';
    }
    if (strpos($slug, 'case') !== false || strpos($slug, 'quan-tri') !== false || strpos($slug, 'kinh-doanh') !== false) {
        return '💼 [CASE STUDY DOANH NGHIỆP]';
    }
    return '📊 [PHÂN TÍCH KINH TẾ]';
}

/**
 * Chuẩn hóa danh sách hashtag, luôn có #VNEconomics
 */
function normalizeSocialHashtags(string $sourceSite, $hashtags, int $limit = 5): array {
    $cleanTags = ['#VNEconomics'];
    if ($sourceSite === 'marketing2student') {
        $cleanTags[] = '#Marketing2Student';
    }
    if (is_array($hashtags)) {
        foreach ($hashtags as $tag) {
            $tag = preg_replace('/[^a-zA-Z0-9_]/', '', (string)$tag);
            if (!empty($tag) && strcasecmp($tag, 'VNEconomics') !== 0 && strcasecmp($tag, 'Marketing2Student') !== 0) {
                $cleanTags[] = '#' . $tag;
            }
        }
    }
    return array_slice(array_unique($cleanTags), 0, $limit);
}

/**
 * Lắp ráp các phần tử JSON (hoặc fallback) vào Template cố định cho Facebook
 */
function renderFacebookCaption(array $post, array $parts, int $angle): string {
    $sourceSite    = $post['source_site'] ?? 'vneconomics';
    $categorySlug  = $post['category_slug'] ?? 'general';
    $categoryLabel = $post['category_label'] ?? 'Tổng Hợp';
    $targetUrl     = $post['target_url'] ?? 'https://vneconomics.com/';

    $badge    = resolveCategoryBadge($sourceSite, $categorySlug, $categoryLabel);
    $headline = mb_strtoupper(trim($parts['headline'] ?? ($post['title'] ?? '')), 'UTF-8');
    $hook     = trim($parts['hook'] ?? '');
    $bullets  = $parts['bullets'] ?? [];
    $takeaway = trim($parts['takeaway'] ?? '');
    $hashtags = $parts['hashtags'] ?? [];

    $utmUrl = $targetUrl . (strpos($targetUrl, '?') !== false ? '&' : '?')
        . "utm_source=facebook&utm_medium=fanpage&utm_campaign=autopost&utm_content=angle_{$angle}";

    $caption = "{$badge} {$headline}\n\n";
    if (!empty($hook)) {
        $caption .= "{$hook}\n\n";
    }

    if (!empty($bullets) && is_array($bullets)) {
        $caption .= "📌 ĐIỂM CỐT LÕI:\n";
        foreach (array_slice($bullets, 0, 3) as $b) {
            $b = trim((string)$b);
            $b = ltrim($b, "•-* \t");
            if (!empty($b)) {
                $caption .= "• {$b}\n";
            }
        }
        $caption .= "\n";
    }

    if (!empty($takeaway)) {
        $caption .= "💡 {$takeaway}\n\n";
    }

    $caption .= "👉 Đọc phân tích chi tiết tại:\n";
    $caption .= "🔗 {$utmUrl}\n\n";
    $caption .= getVneFacebookFooter() . "\n\n";

    $cleanTags = normalizeSocialHashtags($sourceSite, $hashtags, 5);
    $caption .= implode(' ', $cleanTags);

    return $caption;
}

/**
 * Tính độ dài hiển thị thực tế của HTML caption theo chuẩn UTF-16 code units của Telegram Bot API
 */
function tgUtf16Len(string $html): int {
    $plain = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    if (function_exists('mb_convert_encoding')) {
        return (int)(strlen(mb_convert_encoding($plain, 'UTF-16BE', 'UTF-8')) / 2);
    }
    return mb_strlen($plain, 'UTF-8');
}

function tgEscape(string $text): string {
    return htmlspecialchars($text, ENT_NOQUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function tgTruncateText(string $text, int $maxChars): string {
    if ($maxChars <= 4) {
        return '';
    }
    if (mb_strlen($text, 'UTF-8') <= $maxChars) {
        return $text;
    }
    return rtrim(mb_substr($text, 0, $maxChars - 3, 'UTF-8')) . '...';
}

/**
 * Lắp ráp caption HTML cho Telegram sendPhoto, đảm bảo luôn <= 1000 ký tự hiển thị (giới hạn cứng 1024)
 */
function renderTelegramCaption(array $post, array $parts, int $angle, int $maxVisibleLen = 1000): string {
    $sourceSite    = $post['source_site'] ?? 'vneconomics';
    $categorySlug  = $post['category_slug'] ?? 'general';
    $categoryLabel = $post['category_label'] ?? 'Tổng Hợp';
    $targetUrl     = $post['target_url'] ?? 'https://vneconomics.com/';

    $badge    = resolveCategoryBadge($sourceSite, $categorySlug, $categoryLabel);
    $headline = mb_strtoupper(trim($parts['headline'] ?? ($post['title'] ?? '')), 'UTF-8');
    $hook     = trim($parts['hook'] ?? '');
    $takeaway = trim($parts['takeaway'] ?? '');

    $cleanBullets = [];
    if (!empty($parts['bullets']) && is_array($parts['bullets'])) {
        foreach (array_slice($parts['bullets'], 0, 3) as $b) {
            $b = ltrim(trim((string)$b), "•-* \t");
            if (!empty($b)) {
                $cleanBullets[] = $b;
            }
        }
    }

    $utmUrl = $targetUrl . (strpos($targetUrl, '?') !== false ? '&' : '?')
        . "utm_source=telegram&utm_medium=group&utm_campaign=autopost&utm_content=angle_{$angle}";
    $utmUrlEsc = htmlspecialchars($utmUrl, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

    $tags = normalizeSocialHashtags($sourceSite, $parts['hashtags'] ?? [], 3);

    $build = function (string $h, array $bs, string $tk, array $tgs) use ($badge, $headline, $utmUrlEsc): string {
        $out = '<b>' . tgEscape("{$badge} {$headline}") . "</b>\n\n";
        if ($h !== '') {
            $out .= tgEscape($h) . "\n\n";
        }
        if (!empty($bs)) {
            $out .= "📌 <b>ĐIỂM CỐT LÕI:</b>\n";
            foreach ($bs as $b) {
                $out .= '• ' . tgEscape($b) . "\n";
            }
            $out .= "\n";
        }
        if ($tk !== '') {
            $out .= '💡 <i>' . tgEscape($tk) . "</i>\n\n";
        }
        $out .= "👉 <a href=\"{$utmUrlEsc}\">Đọc phân tích chi tiết tại đây</a>\n";
        $out .= "🌐 <a href=\"https://vneconomics.com/\">Website</a> | 📘 <a href=\"https://www.facebook.com/vneconomics/\">Fanpage</a>";
        if (!empty($tgs)) {
            $out .= "\n\n" . tgEscape(implode(' ', $tgs));
        }
        return $out;
    };

    $caption = $build($hook, $cleanBullets, $takeaway, $tags);
    if (tgUtf16Len($caption) <= $maxVisibleLen) {
        return $caption;
    }

    // Bước 1: Bỏ hashtags nếu vượt ngưỡng
    $tags = [];
    $caption = $build($hook, $cleanBullets, $takeaway, $tags);
    if (tgUtf16Len($caption) <= $maxVisibleLen) {
        return $caption;
    }

    // Bước 2: Bỏ takeaway nếu vẫn vượt ngưỡng
    $takeaway = '';
    $caption = $build($hook, $cleanBullets, $takeaway, $tags);
    if (tgUtf16Len($caption) <= $maxVisibleLen) {
        return $caption;
    }

    // Bước 3: Rút gọn hook xuống tối đa 180 ký tự
    if (mb_strlen($hook, 'UTF-8') > 180) {
        $hook = tgTruncateText($hook, 180);
        $caption = $build($hook, $cleanBullets, $takeaway, $tags);
        if (tgUtf16Len($caption) <= $maxVisibleLen) {
            return $caption;
        }
    }

    // Bước 4: Rút gọn đều từng bullet để vừa khít giới hạn
    $excess = tgUtf16Len($caption) - $maxVisibleLen;
    if ($excess > 0 && !empty($cleanBullets)) {
        $perBulletTrim = (int)ceil(($excess + 15) / count($cleanBullets));
        foreach ($cleanBullets as $idx => $b) {
            $targetLen = max(40, mb_strlen($b, 'UTF-8') - $perBulletTrim);
            $cleanBullets[$idx] = tgTruncateText($b, $targetLen);
        }
        $caption = $build($hook, $cleanBullets, $takeaway, $tags);
    }

    // Bảo vệ cuối cùng nếu bài có tiêu đề quá dài
    while (tgUtf16Len($caption) > $maxVisibleLen && !empty($cleanBullets)) {
        array_pop($cleanBullets);
        $caption = $build($hook, $cleanBullets, $takeaway, $tags);
    }

    return $caption;
}

/**
 * Gọi Gemini API để viết lại bài viết thành Structured JSON
 */
function rewritePostWithGemini(array $post, int $angle, array $config): array {
    $geminiConf     = $config['gemini'] ?? [];
    $apiKey         = trim($geminiConf['api_key'] ?? '');
    $primaryModel   = trim($geminiConf['model'] ?? 'gemini-4-hydrogen');
    $fallbackModels = is_array($geminiConf['fallback_models'] ?? null) ? $geminiConf['fallback_models'] : ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];
    $modelsToTry    = array_values(array_unique(array_filter(array_merge([$primaryModel], $fallbackModels))));
    $temp           = (float)($geminiConf['temperature'] ?? 0.65);
    $timeout        = (int)($geminiConf['timeout'] ?? 25);

    if (empty($apiKey) || strpos($apiKey, 'YOUR_') === 0) {
        return [
            'ok'    => false,
            'error' => 'Chưa cấu hình gemini.api_key trong config.php',
            'model' => 'fallback-template',
            'parts' => buildFallbackParts($post)
        ];
    }

    $sourceSite = $post['source_site'] ?? 'vneconomics';
    $siteTone = ($sourceSite === 'marketing2student')
        ? 'Giọng văn thực chiến, gần gũi, súc tích cho sinh viên và marketer trẻ; nhấn mạnh tình huống thực tế và bài học áp dụng.'
        : 'Giọng văn sắc bén, chuyên nghiệp, tư duy phân tích kinh tế số, công nghệ (Blockchain, AI, Big Data) và quản trị doanh nghiệp.';

    $angleInstruction = match ($angle) {
        2       => 'Góc độ 2 (Bài học thực chiến & Ứng dụng): Tập trung vào việc doanh nghiệp/người làm nghề rút ra được bài học gì và áp dụng thực tế ra sao từ câu chuyện này.',
        3       => 'Góc độ 3 (Điểm nghẽn & Góc nhìn phản biện): Tập trung vào sai lầm thường gặp, rào cản triển khai hoặc góc nhìn phản biện để kích thích người đọc bình luận.',
        default => 'Góc độ 1 (Tóm tắt Case Study / Bản chất vấn đề): Tập trung vào chuyện gì đang xảy ra, cơ chế vận hành cốt lõi và kết quả thực tế.'
    };

    $title   = trim($post['title'] ?? '');
    $cat     = trim($post['category_label'] ?? '');
    $content = trim($post['content_plain'] ?? $post['excerpt_text'] ?? '');
    if (mb_strlen($content, 'UTF-8') > 6000) {
        $content = mb_substr($content, 0, 6000, 'UTF-8');
    }

    $systemPrompt = "Bạn là biên tập viên nội dung Facebook cho dự án VNEconomics.\n"
        . "Nhiệm vụ: Đọc bài viết gốc từ website và viết lại thành các thành phần ngắn gọn, thu hút để đăng Facebook.\n"
        . "QUY TẮC BẮT BUỘC:\n"
        . "1. CHỈ sử dụng thông tin, tên riêng, số liệu CÓ THẬT trong bài viết gốc. Tuyệt đối KHÔNG bịa đặt thêm số liệu hay sự kiện.\n"
        . "2. KHÔNG viết các câu sáo rỗng kiểu AI như 'Trong bối cảnh hiện nay', 'Hãy cùng khám phá', 'Trong thời đại số'. Đi thẳng vào vấn đề.\n"
        . "3. Phong cách: {$siteTone}\n"
        . "4. {$angleInstruction}\n"
        . "5. Trả về đúng định dạng JSON với các trường:\n"
        . "   - headline: Tiêu đề hấp dẫn cho Facebook (tối đa 14 từ, không dùng dấu ngoặc kép thừa)\n"
        . "   - hook: 1-2 câu mở đầu đánh trúng insight hoặc nghịch lý trong bài (tối đa 40 từ)\n"
        . "   - bullets: Mảng đúng 3 chuỗi, mỗi chuỗi là 1 ý cốt lõi cô đọng (tối đa 32 từ/ý, không cần ký tự bullet đầu dòng)\n"
        . "   - takeaway: 1 câu đúc kết sắc bén hoặc 1 câu hỏi mở kích thích bình luận (tối đa 28 từ)\n"
        . "   - hashtags: Mảng 3 hashtag tiếng Anh/Việt không dấu viết liền (ví dụ: [\"Blockchain\", \"KinhTeSo\", \"SupplyChain\"])";

    $userPrompt = "Chuyên mục: {$cat}\nTiêu đề gốc: {$title}\n\nNội dung bài viết:\n{$content}";

    $payload = [
        'systemInstruction' => [
            'parts' => [['text' => $systemPrompt]]
        ],
        'contents' => [
            [
                'role'  => 'user',
                'parts' => [['text' => $userPrompt]]
            ]
        ],
        'generationConfig' => [
            'temperature'      => $temp,
            'responseMimeType' => 'application/json'
        ]
    ];

    $lastError = 'Không gọi được Gemini API';
    $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE);

    foreach ($modelsToTry as $model) {
        $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . urlencode($apiKey);
        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payloadJson);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
        $rawResp  = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr  = curl_error($ch);
        curl_close($ch);

        if ($httpCode !== 200 || empty($rawResp)) {
            $lastError = "[{$model}] HTTP {$httpCode}: " . ($curlErr ?: mb_substr((string)$rawResp, 0, 250));
            continue;
        }

        $respJson = json_decode($rawResp, true);
        $textOut  = $respJson['candidates'][0]['content']['parts'][0]['text'] ?? '';
        $parts    = json_decode($textOut, true);

        if (!is_array($parts) || empty($parts['hook']) || empty($parts['bullets'])) {
            $lastError = "[{$model}] JSON không hợp lệ: " . mb_substr($textOut, 0, 180);
            continue;
        }

        return [
            'ok'    => true,
            'error' => null,
            'model' => $model,
            'parts' => $parts
        ];
    }

    return [
        'ok'    => false,
        'error' => $lastError,
        'model' => 'fallback-template',
        'parts' => buildFallbackParts($post)
    ];
}

/**
 * Fallback an toàn nếu chưa có Gemini Key hoặc API gặp sự cố tạm thời
 */
function buildFallbackParts(array $post): array {
    $excerpt = trim($post['excerpt_text'] ?? '');
    if (empty($excerpt)) {
        $excerpt = mb_substr(trim($post['content_plain'] ?? ''), 0, 240, 'UTF-8') . '...';
    }
    return [
        'headline' => $post['title'] ?? 'Bài viết mới trên VNEconomics',
        'hook'     => $excerpt,
        'bullets'  => [],
        'takeaway' => 'Bạn nghĩ sao về góc nhìn này? Hãy để lại bình luận bên dưới nhé!',
        'hashtags' => ['KinhTeSo', 'CongNghe']
    ];
}
