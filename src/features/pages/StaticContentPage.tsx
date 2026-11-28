import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  KeyRound,
  Layers,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import rawPagesData from '../../data/staticPages.json';
import { useTranslation } from '../../core/i18n/index.ts';
import { useSEO } from '../../core/seo/useSEO.ts';
import { sanitizeHtmlContent } from '../../core/utils/sanitize.ts';
import { callUserAI } from '../ai/userAIService.ts';

export type StaticPageCategory = 'about' | 'legal' | 'open-education' | 'cardano-web3' | 'crypto-guides';

export interface StaticPageRecord {
  slug: string;
  category: StaticPageCategory;
  categoryLabelVi: string;
  categoryLabelEn: string;
  titleVi: string;
  subtitleVi: string;
  titleEn: string;
  subtitleEn: string;
  summaryEn: string;
  keyHighlightsEn: string[];
  contentHtmlVi: string;
  wordCount: number;
  readingMinutes: number;
}

const STATIC_PAGES = rawPagesData as StaticPageRecord[];
const PAGES_MAP = new Map(STATIC_PAGES.map((p) => [p.slug, p]));

const PROSE_CLASSES =
  'text-sm sm:text-base text-ink-800 dark:text-ink-200 leading-relaxed ' +
  '[&_h1]:font-serif [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-ink-950 [&_h1]:dark:text-paper-50 [&_h1]:mt-6 [&_h1]:mb-3 ' +
  '[&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-ink-950 [&_h2]:dark:text-paper-50 [&_h2]:mt-7 [&_h2]:mb-3 ' +
  '[&_h3]:font-serif [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-ink-950 [&_h3]:dark:text-paper-50 [&_h3]:mt-5 [&_h3]:mb-2 ' +
  '[&_h4]:font-semibold [&_h4]:text-base [&_h4]:text-ink-900 [&_h4]:dark:text-paper-100 [&_h4]:mt-4 [&_h4]:mb-2 ' +
  '[&_p]:leading-relaxed [&_p]:mb-3.5 ' +
  '[&_a]:text-[#146EBE] [&_a]:dark:text-sky-400 [&_a]:underline [&_a]:break-words ' +
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:mb-4 ' +
  '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_ol]:mb-4 ' +
  '[&_blockquote]:border-l-4 [&_blockquote]:border-[#146EBE] [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:italic [&_blockquote]:bg-paper-100 [&_blockquote]:dark:bg-ink-950/60 [&_blockquote]:rounded-r-lg [&_blockquote]:my-4 ' +
  '[&_img]:rounded-xl [&_img]:max-w-full [&_img]:h-auto [&_img]:my-4 [&_img]:border [&_img]:border-paper-200 [&_img]:dark:border-ink-800 ' +
  '[&_table]:w-full [&_table]:border-collapse [&_table]:my-5 [&_table]:text-xs [&_table]:sm:text-sm [&_table]:block [&_table]:overflow-x-auto ' +
  '[&_th]:bg-paper-100 [&_th]:dark:bg-ink-800 [&_th]:p-2.5 [&_th]:text-left [&_th]:font-semibold [&_th]:border [&_th]:border-paper-200 [&_th]:dark:border-ink-800 ' +
  '[&_td]:p-2.5 [&_td]:border [&_td]:border-paper-200 [&_td]:dark:border-ink-800';

