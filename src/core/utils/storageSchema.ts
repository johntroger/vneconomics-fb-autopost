import { useEffect, useState } from 'react';

export const VNE_STORAGE_SCHEMA_VERSION = 2;
const KEY_SCHEMA_VERSION = 'vne_storage_schema_version';

/**
 * Chạy 1 lần khi khởi động ứng dụng để chuẩn hóa & di trú schema localStorage
 * an toàn giữa các phiên bản nâng cấp VNEconomics.
 */
export function runStorageMigrations(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    const currentVersion = Number(localStorage.getItem(KEY_SCHEMA_VERSION) || '0');
    if (currentVersion >= VNE_STORAGE_SCHEMA_VERSION) return;

    // Migration v1 -> v2:
    // Chuẩn hóa danh sách sách đã mở khóa (loại bỏ giá trị rỗng / trùng lặp)
    const rawUnlocked = localStorage.getItem('vne_unlocked_items');
    if (rawUnlocked) {
      const parsed = JSON.parse(rawUnlocked);
      if (Array.isArray(parsed)) {
        const cleaned = Array.from(new Set(parsed.filter((k): k is string => typeof k === 'string' && k.trim().length > 0)));
        localStorage.setItem('vne_unlocked_items', JSON.stringify(cleaned));
      }
    }

    localStorage.setItem(KEY_SCHEMA_VERSION, String(VNE_STORAGE_SCHEMA_VERSION));
  } catch {
    // Ignore storage quota or malformed JSON
  }
}

/**
 * Debounce hook chuẩn giúp tránh tìm kiếm tuyến tính O(N) trên mỗi nhịp gõ phím
 * khi danh mục mở rộng lên hàng nghìn bài viết / sách / thuật ngữ.
 */
export function useDebouncedValue<T>(value: T, delayMs = 200): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
