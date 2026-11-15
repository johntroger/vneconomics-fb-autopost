-- ==========================================================
-- MIGRATION 002: HỖ TRỢ ĐĂNG ĐỒNG THỜI LÊN TELEGRAM GROUP
-- Dự án: VNEconomics (vneconomics.com & marketing2student.com)
-- ==========================================================

ALTER TABLE social_post_captions
    ADD COLUMN tg_caption_text TEXT DEFAULT NULL AFTER caption_text;

ALTER TABLE social_post_logs
    ADD COLUMN tg_caption_used TEXT DEFAULT NULL AFTER caption_used,
    ADD COLUMN tg_message_id VARCHAR(100) DEFAULT NULL AFTER fb_response_json,
    ADD COLUMN tg_response_json TEXT DEFAULT NULL AFTER tg_message_id,
    ADD COLUMN tg_status ENUM('success', 'failed', 'skipped') DEFAULT NULL AFTER status,
    ADD COLUMN tg_error_message TEXT DEFAULT NULL AFTER error_message;
