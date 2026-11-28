import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, ExternalLink, Globe, KeyRound, Radio, RefreshCw } from 'lucide-react';
import { getPosts } from '../../core/data/catalogService.ts';
import { useTranslation } from '../../core/i18n/index.ts';
import { useSEO } from '../../core/seo/useSEO.ts';
import { PrNewswireWidget } from './PrNewswireWidget.tsx';

const INVESTING_RATES_IFRAME_EN =
  'https://sslirates.investing.com/index.php?rows=5&bg1=FFFFFF&bg2=F1F5F8&text_color=333333&enable_border=show&border_color=0452A1&header_bg=0452A1&header_text=FFFFFF&force_lang=1';
const INVESTING_RATES_IFRAME_VI =
  'https://sslirates.investing.com/index.php?rows=5&bg1=FFFFFF&bg2=F1F5F8&text_color=333333&enable_border=show&border_color=0452A1&header_bg=0452A1&header_text=FFFFFF&force_lang=52';

export const InternationalNewsPage: React.FC = () => {
  const { lang, isEn } = useTranslation();
  const [refreshSeed, setRefreshSeed] = useState(0);

  const globalPicks = useMemo(
    () =>
      getPosts(undefined, lang)
        .filter((p) => p.pillar_slug === 'ai-cong-nghe' || p.pillar_slug === 'kinh-te-so')
        .slice(0, 4),
    [lang],
  );

  useSEO({
    title: isEn
      ? 'International News — Global Economy, Tech & Finance | VNEconomics'
      : 'Tin Quốc tế — Kinh tế, Công nghệ & Tài chính Toàn cầu | VNEconomics',
    description: isEn
      ? 'Auto-updating international press releases from PR Newswire, global central bank rates, and deep-dive digital economy analysis.'
      : 'Dòng tin tức quốc tế tự động cập nhật từ PR Newswire, lãi suất ngân hàng trung ương toàn cầu và phân tích kinh tế số chuyên sâu.',
    canonicalPath: '/tin-quoc-te/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: isEn
        ? 'International News — VNEconomics'
        : 'Tin Quốc tế — VNEconomics',
      url: 'https://vneconomics.com/tin-quoc-te/',
      inLanguage: isEn ? 'en-US' : 'vi-VN',
      publisher: {
        '@type': 'Organization',
        name: 'VNEconomics',
        url: 'https://vneconomics.com/',
      },
    },
  });

  const ratesIframeUrl = isEn ? INVESTING_RATES_IFRAME_EN : INVESTING_RATES_IFRAME_VI;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Hero Banner */}
      <section className="rounded-2xl bg-gradient-to-r from-[#1c244b] via-[#1e3a8a] to-[#146EBE] text-white p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2.5 max-w-3xl">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-200">
            <Link to="/" className="hover:underline">
              {isEn ? 'Home' : 'Trang chủ'}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-white">
              {isEn ? 'International News' : 'Tin Quốc tế'}
            </span>
          </nav>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[11px] font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {isEn ? 'PR Newswire Partner Wire • Auto-Updating' : 'PR Newswire Official Feed • Tự động cập nhật'}
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-snug">
            {isEn
              ? 'International News — Global Economy, Tech & Finance'
              : 'Tin Quốc tế — Kinh tế, Công nghệ & Tài chính Toàn cầu'}
          </h1>

          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-2xl">
            {isEn
              ? 'Continuous stream of global business, technology, finance, and AI press releases synced automatically via our PR Newswire partner feed.'
              : 'Tổng hợp liên tục các thông cáo báo chí kinh doanh, tài chính, công nghệ AI và chuyển đổi số toàn cầu cập nhật tự động qua đối tác PR Newswire.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            to="/thi-truong/"
            className="px-4 py-2.5 rounded-xl bg-white text-[#1c244b] hover:bg-sky-50 text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs"
          >
            {isEn ? 'Market Data Hub' : 'Trung tâm Thị trường'}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/ai-cong-nghe/"
            className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            {isEn ? 'AI & Tech Pillar' : 'Chuyên mục AI & Tech'}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* Main 12-Col Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Live PR Newswire Landing Feed */}
        <section className="lg:col-span-8 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-200 dark:border-ink-800 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#146EBE]/10 text-[#146EBE] dark:text-sky-400 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-ink-950 dark:text-paper-50 flex items-center gap-2">
                  <span>{isEn ? 'Live Global Press Wire' : 'Dòng tin Quốc tế Trực tiếp (PR Newswire)'}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                    <Radio className="w-3 h-3" /> Live
                  </span>
                </h2>
                <p className="text-[11px] text-ink-500 dark:text-ink-400">
                  {isEn
                    ? 'Partner Feed ID 23618 • Automatically refreshed upon release'
                    : 'Nguồn đối tác ID 23618 • Tự động cập nhật ngay khi có thông cáo mới'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setRefreshSeed((n) => n + 1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-800 text-xs font-semibold text-ink-800 dark:text-paper-200 hover:border-[#146EBE] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {isEn ? 'Refresh Feed' : 'Làm mới dòng tin'}
            </button>
          </div>

          <PrNewswireWidget key={refreshSeed} mode="landing" />
        </section>

        {/* Right 4 Cols: Central Bank Rates + VNE Global Analysis + BYOK AI */}
        <aside className="lg:col-span-4 space-y-5">
          {/* Global Central Bank Interest Rates */}
          <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-serif text-lg font-bold text-ink-950 dark:text-paper-50">
                {isEn ? 'Central Bank Policy Rates' : 'Lãi suất Ngân hàng Trung ương'}
              </h2>
              <a
                href={ratesIframeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-[#146EBE] dark:text-sky-400 hover:underline inline-flex items-center gap-1"
              >
                {isEn ? 'Open' : 'Mở rộng'} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="rounded-lg overflow-hidden border border-paper-200 dark:border-ink-800 bg-white">
              <iframe
                src={ratesIframeUrl}
                title={isEn ? 'Global Central Bank Rates' : 'Bảng lãi suất quốc tế'}
                loading="lazy"
                className="w-full h-64 border-0"
              />
            </div>
          </div>

          {/* VNEconomics Global Tech & Digital Economy Picks */}
          <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-ink-950 dark:text-paper-50">
                {isEn ? 'VNEconomics Deep-Dive Picks' : 'Phân tích Kinh tế & AI Chọn lọc'}
              </h2>
              <Link to="/kinh-te-so/" className="text-xs font-semibold text-[#146EBE] hover:underline">
                {isEn ? 'All →' : 'Tất cả →'}
              </Link>
            </div>
            <div className="space-y-2.5">
              {globalPicks.map((post) => (
                <Link
                  key={post.slug}
                  to={`/${post.slug}/`}
                  className="block p-3 rounded-xl border border-paper-200 dark:border-ink-800 bg-paper-100/70 dark:bg-ink-950/60 hover:border-[#146EBE] transition-colors space-y-1"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-editorial-teal">
                    {post.pillar_slug === 'ai-cong-nghe' ? 'AI & Tech' : isEn ? 'Digital Economy' : 'Kinh tế số'}
                  </div>
                  <div className="text-xs font-bold text-ink-950 dark:text-paper-50 line-clamp-2 leading-snug">
                    {post.title}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* BYOK AI Analyst CTA */}
          <div className="rounded-2xl border border-[#146EBE]/30 bg-[#CAE5EC]/40 dark:bg-ink-900 p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#146EBE] dark:text-sky-400">
              <KeyRound className="w-4 h-4" />
              {isEn ? 'BYOK AI Macro Copilot' : 'Trợ lý AI Đọc hiểu Tin vĩ mô'}
            </div>
            <p className="text-xs text-ink-700 dark:text-ink-300 leading-relaxed">
              {isEn
                ? 'Paste your own Gemini or OpenAI API key to summarize international news impact on Vietnam digital markets and equities.'
                : 'Dùng API Key cá nhân tại AI Lab để tóm tắt tác động của tin vĩ mô quốc tế lên tỷ giá, lãi suất và tài sản số.'}
            </p>
            <Link
              to="/ai-lab/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-bold transition-colors"
            >
              {isEn ? 'Open BYOK AI Lab →' : 'Mở AI Lab Ngay →'}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
};
