-- ============================================================================
-- MIGRATION 003: CORE PLATFORM SCHEMA (BLOG, E-LIBRARY, ACADEMY, SEO/GEO/AEO)
-- Project: VNEconomics.com v2 (PHP 8 + MySQL 8)
-- Charset: utf8mb4_unicode_ci
-- ============================================================================

-- 1. Người dùng & Hồ sơ Tác giả E-E-A-T (Firebase Auth + Multi-chain Web3)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firebase_uid VARCHAR(128) DEFAULT NULL,
    email VARCHAR(191) DEFAULT NULL,
    evm_address VARCHAR(42) DEFAULT NULL,
    cardano_address VARCHAR(160) DEFAULT NULL,
    role ENUM('member', 'editor', 'admin') NOT NULL DEFAULT 'member',
    display_name VARCHAR(150) NOT NULL DEFAULT 'Độc giả VNEconomics',
    slug VARCHAR(160) DEFAULT NULL,
    avatar_url VARCHAR(500) DEFAULT NULL,
    bio TEXT DEFAULT NULL,
    credentials_json JSON DEFAULT NULL COMMENT 'E-E-A-T: jobTitle, affiliation, sameAs links',
    last_login_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_firebase_uid (firebase_uid),
    UNIQUE KEY uq_email (email),
    UNIQUE KEY uq_evm_address (evm_address),
    UNIQUE KEY uq_cardano_address (cardano_address),
    UNIQUE KEY uq_user_slug (slug),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 5 Trụ cột Tri thức (Topic Pillars)
