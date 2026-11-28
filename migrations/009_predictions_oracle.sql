-- Migration 009: Scalable Prediction Markets, Atomic Outcome Pools & AI Oracle Resolution
-- Uses InnoDB Row-Level Locking, unique tx_hash anti-replay, and composite range-query indexes.

CREATE TABLE IF NOT EXISTS vne_prediction_markets (
  id VARCHAR(96) NOT NULL PRIMARY KEY,
  slug VARCHAR(128) NOT NULL UNIQUE,
  market_type ENUM('binary', 'multi') NOT NULL DEFAULT 'binary',
  category VARCHAR(48) NOT NULL DEFAULT 'macro',
  status ENUM('pending_review', 'active', 'resolved', 'rejected') NOT NULL DEFAULT 'pending_review',
  title_vi VARCHAR(500) NOT NULL,
  title_en VARCHAR(500) NOT NULL,
  resolution_source_url VARCHAR(500) NOT NULL,
  end_date DATE NOT NULL,
  volume_vne DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
  liquidity_vne DECIMAL(16, 2) NOT NULL DEFAULT 10000.00,
  outcome_results_json JSON NULL,
  ai_moderation_json JSON NULL,
  ai_oracle_scan_json JSON NULL,
  payload_json JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  INDEX idx_pred_status_cat (status, category),
  INDEX idx_pred_end_date (end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vne_prediction_outcomes (
  id VARCHAR(112) NOT NULL PRIMARY KEY,
  market_id VARCHAR(96) NOT NULL,
  label_vi VARCHAR(255) NOT NULL,
  label_en VARCHAR(255) NOT NULL,
  yes_pct TINYINT UNSIGNED NOT NULL DEFAULT 50,
  yes_pool DECIMAL(16, 2) NOT NULL DEFAULT 5000.00,
  no_pool DECIMAL(16, 2) NOT NULL DEFAULT 5000.00,
  history_json JSON NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pred_out_market (market_id),
  CONSTRAINT fk_pred_out_market FOREIGN KEY (market_id) REFERENCES vne_prediction_markets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vne_prediction_positions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  market_id VARCHAR(96) NOT NULL,
  outcome_id VARCHAR(112) NOT NULL,
  actor_address VARCHAR(160) NOT NULL,
  side ENUM('YES', 'NO') NOT NULL,
  shares DECIMAL(14, 2) NOT NULL,
  avg_price_cents DECIMAL(6, 2) NOT NULL,
  cost_vne DECIMAL(14, 2) NOT NULL,
  token_amount DECIMAL(18, 8) NOT NULL DEFAULT 0,
  token_symbol ENUM('tETH', 'tADA') NOT NULL DEFAULT 'tETH',
  tx_mode ENUM('send-token', 'zero-gas') NOT NULL DEFAULT 'send-token',
  chain_family ENUM('evm', 'cardano') NOT NULL DEFAULT 'evm',
  tx_hash VARCHAR(128) NOT NULL,
  claimed TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_pred_tx (tx_hash),
  INDEX idx_pred_market_outcome (market_id, outcome_id),
  INDEX idx_pred_actor (actor_address, created_at),
  CONSTRAINT fk_pred_pos_market FOREIGN KEY (market_id) REFERENCES vne_prediction_markets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Composite index for SARGable daily cap range queries in api/game.php (eliminates DATE(created_at) full scans)
ALTER TABLE user_point_events
  ADD INDEX IF NOT EXISTS idx_point_user_action_date (user_id, action_type, created_at);
