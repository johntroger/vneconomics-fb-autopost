import rawSearchIndex from '../../data/search-index.json';
import type { SupportedLanguage } from '../i18n/i18nService.ts';

interface CompactSearchRow {
  k: 'post' | 'product' | 'course' | 'glossary';
  t: string;
  te: string;
  u: string;
}

export interface HeaderSearchItem {
  kind: 'post' | 'product' | 'course' | 'glossary';
  title: string;
  url: string;
  score: number;
}

function normalizeVi(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

const INDEX_WITH_NORM = (rawSearchIndex as CompactSearchRow[]).map((row) => ({
  ...row,
  normVi: normalizeVi(row.t),
  normEn: row.te.toLowerCase(),
}));

export function searchHeaderIndex(
  query: string,
  limit = 8,
  lang: SupportedLanguage = 'vi',
): HeaderSearchItem[] {
  const tokens = normalizeVi(query)
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  if (tokens.length === 0) return [];

  const results: HeaderSearchItem[] = [];
  for (const item of INDEX_WITH_NORM) {
    const hay = lang === 'en' ? item.normEn : item.normVi;
    let score = 0;
    for (const tk of tokens) {
      if (hay.includes(tk)) score += 3;
    }
    if (score > 0) {
      results.push({
        kind: item.k,
        title: lang === 'en' ? item.te : item.t,
        url: item.u,
        score,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
