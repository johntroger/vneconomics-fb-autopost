import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  CheckCircle2,
  Database,
  ExternalLink,
  FileCheck2,
  Loader2,
  Lock,
  PlusCircle,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Unlock,
  XCircle,
} from 'lucide-react';
import { TOPIC_PILLARS } from '../../core/config/pillars.ts';
import { getCatalogStats, getPosts } from '../../core/data/catalogService.ts';
import { useTranslation } from '../../core/i18n/index.ts';
import { useSEO } from '../../core/seo/useSEO.ts';
import type { PillarSlug } from '../../core/types/index.ts';
import { AiPredictionReviewCard } from '../predictions/AiPredictionReviewCard.tsx';
import {
  approvePendingMarket,
  getPredictionMarkets,
  PREDICTIONS_UPDATED_EVENT,
  rejectPendingMarket,
  resolveMarketOutcome,
  saveMarketAiModeration,
  saveMarketAiOracleScan,
  type PredictionMarket,
  type PredictionSide,
} from '../predictions/predictionMarketService.ts';
import {
  runAiMarketModeration,
  runAiOracleResolutionScan,
} from '../predictions/predictionOracleService.ts';

export const AdminPage: React.FC = () => {
  const { lang, isEn } = useTranslation();
  useSEO({
    title: isEn ? 'Admin CMS & AI Oracle | VNEconomics' : 'Admin CMS & AI Oracle Sàn Dự báo | VNEconomics',
    description: isEn
      ? 'Content management dashboard, SEO/GEO/AEO audit, and AI Oracle Prediction Market moderation.'
      : 'Bảng điều khiển quản trị nội dung, kiểm tra SEO/GEO/AEO và AI Oracle duyệt/chốt kèo Sàn Dự báo.',
    canonicalPath: '/admin/',
  });

  const stats = getCatalogStats(lang);
  const posts = getPosts(undefined, lang);
  const missingTldr = posts.filter((p) => !p.tldr_summary || p.tldr_summary.length < 30).length;

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const [adminToken, setAdminToken] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(() => isLocalhost);

  // Prediction Market Admin & AI Oracle States
  const [markets, setMarkets] = useState<PredictionMarket[]>(() =>
    getPredictionMarkets({ includePending: true }),
  );
  const [oracleTab, setOracleTab] = useState<'resolve' | 'pending'>('resolve');
  const [busyMarketId, setBusyMarketId] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [extraEvidenceByMarket, setExtraEvidenceByMarket] = useState<Record<string, string>>({});
  const [selectedWinOutcomeByMarket, setSelectedWinOutcomeByMarket] = useState<Record<string, string>>({});
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  // VNEconomics v2 Direct Article Publishing -> Autopost FB/Telegram
  const [pubTitle, setPubTitle] = useState('');
  const [pubSlug, setPubSlug] = useState('');
  const [pubSlugTouched, setPubSlugTouched] = useState(false);
  const [pubPillar, setPubPillar] = useState<PillarSlug>('kinh-te-so');
  const [pubFeaturedImage, setPubFeaturedImage] = useState('');
  const [pubReadingMinutes, setPubReadingMinutes] = useState(6);
  const [pubTldr, setPubTldr] = useState('');
  const [pubContent, setPubContent] = useState('');
  const [pubSubmitting, setPubSubmitting] = useState(false);
  const [pubError, setPubError] = useState<string | null>(null);
  const [pubResult, setPubResult] = useState<{ slug: string; url: string } | null>(null);

  const toSlug = (raw: string) =>
    raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);

  const handlePublishTitleChange = (val: string) => {
    setPubTitle(val);
    if (!pubSlugTouched) {
      setPubSlug(toSlug(val));
    }
  };

  const handlePublishArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    setPubError(null);
    setPubResult(null);

    const title = pubTitle.trim();
    const slug = (pubSlug.trim() || toSlug(title)).replace(/^\/+|\/+$/g, '');
    const rawContent = pubContent.trim();

    if (!title || !slug || !rawContent) {
      setPubError(
        isEn
          ? 'Please enter article title, slug, and content.'
          : 'Vui lòng nhập đầy đủ tiêu đề, slug và nội dung bài viết.',
      );
      return;
    }

    const contentHtml = /<(p|h[1-6]|ul|ol|div|blockquote)\b/i.test(rawContent)
      ? rawContent
      : rawContent
          .split(/\n{2,}/)
          .map((block) => `<p>${block.trim().replace(/\n/g, '<br />')}</p>`)
          .join('\n');

    setPubSubmitting(true);
    try {
      const res = await fetch('/api/posts.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken.trim(),
        },
        body: JSON.stringify({
          title,
          slug,
          pillar_slug: pubPillar,
          featured_image: pubFeaturedImage.trim(),
          reading_minutes: Math.max(1, Number(pubReadingMinutes) || 6),
          tldr_summary: pubTldr.trim(),
          excerpt: pubTldr.trim(),
          content_html: contentHtml,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      setPubResult({
        slug: json.data?.slug || slug,
        url: json.data?.url || `https://vneconomics.com/${slug}/`,
      });
      setPubTitle('');
      setPubSlug('');
      setPubSlugTouched(false);
      setPubFeaturedImage('');
      setPubTldr('');
      setPubContent('');
    } catch (err) {
      setPubError(
        err instanceof Error
          ? err.message
          : isEn
            ? 'Failed to publish article.'
            : 'Không thể xuất bản bài viết.',
      );
    } finally {
      setPubSubmitting(false);
    }
  };

  useEffect(() => {
    const sync = () => setMarkets(getPredictionMarkets({ includePending: true }));
    window.addEventListener(PREDICTIONS_UPDATED_EVENT, sync);
    return () => window.removeEventListener(PREDICTIONS_UPDATED_EVENT, sync);
  }, []);

  const pendingMarkets = useMemo(
    () => markets.filter((m) => m.status === 'pending_review'),
    [markets],
  );
  const activeMarkets = useMemo(
    () => markets.filter((m) => m.status === 'active'),
    [markets],
  );

  const handleScanOneMarket = async (market: PredictionMarket) => {
    setBusyMarketId(market.id);
    setAdminNotice(null);
    try {
      const scan = await runAiOracleResolutionScan(market, extraEvidenceByMarket[market.id]);
      saveMarketAiOracleScan(market.id, scan);
      if (scan.suggested_outcome_id) {
        setSelectedWinOutcomeByMarket((prev) => ({
          ...prev,
          [market.id]: scan.suggested_outcome_id!,
        }));
      }
      setAdminNotice(
        isEn
          ? `AI Oracle scanned "${market.titleEn}" (${scan.suggested_verdict} • ${scan.confidence_score}%).`
          : `AI Oracle đã quét xong kèo "${market.titleVi}" (${scan.suggested_verdict} • ${scan.confidence_score}%).`,
      );
    } finally {
      setBusyMarketId(null);
    }
  };

  const handleAuditPendingMarket = async (market: PredictionMarket) => {
    setBusyMarketId(market.id);
    try {
      const ev = await runAiMarketModeration(market);
      saveMarketAiModeration(market.id, ev);
    } finally {
      setBusyMarketId(null);
    }
  };

  const handleBatchScan = async () => {
    setBatchBusy(true);
    try {
      if (oracleTab === 'pending') {
        for (const m of pendingMarkets) {
          const ev = await runAiMarketModeration(m);
          saveMarketAiModeration(m.id, ev);
        }
      } else {
        for (const m of activeMarkets) {
          const scan = await runAiOracleResolutionScan(m, extraEvidenceByMarket[m.id]);
          saveMarketAiOracleScan(m.id, scan);
        }
      }
      setAdminNotice(
        isEn ? 'Completed Batch AI Scan.' : 'Đã hoàn tất Quét AI hàng loạt.',
      );
    } finally {
      setBatchBusy(false);
    }
  };

  const handleResolveBinary = (market: PredictionMarket, side: PredictionSide) => {
    const primaryOutcomeId = market.outcomes[0]?.id;
    if (!primaryOutcomeId) return;
    resolveMarketOutcome({
      marketId: market.id,
      outcomeResults: { [primaryOutcomeId]: side },
      primaryOutcomeId,
      primarySide: side,
      evidenceUrl: market.aiOracleScan?.source_urls?.[0] || market.resolutionSourceUrl,
      note: extraEvidenceByMarket[market.id] || market.aiOracleScan?.evidence_summary,
    });
    setAdminNotice(
      isEn
        ? `Resolved "${market.titleEn}" as ${side}.`
        : `Đã chốt kết quả kèo "${market.titleVi}" là ${side}.`,
    );
  };

  const handleResolveMulti = (market: PredictionMarket) => {
    const winId =
      selectedWinOutcomeByMarket[market.id] ||
      market.aiOracleScan?.suggested_outcome_id ||
      market.outcomes[0]?.id;
    if (!winId) return;
    const outcomeResults: Record<string, PredictionSide> = {};
    for (const o of market.outcomes) {
      outcomeResults[o.id] = o.id === winId ? 'YES' : 'NO';
    }
    resolveMarketOutcome({
      marketId: market.id,
      outcomeResults,
      primaryOutcomeId: winId,
      primarySide: 'YES',
      evidenceUrl: market.aiOracleScan?.source_urls?.[0] || market.resolutionSourceUrl,
      note: extraEvidenceByMarket[market.id] || market.aiOracleScan?.evidence_summary,
    });
    setAdminNotice(
      isEn
        ? `Resolved multi-outcome market "${market.titleEn}".`
        : `Đã chốt kết quả kèo đa kịch bản "${market.titleVi}".`,
    );
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-editorial-teal">
            {isEn
              ? 'VNEconomics CMS v2 (Protected by Firebase Admin UID + Admin Token)'
              : 'VNEconomics CMS v2 (Bảo vệ bằng Firebase Admin UID + Admin Token)'}
          </div>
          <h1 className="font-serif text-3xl font-bold text-ink-950 dark:text-paper-50">
            {isEn ? 'Content Administration & AI Oracle Console' : 'Quản trị Nội dung & AI Oracle Sàn Dự báo'}
          </h1>
        </div>
        <a
          href="/admin.html"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2.5 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
        >
          <Bot className="w-4 h-4" />
          {isEn ? 'Open FB/Telegram Autopost Console (/admin.html)' : 'Mở Bảng điều khiển FB/Telegram Autopost (/admin.html)'}
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: isEn ? 'Migrated Articles' : 'Bài viết đã di cư', val: stats.posts },
          { label: isEn ? 'Books & AI Skills' : 'Sách & AI Skills', val: stats.products + 2 },
          { label: isEn ? 'Active Prediction Markets' : 'Kèo Dự báo đang mở', val: activeMarkets.length },
          { label: isEn ? 'Pending Review Markets' : 'Kèo mới chờ duyệt', val: pendingMarkets.length },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="p-5 rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900"
          >
            <div className="text-xs text-ink-500">{kpi.label}</div>
            <div className="text-2xl font-bold tabular-nums mt-1">{kpi.val}</div>
          </div>
        ))}
      </div>

      {/* AI ORACLE & PREDICTION MARKET MODERATION SECTION */}
      <section className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 sm:p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-paper-200 dark:border-ink-800 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#146EBE]">
              <ShieldCheck className="w-4 h-4" />
              <span>
                {isEn
                  ? 'Prediction Market Moderation & AI Oracle (Research Vocabulary Architecture)'
                  : 'Hệ thống AI Quét dữ liệu & Duyệt Kèo Dự báo'}
              </span>
            </div>
            <h2 className="font-serif text-xl font-bold text-ink-950 dark:text-paper-50">
              {isEn ? 'AI Scan → Suggestion Card → Admin Approve' : 'AI Quét thực tế → Thẻ gợi ý → Admin Duyệt chốt'}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isUnlocked ? (
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                  placeholder={isEn ? 'Enter Admin Token...' : 'Nhập X-Admin-Token...'}
                  className="px-3 py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setIsUnlocked(adminToken.trim().length >= 6)}
                  className="px-3 py-1.5 rounded-lg bg-[#146EBE] text-white text-xs font-bold inline-flex items-center gap-1"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Unlock' : 'Mở khóa'}</span>
                </button>
              </div>
            ) : (
              <>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                  <Unlock className="w-3 h-3" />
                  {isLocalhost ? (isEn ? 'Local Admin Mode' : 'Admin Localhost') : 'Admin Unlocked'}
                </span>
                <button
                  type="button"
                  disabled={batchBusy}
                  onClick={() => void handleBatchScan()}
                  className="px-3.5 py-2 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {batchBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isEn ? 'Batch AI Scan' : 'AI Quét hàng loạt'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {adminNotice && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
            {adminNotice}
          </div>
        )}

        {!isUnlocked ? (
          <div className="p-8 text-center text-xs text-ink-500 space-y-2">
            <Lock className="w-6 h-6 mx-auto text-ink-400" />
            <p>
              {isEn
                ? 'Enter your Admin Token to run AI Oracle scans and approve market resolutions.'
                : 'Vui lòng nhập Admin Token để kích hoạt AI Oracle và duyệt chốt kèo.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 border-b border-paper-200 dark:border-ink-800 pb-3 text-xs font-bold">
              <button
                type="button"
                onClick={() => setOracleTab('resolve')}
                className={`px-3.5 py-2 rounded-xl transition-colors ${
                  oracleTab === 'resolve'
                    ? 'bg-[#146EBE] text-white'
                    : 'bg-paper-100 dark:bg-ink-800 text-ink-700 dark:text-paper-200'
                }`}
              >
                {isEn
                  ? `AI Oracle Resolution (${activeMarkets.length})`
                  : `AI Quét & Chốt kèo (${activeMarkets.length})`}
              </button>
              <button
                type="button"
                onClick={() => setOracleTab('pending')}
                className={`px-3.5 py-2 rounded-xl transition-colors ${
                  oracleTab === 'pending'
                    ? 'bg-[#146EBE] text-white'
                    : 'bg-paper-100 dark:bg-ink-800 text-ink-700 dark:text-paper-200'
                }`}
              >
                {isEn
                  ? `Pending New Markets (${pendingMarkets.length})`
                  : `Duyệt kèo cộng đồng mới (${pendingMarkets.length})`}
              </button>
            </div>

            {oracleTab === 'pending' && (
              <div className="space-y-4">
                {pendingMarkets.length === 0 ? (
                  <p className="text-xs text-ink-500 py-4">
                    {isEn
                      ? 'No pending community markets waiting for review.'
                      : 'Hiện chưa có kèo cộng đồng mới nào đang chờ duyệt.'}
                  </p>
                ) : (
                  pendingMarkets.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-100/50 dark:bg-ink-950/50 p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-bold text-ink-950 dark:text-paper-50">
                            {isEn ? m.titleEn : m.titleVi}
                          </div>
                          <div className="text-[11px] text-ink-500">
                            {m.category} • {m.type} • {isEn ? 'Close' : 'Chốt'}: {m.endDate} •{' '}
                            {m.resolutionSourceLabel}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                          <button
                            type="button"
                            disabled={busyMarketId === m.id}
                            onClick={() => void handleAuditPendingMarket(m)}
                            className="px-3 py-1.5 rounded-lg bg-[#146EBE]/10 text-[#146EBE] hover:bg-[#146EBE] hover:text-white inline-flex items-center gap-1 transition-colors"
                          >
                            {busyMarketId === m.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                            <span>{isEn ? 'AI Audit' : 'AI Thẩm định'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => approvePendingMarket(m.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isEn ? 'Approve' : 'Duyệt lên sàn'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => rejectPendingMarket(m.id, 'Rejected by Admin')}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{isEn ? 'Reject' : 'Từ chối'}</span>
                          </button>
                        </div>
                      </div>

                      {m.aiModeration && (
                        <AiPredictionReviewCard mode="moderation" evaluation={m.aiModeration} isEn={isEn} />
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {oracleTab === 'resolve' && (
              <div className="space-y-4">
                {activeMarkets.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-100/50 dark:bg-ink-950/50 p-4 space-y-3"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-ink-950 dark:text-paper-50">
                          {isEn ? m.titleEn : m.titleVi}
                        </div>
                        <div className="text-[11px] text-ink-500">
                          {m.category} • {isEn ? 'Close' : 'Chốt sổ'}: {m.endDate} •{' '}
                          <a
                            href={m.resolutionSourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#146EBE] hover:underline"
                          >
                            {m.resolutionSourceLabel}
                          </a>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold shrink-0">
                        <button
                          type="button"
                          disabled={busyMarketId === m.id}
                          onClick={() => void handleScanOneMarket(m)}
                          className="px-3 py-1.5 rounded-lg bg-[#146EBE] hover:bg-[#0f5ba0] text-white inline-flex items-center gap-1.5"
                        >
                          {busyMarketId === m.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          <span>{isEn ? 'AI Scan Real Data' : 'AI Quét dữ liệu thực tế'}</span>
                        </button>

                        {m.type === 'binary' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleResolveBinary(m, 'YES')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {isEn ? 'Resolve YES' : 'Chốt YES'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResolveBinary(m, 'NO')}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
                            >
                              {isEn ? 'Resolve NO' : 'Chốt NO'}
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={
                                selectedWinOutcomeByMarket[m.id] ||
                                m.aiOracleScan?.suggested_outcome_id ||
                                m.outcomes[0]?.id
                              }
                              onChange={(e) =>
                                setSelectedWinOutcomeByMarket((prev) => ({
                                  ...prev,
                                  [m.id]: e.target.value,
                                }))
                              }
                              className="px-2.5 py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 text-xs"
                            >
                              {m.outcomes.map((o) => (
                                <option key={o.id} value={o.id}>
                                  {isEn ? o.labelEn : o.labelVi}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleResolveMulti(m)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {isEn ? 'Resolve Winner' : 'Chốt kịch bản thắng'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <input
                      type="text"
                      value={extraEvidenceByMarket[m.id] || ''}
                      onChange={(e) =>
                        setExtraEvidenceByMarket((prev) => ({
                          ...prev,
                          [m.id]: e.target.value,
                        }))
                      }
                      placeholder={
                        isEn
                          ? 'Optional: paste latest press release / link for AI Oracle to verify...'
                          : 'Tùy chọn: dán tin tức/link thông cáo mới nhất để AI Oracle đối chiếu thêm...'
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 text-[11px]"
                    />

                    {m.aiOracleScan && (
                      <AiPredictionReviewCard mode="oracle" evaluation={m.aiOracleScan} isEn={isEn} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* VNEconomics v2 Direct Article Publishing -> Autopost FB/Telegram */}
      <section className="p-6 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-bold flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-editorial-teal" />
              {isEn
                ? 'Publish New Article (VNEconomics v2 → Autopost)'
                : 'Đăng bài viết mới (VNEconomics v2 → Autopost FB/Telegram)'}
            </h2>
            <p className="text-xs text-ink-600 dark:text-ink-400 mt-1">
              {isEn
                ? 'Publishes directly to vneconomics.com MySQL & renders immediately at /<slug>/. automation.vneconomics.com scans /api/posts.php automatically for Facebook & Telegram.'
                : 'Lưu trực tiếp vào MySQL trên vneconomics.com và hiển thị ngay tại /<slug>/. Hệ thống automation.vneconomics.com sẽ tự quét /api/posts.php để đăng Facebook & Telegram.'}
            </p>
          </div>
        </div>

        {!isUnlocked ? (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs text-amber-700 dark:text-amber-300">
            {isEn
              ? 'Please enter your Admin Token at the top of the page to unlock direct article publishing.'
              : 'Vui lòng nhập Admin Token ở đầu trang để mở khóa tính năng đăng bài viết mới.'}
          </div>
        ) : (
          <form onSubmit={handlePublishArticle} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1">
                  {isEn ? 'Article Title *' : 'Tiêu đề bài viết *'}
                </label>
                <input
                  type="text"
                  required
                  value={pubTitle}
                  onChange={(e) => handlePublishTitleChange(e.target.value)}
                  placeholder={
                    isEn
                      ? 'e.g. How AI Agents Reshaped Vietnam Digital Payments in 2026'
                      : 'VD: AI Agent đang thay đổi thanh toán số tại Việt Nam năm 2026 ra sao?'
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1">
                  {isEn ? 'URL Slug *' : 'Đường dẫn (Slug) *'}
                </label>
                <input
                  type="text"
                  required
                  value={pubSlug}
                  onChange={(e) => {
                    setPubSlugTouched(true);
                    setPubSlug(e.target.value);
                  }}
                  placeholder="ai-agent-thanh-toan-so-viet-nam-2026"
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1">
                  {isEn ? 'Topic Pillar' : 'Chuyên mục'}
                </label>
                <select
                  value={pubPillar}
                  onChange={(e) => setPubPillar(e.target.value as PillarSlug)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
                >
                  {TOPIC_PILLARS.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {isEn ? p.nameEn : p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1">
                  {isEn ? 'Featured Image URL (optional)' : 'URL Ảnh đại diện (tùy chọn)'}
                </label>
                <input
                  type="url"
                  value={pubFeaturedImage}
                  onChange={(e) => setPubFeaturedImage(e.target.value)}
                  placeholder="https://vneconomics.com/wp-content/uploads/..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1">
                  {isEn ? 'Reading Minutes' : 'Thời gian đọc (phút)'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={pubReadingMinutes}
                  onChange={(e) => setPubReadingMinutes(Number(e.target.value) || 6)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1">
                {isEn ? 'TL;DR Summary / Excerpt' : 'Tóm tắt TL;DR / Sapo'}
              </label>
              <textarea
                rows={2}
                value={pubTldr}
                onChange={(e) => setPubTldr(e.target.value)}
                placeholder={
                  isEn
                    ? 'Concise 1-2 sentence takeaway used for GEO/AEO and Autopost captions.'
                    : 'Tóm tắt ngắn 1–2 câu dùng cho GEO/AEO và nội dung tóm tắt khi Autopost.'
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1">
                {isEn ? 'Article Content (HTML or plain paragraphs) *' : 'Nội dung bài viết (HTML hoặc văn bản thường) *'}
              </label>
              <textarea
                required
                rows={8}
                value={pubContent}
                onChange={(e) => setPubContent(e.target.value)}
                placeholder={
                  isEn
                    ? '<p>Write or paste HTML / plain paragraphs here...</p>'
                    : 'Dán nội dung HTML hoặc các đoạn văn bản thường (tự động bọc thẻ <p>)...'
                }
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
              />
            </div>

            {pubError && (
              <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{pubError}</span>
              </div>
            )}

            {pubResult && (
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-800 dark:text-emerald-200 flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {isEn
                    ? 'Article published! Autopost will pick it up on the next sync.'
                    : 'Đã xuất bản bài viết! Autopost sẽ tự động quét trong chu kỳ tiếp theo.'}
                </span>
                <a
                  href={`/${pubResult.slug}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold underline"
                >
                  {pubResult.url}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={pubSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-editorial-teal hover:bg-editorial-teal/90 text-white text-sm font-semibold disabled:opacity-60 cursor-pointer"
              >
                {pubSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {pubSubmitting
                  ? isEn
                    ? 'Publishing...'
                    : 'Đang xuất bản...'
                  : isEn
                    ? 'Publish Article'
                    : 'Xuất bản bài viết'}
              </button>
            </div>
          </form>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-6 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-3">
          <h2 className="font-serif text-lg font-bold flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-editorial-teal" />
            {isEn ? 'SEO • GEO • AEO Audit' : 'Kiểm toán SEO • GEO • AEO'}
          </h2>
          <ul className="text-xs space-y-2 text-ink-700 dark:text-ink-300">
            <li>
              • {isEn ? 'Articles with TL;DR / Excerpt: ' : 'Bài viết có TL;DR / Excerpt: '}
              <strong>{stats.posts - missingTldr}/{stats.posts}</strong>
            </li>
            <li>
              • {isEn ? 'Auto-generated 301 Redirect rules: ' : 'Quy tắc 301 Redirect đã tạo tự động: '}
              <strong>{stats.redirects}</strong>
            </li>
            <li>
              • {isEn ? 'Exported Exam Banks for staging-store.vneconomics.com: ' : 'Ngân hàng Đề thi đã xuất cho '}
              {!isEn && <code>staging-store.vneconomics.com</code>}
              {!isEn && ': '}
              <strong>{stats.exam_banks}</strong>
            </li>
            <li>
              • {isEn
                ? 'Bilingual VI/EN & FAQ AI Batch pipeline: Ready via scripts/translate-catalog-en.mjs.'
                : 'Batch AI sinh FAQ 3–5 câu & chuyển ngữ EN cho 216 bài: Sẵn sàng qua scripts/translate-catalog-en.mjs.'}
            </li>
          </ul>
        </div>

        <div className="p-6 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-3">
          <h2 className="font-serif text-lg font-bold flex items-center gap-2">
            <Database className="w-5 h-5 text-editorial-navy dark:text-sky-400" />
            {isEn ? 'Quick Links & Security' : 'Liên kết Nhanh & An ninh'}
          </h2>
          <div className="text-xs space-y-2 text-ink-700 dark:text-ink-300">
            <p className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              {isEn
                ? 'Every database write operation via API requires a Firebase ID Token (RS256) and Rate Limiting.'
                : 'Mọi thao tác ghi DB qua API đều yêu cầu Firebase ID Token (RS256) và Rate Limit.'}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link to="/du-bao/" className="px-3 py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 font-semibold">
                {isEn ? 'Inspect Prediction Markets' : 'Mở Sàn Dự báo'}
              </Link>
              <Link to="/thu-vien-sach/" className="px-3 py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 font-semibold">
                {isEn ? 'Inspect Ebook Library' : 'Kiểm tra Thư viện Sách'}
              </Link>
              <Link to="/tu-dien/" className="px-3 py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 font-semibold">
                {isEn ? 'Inspect AEO Lexicon' : 'Kiểm tra Từ điển AEO'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
