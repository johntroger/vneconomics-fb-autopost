<?php
/**
 * VNE POINTS, DAILY 100-VNE AUTO-RESET & RESOURCE UNLOCK ANTI-CHEAT API
 * Mọi biến động điểm thưởng và mở khóa Sách/Khóa học/AI Skills đều kiểm chứng phía Server
 * (Firebase JWT RS256 + MySQL Transaction + Idempotency Key).
 */

require_once __DIR__ . '/core/bootstrap.php';

vneBootstrapApi();
vneEnforceRateLimit('game', 40, 60);

$claims = vneRequireAuth();
$pdo = getDbConnection();
if (!$pdo) {
    vneJsonError('Không thể kết nối cơ sở dữ liệu.', 503, 'DB_UNAVAILABLE');
}

$uid = (string)$claims['sub'];
$userStmt = $pdo->prepare("SELECT id FROM users WHERE firebase_uid = :uid LIMIT 1");
$userStmt->execute([':uid' => $uid]);
$user = $userStmt->fetch();
if (!$user) {
    vneJsonError('Tài khoản chưa tồn tại trong hệ thống.', 403, 'USER_NOT_SYNCED');
}
$userId = (int)$user['id'];

function ensureServerDailyPointsReset(PDO $pdo, int $userId): array {
    $today = gmdate('Y-m-d');
    $stmt = $pdo->prepare("SELECT total_points, tier_level, daily_streak, last_checkin_date, last_daily_reset_date FROM user_points WHERE user_id = :u LIMIT 1");
    $stmt->execute([':u' => $userId]);
    $row = $stmt->fetch();

    if (!$row) {
        $pdo->prepare("INSERT IGNORE INTO user_points (user_id, total_points, lifetime_earned, last_daily_reset_date) VALUES (:u, 100, 100, :d)")
            ->execute([':u' => $userId, ':d' => $today]);
        return ['total_points' => 100, 'tier_level' => 1, 'daily_streak' => 0, 'last_checkin_date' => null, 'last_daily_reset_date' => $today];
    }

    if ((string)($row['last_daily_reset_date'] ?? '') !== $today) {
        $currentPts = (int)$row['total_points'];
        $nextPts = max($currentPts, 100);
        $delta = $nextPts - $currentPts;
        $pdo->prepare("UPDATE user_points SET total_points = :pts, last_daily_reset_date = :d WHERE user_id = :u")
            ->execute([':pts' => $nextPts, ':d' => $today, ':u' => $userId]);
        if ($delta > 0) {
            $idem = "daily_reset_{$userId}_{$today}";
            $pdo->prepare("INSERT IGNORE INTO user_point_events (user_id, points_delta, action_type, reason, idempotency_key) VALUES (:u, :delta, 'checkin', 'Tự động reset 100 VNE Points mỗi ngày', :k)")
                ->execute([':u' => $userId, ':delta' => $delta, ':k' => $idem]);
        }
        $row['total_points'] = $nextPts;
        $row['last_daily_reset_date'] = $today;
    }

    return $row;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'GET') {
    $pts = ensureServerDailyPointsReset($pdo, $userId);
    $unlocked = [];
    try {
        $uStmt = $pdo->prepare("SELECT item_key FROM user_unlocked_items WHERE user_id = :u");
        $uStmt->execute([':u' => $userId]);
        $unlocked = array_column($uStmt->fetchAll(), 'item_key');
    } catch (\Throwable $e) {
        // Table may not be migrated yet
    }
    $pts['unlocked_items'] = $unlocked;
    vneJsonSuccess($pts);
}

