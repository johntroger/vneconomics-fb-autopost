<?php
/**
 * KẾT NỐI CƠ SỞ DỮ LIỆU MYSQL & NẠP CẤU HÌNH ĐA TẦNG
 * Dự án: VNEconomics FB Autopost
 */

defined('VNE_APP') or define('VNE_APP', true);

function getVneConfig(): array {
    static $cachedConfig = null;
    if ($cachedConfig !== null) {
        return $cachedConfig;
    }

    $candidates = [
        __DIR__ . '/config.php',
        __DIR__ . '/../config.php',
        __DIR__ . '/../../config.php',
        __DIR__ . '/config.sample.php'
    ];

    foreach ($candidates as $path) {
        if (file_exists($path)) {
            $loaded = require $path;
            if (is_array($loaded)) {
                $cachedConfig = $loaded;
                return $cachedConfig;
            }
        }
    }

    $cachedConfig = [];
    return $cachedConfig;
}

function getDbConnection(): ?PDO {
    static $pdo = null;
    static $attempted = false;

    if ($attempted) {
        return $pdo;
    }
    $attempted = true;

    $config = getVneConfig();
    $db = $config['db'] ?? [];
    if (empty($db['database']) || empty($db['username'])) {
        return null;
    }

    $host    = $db['host'] ?? 'localhost';
    $port    = (int)($db['port'] ?? 3306);
    $dbname  = $db['database'];
    $charset = $db['charset'] ?? 'utf8mb4';

    $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset={$charset}";
    try {
        $pdo = new PDO($dsn, $db['username'], $db['password'] ?? '', [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false
        ]);
        ensureAutopostSchema($pdo);
    } catch (\Throwable $e) {
        error_log('[VNE Autopost DB Error] ' . $e->getMessage());
        $pdo = null;
    }

    return $pdo;
}

/**
 * Tự động tạo bảng nếu chưa chạy migration thủ công (Self-Healing Schema)
 */
function ensureAutopostSchema(PDO $pdo): void {
    static $checked = false;
    if ($checked) return;
    $checked = true;

    $migrationFile = __DIR__ . '/../migrations/001_social_autopost.sql';
    if (!file_exists($migrationFile)) return;

    try {
        $check = $pdo->query("SHOW TABLES LIKE 'social_post_queue'")->fetch();
        if (!$check) {
            $sql = file_get_contents($migrationFile);
            if ($sql) {
                $pdo->exec($sql);
            }
        }

        // Self-healing cho Migration 002 (Telegram Autopost)
        $capCol = $pdo->query("SHOW COLUMNS FROM social_post_captions LIKE 'tg_caption_text'")->fetch();
        if (!$capCol) {
            $pdo->exec("ALTER TABLE social_post_captions ADD COLUMN tg_caption_text TEXT DEFAULT NULL AFTER caption_text");
        }

        $logCol = $pdo->query("SHOW COLUMNS FROM social_post_logs LIKE 'tg_status'")->fetch();
        if (!$logCol) {
            $pdo->exec("
                ALTER TABLE social_post_logs
                    ADD COLUMN tg_caption_used TEXT DEFAULT NULL AFTER caption_used,
                    ADD COLUMN tg_message_id VARCHAR(100) DEFAULT NULL AFTER fb_response_json,
                    ADD COLUMN tg_response_json TEXT DEFAULT NULL AFTER tg_message_id,
                    ADD COLUMN tg_status ENUM('success', 'failed', 'skipped') DEFAULT NULL AFTER status,
                    ADD COLUMN tg_error_message TEXT DEFAULT NULL AFTER error_message
            ");
        }
    } catch (\Throwable $e) {
        error_log('[VNE Schema Error] ' . $e->getMessage());
    }
}
