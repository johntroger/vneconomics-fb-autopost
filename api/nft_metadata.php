<?php
/**
 * DYNAMIC NFT METADATA ENDPOINT (CHUẨN ERC-721 / CARDANO CIP-25)
 */

require_once __DIR__ . '/core/bootstrap.php';

vneBootstrapApi();
$code = vneSanitizePlainText((string)($_GET['code'] ?? ''), 64);
if ($code === '') {
    vneJsonError('Thiếu mã NFT code.', 400);
}

$pdo = getDbConnection();
$record = null;
if ($pdo) {
    $stmt = $pdo->prepare("SELECT * FROM user_nfts WHERE verify_code = :c LIMIT 1");
    $stmt->execute([':c' => $code]);
    $record = $stmt->fetch();
}

$title = $record['title'] ?? 'VNEconomics Digital Certificate (Testnet)';
$nftType = $record['nft_type'] ?? 'passport';
$network = $record['network'] ?? 'Base Sepolia Testnet';
$sha256 = $record['sha256_proof'] ?? hash('sha256', $code);

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'name'         => $title,
    'description'  => 'Chứng nhận/Hộ chiếu Kinh tế số VNEconomics.com (100% Testnet - 0đ tiền thật).',
    'image'        => 'https://vneconomics.com/assets/vne-nft-badge.png',
    'external_url' => 'https://vneconomics.com/verify/' . rawurlencode($code),
    'attributes'   => [
        ['trait_type' => 'Type', 'value' => strtoupper($nftType)],
        ['trait_type' => 'Network', 'value' => $network],
        ['trait_type' => 'Milestone Stage', 'value' => (int)($record['milestone_stage'] ?? 1)],
        ['trait_type' => 'SHA256 Proof', 'value' => $sha256],
    ],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
