import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Search } from 'lucide-react';
import { getLocalizedPillar, resolvePillarBySlug } from '../../core/config/pillars.ts';
import { getPosts, resolveMediaUrl } from '../../core/data/catalogService.ts';
import { useTranslation } from '../../core/i18n/index.ts';
import { useSEO } from '../../core/seo/useSEO.ts';
import type { PillarSlug } from '../../core/types/index.ts';

export const PillarPage: React.FC<{ pillarSlug: PillarSlug }> = ({ pillarSlug }) => {
  const { lang, isEn } = useTranslation();
  const rawPillar = resolvePillarBySlug(pillarSlug);
  const pillar = rawPillar ? getLocalizedPillar(rawPillar, lang) : undefined;
  const allPosts = getPosts(pillarSlug, lang);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allPosts;
    return allPosts.filter(
      (p) => p.title.toLowerCase().includes(q) || p.tldr_summary.toLowerCase().includes(q),
    );
  }, [allPosts, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  useSEO({
    title: `${pillar?.name || pillarSlug} | VNEconomics`,
    description: pillar?.description || (isEn ? 'VNEconomics Knowledge Pillar.' : 'Chuyên mục tri thức VNEconomics.'),
    canonicalPath: `/${pillarSlug}/`,
  });

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-6 sm:p-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-editorial-teal">
            {isEn ? `Knowledge Pillar • ${allPosts.length} articles` : `Trụ cột Tri thức • ${allPosts.length} bài viết`}
          </div>
          <h1 className="font-serif text-3xl font-bold text-ink-950 dark:text-paper-50">
            {pillar?.name}
          </h1>
          <p className="text-sm text-ink-600 dark:text-ink-400 max-w-2xl">{pillar?.description}</p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder={isEn ? 'Filter articles in this pillar...' : 'Lọc bài viết trong chuyên mục...'}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {paged.map((post) => {
          const img = resolveMediaUrl(post.featured_image);
          return (
            <Link
              key={post.slug}
              to={`/${post.slug}/`}
              className="group rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 overflow-hidden hover:border-editorial-teal flex flex-col"
            >
              {img && (
                <div className="h-44 bg-paper-200 dark:bg-ink-800 overflow-hidden">
                  <img src={img} alt={post.title} loading="lazy" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-ink-500 tabular-nums">
                    <span>{post.published_at.slice(0, 10)}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {post.reading_minutes} {isEn ? 'min' : 'phút'}
                    </span>
                  </div>
                  <h2 className="font-serif text-lg font-bold text-ink-950 dark:text-paper-50 group-hover:text-editorial-teal line-clamp-2">
                    {post.title}
                  </h2>
                  <p className="text-xs text-ink-600 dark:text-ink-400 line-clamp-3">{post.tldr_summary || post.excerpt}</p>
                </div>
                <span className="text-xs font-semibold text-editorial-teal inline-flex items-center gap-1">
                  {isEn ? 'Read article' : 'Đọc chi tiết'} <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              className={`w-8 h-8 rounded-lg text-xs font-semibold tabular-nums ${
                n === page
                  ? 'bg-[#146EBE] text-white'
                  : 'border border-paper-300 dark:border-ink-700 text-ink-600 dark:text-ink-400'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