CREATE TABLE IF NOT EXISTS pillars (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    short_label VARCHAR(80) NOT NULL,
    description TEXT DEFAULT NULL,
    seo_title VARCHAR(255) DEFAULT NULL,
    seo_desc VARCHAR(500) DEFAULT NULL,
    accent_color VARCHAR(30) DEFAULT '#0F766E',
    sort_order TINYINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO pillars (slug, name, short_label, description, seo_title, seo_desc, accent_color, sort_order) VALUES
('kinh-te-so', 'Kinh tế số & Chuyển đổi số', 'Kinh tế số', 'Phân tích kinh tế số, chuyển đổi số doanh nghiệp và công nghệ ứng dụng tại Việt Nam.', 'Kinh tế số & Chuyển đổi số | VNEconomics', 'Kiến thức, báo cáo và phân tích chuyên sâu về kinh tế số và chuyển đổi số tại Việt Nam.', '#0F766E', 1),
('blockchain-tai-san-so', 'Blockchain & Tài sản số', 'Blockchain', 'Kiến thức Blockchain, tiền mã hóa, pháp lý tài sản số và hệ sinh thái Cardano Việt Nam.', 'Blockchain & Tài sản số | VNEconomics', 'Nghiên cứu Blockchain, tài sản số, Web3, Cardano dRep và chính sách pháp lý tài sản số.', '#1D4ED8', 2),
('ai-cong-nghe', 'AI & Công nghệ mới', 'AI & Tech', 'Trí tuệ nhân tạo ứng dụng, tự động hóa, phân tích dữ liệu và công nghệ mới nổi.', 'AI & Công nghệ mới | VNEconomics', 'Ứng dụng AI thực chiến trong kinh tế, tài chính, quản trị và nghiên cứu khoa học.', '#7C3AED', 3),
('digital-marketing', 'Digital Marketing & Tăng trưởng', 'Marketing', 'Chiến lược Digital Marketing, AI Marketing, truyền thông số và tăng trưởng bền vững.', 'Digital Marketing & AI Marketing | VNEconomics', 'Chiến lược Digital Marketing hiện đại, AI Marketing và tối ưu chuyển đổi số.', '#B45309', 4),
('nghien-cuu-khoa-hoc', 'Nghiên cứu Khoa học & Học thuật', 'Nghiên cứu', 'Phương pháp nghiên cứu khoa học, mô hình định lượng, công bố quốc tế và tài nguyên học thuật.', 'Nghiên cứu Khoa học & Phương pháp luận | VNEconomics', 'Hướng dẫn phương pháp nghiên cứu khoa học, mô hình kinh tế lượng và công bố học thuật.', '#047857', 5);

-- 3. Thẻ phân loại (Tags)
CREATE TABLE IF NOT EXISTS tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    wp_term_id INT DEFAULT NULL,
    slug VARCHAR(140) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bài viết & Trang tĩnh (216+ posts & pages)
CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    wp_id INT DEFAULT NULL,
    post_type ENUM('post', 'page', 'daily_brief') NOT NULL DEFAULT 'post',
    slug VARCHAR(220) NOT NULL,
    title VARCHAR(500) NOT NULL,
    tldr_summary TEXT DEFAULT NULL COMMENT 'Answer-First TL;DR (40-60 từ) + Key Takeaways cho AEO/GEO',
    excerpt TEXT DEFAULT NULL,
    content_html LONGTEXT NOT NULL,
    faq_json JSON DEFAULT NULL COMMENT 'Mảng [{q, a}] xuất FAQPage Schema',
    citations_json JSON DEFAULT NULL COMMENT 'Nguồn tham khảo E-E-A-T',
    pillar_id INT DEFAULT NULL,
    author_id INT DEFAULT NULL,
    featured_image VARCHAR(500) DEFAULT NULL,
    seo_title VARCHAR(255) DEFAULT NULL,
    seo_desc VARCHAR(500) DEFAULT NULL,
    canonical_url VARCHAR(500) DEFAULT NULL,
    status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'published',
    reading_minutes TINYINT UNSIGNED NOT NULL DEFAULT 5,
    views INT UNSIGNED NOT NULL DEFAULT 0,
    published_at DATETIME DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_post_slug (slug),
    UNIQUE KEY uq_post_wp_id (wp_id),
    INDEX idx_posts_feed (status, post_type, pillar_id, published_at),
    INDEX idx_posts_views (status, views),
    FULLTEXT KEY ft_posts_search (title, tldr_summary, content_html),
    CONSTRAINT fk_posts_pillar FOREIGN KEY (pillar_id) REFERENCES pillars(id) ON DELETE SET NULL,
    CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_tags (
    post_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (post_id, tag_id),
    CONSTRAINT fk_pt_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_pt_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Từ điển Thuật ngữ AEO (Tách từ Từ điển Cardano & Từ điển Blockchain)
CREATE TABLE IF NOT EXISTS glossary_terms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(180) NOT NULL UNIQUE,
    term VARCHAR(220) NOT NULL,
    short_definition TEXT NOT NULL COMMENT 'Định nghĩa ngắn 40-60 từ cho Featured Snippet & DefinedTerm',
    full_explanation LONGTEXT DEFAULT NULL,
    faq_json JSON DEFAULT NULL,
    related_pillar_id INT DEFAULT NULL,
    source_label VARCHAR(120) DEFAULT 'Cardano & Kinh tế số',
    views INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FULLTEXT KEY ft_glossary_search (term, short_definition),
    CONSTRAINT fk_glossary_pillar FOREIGN KEY (related_pillar_id) REFERENCES pillars(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Bình luận bài viết
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    wp_comment_id INT DEFAULT NULL,
    post_id INT NOT NULL,
    user_id INT DEFAULT NULL,
    parent_id INT DEFAULT NULL,
    author_name VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    status ENUM('pending', 'approved', 'spam') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_wp_comment_id (wp_comment_id),
    INDEX idx_post_comments (post_id, status, created_at),
    CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Thư viện Sách, Tài liệu & AI Skills (Mở khóa 0đ tiền thật)
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    wp_id INT DEFAULT NULL,
    slug VARCHAR(220) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    category_slug VARCHAR(120) DEFAULT NULL,
    category_name VARCHAR(180) DEFAULT NULL,
    unlock_type ENUM('free', 'points', 'testnet_tx') NOT NULL DEFAULT 'free',
    points_cost INT UNSIGNED NOT NULL DEFAULT 0,
    cover_image VARCHAR(500) DEFAULT NULL,
    file_path VARCHAR(500) DEFAULT NULL COMMENT 'Đường dẫn cục bộ hoặc link mở an toàn sau khi xác thực',
    external_url VARCHAR(500) DEFAULT NULL,
    short_description TEXT DEFAULT NULL,
    description_html LONGTEXT DEFAULT NULL,
    faq_json JSON DEFAULT NULL,
    download_count INT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('draft', 'published') NOT NULL DEFAULT 'published',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_prod_wp_id (wp_id),
    INDEX idx_prod_cat (status, category_slug),
    FULLTEXT KEY ft_products_search (title, short_description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS unlock_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_type ENUM('product', 'course', 'ai_skill', 'dataset') NOT NULL DEFAULT 'product',
    item_id INT NOT NULL,
    unlock_method ENUM('free', 'points', 'evm_testnet', 'cardano_testnet') NOT NULL,
    points_spent INT UNSIGNED NOT NULL DEFAULT 0,
    tx_hash VARCHAR(120) DEFAULT NULL,
    network VARCHAR(60) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_unlock (user_id, item_type, item_id),
    INDEX idx_unlock_user (user_id, created_at),
    CONSTRAINT fk_unlock_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Học viện 10 Khóa học (LearnPress Migration)
CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    wp_id INT DEFAULT NULL,
    slug VARCHAR(220) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    level_label VARCHAR(80) DEFAULT 'Cơ bản',
    duration_label VARCHAR(80) DEFAULT NULL,
    students_count INT UNSIGNED NOT NULL DEFAULT 0,
    cover_image VARCHAR(500) DEFAULT NULL,
    description_html LONGTEXT DEFAULT NULL,
    syllabus_json JSON DEFAULT NULL,
    faq_json JSON DEFAULT NULL,
    reward_points INT UNSIGNED NOT NULL DEFAULT 100,
    status ENUM('draft', 'published') NOT NULL DEFAULT 'published',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_course_wp_id (wp_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_lessons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    section_title VARCHAR(255) DEFAULT NULL,
    title VARCHAR(300) NOT NULL,
    slug VARCHAR(220) NOT NULL,
    content_html LONGTEXT DEFAULT NULL,
    video_url VARCHAR(500) DEFAULT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    INDEX idx_course_order (course_id, sort_order),
    CONSTRAINT fk_lesson_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    progress_percent TINYINT UNSIGNED NOT NULL DEFAULT 0,
    completed_lessons_json JSON DEFAULT NULL,
    completed_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_course (user_id, course_id),
    CONSTRAINT fk_enroll_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_enroll_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Dữ liệu Thị trường & Snapshot cho AI Phân tích + Paper Trading
CREATE TABLE IF NOT EXISTS market_snapshots (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    market_type ENUM('gold', 'crypto', 'forex', 'interest_rate', 'stock') NOT NULL,
    symbol VARCHAR(60) NOT NULL,
    label VARCHAR(160) NOT NULL,
    price_value DECIMAL(20, 4) NOT NULL DEFAULT 0,
    currency VARCHAR(16) NOT NULL DEFAULT 'VND',
    change_24h DECIMAL(10, 4) DEFAULT 0,
    payload_json JSON DEFAULT NULL,
    source_name VARCHAR(120) DEFAULT NULL,
    captured_at DATETIME NOT NULL,
    INDEX idx_market_latest (market_type, symbol, captured_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Bản đồ 301 Redirect & Log 404 thời gian thực
CREATE TABLE IF NOT EXISTS redirects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_path VARCHAR(500) NOT NULL,
    target_url VARCHAR(500) NOT NULL,
    http_code SMALLINT NOT NULL DEFAULT 301,
    hit_count INT UNSIGNED NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_redirect_source (source_path(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS not_found_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    request_path VARCHAR(500) NOT NULL,
    referrer VARCHAR(500) DEFAULT NULL,
    user_agent VARCHAR(255) DEFAULT NULL,
    hit_count INT UNSIGNED NOT NULL DEFAULT 1,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_404_path (request_path(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS migrations_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO migrations_history (migration_name) VALUES ('003_core_platform_schema.sql');