export const StaticContentPage: React.FC<{ forcedSlug?: string }> = ({ forcedSlug }) => {
  const { slug: paramSlug } = useParams<{ slug?: string }>();
  const location = useLocation();
  const { isEn } = useTranslation();

  const resolvedSlug = useMemo(() => {
    if (forcedSlug) return forcedSlug;
    if (paramSlug) return paramSlug;
    return location.pathname.replace(/^\/+|\/+$/g, '').split('/')[0] || '';
  }, [forcedSlug, paramSlug, location.pathname]);

  const page = PAGES_MAP.get(resolvedSlug);

  const [aiTranslation, setAiTranslation] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    setAiTranslation('');
    setAiError('');
    setAiLoading(false);
  }, [resolvedSlug]);

  const pageTitle = page ? (isEn ? page.titleEn : page.titleVi) : isEn ? 'Page Not Found' : 'Không tìm thấy trang';
  const pageDesc = page
    ? isEn
      ? page.summaryEn
      : page.subtitleVi
    : isEn
      ? 'The requested resource could not be located on VNEconomics.'
      : 'Không tìm thấy nội dung trang được yêu cầu trên VNEconomics.';

  useSEO({
    title: `${pageTitle} | VNEconomics`,
    description: pageDesc,
    canonicalPath: page ? `/${page.slug}/` : location.pathname,
    jsonLd: page
      ? {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: pageTitle,
          description: pageDesc,
          url: `https://vneconomics.com/${page.slug}/`,
          inLanguage: isEn ? 'en-US' : 'vi-VN',
          publisher: {
            '@type': 'Organization',
            name: 'VNEconomics',
            url: 'https://vneconomics.com/',
          },
        }
      : undefined,
  });

  if (!page) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-14 text-center space-y-4">
        <FileText className="w-12 h-12 text-ink-400 mx-auto" />
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink-950 dark:text-paper-50">
          {isEn ? 'Page Not Found' : 'Không tìm thấy trang yêu cầu'}
        </h1>
        <p className="text-sm text-ink-600 dark:text-ink-400 max-w-md mx-auto">
          {isEn
            ? 'The page you are looking for may have moved into one of our Knowledge Pillars or Library tools.'
            : 'Nội dung này không tồn tại hoặc đã được chuyển vào chuyên mục mới của VNEconomics.'}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {isEn ? 'Back to Home' : 'Quay về Trang chủ'}
        </Link>
      </div>
    );
  }

  const relatedPages = STATIC_PAGES.filter((item) => {
    if (item.slug === page.slug) return false;
    if (page.category === 'about' || page.category === 'legal') {
      return item.category === 'about' || item.category === 'legal';
    }
    return item.category === page.category;
  });

  const handleTranslateFullPage = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const plainVi = page.contentHtmlVi
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 9000);
      const reply = await callUserAI({
        systemPrompt:
          'You are a bilingual Economics, Blockchain & AI editor. Translate the following webpage content accurately into clear, publication-grade English with Markdown headings and bullet lists. Output pure English only.',
        prompt: `Page Title: ${page.titleEn}\n\nSource Vietnamese Content:\n${plainVi}`,
        maxTokens: 2000,
      });
      setAiTranslation(reply);
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : 'Please configure your personal AI API Key in AI Lab to translate on demand.',
      );
    } finally {
      setAiLoading(false);
    }
  };

  const categoryLabel = isEn ? page.categoryLabelEn : page.categoryLabelVi;
  const subtitle = isEn ? page.subtitleEn : page.subtitleVi;

  const sidebarCta =
    page.category === 'cardano-web3' || page.category === 'crypto-guides'
      ? {
          to: '/cardano-hub/',
          titleVi: 'Thực hành Ví Cardano CIP-30 & Đúc NFT Testnet',
          titleEn: 'Try Cardano CIP-30 Wallet & Testnet NFT Studio',
          descVi: 'Kết nối ví Eternl / Lace / MetaMask trên Testnet 0đ và xem bản đồ sinh thái Web3.',
          descEn: 'Connect Eternl, Lace, or MetaMask wallets in our $0 Testnet playground.',
          btnVi: 'Mở Cardano & Web3 Hub →',
          btnEn: 'Open Cardano & Web3 Hub →',
        }
      : page.category === 'open-education'
        ? {
            to: '/hoc-vien/',
            titleVi: 'Khám phá Học viện & Thư viện OER 0đ',
            titleEn: 'Explore Free Courses & Open Ebook Library',
            descVi: 'Học miễn phí 10 khóa học chuyên sâu kèm slide PPT/PDF và chứng chỉ NFT Testnet.',
            descEn: 'Access 10 structured courses with PPT/PDF decks and 59+ free digital resources.',
            btnVi: 'Vào Học viện VNEconomics →',
            btnEn: 'Visit VNE Academy →',
          }
        : {
            to: '/ai-lab/',
            titleVi: 'Trợ lý AI BYOK & Không gian Học tập',
            titleEn: 'BYOK AI Lab & Digital Learning Workspace',
            descVi: 'Kết nối API Key cá nhân ngay trên trình duyệt để tra cứu tri thức và luyện tập SM-2.',
            descEn: 'Connect your personal Gemini/OpenAI key in-browser for RAG search and research reviews.',
            btnVi: 'Mở AI Lab Ngay →',
            btnEn: 'Open AI BYOK Lab →',
          };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Hero Banner */}
      <section className="rounded-2xl bg-gradient-to-r from-[#1c244b] via-[#1e3a8a] to-[#146EBE] text-white p-6 sm:p-8 space-y-4 shadow-sm">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-slate-200">
          <Link to="/" className="hover:underline">
            {isEn ? 'Home' : 'Trang chủ'}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-sky-200">{categoryLabel}</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-semibold text-white line-clamp-1">{pageTitle}</span>
        </nav>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[11px] font-bold uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-amber-300" />
            {categoryLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-sky-100 tabular-nums">
            <Clock className="w-3.5 h-3.5" />
            {isEn
              ? `${page.wordCount} words • ${page.readingMinutes} min read`
              : `${page.wordCount} từ • ~${page.readingMinutes} phút đọc`}
          </span>
        </div>

        <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-snug max-w-4xl">
          {pageTitle}
        </h1>
        <p className="text-xs sm:text-sm text-slate-200 max-w-3xl leading-relaxed">{subtitle}</p>
      </section>

      {/* Main 12-Col Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Redesigned Content Card */}
        <article className="lg:col-span-8 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-6 sm:p-8 space-y-6">
          {isEn ? (
            <div className="space-y-6">
              <div className="p-5 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#146EBE] dark:text-sky-400">
                  <BookOpen className="w-4 h-4" />
                  Executive Overview
                </div>
                <p className="text-sm text-ink-800 dark:text-paper-200 leading-relaxed">{page.summaryEn}</p>
              </div>

              <div className="space-y-3">
                <h2 className="font-serif text-xl font-bold text-ink-950 dark:text-paper-50">
                  Key Takeaways &amp; Scope
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {page.keyHighlightsEn.map((point, idx) => (
                    <div
                      key={point}
                      className="p-4 rounded-xl border border-paper-200 dark:border-ink-800 bg-paper-100/70 dark:bg-ink-950/60 flex items-start gap-3"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-xs sm:text-sm text-ink-800 dark:text-paper-200 leading-relaxed">
                        <span className="font-bold text-[#146EBE] dark:text-sky-400 mr-1.5">0{idx + 1}.</span>
                        {point}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-100 dark:bg-ink-950/70 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-ink-950 dark:text-paper-50 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#146EBE]" />
                      Full-Length Edition Available via On-Demand AI Translation
                    </div>
                    <p className="text-xs text-ink-600 dark:text-ink-400">
                      Original archival document ({page.wordCount} words) is stored in Vietnamese. Translate cleanly using your BYOK AI key.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={handleTranslateFullPage}
                    className="px-4 py-2 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                    {aiLoading ? 'Translating...' : 'Translate Full Page with BYOK AI'}
                  </button>
                </div>

                {aiError && (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2">
                    <span>{aiError}</span>
                    <Link to="/ai-lab/" className="font-bold underline shrink-0">
                      Configure AI Key →
                    </Link>
                  </div>
                )}

                {aiTranslation && (
                  <div className="p-4 rounded-xl bg-white dark:bg-ink-900 border border-paper-200 dark:border-ink-800 text-sm text-ink-800 dark:text-paper-200 whitespace-pre-wrap leading-relaxed">
                    {aiTranslation}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              className={PROSE_CLASSES}
              dangerouslySetInnerHTML={{
                __html: sanitizeHtmlContent(
                  page.contentHtmlVi || '<p>Nội dung trang đang được cập nhật.</p>',
                ),
              }}
            />
          )}
        </article>

        {/* Right 4 Cols: Sticky Navigation & Contextual Tools */}
        <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">
          {relatedPages.length > 0 && (
            <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-3.5">
              <div className="text-xs font-bold uppercase tracking-wider text-[#146EBE] dark:text-sky-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                {isEn ? 'Related Pages in This Hub' : 'Các trang cùng Chuyên đề'}
              </div>
              <div className="space-y-2">
                {relatedPages.map((rel) => (
                  <Link
                    key={rel.slug}
                    to={`/${rel.slug}/`}
                    className="group block p-3 rounded-xl border border-paper-200 dark:border-ink-800 bg-paper-100/70 dark:bg-ink-950/60 hover:border-[#146EBE] transition-colors"
                  >
                    <div className="text-xs font-bold text-ink-950 dark:text-paper-50 group-hover:text-[#146EBE] dark:group-hover:text-sky-400 line-clamp-2 leading-snug">
                      {isEn ? rel.titleEn : rel.titleVi}
                    </div>
                    <div className="text-[11px] text-ink-500 dark:text-ink-400 mt-1 flex items-center justify-between">
                      <span>/{rel.slug}/</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-[#146EBE]/30 bg-[#CAE5EC]/40 dark:bg-ink-900 p-5 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#146EBE] dark:text-sky-400">
              <ShieldCheck className="w-4 h-4" />
              {isEn ? 'VNEconomics Platform Tools' : 'Công cụ & Hệ sinh thái 0đ'}
            </div>
            <h2 className="font-serif text-lg font-bold text-ink-950 dark:text-paper-50">
              {isEn ? sidebarCta.titleEn : sidebarCta.titleVi}
            </h2>
            <p className="text-xs text-ink-700 dark:text-ink-300 leading-relaxed">
              {isEn ? sidebarCta.descEn : sidebarCta.descVi}
            </p>
            <Link
              to={sidebarCta.to}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-bold transition-colors"
            >
              {isEn ? sidebarCta.btnEn : sidebarCta.btnVi}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
};
