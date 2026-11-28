import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Check, Coins, Copy, Globe, Sparkles } from 'lucide-react';
import { getLocalizedPillar, resolvePillarBySlug } from '../../core/config/pillars.ts';
import { getPostBySlug, getPosts, resolveMediaUrl } from '../../core/data/catalogService.ts';
import { useTranslation } from '../../core/i18n/index.ts';
import { useSEO } from '../../core/seo/useSEO.ts';
import { sanitizeHtmlContent } from '../../core/utils/sanitize.ts';
import { callUserAI } from '../ai/userAIService.ts';
import { claimArticleReadReward } from '../game/vneGameService.ts';
import { PublicProfilePage } from '../account/PublicProfilePage.tsx';
import {
  getCurrentUserOriginalHandle,
  getCurrentUserPublicHandle,
  hasPublicProfile,
  normalizeHandle,
} from '../account/publicProfileService.ts';

const VN_CHAR_RE =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;

function stripDuplicateLeadingCover(html: string, featuredImage?: string | null): string {
  const trimmed = html.trimStart();
  if (!trimmed || !featuredImage) return html;
  const baseName = featuredImage.split('/').pop()?.split('?')[0]?.toLowerCase() || '';
  const leadMatch = trimmed.match(/^(?:<figure\b[^>]*>[\s\S]*?<\/figure>|<p\b[^>]*>\s*<img\b[^>]*>\s*<\/p>)/i);
  if (!leadMatch) return html;
  const blockLower = leadMatch[0].toLowerCase();
  if ((baseName && blockLower.includes(baseName)) || blockLower.includes('-cover-')) {
    return trimmed.slice(leadMatch[0].length).trimStart();
  }
  return html;
}

