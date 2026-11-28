<?php
/**
 * NFT VOUCHER NONCE, RECORDING & PUBLIC VERIFICATION API (100% TESTNET)
 */

require_once __DIR__ . '/core/bootstrap.php';

vneBootstrapApi();
$pdo = getDbConnection();
if (!$pdo) {
    vneJsonError('Không thể kết nối cơ sở dữ liệu.', 503, 'DB_UNAVAILABLE');
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $verify = vneSanitizePlainText((string)($_GET['verify'] ?? ''), 64);
    if ($verify === '') {
        vneJsonError('Thiếu tham số verify.', 400);
    }
    $stmt = $pdo->prepare(
        "SELECT n.verify_code, n.nft_type, n.title, n.chain_family, n.network, n.contract_address,
                n.token_id, n.tx_hash, n.sha256_proof, n.milestone_stage, n.minted_at,
                u.display_name AS owner_name
         FROM user_nfts n
         LEFT JOIN users u ON n.user_id = u.id
         WHERE n.verify_code = :v LIMIT 1"
    );
    $stmt->execute([':v' => $verify]);
    $row = $stmt->fetch();
    if (!$row) {
        vneJsonError('Không tìm thấy chứng chỉ NFT.', 404, 'NOT_FOUND');
    }
    vneJsonSuccess($row);
}

if ($method === 'POST') {
    vneEnforceRateLimit('nft_mint', 15, 60);
    $claims = vneRequireAuth();
    $body = vneReadJsonBody();
    $action = (string)($body['action'] ?? 'issue_voucher');

    $uid = (string)$claims['sub'];
    $userStmt = $pdo->prepare("SELECT id FROM users WHERE firebase_uid = :uid LIMIT 1");
    $userStmt->execute([':uid' => $uid]);
    $user = $userStmt->fetch();
    if (!$user) vneJsonError('Tài khoản chưa đồng bộ.', 403);
    $userId = (int)$user['id'];

    if ($action === 'issue_voucher') {
        $nftType = in_array($body['nft_type'] ?? '', ['passport', 'certificate', 'proof'], true) ? $body['nft_type'] : 'passport';
        $chainFamily = ($body['chain_family'] ?? 'evm') === 'cardano' ? 'cardano' : 'evm';
        $recipient = vneSanitizePlainText((string)($body['recipient_address'] ?? ''), 160);
        if ($recipient === '') vneJsonError('Thiếu địa chỉ ví nhận NFT.', 400);

        $nonce = bin2hex(random_bytes(16));
        $sha256 = hash('sha256', "{$userId}|{$nftType}|{$recipient}|{$nonce}");
        $expiresAt = gmdate('Y-m-d H:i:s', time() + 900);

        $pdo->prepare(
            "INSERT INTO nft_mint_vouchers (nonce, user_id, nft_type, reference_id, recipient_address, chain_family, sha256_proof, expires_at)
             VALUES (:n, :u, :t, :ref, :addr, :cf, :sha, :exp)"
        )->execute([
            ':n'    => $nonce,
            ':u'    => $userId,
            ':t'    => $nftType,
            ':ref'  => vneSanitizePlainText((string)($body['reference_id'] ?? ''), 80),
            ':addr' => $recipient,
            ':cf'   => $chainFamily,
            ':sha'  => $sha256,
            ':exp'  => $expiresAt,
        ]);

        vneJsonSuccess(['nonce' => $nonce, 'sha256_proof' => $sha256, 'expires_at' => $expiresAt]);
    }

    if ($action === 'confirm_mint') {
        $nonce = vneSanitizePlainText((string)($body['nonce'] ?? ''), 64);
        $txHash = vneSanitizePlainText((string)($body['tx_hash'] ?? ''), 120);
        $tokenId = vneSanitizePlainText((string)($body['token_id'] ?? ''), 120);
        $title = vneSanitizePlainText((string)($body['title'] ?? 'VNEconomics NFT'), 250);
        $network = vneSanitizePlainText((string)($body['network'] ?? 'Base Sepolia Testnet'), 60);

        $pdo->beginTransaction();
        try {
            $vStmt = $pdo->prepare("SELECT * FROM nft_mint_vouchers WHERE nonce = :n AND user_id = :u AND is_claimed = 0 AND expires_at >= UTC_TIMESTAMP() FOR UPDATE");
            $vStmt->execute([':n' => $nonce, ':u' => $userId]);
            $voucher = $vStmt->fetch();
            if (!$voucher) {
                $pdo->rollBack();
                vneJsonError('Voucher không hợp lệ, đã sử dụng hoặc đã hết hạn.', 400, 'INVALID_VOUCHER');
            }

            $verifyCode = 'VNE-' . strtoupper($voucher['nft_type']) . '-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
            $pdo->prepare("UPDATE nft_mint_vouchers SET is_claimed = 1 WHERE nonce = :n")->execute([':n' => $nonce]);
            $pdo->prepare(
                "INSERT INTO user_nfts (verify_code, user_id, nft_type, title, chain_family, network, contract_address, token_id, tx_hash, sha256_proof, milestone_stage)
                 VALUES (:vc, :u, :t, :title, :cf, :net, :ca, :tid, :tx, :sha, :st)"
            )->execute([
                ':vc'    => $verifyCode,
                ':u'     => $userId,
                ':t'     => $voucher['nft_type'],
                ':title' => $title,
                ':cf'    => $voucher['chain_family'],
                ':net'   => $network,
                ':ca'    => vneSanitizePlainText((string)($body['contract_address'] ?? ''), 160),
                ':tid'   => $tokenId ?: '1',
                ':tx'    => $txHash,
                ':sha'   => $voucher['sha256_proof'],
                ':st'    => max(1, (int)($body['milestone_stage'] ?? 1)),
            ]);
            $pdo->commit();
            vneJsonSuccess(['verify_code' => $verifyCode]);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            vneJsonError('Không thể xác nhận đúc NFT.', 500);
        }
    }
}

vneJsonError('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
