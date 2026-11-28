<?php
/**
 * FILE/JSON + APCU RESPONSE CACHE (STALE-WHILE-REVALIDATE & SINGLE-FLIGHT)
 * Chống hiệu ứng "đàn bò tót" (Cache Stampede) và đệm bộ đếm lượt xem bài viết
 * để giảm tối đa tải MySQL & I/O trên Plesk khi có hàng chục nghìn CCU.
 */

defined('VNE_APP') or die('Truy cập trực tiếp bị từ chối.');

function vneGetCacheDir(string $sub = 'data'): string {
    $base = __DIR__ . '/../cache/' . preg_replace('/[^a-zA-Z0-9_\-]/', '', $sub);
    if (!is_dir($base)) {
        @mkdir($base, 0755, true);
    }
    return $base;
}

function vneCachePath(string $key, string $sub = 'data'): string {
    $safe = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $key);
    return vneGetCacheDir($sub) . '/' . $safe . '.json';
}

function vneApcuAvailable(): bool {
    return function_exists('apcu_fetch') && function_exists('apcu_store') && (bool)ini_get('apc.enabled');
}

function vneCacheGet(string $key, int $ttlSeconds = 300, string $sub = 'data') {
    if (vneApcuAvailable()) {
        $ok = false;
        $val = apcu_fetch("vne:{$sub}:{$key}", $ok);
        if ($ok) {
            return $val;
        }
    }

    $path = vneCachePath($key, $sub);
    if (!is_file($path)) {
        return null;
    }
    $mtime = @filemtime($path);
    if ($mtime === false || (time() - $mtime) > $ttlSeconds) {
        return null;
    }
    $raw = @file_get_contents($path);
    if ($raw === false) {
        return null;
    }
    $decoded = json_decode($raw, true);
    if (is_array($decoded) && array_key_exists('__vne_exp', $decoded) && array_key_exists('data', $decoded)) {
        return $decoded['data'];
    }
    return $decoded ?? null;
}

function vneCacheSet(string $key, $value, string $sub = 'data', int $ttlSeconds = 300): bool {
    if (vneApcuAvailable()) {
        @apcu_store("vne:{$sub}:{$key}", $value, max(10, $ttlSeconds));
    }

    $path = vneCachePath($key, $sub);
    $envelope = ['__vne_exp' => time() + $ttlSeconds, 'data' => $value];
    $json = json_encode($envelope, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        return false;
    }

    $tmp = $path . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, $json, LOCK_EX) !== false) {
        if (@rename($tmp, $path)) {
            return true;
        }
        @unlink($tmp);
    }
    return @file_put_contents($path, $json, LOCK_EX) !== false;
}

/**
 * Single-Flight Stale-While-Revalidate:
 * - Nếu cache còn hạn: trả về ngay.
 * - Nếu hết hạn: chỉ 1 worker giữ lock (LOCK_EX | LOCK_NB) đi rebuild;
 *   các request đồng thời khác nhận ngay dữ liệu stale cũ trong 0.5ms.
 */
function vneCacheGetOrBuild(string $key, int $ttlSeconds, callable $builder, string $sub = 'data') {
    $fresh = vneCacheGet($key, $ttlSeconds, $sub);
    if ($fresh !== null) {
        return $fresh;
    }

    $path = vneCachePath($key, $sub);
    $stale = null;
    if (is_file($path)) {
        $raw = @file_get_contents($path);
        if ($raw !== false) {
            $decoded = json_decode($raw, true);
            $stale = (is_array($decoded) && array_key_exists('data', $decoded)) ? $decoded['data'] : $decoded;
        }
    }

    $lockPath = $path . '.lock';
    $lockFp = @fopen($lockPath, 'c');
    if ($lockFp && flock($lockFp, LOCK_EX | LOCK_NB)) {
        try {
            $built = $builder();
            if ($built !== null) {
                vneCacheSet($key, $built, $sub, $ttlSeconds);
                return $built;
            }
        } finally {
            flock($lockFp, LOCK_UN);
            fclose($lockFp);
        }
    } else {
        if ($lockFp) {
            fclose($lockFp);
        }
        if ($stale !== null) {
            return $stale;
        }
    }

    $built = $builder();
    if ($built !== null) {
        vneCacheSet($key, $built, $sub, $ttlSeconds);
    }
    return $built ?? $stale;
}

function vneCacheInvalidatePrefix(string $prefix, string $sub = 'data'): int {
    $dir = vneGetCacheDir($sub);
    $safePrefix = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $prefix);
    $files = glob($dir . '/' . $safePrefix . '*.json') ?: [];
    $deleted = 0;
    foreach ($files as $file) {
        if (@unlink($file)) {
            $deleted++;
        }
    }
    if (vneApcuAvailable() && class_exists('APCUIterator')) {
        $esc = preg_quote("vne:{$sub}:{$prefix}", '/');
        foreach (new APCUIterator("/^{$esc}/") as $entry) {
            @apcu_delete($entry['key']);
        }
    }
    return $deleted;
}

/**
 * Đệm bộ đếm lượt xem bài viết (tránh Row-Level Lock khi hàng nghìn user đọc 1 bài cùng lúc).
 * Ghi gộp xuống MySQL mỗi $flushThreshold lượt hoặc mỗi $flushSeconds giây.
 */
function vneBufferPostView(PDO $pdo, int $postId, int $flushThreshold = 50, int $flushSeconds = 60): void {
    if ($postId <= 0) {
        return;
    }
    $dir = vneGetCacheDir('views');
    $file = $dir . '/post_' . $postId . '.cnt';
    $fp = @fopen($file, 'c+');
    if (!$fp) {
        return;
    }

    $shouldFlush = 0;
    if (flock($fp, LOCK_EX)) {
        $raw = trim((string)stream_get_contents($fp));
        $parts = $raw !== '' ? explode('|', $raw) : [0, time()];
        $count = ((int)($parts[0] ?? 0)) + 1;
        $lastFlush = (int)($parts[1] ?? time());
        $now = time();

        if ($count >= $flushThreshold || ($now - $lastFlush) >= $flushSeconds) {
            $shouldFlush = $count;
            $nextState = "0|{$now}";
        } else {
            $nextState = "{$count}|{$lastFlush}";
        }

        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, $nextState);
        fflush($fp);
        flock($fp, LOCK_UN);
    }
    fclose($fp);

    if ($shouldFlush > 0) {
        try {
            $pdo->prepare("UPDATE posts SET views = views + :delta WHERE id = :id")
                ->execute([':delta' => $shouldFlush, ':id' => $postId]);
        } catch (\Throwable $e) {
            error_log('[VNE Views Flush Error] ' . $e->getMessage());
        }
    }
}