export const PostDetailPage: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const { lang, isEn, setLanguage } = useTranslation();
  const catalogPost = getPostBySlug(slug, lang);
  const [serverPost, setServerPost] = useState<typeof catalogPost>(undefined);
  const post = catalogPost || serverPost;
  const rawPillar = resolvePillarBySlug(post?.pillar_slug);
  const pillar = rawPillar ? getLocalizedPillar(rawPillar, lang) : undefined;

  const [bodyHtml, setBodyHtml] = useState<string>('');
  const [rawSourceHtml, setRawSourceHtml] = useState<string>('');
  const [hasFullEnglishBody, setHasFullEnglishBody] = useState(false);
  const [loadingBody, setLoadingBody] = useState(true);
  const [translatingFull, setTranslatingFull] = useState(false);
  const [progress, setProgress] = useState(0);

  const [aiResult, setAiResult] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [rewardMsg, setRewardMsg] = useState('');
  const [copiedCite, setCopiedCite] = useState(false);

  useSEO({
    title: post?.seo_title || `${slug} | VNEconomics`,
    description:
      post?.seo_desc ||
      post?.tldr_summary ||
      (isEn ? 'Research analysis article on VNEconomics.' : 'Bài viết phân tích trên VNEconomics.'),
    canonicalPath: `/${slug}/`,
    jsonLd: post
      ? {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: post.tldr_summary || post.excerpt,
          datePublished: post.published_at,
          author: { '@type': 'Person', name: post.author_name },
          publisher: { '@type': 'Organization', name: 'VNEconomics' },
        }
      : undefined,
  });

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = Math.max(1, h.scrollHeight - h.clientHeight);
      setProgress(Math.min(100, Math.round((window.scrollY / max) * 100)));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingBody(true);
    setAiResult('');
    setAiError('');
    setRewardMsg('');
    setHasFullEnglishBody(false);

    async function loadContent() {
      // 1. Check cached browser-translated English edition when in EN mode
      if (isEn) {
        try {
          const cachedEn = localStorage.getItem(`vne_post_html_en_${slug}`);
          if (cachedEn && !VN_CHAR_RE.test(cachedEn)) {
            if (!cancelled) {
              setBodyHtml(sanitizeHtmlContent(cachedEn));
              setHasFullEnglishBody(true);
            }
            return;
          }
        } catch {
          // Ignore
        }
      }

      // 2. Try backend PHP REST API
      let fetchedHtml = '';
      try {
        const res = await fetch(`/api/posts.php?slug=${encodeURIComponent(slug)}`);
        if (res.ok) {
          const json = await res.json();
          if (isEn && json?.data?.content_html_en && !VN_CHAR_RE.test(json.data.content_html_en)) {
            if (!cancelled) {
              setBodyHtml(sanitizeHtmlContent(json.data.content_html_en));
              setHasFullEnglishBody(true);
            }
            return;
          }
          if (json?.ok && json?.data?.content_html) {
            fetchedHtml = json.data.content_html;
            if (!cancelled && !catalogPost && json.data.title) {
              setServerPost({
                wp_id: Number(json.data.wp_id || json.data.id || 0),
                post_type: 'post',
                slug: String(json.data.slug || slug),
                title: String(json.data.title),
                tldr_summary: String(json.data.tldr_summary || ''),
                excerpt: String(json.data.excerpt || json.data.tldr_summary || ''),
                pillar_slug: (json.data.pillar_slug || 'kinh-te-so') as NonNullable<typeof catalogPost>['pillar_slug'],
                pillar_id: 1,
                author_name: String(json.data.author_name || 'Ban Biên Tập VNEconomics'),
                featured_image: json.data.featured_image || null,
                seo_title: String(json.data.seo_title || json.data.title),
                seo_desc: String(json.data.seo_desc || json.data.tldr_summary || ''),
                reading_minutes: Number(json.data.reading_minutes || 4),
                published_at: String(json.data.published_at || new Date().toISOString()),
              });
            }
          }
        }
      } catch {
        // Fallback below for local static Vite dev
      }

      // 3. Fallback static pre-extracted full article JSON (/posts-content/<slug>.json)
      if (!fetchedHtml) {
        try {
          const staticRes = await fetch(`/posts-content/${encodeURIComponent(slug)}.json`);
          if (staticRes.ok) {
            const staticJson = await staticRes.json();
            if (staticJson?.content_html) {
              fetchedHtml = staticJson.content_html;
            }
          }
        } catch {
          // Fallback to summary below
        }
      }

      if (!cancelled) {
        setRawSourceHtml(fetchedHtml);
        if (isEn) {
          // STRICT POLICY: Never leak raw Vietnamese HTML when lang === 'en'
          const enSummary = post?.tldr_summary || post?.excerpt || '';
          const safeIsEnglish = !VN_CHAR_RE.test(fetchedHtml);
          if (fetchedHtml && safeIsEnglish) {
            setBodyHtml(sanitizeHtmlContent(fetchedHtml));
            setHasFullEnglishBody(true);
          } else {
            setBodyHtml(`<p>${enSummary}</p>`);
            setHasFullEnglishBody(false);
          }
        } else {
          setBodyHtml(
            fetchedHtml
              ? stripDuplicateLeadingCover(sanitizeHtmlContent(fetchedHtml), post?.featured_image)
              : `<p>${post?.tldr_summary || post?.excerpt || ''}</p>`,
          );
        }
      }
    }

    loadContent().finally(() => {
      if (!cancelled) setLoadingBody(false);
    });
    return () => {
      cancelled = true;
    };
  }, [slug, post, isEn]);

  if (!post) {
    const cleanHandle = normalizeHandle(slug);
    const myPub = getCurrentUserPublicHandle();
    const myOrig = getCurrentUserOriginalHandle();
    const isProfileRoute =
      slug.startsWith('@') ||
      (cleanHandle.length >= 3 &&
        (hasPublicProfile(cleanHandle) || cleanHandle === myPub || cleanHandle === myOrig));

    if (isProfileRoute) {
      return <PublicProfilePage forcedHandle={slug} />;
    }

    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-serif text-2xl font-bold">
          {isEn ? 'Article Not Found' : 'Không tìm thấy bài viết'}
        </h1>
        <p className="text-sm text-ink-500">
          {isEn ? `The route /${slug}/ does not exist in the current catalog.` : `Đường dẫn /${slug}/ chưa có trong dữ liệu hiện tại.`}
        </p>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-editorial-teal">
          <ArrowLeft className="w-4 h-4" /> {isEn ? 'Back to Home' : 'Về Trang chủ'}
        </Link>
      </div>
    );
  }

  const handleTranslateFullArticle = async () => {
    setTranslatingFull(true);
    setAiError('');
    try {
      const sourceText = rawSourceHtml
        ? rawSourceHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 9000)
        : post.tldr_summary;
      const translated = await callUserAI({
        prompt: `Translate the following article faithfully into clean, academic English HTML (<p>, <h2>, <h3>, <ul>, <li>). Output ONLY pure English HTML with ZERO Vietnamese words:\n\nTitle: ${post.title}\n\nSource:\n${sourceText}`,
      });
      const sanitized = sanitizeHtmlContent(translated);
      if (VN_CHAR_RE.test(sanitized)) {
        throw new Error('Translation output contained non-English characters. Please retry.');
      }
      setBodyHtml(sanitized);
      setHasFullEnglishBody(true);
      try {
        localStorage.setItem(`vne_post_html_en_${slug}`, sanitized);
      } catch {
        // Ignore storage quota
      }
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : 'Please configure your personal AI API Key in AI Lab first.',
      );
    } finally {
      setTranslatingFull(false);
    }
  };

  const runContextualAI = async (instruction: string) => {
    setAiBusy(true);
    setAiError('');
    const plain = bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 7000);
    const langConstraint = isEn
      ? 'Respond strictly in pure English with zero Vietnamese words.'
      : 'Trả lời bằng tiếng Việt học thuật rõ ràng.';
    try {
      const reply = await callUserAI({
        prompt: `${instruction}\n${langConstraint}\n\nTitle: ${post.title}\nContent:\n${plain || post.tldr_summary}`,
      });
      setAiResult(reply);
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : isEn
            ? 'Please configure your API Key in AI Lab first.'
            : 'Vui lòng cài đặt AI Key tại AI Lab.',
      );
    } finally {
      setAiBusy(false);
    }
  };

  const apaCitation = `${post.author_name} (${post.published_at.slice(0, 4)}). ${post.title}. VNEconomics. https://vneconomics.com/${post.slug}/`;
  const related = getPosts(post.pillar_slug, lang).filter((p) => p.slug !== post.slug).slice(0, 3);
  const coverUrl = resolveMediaUrl(post.featured_image);

  return (
    <>
      <div className="fixed top-16 left-0 right-0 h-0.5 bg-paper-200 dark:bg-ink-800 z-30">
        <div className="h-full bg-editorial-teal transition-all duration-150" style={{ width: `${progress}%` }} />
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <article className="lg:col-span-8 space-y-6 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-6 sm:p-8">
          <nav className="flex items-center gap-2 text-xs text-ink-500">
            <Link to="/" className="hover:text-editorial-teal">{isEn ? 'Home' : 'Trang chủ'}</Link>
            <span>/</span>
            <Link to={`/${post.pillar_slug}/`} className="text-editorial-teal font-medium">
              {pillar?.shortLabel || post.pillar_slug}
            </Link>
          </nav>

          <header className="space-y-3">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink-950 dark:text-paper-50 leading-tight">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-ink-500 tabular-nums">
              <span>
                {isEn ? 'Author:' : 'Tác giả:'}{' '}
                <strong className="text-ink-800 dark:text-paper-200">{post.author_name}</strong>
              </span>
              <span>•</span>
              <span>
                {isEn ? 'Published:' : 'Ngày đăng:'} {post.published_at.slice(0, 10)}
              </span>
              <span>•</span>
              <span>
                {post.reading_minutes} {isEn ? 'min read' : 'phút đọc'}
              </span>
            </div>
          </header>

          {/* Answer-First AEO TL;DR Box */}
          <section className="rounded-xl border border-[#146EBE]/30 bg-[#146EBE]/5 dark:bg-sky-950/30 p-5 space-y-1.5">
            <div className="text-xs font-bold uppercase tracking-wider text-[#146EBE] dark:text-sky-400">
              {isEn ? 'Executive Summary (AEO Answer Box)' : 'Tóm tắt cốt lõi (AEO Answer Box)'}
            </div>
            <p className="text-sm text-ink-800 dark:text-paper-200 leading-relaxed">{post.tldr_summary || post.excerpt}</p>
          </section>

          {coverUrl && (
            <img src={coverUrl} alt={post.title} className="w-full rounded-xl border border-paper-300 dark:border-ink-800" />
          )}

          {/* Sanitized Article Content */}
          {loadingBody ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-paper-300 dark:bg-ink-800 rounded w-full" />
              <div className="h-4 bg-paper-300 dark:bg-ink-800 rounded w-5/6" />
              <div className="h-4 bg-paper-300 dark:bg-ink-800 rounded w-4/6" />
            </div>
          ) : (
            <div className="space-y-5">
              <div
                className="prose prose-slate dark:prose-invert max-w-none text-base leading-relaxed space-y-4 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:pt-4 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:font-bold [&_a]:text-editorial-teal [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />

              {isEn && !hasFullEnglishBody && (
                <div className="rounded-xl border border-sky-200 dark:border-sky-900 bg-sky-50/70 dark:bg-sky-950/30 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#146EBE] dark:text-sky-300 uppercase tracking-wider">
                    <Globe className="w-4 h-4" /> Full English Translation
                  </div>
                  <p className="text-xs text-ink-700 dark:text-ink-300 leading-relaxed">
                    Under the strict English-only policy, the untranslated archival HTML body is omitted in English mode. Generate the full English article instantaneously using your BYOK AI Key, or switch to the original Vietnamese edition below.
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      disabled={translatingFull}
                      onClick={handleTranslateFullArticle}
                      className="px-4 py-2 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {translatingFull ? 'Translating full article...' : 'Translate Full Article with BYOK AI'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage('vi')}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-ink-700 text-xs font-semibold hover:border-[#146EBE]"
                    >
                      Read Vietnamese Edition
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </article>

        <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">
          {/* Contextual BYOK AI Companion */}
          <section className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-editorial-teal" />
                {isEn ? 'AI Reading Copilot (BYOK)' : 'Trợ lý AI Đọc bài (BYOK)'}
              </span>
              <Link to="/ai-lab/" className="text-[11px] font-semibold text-editorial-teal hover:underline">
                {isEn ? 'Configure Key →' : 'Cài đặt Key →'}
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={aiBusy}
                onClick={() =>
                  runContextualAI(
                    isEn
                      ? 'Summarize the 3 most critical research takeaways in bullet points.'
                      : 'Tóm tắt 3 ý cốt lõi quan trọng nhất của bài viết dưới dạng gạch đầu dòng.',
                  )
                }
                className="px-3 py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 text-xs font-medium hover:border-editorial-teal"
              >
                {isEn ? 'Summarize 3 Takeaways' : 'Tóm tắt 3 ý chính'}
              </button>
              <button
                type="button"
                disabled={aiBusy}
                onClick={() =>
                  runContextualAI(
                    isEn
                      ? 'Explain the core concept in plain, beginner-friendly English.'
                      : 'Giải thích nội dung chính của bài viết thật đơn giản cho người mới bắt đầu.',
                  )
                }
                className="px-3 py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 text-xs font-medium hover:border-editorial-teal"
              >
                {isEn ? 'Explain Simply' : 'Giải thích dễ hiểu'}
              </button>
              <button
                type="button"
                disabled={aiBusy}
                onClick={() =>
                  runContextualAI(
                    isEn
                      ? 'Create 5 multiple-choice review questions with short answers based on this article.'
                      : 'Tạo 5 câu hỏi trắc nghiệm ôn tập kèm đáp án ngắn dựa trên bài viết.',
                  )
                }
                className="px-3 py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 text-xs font-medium hover:border-editorial-teal"
              >
                {isEn ? '5 Practice Questions' : 'Tạo 5 câu ôn tập'}
              </button>
            </div>
            {aiBusy && (
              <p className="text-xs text-ink-500">
                {isEn ? 'Your AI copilot is analyzing this article...' : 'AI của bạn đang phân tích bài viết...'}
              </p>
            )}
            {aiError && <p className="text-xs text-rose-600 dark:text-rose-400">{aiError}</p>}
            {aiResult && (
              <div className="p-3.5 rounded-lg bg-paper-100 dark:bg-ink-950 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                {aiResult}
              </div>
            )}
          </section>

          {/* Read-to-Earn + APA Citation */}
          <section className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-4">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  const res = claimArticleReadReward(post.slug, post.title);
                  setRewardMsg(
                    isEn
                      ? res.ok
                        ? '+10 VNE Points credited to your learning balance!'
                        : 'You have already claimed points for this article.'
                      : res.message,
                  );
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <Coins className="w-4 h-4 text-amber-300" />
                {isEn ? 'Confirm Read & Earn (+10 VNE Points)' : 'Xác nhận đã đọc xong (+10 VNE Points)'}
              </button>
              {rewardMsg && <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{rewardMsg}</div>}
            </div>

            <div className="pt-3 border-t border-paper-200 dark:border-ink-800 space-y-2">
              <div className="text-xs font-bold flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-editorial-teal" />
                {isEn ? 'Cite This Article (GEO / APA 7)' : 'Trích dẫn bài viết (GEO / APA 7)'}
              </div>
              <div className="p-3 rounded-lg bg-paper-100 dark:bg-ink-950 text-xs font-mono flex items-start justify-between gap-2">
                <span className="break-words">{apaCitation}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(apaCitation);
                    setCopiedCite(true);
                    setTimeout(() => setCopiedCite(false), 2000);
                  }}
                  className="shrink-0 p-1.5 rounded border border-paper-300 dark:border-ink-700"
                  title={isEn ? 'Copy citation' : 'Sao chép trích dẫn'}
                >
                  {copiedCite ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </section>

          {related.length > 0 && (
            <section className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-3">
              <h2 className="font-serif text-lg font-bold">
                {isEn ? 'Related Articles in This Pillar' : 'Bài viết cùng chuyên mục'}
              </h2>
              <div className="space-y-2.5">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    to={`/${r.slug}/`}
                    className="block p-3 rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-100 dark:bg-ink-950/60 hover:border-editorial-teal text-xs font-semibold line-clamp-2"
                  >
                    {r.title}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </>
  );
};
