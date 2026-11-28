-- Migration 008: Scalable InnoDB tables for Crypto & Stock Simulated Exchanges (10,000+ CCU ready)
-- Uses Row-Level Locking and composite indexes on (user_id, status) so settling one user's trade never locks others.

CREATE TABLE IF NOT EXISTS vne_sim_positions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  client_position_id VARCHAR(64) NOT NULL,
  market_kind ENUM('crypto', 'stock', 'commodity', 'forex', 'carbon') NOT NULL,
  symbol VARCHAR(24) NOT NULL,
  side ENUM('long', 'short') NOT NULL DEFAULT 'long',
  leverage TINYINT UNSIGNED NOT NULL DEFAULT 1,
  margin_vne DECIMAL(14, 2) NOT NULL,
  units DECIMAL(20, 8) NOT NULL,
  entry_price_vne DECIMAL(18, 4) NOT NULL,
  take_profit_vne DECIMAL(18, 4) NULL,
  stop_loss_vne DECIMAL(18, 4) NULL,
  status ENUM('open', 'closed', 'liquidated') NOT NULL DEFAULT 'open',
  realized_pnl_vne DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_user_client_pos (user_id, client_position_id),
  KEY idx_user_status (user_id, status),
  KEY idx_market_created (market_kind, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vne_sim_trade_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  market_kind ENUM('crypto', 'stock', 'commodity', 'forex', 'carbon') NOT NULL,
  symbol VARCHAR(24) NOT NULL,
  side ENUM('long', 'short') NOT NULL,
  margin_vne DECIMAL(14, 2) NOT NULL,
  entry_price_vne DECIMAL(18, 4) NOT NULL,
  exit_price_vne DECIMAL(18, 4) NOT NULL,
  pnl_vne DECIMAL(14, 2) NOT NULL,
  fee_vne DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  settled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_settled (user_id, settled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
