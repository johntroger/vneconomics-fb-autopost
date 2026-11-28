<?php
/**
 * VNECONOMICS PREDICTION MARKETS & AI ORACLE API (PHP 8 — HIGH CONCURRENCY)
 * - Public GET: list active/resolved markets with TTL cache (pass ?include_pending=1 with valid X-Admin-Token).
 * - Community POST (action=submit_market | place_bet):
 *   - Uses MySQL InnoDB row-level transactions + atomic outcome pools + UNIQUE(tx_hash) anti-replay.
 *   - Only touches JSON fallback file when $pdo === null (zero-DB local/sandbox mode).
 * - Admin POST (action=approve_market | reject_market | resolve_market):
 *   - Protected by X-Admin-Token (hash_equals) + cache prefix invalidation.
 */

require_once __DIR__ . '/core/bootstrap.php';

$config = vneBootstrapApi();
$pdo = getDbConnection();

$storeDir = dirname(__DIR__) . '/uploads';
$storeFile = $storeDir . '/predictions_registry.json';

function requireValidAdminToken(array $config): void {
    $expected = trim((string)($config['security']['admin_token'] ?? ''));
    $provided = trim((string)($_SERVER['HTTP_X_ADMIN_TOKEN'] ?? ''));
    if ($expected === '' || str_starts_with($expected, 'THAY_BANG_')) {
        vneJsonError('Admin Token not configured in api/config.php.', 503, 'ADMIN_TOKEN_NOT_CONFIGURED');
    }
    if ($provided === '' || !hash_equals($expected, $provided)) {
        vneJsonError('Missing or invalid X-Admin-Token.', 403, 'FORBIDDEN');
    }
}

function readPredictionsJsonStore($fp): array {
    rewind($fp);
    $raw = stream_get_contents($fp);
    $decoded = $raw ? json_decode($raw, true) : null;
    if (!is_array($decoded) || !isset($decoded['markets']) || !is_array($decoded['markets'])) {
        return ['markets' => []];
    }
    return $decoded;
}

function ensureJsonFallbackDir(string $dir): void {
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $includePending = !empty($_GET['include_pending']);
    if ($includePending) {
        requireValidAdminToken($config);
    }

    if ($pdo) {
        $cacheKey = $includePending ? 'pred_markets_all_v1' : 'pred_markets_public_v1';
        $markets = vneCacheGetOrBuild($cacheKey, 20, static function () use ($pdo, $includePending) {
            try {
                $sql = $includePending
                    ? "SELECT payload_json FROM vne_prediction_markets ORDER BY created_at DESC LIMIT 200"
                    : "SELECT payload_json FROM vne_prediction_markets WHERE status IN ('active', 'resolved') ORDER BY created_at DESC LIMIT 200";
                $stmt = $pdo->query($sql);
                $rows = [];
                while ($row = $stmt->fetch()) {
                    $item = json_decode((string)$row['payload_json'], true);
                    if (is_array($item)) {
                        $rows[] = $item;
                    }
                }
                return $rows;
            } catch (PDOException $e) {
                error_log('GET vne_prediction_markets error: ' . $e->getMessage());
                return [];
            }
        }, 'predictions');

        vneJsonSuccess(['markets' => $markets ?? []]);
    }

    // No-DB fallback mode
    $markets = [];
    if (file_exists($storeFile)) {
        $raw = @file_get_contents($storeFile);
        $store = $raw ? json_decode($raw, true) : null;
        if (is_array($store['markets'] ?? null)) {
            foreach ($store['markets'] as $m) {
                $status = (string)($m['status'] ?? 'active');
                if ($includePending || $status === 'active' || $status === 'resolved') {
                    $markets[] = $m;
                }
            }
        }
    }
    vneJsonSuccess(['markets' => $markets]);
}

