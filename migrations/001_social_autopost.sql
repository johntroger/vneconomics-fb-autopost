-- ==========================================================
-- MIGRATION 001: HỆ THỐNG ĐA NGUỒN TỰ ĐỘNG ĐĂNG BÀI FANPAGE
-- Dự án: VNEconomics (vneconomics.com & marketing2student.com)
-- Fanpage: https://www.facebook.com/vneconomics/
-- ==========================================================

CREATE TABLE IF NOT EXISTS social_post_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_site VARCHAR(50) NOT NULL COMMENT 'vneconomics | marketing2student',
    wp_post_id BIGINT UNSIGNED NOT NULL,
    category_slug VARCHAR(100) NOT NULL DEFAULT 'uncategorized',
    category_label VARCHAR(150) DEFAULT NULL,
    ref_slug VARCHAR(191) NOT NULL,
    title VARCHAR(500) NOT NULL,
    target_url VARCHAR(500) NOT NULL,
    image_url VARCHAR(700) DEFAULT NULL,
    excerpt_text TEXT DEFAULT NULL,
    content_plain MEDIUMTEXT DEFAULT NULL,
    post_count INT NOT NULL DEFAULT 0,
    last_angle TINYINT NOT NULL DEFAULT 0,
    last_posted_at DATETIME DEFAULT NULL,
    last_fb_post_id VARCHAR(100) DEFAULT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    published_at DATETIME DEFAULT NULL,
    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY idx_site_slug (source_site, ref_slug),
    INDEX idx_site_cat (source_site, category_slug),
    INDEX idx_active_lru (is_active, source_site, post_count, last_posted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lưu cache caption đã được Gemini viết lại theo từng (queue_id, angle)
-- Cho phép xem trước, chỉnh sửa tay, hoặc tái sử dụng khi chưa đăng
CREATE TABLE IF NOT EXISTS social_post_captions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    queue_id INT NOT NULL,
    angle TINYINT NOT NULL DEFAULT 1,
    caption_text TEXT NOT NULL,
    ai_model VARCHAR(100) DEFAULT NULL,
    is_manual_edited TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY idx_queue_angle (queue_id, angle),
    CONSTRAINT fk_caption_queue FOREIGN KEY (queue_id) REFERENCES social_post_queue(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Nhật ký bài đăng & Khóa bảo vệ chống đăng trùng theo (Ngày, Khung giờ)
CREATE TABLE IF NOT EXISTS social_post_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    posted_date DATE NOT NULL,
    slot_key VARCHAR(10) NOT NULL COMMENT '08:00 | 13:00 | 17:00 | 21:00',
    source_site VARCHAR(50) NOT NULL,
    category_slug VARCHAR(100) NOT NULL,
    ref_slug VARCHAR(191) NOT NULL,
    target_url VARCHAR(500) NOT NULL,
    post_angle TINYINT NOT NULL DEFAULT 1,
    caption_used TEXT DEFAULT NULL,
    fb_post_id VARCHAR(100) DEFAULT NULL,
    fb_response_json TEXT DEFAULT NULL,
    status ENUM('success', 'failed', 'skipped') NOT NULL DEFAULT 'success',
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY idx_daily_slot_guard (posted_date, slot_key),
    INDEX idx_site_slug (source_site, ref_slug),
    INDEX idx_date (posted_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
