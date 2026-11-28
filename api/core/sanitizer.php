<?php
/**
 * HTML WHITELIST & INPUT SANITIZER (CHỐNG XSS KHI MIGRATE & NHẬP LIỆU)
 */

defined('VNE_APP') or die('Truy cập trực tiếp bị từ chối.');

function vneSanitizeSlug(string $input): string {
    $slug = strtolower(trim($input));
    $slug = preg_replace('/[^a-z0-9\-_%]/', '-', $slug) ?? '';
    $slug = preg_replace('/-+/', '-', $slug) ?? '';
    return trim($slug, '-');
}

function vneSanitizePlainText(string $input, int $maxLength = 500): string {
    $clean = trim(strip_tags($input));
    $clean = preg_replace('/\s+/u', ' ', $clean) ?? '';
    if (mb_strlen($clean, 'UTF-8') > $maxLength) {
        return mb_substr($clean, 0, $maxLength, 'UTF-8');
    }
    return $clean;
}

/**
 * Loại bỏ các thẻ/thuộc tính nguy hiểm (<script>, <iframe> lạ, on*, javascript:)
 */
function vneSanitizeHtml(string $html): string {
    if (trim($html) === '') {
        return '';
    }

    // Gỡ bỏ script, style, object, embed trước khi parse
    $html = preg_replace('#<(script|style|object|embed|applet|form)[^>]*>.*?</\1>#is', '', $html) ?? '';
    // Gỡ bỏ event handlers (onload=, onclick=, onerror=...)
    $html = preg_replace('/\son[a-z]+\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $html) ?? '';
    // Chặn javascript: và data:text/html trong href/src
    $html = preg_replace('/\b(href|src)\s*=\s*(["\'])\s*(?:javascript:|vbscript:|data:text\/html)[^"\']*\2/i', '$1="#"', $html) ?? '';

    $allowedTags = '<p><br><h1><h2><h3><h4><h5><h6><ul><ol><li><blockquote><pre><code><strong><b><em><i><u><s><a><img><table><thead><tbody><tfoot><tr><th><td><figure><figcaption><hr><div><span>';
    return strip_tags($html, $allowedTags);
}
