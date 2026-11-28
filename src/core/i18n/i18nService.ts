import { en } from './locales/en.ts';
import { vi, type LocaleDictionary } from './locales/vi.ts';

export type SupportedLanguage = 'vi' | 'en';

export const LANGUAGE_STORAGE_KEY = 'vne_language_preference';
export const DEFAULT_LANGUAGE: SupportedLanguage = 'vi';

const dictionaries: Record<SupportedLanguage, LocaleDictionary> = {
  vi,
  en,
};

let currentLanguage: SupportedLanguage = DEFAULT_LANGUAGE;
const listeners = new Set<(lang: SupportedLanguage) => void>();

export function getLanguage(): SupportedLanguage {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'vi' || saved === 'en') {
        return saved;
      }
    } catch {
      // Ignore storage access restriction
    }
  }
  return currentLanguage;
}

export function setLanguage(lang: SupportedLanguage): SupportedLanguage {
  const target: SupportedLanguage = lang === 'en' ? 'en' : 'vi';
  currentLanguage = target;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, target);
    } catch {
      // Ignore
    }
    if (document.documentElement) {
      document.documentElement.lang = target;
    }
  }

  listeners.forEach((fn) => {
    try {
      fn(target);
    } catch {
      // Ignore subscriber errors
    }
  });
  return target;
}

export function toggleLanguage(): SupportedLanguage {
  return setLanguage(getLanguage() === 'vi' ? 'en' : 'vi');
}

export function subscribeLanguage(listener: (lang: SupportedLanguage) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function resolvePath(obj: unknown, path: string): unknown {
  if (!obj || !path) return undefined;
  let cur: unknown = obj;
  for (const part of path.split('.')) {
    if (cur && typeof cur === 'object' && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return cur;
}

export function t(
  key: string,
  params?: Record<string, string | number>,
  fallback?: string,
): string {
  const active = getLanguage();
  let raw = resolvePath(dictionaries[active], key);
  if (raw === undefined && active !== DEFAULT_LANGUAGE) {
    raw = resolvePath(dictionaries[DEFAULT_LANGUAGE], key);
  }
  let text = typeof raw === 'string' ? raw : fallback || key;

  if (params) {
    text = text.replace(/\{(\w+)\}/g, (match, k) => (k in params ? String(params[k]) : match));
  }
  return text;
}
