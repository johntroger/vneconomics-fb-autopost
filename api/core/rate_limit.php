<?php
/**
 * RATE LIMITER THEO IP (APCU + SHARDED FILE BUCKETS)
 * - Ưu tiên APCu (RAM in-memory, 0 disk I/O) nếu hosting hỗ trợ.
 * - Fallback sang file lock được băm (shard) 256 thư mục con (00..ff) để tránh nghẽn thư mục & cạn inode.
 */

defined('VNE_APP') or die('Truy cập trực tiếp bị từ chối.');

function vneEnforceRateLimit(string $bucket, int $maxRequests = 60, int $windowSeconds = 60): void {
    $ip = function_exists('vneGetClientIp') ? vneGetClientIp() : ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    $key = hash('sha256', $bucket . '|' . $ip);
    $now = time();

    if (function_exists('apcu_inc') && function_exists('apcu_add') && (bool)ini_get('apc.enabled')) {
        $windowSlot = (int)floor($now / max(1, $windowSeconds));
        $apcuKey = "vne:rl:{$key}:{$windowSlot}";
        apcu_add($apcuKey, 0, $windowSeconds + 5);
        $count = (int)apcu_inc($apcuKey);
        if ($count > $maxRequests) {
            header('Retry-After: ' . $windowSeconds);
            vneJsonError('Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.', 429, 'RATE_LIMITED');
        }
        return;
    }

    $shard = substr($key, 0, 2);
    $dir = vneGetCacheDir('ratelimit') . '/' . $shard;
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    $file = $dir . '/' . $key . '.json';

    $fp = @fopen($file, 'c+');
    if (!$fp) {
        return; // Fail-open nhẹ nếu thư mục tạm chưa ghi được
    }

    if (flock($fp, LOCK_EX)) {
        $raw = stream_get_contents($fp);
        $timestamps = $raw ? (json_decode($raw, true) ?: []) : [];
        $cutoff = $now - $windowSeconds;
        $timestamps = array_values(array_filter($timestamps, static fn($ts) => is_int($ts) && $ts > $cutoff));

        if (count($timestamps) >= $maxRequests) {
            flock($fp, LOCK_UN);
            fclose($fp);
            header('Retry-After: ' . $windowSeconds);
            vneJsonError('Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.', 429, 'RATE_LIMITED');
        }

        $timestamps[] = $now;
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($timestamps));
        fflush($fp);
        flock($fp, LOCK_UN);
    }
    fclose($fp);

    // Probabilistic garbage collection scoped strictly to the 2-char shard (~256x smaller than global)
    if (random_int(1, 200) === 1) {
        foreach (@glob($dir . '/*.json') ?: [] as $oldFile) {
            if (@filemtime($oldFile) < $now - 3600) {
                @unlink($oldFile);
            }
        }
    }
}
