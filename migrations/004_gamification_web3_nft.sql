-- ============================================================================
-- MIGRATION 004: GAMIFICATION (VNE POINTS, ECONOMY SIM) & WEB3 TESTNET NFT
-- Project: VNEconomics.com v2 (0đ Tiền Thật - 100% Testnet & Learning Rewards)
-- Charset: utf8mb4_unicode_ci
-- ============================================================================

-- 1. Số dư VNE Points & Chuỗi điểm danh (Anti-Cheat lưu phía Server)
CREATE TABLE IF NOT EXISTS user_points (
    user_id INT PRIMARY KEY,
    total_points INT UNSIGNED NOT NULL DEFAULT 50,
    lifetime_earned INT UNSIGNED NOT NULL DEFAULT 50,
    tier_level TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '1: Tân binh, 2: Nhà phân tích, 3: Chuyên gia, 4: Kiến trúc sư',
    daily_streak INT UNSIGNED NOT NULL DEFAULT 0,
    last_checkin_date DATE DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_points_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Nhật ký biến động VNE Points (chống spam/trùng lặp theo idempotency_key)
CREATE TABLE IF NOT EXISTS user_point_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    points_delta INT NOT NULL,
    action_type ENUM('checkin', 'read_post', 'complete_lesson', 'unlock_item', 'sim_harvest', 'sim_upgrade', 'testnet_tx', 'nft_mint', 'admin_adjust') NOT NULL,
    reason VARCHAR(255) NOT NULL,
    idempotency_key VARCHAR(120) DEFAULT NULL,
    tx_hash VARCHAR(120) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_point_idem (idempotency_key),
    INDEX idx_point_events_user (user_id, created_at),
    CONSTRAINT fk_pe_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Hồ sơ Game VNE Economy Sim (Quỹ đầu tư & Doanh nghiệp Số cá nhân)
CREATE TABLE IF NOT EXISTS sim_portfolios (
    user_id INT PRIMARY KEY,
    sim_cash DECIMAL(18, 2) NOT NULL DEFAULT 100000000.00 COMMENT '100 triệu VND ảo dùng cho Paper Trading',
    reputation_exp INT UNSIGNED NOT NULL DEFAULT 0,
    total_harvests INT UNSIGNED NOT NULL DEFAULT 0,
    last_evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sim_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tài sản Số & Vị thế Paper Trading trong Game (Lazy State Evaluation)
CREATE TABLE IF NOT EXISTS sim_assets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    asset_kind ENUM('validator_node', 'ai_gpu_cluster', 'digital_store', 'green_bond', 'paper_gold', 'paper_crypto', 'paper_stock') NOT NULL,
    asset_name VARCHAR(160) NOT NULL,
    level TINYINT UNSIGNED NOT NULL DEFAULT 1,
    quantity DECIMAL(18, 6) NOT NULL DEFAULT 1.000000,
    avg_entry_price DECIMAL(20, 4) NOT NULL DEFAULT 0,
    efficiency_score TINYINT UNSIGNED NOT NULL DEFAULT 90 COMMENT '0-100%, suy giảm theo thời gian cần bảo trì',
    last_evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sim_assets_user (user_id, asset_kind),
    CONSTRAINT fk_sa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Nonce xác thực đăng nhập Ví Web3 (SIWE EVM & CIP-8 Cardano - hết hạn 5 phút)
CREATE TABLE IF NOT EXISTS web3_auth_nonces (
    nonce VARCHAR(64) PRIMARY KEY,
    chain_family ENUM('evm', 'cardano') NOT NULL,
    wallet_address VARCHAR(160) NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nonce_wallet (wallet_address, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Voucher Nonce cấp phép Đúc NFT On-chain Testnet (Chống Replay Attack)
CREATE TABLE IF NOT EXISTS nft_mint_vouchers (
    nonce VARCHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    nft_type ENUM('passport', 'certificate', 'proof') NOT NULL,
    reference_id VARCHAR(80) DEFAULT NULL COMMENT 'course_id, asset_id hoặc milestone',
    recipient_address VARCHAR(160) NOT NULL,
    chain_family ENUM('evm', 'cardano') NOT NULL DEFAULT 'evm',
    sha256_proof VARCHAR(64) NOT NULL,
    is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_voucher_user (user_id, nft_type),
    CONSTRAINT fk_voucher_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Danh sách NFT đã đúc On-chain Testnet (Tra cứu công khai tại /verify/<id>)
CREATE TABLE IF NOT EXISTS user_nfts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    verify_code VARCHAR(40) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    nft_type ENUM('passport', 'certificate', 'proof') NOT NULL,
    title VARCHAR(255) NOT NULL,
    chain_family ENUM('evm', 'cardano') NOT NULL DEFAULT 'evm',
    network VARCHAR(60) NOT NULL COMMENT 'Base Sepolia, Ethereum Sepolia, Cardano Preprod...',
    contract_address VARCHAR(160) DEFAULT NULL,
    token_id VARCHAR(120) NOT NULL,
    tx_hash VARCHAR(120) NOT NULL,
    sha256_proof VARCHAR(64) NOT NULL,
    metadata_uri VARCHAR(500) DEFAULT NULL,
    milestone_stage TINYINT UNSIGNED NOT NULL DEFAULT 1,
    minted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nfts_user (user_id, nft_type),
    INDEX idx_nfts_tx (tx_hash),
    CONSTRAINT fk_nft_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO migrations_history (migration_name) VALUES ('004_gamification_web3_nft.sql');
