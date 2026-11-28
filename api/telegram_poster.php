<?php
/**
 * MODULE ĐẨY BÀI LÊN TELEGRAM GROUP (BOT API - SENDPHOTO + HTML CAPTION <= 1024)
 * Dự án: VNEconomics (vneconomics.com & marketing2student.com)
 */

defined('VNE_APP') or die('Truy cập trực tiếp bị từ chối.');

/**
 * Gửi bài viết (1 ảnh + caption HTML đã tối ưu <= 1024 ký tự) lên Telegram Group
 */
function postToTelegramGroup(string $tgCaption, string $localImage, string $imageUrl, array $config, ?string $sourceSite = null): array {
    $tgConf    = $config['telegram'] ?? [];
    $enabled   = !empty($tgConf['enabled']);
    $botToken  = trim((string)($tgConf['bot_token'] ?? ''));
    $chatId    = trim((string)($tgConf['chat_id'] ?? ''));
    $timeout   = (int)($tgConf['timeout'] ?? 20);
    $silent    = !empty($tgConf['disable_notification']);

    if (!$enabled || empty($botToken) || strpos($botToken, 'YOUR_') === 0 || empty($chatId) || strpos($chatId, 'YOUR_') === 0) {
        return [
            'status'     => 'skipped',
            'message_id' => null,
            'response'   => [
                'mode' => empty($tgConf) ? 'NOT_CONFIGURED' : 'SIMULATED',
                'note' => 'Chưa bật telegram.enabled = true hoặc chưa điền bot_token / chat_id trong config.php.'
            ],
            'error'      => null
        ];
    }

    // Hỗ trợ message_thread_id dạng số đơn hoặc mảng theo từng source_site (cho Group bật Topics/Forum)
    $threadConf = $tgConf['message_thread_id'] ?? null;
    $threadId   = null;
    if (is_array($threadConf) && $sourceSite !== null && !empty($threadConf[$sourceSite])) {
        $threadId = (int)$threadConf[$sourceSite];
    } elseif (is_numeric($threadConf) && (int)$threadConf > 0) {
        $threadId = (int)$threadConf;
    }

    $hasLocalImage = !empty($localImage) && file_exists($localImage) && class_exists('CURLFile');
    $hasRemoteImg  = !empty($imageUrl);
    $usePhoto      = $hasLocalImage || $hasRemoteImg;

    $method   = $usePhoto ? 'sendPhoto' : 'sendMessage';
    $endpoint = "https://api.telegram.org/bot{$botToken}/{$method}";

    $payload = [
        'chat_id'    => $chatId,
        'parse_mode' => 'HTML',
    ];

    if ($usePhoto) {
        $payload['caption'] = $tgCaption;
        if ($hasLocalImage) {
            $payload['photo'] = new CURLFile($localImage, 'image/jpeg');
        } else {
            $payload['photo'] = $imageUrl;
        }
    } else {
        $payload['text'] = $tgCaption;
    }

    if ($threadId !== null) {
        $payload['message_thread_id'] = $threadId;
    }
    if ($silent) {
        $payload['disable_notification'] = 'true';
    }

    $maxRetries = 2;
    $attempt    = 0;
    $rawResp    = '';
    $httpCode   = 0;
    $curlErr    = '';
    $tgResp     = null;
    $msgId      = null;

    while ($attempt <= $maxRetries) {
        $attempt++;
        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_POST, true);
        if (isset($payload['photo']) && $payload['photo'] instanceof CURLFile) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        } else {
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($payload));
        }
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
        $rawResp  = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr  = curl_error($ch);
        curl_close($ch);

        if ($httpCode === 200 && !empty($rawResp)) {
            $tgResp = json_decode($rawResp, true);
            if (!empty($tgResp['ok']) && !empty($tgResp['result']['message_id'])) {
                $msgId = (string)$tgResp['result']['message_id'];
                break;
            }
        }

        // Nếu upload file local thất bại và có URL ảnh gốc -> thử fallback sang URL
        if ($usePhoto && isset($payload['photo']) && $payload['photo'] instanceof CURLFile && $hasRemoteImg) {
            $payload['photo'] = $imageUrl;
        }

        if ($attempt <= $maxRetries) {
            sleep(2);
        }
    }

    if (!empty($msgId)) {
        return [
            'status'     => 'success',
            'message_id' => $msgId,
            'response'   => $tgResp,
            'error'      => null
        ];
    }

    return [
        'status'     => 'failed',
        'message_id' => null,
        'response'   => $tgResp ?: $rawResp,
        'error'      => "Lỗi Telegram Bot API (HTTP {$httpCode}): " . ($curlErr ?: mb_substr((string)$rawResp, 0, 300))
    ];
}
