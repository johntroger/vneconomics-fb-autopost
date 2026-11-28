-- ============================================================================
-- MIGRATION 007: DAILY 100-VNE RESET, UNLOCKED ITEMS & PERSONAL BOOKSHELF
-- Project: VNEconomics.com v2 (Phase 2 Backend & DB Standardization)
-- Charset: utf8mb4_unicode_ci
-- ============================================================================

-- 1. Cột theo dõi ngày reset 100 VNE Points tự động phía Server
ALTER TABLE user_points
    ADD COLUMN IF NOT EXISTS last_daily_reset_date DATE DEFAULT NULL AFTER last_checkin_date;

-- 2. Danh sách tài nguyên đã mở khóa bằng VNE Points (Sách, Khóa học, AI Skills)
CREATE TABLE IF NOT EXISTS user_unlocked_items (
    user_id INT NOT NULL,
    item_key VARCHAR(190) NOT NULL,
    points_spent INT UNSIGNED NOT NULL DEFAULT 10,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, item_key),
    INDEX idx_unlocked_user_time (user_id, unlocked_at),
    CONSTRAINT fk_unlocked_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tủ sách cá nhân của người dùng (/tu-sach-cua-toi/)
CREATE TABLE IF NOT EXISTS user_bookshelf (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    book_key VARCHAR(190) NOT NULL,
    book_slug VARCHAR(190) DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    author_or_category VARCHAR(160) DEFAULT '',
    cover_image VARCHAR(512) DEFAULT NULL,
    status ENUM('want_to_read', 'reading', 'completed') NOT NULL DEFAULT 'want_to_read',
    progress_pct TINYINT UNSIGNED NOT NULL DEFAULT 0,
    reading_exp INT UNSIGNED NOT NULL DEFAULT 10,
    personal_goal VARCHAR(255) DEFAULT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY uq_user_book (user_id, book_key),
    INDEX idx_bookshelf_user_status (user_id, status),
    CONSTRAINT fk_bookshelf_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Nhật ký & Ghi chú đọc sách (Reading Diary Timeline)
CREATE TABLE IF NOT EXISTS user_bookshelf_notes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    book_key VARCHAR(190) NOT NULL,
    book_title VARCHAR(255) NOT NULL,
    tag ENUM('quote', 'insight', 'summary', 'question') NOT NULL DEFAULT 'insight',
    note TEXT NOT NULL,
    page_or_chapter VARCHAR(120) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_bookshelf_notes_user (user_id, created_at),
    CONSTRAINT fk_bookshelf_notes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
