-- ============================================================================
-- MIGRATION 006: BOOK NFTS 1-OF-1, PUBLIC ACCOUNT PROFILES & 10-POINT POLICY
-- Project: VNEconomics.com v2
-- Charset: utf8mb4_unicode_ci
-- ============================================================================

-- 1. Sổ cái NFT Sách Độc bản 1-of-1 (Write-Once Immutability)
CREATE TABLE IF NOT EXISTS vne_book_nfts (
    book_key VARCHAR(190) PRIMARY KEY,
    book_slug VARCHAR(190) NOT NULL,
    verify_code VARCHAR(64) NOT NULL UNIQUE,
    token_id VARCHAR(64) NOT NULL,
    owner_address VARCHAR(160) NOT NULL,
    owner_name VARCHAR(120) NOT NULL,
    payload_json LONGTEXT NOT NULL,
    minted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_book_nfts_slug (book_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Hồ sơ Công khai & Đường dẫn Cá nhân riêng (1-time Custom Handle Lock)
CREATE TABLE IF NOT EXISTS vne_public_profiles (
    original_handle VARCHAR(64) PRIMARY KEY,
    custom_handle VARCHAR(64) NOT NULL UNIQUE,
    display_name VARCHAR(120) NOT NULL,
    bio TEXT,
    location VARCHAR(100) DEFAULT 'Việt Nam',
    specialty_tag VARCHAR(120) DEFAULT 'VNEconomics Reader',
    avatar_url VARCHAR(512) DEFAULT '',
    has_edited_once TINYINT(1) NOT NULL DEFAULT 1,
    edited_at DATE DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Đồng bộ chính sách điểm mặc định 10 VNE (reset 100 VNE mỗi ngày)
ALTER TABLE user_points
    MODIFY COLUMN total_points INT UNSIGNED NOT NULL DEFAULT 10,
    MODIFY COLUMN lifetime_earned INT UNSIGNED NOT NULL DEFAULT 10;