if ($method === 'POST') {
    $body = vneReadJsonBody();
    $action = (string)($body['action'] ?? '');

    if ($action === 'checkin') {
        $today = gmdate('Y-m-d');
        $idem = "checkin_{$userId}_{$today}";

        $pdo->beginTransaction();
        try {
            ensureServerDailyPointsReset($pdo, $userId);
            $ins = $pdo->prepare("INSERT IGNORE INTO user_point_events (user_id, points_delta, action_type, reason, idempotency_key) VALUES (:u, 20, 'checkin', 'Điểm danh hàng ngày', :k)");
            $ins->execute([':u' => $userId, ':k' => $idem]);
            if ($ins->rowCount() === 0) {
                $pdo->rollBack();
                vneJsonError('Hôm nay bạn đã điểm danh rồi.', 409, 'ALREADY_CLAIMED');
            }
            $pdo->prepare("UPDATE user_points SET total_points = total_points + 20, lifetime_earned = lifetime_earned + 20, daily_streak = daily_streak + 1, last_checkin_date = :d WHERE user_id = :u")
                ->execute([':d' => $today, ':u' => $userId]);
            $pdo->commit();
            vneJsonSuccess(['points_added' => 20]);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            vneJsonError('Không thể điểm danh lúc này.', 500);
        }
    }

    if ($action === 'unlock_item') {
        $itemKey = vneSanitizePlainText((string)($body['item_key'] ?? ''), 190);
        $label = vneSanitizePlainText((string)($body['label'] ?? $itemKey), 180);
        $cost = max(10, min(100, (int)($body['cost'] ?? 10)));
        if ($itemKey === '') {
            vneJsonError('Thiếu mã tài nguyên cần mở khóa.', 400, 'INVALID_ITEM_KEY');
        }

        $pdo->beginTransaction();
        try {
            $pts = ensureServerDailyPointsReset($pdo, $userId);
            $exists = $pdo->prepare("SELECT 1 FROM user_unlocked_items WHERE user_id = :u AND item_key = :k LIMIT 1");
            $exists->execute([':u' => $userId, ':k' => $itemKey]);
            if ($exists->fetch()) {
                $pdo->commit();
                vneJsonSuccess(['unlocked' => true, 'already_unlocked' => true, 'total_points' => (int)$pts['total_points']]);
            }

            if ((int)$pts['total_points'] < $cost) {
                $pdo->rollBack();
                vneJsonError("Cần {$cost} VNE Points (bạn đang có {$pts['total_points']} VNE).", 402, 'INSUFFICIENT_POINTS');
            }

            $pdo->prepare("UPDATE user_points SET total_points = total_points - :c WHERE user_id = :u AND total_points >= :c2")
                ->execute([':c' => $cost, ':u' => $userId, ':c2' => $cost]);
            $pdo->prepare("INSERT IGNORE INTO user_unlocked_items (user_id, item_key, points_spent) VALUES (:u, :k, :c)")
                ->execute([':u' => $userId, ':k' => $itemKey, ':c' => $cost]);
            $pdo->prepare("INSERT IGNORE INTO user_point_events (user_id, points_delta, action_type, reason, idempotency_key) VALUES (:u, :d, 'unlock_item', :r, :idem)")
                ->execute([':u' => $userId, ':d' => -$cost, ':r' => "Mở khóa: {$label}", ':idem' => "unlock_{$userId}_{$itemKey}"]);

            $pdo->commit();
            vneJsonSuccess(['unlocked' => true, 'total_points' => (int)$pts['total_points'] - $cost]);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            vneJsonError('Không thể mở khóa tài nguyên lúc này.', 500);
        }
    }

    if ($action === 'practice_reward') {
        $points = max(1, min(60, (int)($body['points'] ?? 0)));
        $reason = vneSanitizePlainText((string)($body['reason'] ?? 'Luyện tập VNEconomics'), 180);
        $idem = vneSanitizePlainText((string)($body['idempotency_key'] ?? ''), 120);
        if ($idem === '') {
            $idem = 'practice_' . $userId . '_' . gmdate('YmdHi') . '_' . substr(hash('sha256', $reason), 0, 8);
        }

        $pdo->beginTransaction();
        try {
            ensureServerDailyPointsReset($pdo, $userId);
            $ins = $pdo->prepare("INSERT IGNORE INTO user_point_events (user_id, points_delta, action_type, reason, idempotency_key) VALUES (:u, :p, 'complete_lesson', :r, :k)");
            $ins->execute([':u' => $userId, ':p' => $points, ':r' => $reason, ':k' => $idem]);
            if ($ins->rowCount() === 0) {
                $pdo->rollBack();
                vneJsonError('Phần thưởng luyện tập này đã được ghi nhận.', 409, 'ALREADY_CLAIMED');
            }
            $pdo->prepare("UPDATE user_points SET total_points = total_points + :p, lifetime_earned = lifetime_earned + :p2 WHERE user_id = :u")
                ->execute([':p' => $points, ':p2' => $points, ':u' => $userId]);
            $pdo->commit();
            vneJsonSuccess(['points_added' => $points]);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            vneJsonError('Không thể cộng điểm luyện tập lúc này.', 500);
        }
    }

    if ($action === 'testnet_swap') {
        $txHash = strtolower(vneSanitizePlainText((string)($body['tx_hash'] ?? ''), 120));
        $points = max(10, min(250, (int)($body['points'] ?? 50)));
        $network = vneSanitizePlainText((string)($body['network'] ?? 'Testnet'), 80);
        $amountLabel = vneSanitizePlainText((string)($body['amount_label'] ?? ''), 80);
        if (strlen($txHash) < 16) {
            vneJsonError('Mã giao dịch Testnet (txHash) không hợp lệ.', 400, 'INVALID_TX_HASH');
        }

        $idem = "swap_{$txHash}";
        $dayStart = gmdate('Y-m-d 00:00:00');
        $dayEnd = gmdate('Y-m-d 00:00:00', strtotime('+1 day'));
        $pdo->beginTransaction();
        try {
            ensureServerDailyPointsReset($pdo, $userId);
            $capStmt = $pdo->prepare("SELECT COALESCE(SUM(points_delta), 0) FROM user_point_events WHERE user_id = :u AND action_type = 'testnet_tx' AND created_at >= :ds AND created_at < :de");
            $capStmt->execute([':u' => $userId, ':ds' => $dayStart, ':de' => $dayEnd]);
            $todayTotal = (int)$capStmt->fetchColumn();
            if ($todayTotal + $points > 500) {
                $pdo->rollBack();
                vneJsonError('Đã đạt hạn mức quy đổi Testnet 500 VNE/ngày.', 429, 'DAILY_SWAP_CAP');
            }

            $ins = $pdo->prepare("INSERT IGNORE INTO user_point_events (user_id, points_delta, action_type, reason, idempotency_key, tx_hash) VALUES (:u, :p, 'testnet_tx', :r, :k, :tx)");
            $ins->execute([
                ':u'  => $userId,
                ':p'  => $points,
                ':r'  => "Testnet Swap ({$network} • {$amountLabel})",
                ':k'  => $idem,
                ':tx' => $txHash,
            ]);
            if ($ins->rowCount() === 0) {
                $pdo->rollBack();
                vneJsonError('Giao dịch Testnet này đã được quy đổi trước đó.', 409, 'TX_ALREADY_REDEEMED');
            }

            $pdo->prepare("UPDATE user_points SET total_points = total_points + :p, lifetime_earned = lifetime_earned + :p2 WHERE user_id = :u")
                ->execute([':p' => $points, ':p2' => $points, ':u' => $userId]);
            $pdo->commit();
            vneJsonSuccess(['points_added' => $points, 'tx_hash' => $txHash]);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            vneJsonError('Không thể xác nhận quy đổi Testnet lúc này.', 500);
        }
    }

    if ($action === 'sim_exchange_settle') {
        $rawKind = (string)($body['market_kind'] ?? 'crypto');
        $marketKind = in_array($rawKind, ['crypto', 'stock', 'commodity', 'forex', 'carbon'], true) ? $rawKind : 'crypto';
        $symbol = vneSanitizePlainText((string)($body['symbol'] ?? ''), 24);
        $side = ((string)($body['side'] ?? 'long')) === 'short' ? 'short' : 'long';
        $marginVne = max(10, min(10000, (float)($body['margin_vne'] ?? 10)));
        $entryPrice = max(0.0001, (float)($body['entry_price_vne'] ?? 1));
        $exitPrice = max(0.0001, (float)($body['exit_price_vne'] ?? 1));
        $pnlVne = max(-10000, min(500, (float)($body['pnl_vne'] ?? 0)));
        $feeVne = max(0, min(500, (float)($body['fee_vne'] ?? 0)));

        $dayStart = gmdate('Y-m-d 00:00:00');
        $dayEnd = gmdate('Y-m-d 00:00:00', strtotime('+1 day'));
        $pdo->beginTransaction();
        try {
            ensureServerDailyPointsReset($pdo, $userId);

            // Enforce 500 VNE/day net profit cap on simulated exchanges
            if ($pnlVne > 0) {
                $capStmt = $pdo->prepare("SELECT COALESCE(SUM(GREATEST(pnl_vne, 0)), 0) FROM vne_sim_trade_history WHERE user_id = :u AND settled_at >= :ds AND settled_at < :de");
                $capStmt->execute([':u' => $userId, ':ds' => $dayStart, ':de' => $dayEnd]);
                $todayProfit = (float)$capStmt->fetchColumn();
                if ($todayProfit + $pnlVne > 500) {
                    $pnlVne = max(0, 500 - $todayProfit);
                }
            }

            $pdo->prepare("INSERT INTO vne_sim_trade_history (user_id, market_kind, symbol, side, margin_vne, entry_price_vne, exit_price_vne, pnl_vne, fee_vne) VALUES (:u, :mk, :sym, :side, :m, :ep, :xp, :pnl, :fee)")
                ->execute([
                    ':u' => $userId,
                    ':mk' => $marketKind,
                    ':sym' => $symbol,
                    ':side' => $side,
                    ':m' => $marginVne,
                    ':ep' => $entryPrice,
                    ':xp' => $exitPrice,
                    ':pnl' => $pnlVne,
                    ':fee' => $feeVne,
                ]);

            $pdo->commit();
            vneJsonSuccess(['settled' => true, 'pnl_vne' => $pnlVne]);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            vneJsonError('Không thể đồng bộ chốt lệnh sàn mô phỏng.', 500);
        }
    }

    vneJsonError('Hành động không được hỗ trợ.', 400, 'INVALID_ACTION');
}

vneJsonError('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
