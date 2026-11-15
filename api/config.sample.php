<?php
/**
 * MẪU CẤU HÌNH HỆ THỐNG TỰ ĐỘNG ĐĂNG BÀI FACEBOOK - VNECONOMICS
 *
 * Hướng dẫn:
 * 1. Sao chép file này thành api/config.php (hoặc đặt config.php ở thư mục cha ngoài httpdocs trên Plesk).
 * 2. Điền thông tin MySQL từ Plesk.
 * 3. Điền Facebook Page ID & Never-Expiring Page Access Token.
 * 4. Điền Gemini API Key (trả phí) để tự động viết lại bài chuẩn Facebook.
 * 5. Không commit api/config.php lên Git.
 */

defined('VNE_APP') or die('Truy cập trực tiếp bị từ chối.');

return [
    'db' => [
        'host'     => 'localhost',
        'port'     => 3306,
        'database' => 'vneconomics_autopost',
        'username' => 'vne_user',
        'password' => 'MAT_KHAU_DB_MANH',
        'charset'  => 'utf8mb4'
    ],
    'security' => [
        'admin_token' => 'THAY_BANG_CHUOI_ADMIN_TOKEN_32_KY_TU',
        'cron_secret' => 'vne_fb_cron_2026_secret_key'
    ],
    'facebook' => [
        'enabled'           => false, // Đặt true khi đã điền page_id và page_access_token thật (false = chế độ SIMULATED để test)
        'page_id'           => 'YOUR_FACEBOOK_PAGE_ID',
        'page_access_token' => 'YOUR_NEVER_EXPIRING_PAGE_ACCESS_TOKEN',
        'graph_version'     => 'v21.0'
    ],
    'gemini' => [
        'api_key'         => 'YOUR_GEMINI_API_KEY',
        // Các model khả dụng hiện tại: gemini-4-hydrogen (khuyên dùng), gemini-4-argon, gemini-4-carbon, gemini-3.8-flash, gemini-3.5-flash-lite
        'model'           => 'gemini-4-hydrogen',
        'fallback_models' => ['gemini-3.8-flash', 'gemini-3.5-flash-lite'],
        'temperature'     => 0.65,
        'timeout'         => 25
    ],
    'sites' => [
        'vneconomics' => [
            'name'           => 'VNEconomics',
            'base_url'       => 'https://vneconomics.com',
            'wp_api_url'     => 'https://vneconomics.com/wp-json/wp/v2/posts',
            'sync_pages'     => 3, // Số trang WP API quét mỗi lần (tối đa 100 bài/trang)
            'per_page'       => 50,
            'fallback_image' => __DIR__ . '/../assets/fallback-vneconomics.jpg'
        ],
        'marketing2student' => [
            'name'           => 'Marketing2Student',
            'base_url'       => 'https://marketing2student.com',
            'wp_api_url'     => 'https://marketing2student.com/wp-json/wp/v2/posts',
            'sync_pages'     => 3,
            'per_page'       => 50,
            'fallback_image' => __DIR__ . '/../assets/fallback-marketing2student.jpg'
        ]
    ],
    // Lịch đăng cố định 4 khung giờ/ngày (Asia/Ho_Chi_Minh):
    // 2 bài vneconomics (08:00, 17:00) + 2 bài marketing2student (13:00, 21:00)
    'schedule_slots' => [
        '08:00' => [
            'source_site' => 'vneconomics',
            'label'       => '08:00 Sáng (VNEconomics)'
        ],
        '13:00' => [
            'source_site' => 'marketing2student',
            'label'       => '13:00 Chiều (Marketing2Student)'
        ],
        '17:00' => [
            'source_site' => 'vneconomics',
            'label'       => '17:00 Chiều (VNEconomics)'
        ],
        '21:00' => [
            'source_site' => 'marketing2student',
            'label'       => '21:00 Tối (Marketing2Student)'
        ]
    ]
];
