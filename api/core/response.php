<?php
/**
 * CHUẨN HÓA JSON RESPONSE CHO TOÀN BỘ API
 */

defined('VNE_APP') or die('Truy cập trực tiếp bị từ chối.');

function vneJsonSuccess($data = [], int $status = 200, array $meta = []): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    $payload = [
        'ok'   => true,
        'data' => $data,
    ];
    if (!empty($meta)) {
        $payload['meta'] = $meta;
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function vneJsonError(string $message, int $status = 400, string $code = 'BAD_REQUEST', array $details = []): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    $payload = [
        'ok'    => false,
        'error' => [
            'code'    => $code,
            'message' => $message,
        ],
    ];
    if (!empty($details)) {
        $payload['error']['details'] = $details;
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function vneReadJsonBody(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}