if ($method === 'POST') {
    vneEnforceRateLimit('predictions_write', 30, 60);
    $body = vneReadJsonBody();
    $action = vneSanitizePlainText((string)($body['action'] ?? ''), 48);

    if ($action === 'submit_market') {
        $market = $body['market'] ?? null;
        if (!is_array($market) || empty($market['id']) || empty($market['titleVi'])) {
            vneJsonError('Invalid prediction market payload.', 400);
        }
        $market['status'] = 'pending_review';
        $marketId = vneSanitizePlainText((string)$market['id'], 96);

        if ($pdo) {
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare(
                    "INSERT INTO vne_prediction_markets (id, slug, market_type, category, status, title_vi, title_en, resolution_source_url, end_date, volume_vne, liquidity_vne, payload_json)
                     VALUES (:id, :slug, :mtype, :cat, 'pending_review', :tvi, :ten, :src, :edate, :vol, :liq, :payload)
                     ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json)"
                );
                $stmt->execute([
                    ':id' => $marketId,
                    ':slug' => vneSanitizePlainText((string)($market['slug'] ?? $marketId), 128),
                    ':mtype' => ($market['type'] ?? 'binary') === 'multi' ? 'multi' : 'binary',
                    ':cat' => vneSanitizePlainText((string)($market['category'] ?? 'macro'), 48),
                    ':tvi' => vneSanitizePlainText((string)$market['titleVi'], 500),
                    ':ten' => vneSanitizePlainText((string)($market['titleEn'] ?? $market['titleVi']), 500),
                    ':src' => vneSanitizePlainText((string)($market['resolutionSourceUrl'] ?? 'https://vneconomics.com/'), 500),
                    ':edate' => vneSanitizePlainText((string)($market['endDate'] ?? date('Y-m-d')), 10),
                    ':vol' => (float)($market['volumeVne'] ?? 0),
                    ':liq' => (float)($market['liquidityVne'] ?? 10000),
                    ':payload' => json_encode($market, JSON_UNESCAPED_UNICODE),
                ]);

                if (!empty($market['outcomes']) && is_array($market['outcomes'])) {
                    $outStmt = $pdo->prepare(
                        "INSERT IGNORE INTO vne_prediction_outcomes (id, market_id, label_vi, label_en, yes_pct, yes_pool, no_pool, history_json)
                         VALUES (:oid, :mid, :lvi, :len, :ypct, :ypool, :npool, :hist)"
                    );
                    foreach ($market['outcomes'] as $o) {
                        $outStmt->execute([
                            ':oid' => vneSanitizePlainText((string)($o['id'] ?? ''), 112),
                            ':mid' => $marketId,
                            ':lvi' => vneSanitizePlainText((string)($o['labelVi'] ?? ''), 255),
                            ':len' => vneSanitizePlainText((string)($o['labelEn'] ?? ''), 255),
                            ':ypct' => max(1, min(99, (int)($o['yesPct'] ?? 50))),
                            ':ypool' => (float)($o['yesPool'] ?? 5000),
                            ':npool' => (float)($o['noPool'] ?? 5000),
                            ':hist' => json_encode($o['history'] ?? [50], JSON_UNESCAPED_UNICODE),
                        ]);
                    }
                }
                $pdo->commit();
                vneCacheInvalidatePrefix('pred_markets_', 'predictions');
            } catch (PDOException $e) {
                $pdo->rollBack();
                error_log('POST submit_market DB error: ' . $e->getMessage());
                vneJsonError('Database error submitting market.', 500);
            }
        } else {
            ensureJsonFallbackDir($storeDir);
            $fp = fopen($storeFile, 'c+');
            if ($fp && flock($fp, LOCK_EX)) {
                $store = readPredictionsJsonStore($fp);
                $store['markets'][$marketId] = $market;
                ftruncate($fp, 0);
                rewind($fp);
                fwrite($fp, json_encode($store, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
                fflush($fp);
                flock($fp, LOCK_UN);
                fclose($fp);
            }
        }

        vneJsonSuccess(['market' => $market], 201);
    }

    if ($action === 'place_bet' && $pdo) {
        $marketId = vneSanitizePlainText((string)($body['market_id'] ?? ''), 96);
        $outcomeId = vneSanitizePlainText((string)($body['outcome_id'] ?? ''), 112);
        $actor = vneSanitizePlainText((string)($body['actor_address'] ?? ''), 160);
        $side = ((string)($body['side'] ?? 'YES')) === 'NO' ? 'NO' : 'YES';
        $shares = max(0.01, (float)($body['shares'] ?? 0));
        $avgPriceCents = max(0.5, min(99.5, (float)($body['avg_price_cents'] ?? 50)));
        $costVne = max(0.1, (float)($body['cost_vne'] ?? 1));
        $newYesPct = max(1, min(99, (int)($body['new_yes_pct'] ?? 50)));
        $txHash = strtolower(vneSanitizePlainText((string)($body['tx_hash'] ?? ''), 128));

        if ($marketId === '' || $outcomeId === '' || strlen($txHash) < 16) {
            vneJsonError('Invalid bet payload or txHash.', 400);
        }

        $pdo->beginTransaction();
        try {
            $ins = $pdo->prepare(
                "INSERT IGNORE INTO vne_prediction_positions
                 (market_id, outcome_id, actor_address, side, shares, avg_price_cents, cost_vne, token_amount, token_symbol, tx_mode, chain_family, tx_hash)
                 VALUES (:mid, :oid, :actor, :side, :shares, :price, :cost, :tamt, :tsym, :tmode, :chain, :tx)"
            );
            $ins->execute([
                ':mid' => $marketId,
                ':oid' => $outcomeId,
                ':actor' => $actor,
                ':side' => $side,
                ':shares' => $shares,
                ':price' => $avgPriceCents,
                ':cost' => $costVne,
                ':tamt' => max(0, (float)($body['token_amount'] ?? 0)),
                ':tsym' => ((string)($body['token_symbol'] ?? 'tETH')) === 'tADA' ? 'tADA' : 'tETH',
                ':tmode' => ((string)($body['tx_mode'] ?? 'send-token')) === 'zero-gas' ? 'zero-gas' : 'send-token',
                ':chain' => ((string)($body['chain_family'] ?? 'evm')) === 'cardano' ? 'cardano' : 'evm',
                ':tx' => $txHash,
            ]);

            if ($ins->rowCount() === 0) {
                $pdo->rollBack();
                vneJsonError('Transaction hash already recorded.', 409, 'DUPLICATE_TX_HASH');
            }

            // Atomic row-level pool & volume updates (no lost updates under concurrency)
            $pdo->prepare("UPDATE vne_prediction_markets SET volume_vne = volume_vne + :c WHERE id = :mid")
                ->execute([':c' => $costVne, ':mid' => $marketId]);

            $poolCol = $side === 'YES' ? 'yes_pool' : 'no_pool';
            $pdo->prepare("UPDATE vne_prediction_outcomes SET {$poolCol} = {$poolCol} + :c, yes_pct = :yp WHERE id = :oid")
                ->execute([':c' => $costVne, ':yp' => $newYesPct, ':oid' => $outcomeId]);

            $pdo->commit();
            vneCacheInvalidatePrefix('pred_markets_', 'predictions');
            vneJsonSuccess(['recorded' => true, 'tx_hash' => $txHash], 201);
        } catch (PDOException $e) {
            $pdo->rollBack();
            error_log('POST place_bet DB error: ' . $e->getMessage());
            vneJsonError('Unable to record prediction bet.', 500);
        }
    }

    if (in_array($action, ['approve_market', 'reject_market', 'resolve_market'], true)) {
        requireValidAdminToken($config);
        $marketId = vneSanitizePlainText((string)($body['market_id'] ?? ''), 96);
        if ($marketId === '') {
            vneJsonError('Missing market_id.', 400);
        }

        $nextStatus = $action === 'approve_market' ? 'active' : ($action === 'reject_market' ? 'rejected' : 'resolved');
        $outcomeResults = isset($body['outcome_results']) && is_array($body['outcome_results']) ? $body['outcome_results'] : null;

        if ($pdo) {
            try {
                $stmt = $pdo->prepare(
                    "UPDATE vne_prediction_markets
                     SET status = :status,
                         outcome_results_json = COALESCE(:outcomes, outcome_results_json),
                         resolved_at = CASE WHEN :status = 'resolved' THEN NOW() ELSE resolved_at END
                     WHERE id = :id"
                );
                $stmt->execute([
                    ':status' => $nextStatus,
                    ':outcomes' => $outcomeResults ? json_encode($outcomeResults, JSON_UNESCAPED_UNICODE) : null,
                    ':id' => $marketId,
                ]);
                vneCacheInvalidatePrefix('pred_markets_', 'predictions');
            } catch (PDOException $e) {
                error_log('Admin prediction action DB error: ' . $e->getMessage());
                vneJsonError('Database error updating market.', 500);
            }
        } else {
            ensureJsonFallbackDir($storeDir);
            $fp = fopen($storeFile, 'c+');
            if ($fp && flock($fp, LOCK_EX)) {
                $store = readPredictionsJsonStore($fp);
                if (isset($store['markets'][$marketId])) {
                    $store['markets'][$marketId]['status'] = $nextStatus;
                    if ($outcomeResults !== null) {
                        $store['markets'][$marketId]['outcomeResults'] = $outcomeResults;
                    }
                    if ($nextStatus === 'resolved') {
                        $store['markets'][$marketId]['resolvedAt'] = gmdate('c');
                    }
                    ftruncate($fp, 0);
                    rewind($fp);
                    fwrite($fp, json_encode($store, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
                    fflush($fp);
                }
                flock($fp, LOCK_UN);
                fclose($fp);
            }
        }

        vneJsonSuccess(['market_id' => $marketId, 'status' => $nextStatus]);
    }

    vneJsonError('Unsupported action.', 400);
}

vneJsonError('Method not allowed.', 405);
