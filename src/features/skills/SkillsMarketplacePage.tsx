import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Bot,
  Check,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Filter,
  FlaskConical,
  KeyRound,
  Layers,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Terminal,
  Unlock,
} from 'lucide-react';
import { resolveMediaUrl } from '../../core/data/catalogService.ts';
import { useTranslation } from '../../core/i18n/index.ts';
import { useSEO } from '../../core/seo/useSEO.ts';
import { getPointsState, getResourcePointCost, isItemUnlocked, unlockItemWithPoints } from '../game/vneGameService.ts';
import {
  getLocalizedSkillCategories,
  getLocalizedSkills,
  SKILL_DIFFICULTY_LABELS,
  type AISkillItem,
  type SkillCategorySlug,
  type SkillCostType,
  type SkillDifficulty,
} from './aiSkillsData.ts';

type SortMode = 'recommended' | 'free-first' | 'az';

const COST_LABELS_MAP: Record<'vi' | 'en', Record<SkillCostType, string>> = {
  vi: {
    free: 'Miễn phí 0đ',
    opensource: 'Mã nguồn mở',
    points: 'VNE Points',
  },
  en: {
    free: 'Free ($0)',
    opensource: 'Open Source',
    points: 'VNE Points',
  },
};

const PAGE_SIZE = 15;

function downloadSkillMarkdown(skill: AISkillItem, isEn: boolean): void {
  const md = `---
name: ${skill.slug}
description: ${skill.shortDesc}
category: ${skill.categoryName}
compatible_agents: ${skill.compatibleAgents.join(', ')}
---

# ${skill.title}

${skill.summary}

## ${isEn ? 'Real-World Applications' : 'Ứng dụng thực tế'}
${skill.useCases.map((u) => `- ${u}`).join('\n')}

## ${isEn ? 'Activation Guide' : 'Hướng dẫn kích hoạt'}
${skill.steps.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}

## ${isEn ? 'Sample Activation Prompt / Command' : 'Prompt / Lệnh kích hoạt mẫu'}
\`\`\`text
${skill.samplePrompt}
\`\`\`
`;
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${skill.slug}-SKILL.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const SkillCoverVisual: React.FC<{
  skill: AISkillItem;
  compact?: boolean;
  lang: 'vi' | 'en';
}> = ({ skill, compact = true, lang }) => {
  const diffLabel = SKILL_DIFFICULTY_LABELS[lang][skill.difficulty] || skill.difficulty;
  return (
  <div className="relative aspect-video bg-gradient-to-br from-[#1c244b] via-[#1e2d67] to-[#046bd2] overflow-hidden select-none">
    {/* Subtle technical grid overlay */}
    <div
      className="absolute inset-0 opacity-15"
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(255,255,255,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.22) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    />

    {/* Top Overlay Badges */}
    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 z-10">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900/85 backdrop-blur-sm text-[10px] font-semibold text-white border border-white/15">
        <Bot className="w-3 h-3 text-amber-300" />
        {diffLabel}
      </span>
      {skill.isMakeInVNE && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-600/95 text-[10px] font-bold text-white shadow-sm">
          <Sparkles className="w-2.5 h-2.5 text-amber-200" />
          Make-in-VNE
        </span>
      )}
    </div>

    {/* Center Graphic Typography */}
    <div className={`relative z-10 h-full flex flex-col justify-center px-3.5 ${compact ? 'pt-6 pb-7' : 'pt-7 pb-9 px-6'}`}>
      <div className="flex flex-wrap items-center gap-1.5 mb-1">
        <span className="px-1.5 py-0.5 rounded bg-white/15 text-[9px] font-semibold text-sky-100 border border-white/15 truncate max-w-[140px]">
          {skill.categoryName}
        </span>
        <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-[9px] font-bold text-amber-200 border border-amber-300/30 whitespace-nowrap">
          {`${getResourcePointCost(skill.pointsCost)} VNE`}
        </span>
      </div>
      <div
        className={`font-extrabold text-white leading-snug tracking-tight drop-shadow-sm ${
          compact ? 'text-xs sm:text-[13px] line-clamp-1' : 'text-lg sm:text-2xl'
        }`}
      >
        {skill.title}
      </div>
      <div className="text-[10px] text-sky-100/80 mt-0.5 truncate">
        Agent: {skill.compatibleAgents.slice(0, 3).join(' • ')}
      </div>
    </div>

    {/* Bottom Overlay Badges & Watermark */}
    <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between gap-1.5 z-10">
      <div className="flex items-center gap-1 shrink-0">
        {skill.isRecommended && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#046bd2]/95 text-[9px] font-bold text-white border border-white/20 whitespace-nowrap">
            <Sparkles className="w-2.5 h-2.5 text-amber-300 shrink-0" />
            {lang === 'en' ? 'Recommended' : 'Khuyên dùng'}
          </span>
        )}
        {skill.isAcademicEEAT && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-700/90 text-[9px] font-bold text-white border border-white/20 whitespace-nowrap">
            <ShieldCheck className="w-2.5 h-2.5 text-emerald-200 shrink-0" />
            EEAT
          </span>
        )}
      </div>
      <span className="text-[8px] font-bold tracking-widest uppercase text-white/60 whitespace-nowrap">
        VNECONOMICS.COM
      </span>
    </div>
  </div>
  );
};

const SkillDetailView: React.FC<{ slug: string }> = ({ slug }) => {
  const { lang, isEn } = useTranslation();
  const skillsCatalog = useMemo(() => getLocalizedSkills(lang), [lang]);
  const skill = skillsCatalog.find((s) => s.slug === slug);
  const [copied, setCopied] = useState(false);
  const [unlocked, setUnlocked] = useState(() => (skill ? isItemUnlocked(`skill_${skill.slug}`) : false));
  const [statusMsg, setStatusMsg] = useState('');

  useSEO({
    title: skill
      ? isEn
        ? `${skill.title} — VNEconomics AI Skills Marketplace`
        : `${skill.title} — Sàn AI Skills VNEconomics`
      : isEn
        ? 'AI Skill Not Found'
        : 'Không tìm thấy AI Skill',
    description:
      skill?.shortDesc ||
      (isEn ? 'AI Agent Skills Marketplace at VNEconomics.' : 'Sàn Skills cho AI Agents tại VNEconomics.'),
    canonicalPath: `/ai-skills/${slug}/`,
  });

  if (!skill) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-14 text-center space-y-4">
        <h1 className="font-serif text-2xl font-bold text-ink-950 dark:text-paper-50">
          {isEn ? 'Requested AI Skill not found' : 'Không tìm thấy AI Skill yêu cầu'}
        </h1>
        <Link
          to="/ai-skills/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#046bd2] text-white text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />{' '}
          {isEn ? 'Back to AI Agent Skills Marketplace' : 'Quay lại Sàn Skills cho AI Agents'}
        </Link>
      </div>
    );
  }

  const relatedSkills = skillsCatalog.filter(
    (s) => s.categorySlug === skill.categorySlug && s.slug !== skill.slug,
  ).slice(0, 4);

  const skillCost = skill ? getResourcePointCost(skill.pointsCost) : 10;

  const handleCopyPrompt = () => {
    navigator.clipboard?.writeText(skill.samplePrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUnlock = () => {
    const res = unlockItemWithPoints(`skill_${skill.slug}`, skillCost, skill.title);
    setStatusMsg(res.message);
    if (res.ok) setUnlocked(true);
  };

  const canDownloadDirectly = unlocked;
  const userPoints = getPointsState().totalPoints;
  const resolvedZipUrl = skill.downloadUrl ? resolveMediaUrl(skill.downloadUrl) : undefined;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 4-level Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
        <Link to="/" className="hover:text-[#046bd2]">{isEn ? 'Home' : 'Trang chủ'}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/ai-skills/" className="hover:text-[#046bd2]">{isEn ? 'AI Skills Marketplace' : 'Sàn AI Skills'}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-[#046bd2] font-medium">{skill.categoryName}</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-ink-900 dark:text-paper-100 font-semibold">{skill.title}</span>
      </nav>

      {/* Main Header Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-ink-800 shadow-sm">
            <SkillCoverVisual skill={skill} compact={false} lang={lang} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 space-y-1">
              <div className="text-xs font-bold text-[#046bd2] dark:text-sky-400">
                {isEn ? 'Practical Guidance for Using This Skill' : 'Lời khuyên thực chiến khi dùng Skill'}
              </div>
              <p className="text-xs text-ink-700 dark:text-ink-300 leading-relaxed">{skill.adviceStudent}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 space-y-1">
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                {isEn ? 'Free ($0) Access & Academic Unlock' : 'Đặc quyền 0đ & Mở khóa học thuật'}
              </div>
              <p className="text-xs text-ink-700 dark:text-ink-300 leading-relaxed">{skill.benefitNote}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {skill.isAcademicEEAT && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />{' '}
                {isEn ? 'EEAT Verified • VNEconomics Standard' : 'Thẩm định EEAT • Chuẩn VNEconomics'}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 text-[11px] font-semibold">
              {skill.categoryName}
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink-950 dark:text-paper-50">
              {skill.title}
            </h1>
            <p className="text-sm text-ink-700 dark:text-ink-300 leading-relaxed">{skill.summary}</p>
          </div>

          {/* Spec Table */}
          <div className="rounded-xl border border-slate-200 dark:border-ink-800 overflow-hidden text-xs">
            <div className="grid grid-cols-3 border-b border-slate-200 dark:border-ink-800">
              <div className="p-3 bg-slate-50 dark:bg-ink-950 font-semibold text-ink-600 dark:text-ink-400">
                {isEn ? 'Unlock Cost' : 'Chi phí mở khóa'}
              </div>
              <div className="col-span-2 p-3 font-bold text-emerald-700 dark:text-emerald-400">
                {isEn
                  ? `${skillCost} VNE Points ($0 real money • Balance: ${userPoints} VNE)`
                  : `${skillCost} VNE Points (0đ tiền thật • Số dư: ${userPoints} VNE)`}
              </div>
            </div>
            <div className="grid grid-cols-3 border-b border-slate-200 dark:border-ink-800">
              <div className="p-3 bg-slate-50 dark:bg-ink-950 font-semibold text-ink-600 dark:text-ink-400">
                {isEn ? 'Difficulty Level' : 'Độ khó tiếp cận'}
              </div>
              <div className="col-span-2 p-3 text-ink-900 dark:text-paper-100">
                {SKILL_DIFFICULTY_LABELS[lang][skill.difficulty] || skill.difficulty}
              </div>
            </div>
            <div className="grid grid-cols-3 border-b border-slate-200 dark:border-ink-800">
              <div className="p-3 bg-slate-50 dark:bg-ink-950 font-semibold text-ink-600 dark:text-ink-400">
                {isEn ? 'Supported AI Agents' : 'AI Agents hỗ trợ'}
              </div>
              <div className="col-span-2 p-3 text-ink-900 dark:text-paper-100">
                {skill.compatibleAgents.join(', ')}
              </div>
            </div>
            <div className="grid grid-cols-3 border-b border-slate-200 dark:border-ink-800">
              <div className="p-3 bg-slate-50 dark:bg-ink-950 font-semibold text-ink-600 dark:text-ink-400">
                {isEn ? 'Package Format' : 'Định dạng gói'}
              </div>
              <div className="col-span-2 p-3 text-ink-900 dark:text-paper-100">{skill.formatLabel}</div>
            </div>
            <div className="grid grid-cols-3">
              <div className="p-3 bg-slate-50 dark:bg-ink-950 font-semibold text-ink-600 dark:text-ink-400">
                {isEn ? 'Optimized Language' : 'Ngôn ngữ tối ưu'}
              </div>
              <div className="col-span-2 p-3 text-ink-900 dark:text-paper-100">{skill.languageLabel}</div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            {skill.tags.map((tg) => (
              <span
                key={tg}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-ink-800 text-[11px] font-medium text-ink-700 dark:text-ink-300"
              >
                <Tag className="w-3 h-3 text-[#046bd2]" />
                {tg}
              </span>
            ))}
          </div>

          {/* Primary CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {canDownloadDirectly ? (
              resolvedZipUrl ? (
                <a
                  href={resolvedZipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#046bd2] hover:bg-[#0356aa] text-white text-sm font-bold shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {isEn ? 'Download Skill Package (.zip)' : 'Tải Gói Skill (.zip)'}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => downloadSkillMarkdown(skill, isEn)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#046bd2] hover:bg-[#0356aa] text-white text-sm font-bold shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {isEn ? 'Download SKILL.md' : 'Tải file SKILL.md'}
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={handleUnlock}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-sm transition-colors"
              >
                <Lock className="w-4 h-4" />
                {isEn ? `Unlock Now (${skillCost} VNE Points)` : `Mở khóa ngay (${skillCost} VNE Points)`}
              </button>
            )}

            <Link
              to="/ai-lab/"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-ink-700 bg-slate-50 dark:bg-ink-800 text-ink-900 dark:text-paper-100 text-sm font-semibold hover:border-[#046bd2]"
            >
              <KeyRound className="w-4 h-4 text-editorial-teal" />
              {isEn ? 'Test in AI BYOK Lab' : 'Chạy thử với AI BYOK Lab'}
            </Link>
          </div>

          {statusMsg && (
            <div className={`p-3 rounded-xl border text-xs font-medium flex flex-wrap items-center gap-2 ${unlocked ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'}`}>
              <Unlock className="w-4 h-4 shrink-0" />
              <span>{statusMsg}</span>
              {!unlocked && (
                <span className="inline-flex items-center gap-2">
                  <Link to="/luyen-tap/" className="underline font-bold text-[#046bd2]">
                    {isEn ? 'Practice to earn VNE' : 'Luyện tập kiếm VNE'}
                  </Link>
                  <Link to="/tai-khoan/" className="underline font-bold text-[#046bd2]">
                    {isEn ? 'Register account' : 'Đăng ký tài khoản'}
                  </Link>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3-Part Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-xl border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-5 space-y-2.5">
          <h2 className="font-serif text-lg font-bold text-ink-950 dark:text-paper-50">
            {isEn ? 'Real-World Applications' : 'Ứng dụng thực tế'}
          </h2>
          <ul className="space-y-2 text-xs text-ink-700 dark:text-ink-300 leading-relaxed list-disc pl-4">
            {skill.useCases.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-5 space-y-2.5">
          <h2 className="font-serif text-lg font-bold text-emerald-700 dark:text-emerald-400">
            {isEn ? 'Key Strengths' : 'Ưu điểm nổi bật'}
          </h2>
          <ul className="space-y-2 text-xs text-ink-700 dark:text-ink-300 leading-relaxed list-disc pl-4">
            {skill.pros.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-5 space-y-2.5">
          <h2 className="font-serif text-lg font-bold text-amber-700 dark:text-amber-400">
            {isEn ? 'Limitations to Note' : 'Giới hạn cần lưu ý'}
          </h2>
          <ul className="space-y-2 text-xs text-ink-700 dark:text-ink-300 leading-relaxed list-disc pl-4">
            {skill.limits.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 4-Step HowTo + Sample Prompt (Locked until unlocked with VNE Points) */}
      {!canDownloadDirectly ? (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 p-6 sm:p-8 text-center space-y-3">
          <Lock className="w-8 h-8 text-amber-600 mx-auto" />
          <h2 className="font-serif text-lg sm:text-xl font-bold text-ink-950 dark:text-paper-50">
            {isEn
              ? `Unlock with ${skillCost} VNE Points to read activation steps, copy prompt & download`
              : `Mở khóa bằng ${skillCost} VNE Points để xem hướng dẫn kích hoạt, sao chép prompt & tải Skill`}
          </h2>
          <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-400 max-w-xl mx-auto">
            {isEn
              ? 'Default balance is 10 VNE Points (resets to 100 VNE daily). Register an account and practice in the Arena to earn extra VNE Points into your wallet.'
              : 'Mặc định bạn có 10 VNE Points (tự động reset 100 VNE mỗi ngày). Đăng ký tài khoản và tham gia luyện tập để kiếm thêm VNE Points vào ví.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleUnlock}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold"
            >
              <Lock className="w-4 h-4" />
              {isEn ? `Unlock (${skillCost} VNE Points)` : `Mở khóa (${skillCost} VNE Points)`}
            </button>
            <Link
              to="/luyen-tap/"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-ink-700 bg-white dark:bg-ink-900 text-xs sm:text-sm font-semibold hover:border-[#046bd2]"
            >
              {isEn ? 'Practice for VNE' : 'Luyện tập kiếm VNE'}
            </Link>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-ink-950 dark:text-paper-50">
              {isEn ? '4-Step Quick Activation Flow' : 'Quy trình 4 bước kích hoạt nhanh'}
            </h2>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-ink-800 text-ink-500">
              HowTo
            </span>
          </div>
          <ol className="space-y-2.5">
            {skill.steps.map((step, i) => (
              <li key={step} className="flex items-start gap-2.5 text-xs text-ink-700 dark:text-ink-300">
                <span className="w-5 h-5 rounded-full bg-[#046bd2] text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                  {i + 1}
                </span>
                <span className="pt-0.5 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-ink-800 bg-slate-950 text-slate-100 p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
              <Terminal className="w-4 h-4" />
              {isEn ? 'Sample Skill Activation Prompt / Command' : 'Mẫu Câu lệnh / Prompt Kích hoạt Skill'}
            </div>
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? (isEn ? 'Copied!' : 'Đã sao chép!') : isEn ? 'Copy' : 'Sao chép'}
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-200 bg-black/35 rounded-xl p-4 border border-white/10">
            {skill.samplePrompt}
          </pre>
        </div>
      </div>
      )}

      {/* Related Skills */}
      {relatedSkills.length > 0 && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-ink-950 dark:text-paper-50">
              {isEn ? 'Related AI Skills' : 'AI Skills cùng chuyên mục'}
            </h2>
            <Link to="/ai-skills/" className="text-xs font-semibold text-[#046bd2] hover:underline">
              {isEn ? 'View all →' : 'Xem tất cả →'}
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {relatedSkills.map((rel) => (
              <Link
                key={rel.slug}
                to={`/ai-skills/${rel.slug}/`}
                className="group rounded-xl border border-slate-200/90 dark:border-ink-800 bg-white dark:bg-ink-900 overflow-hidden hover:border-[#046bd2] transition-all flex flex-col"
              >
                <SkillCoverVisual skill={rel} lang={lang} />
                <div className="p-3.5 space-y-1.5">
                  <div className="text-[10px] font-bold text-[#046bd2] truncate">{rel.categoryName}</div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-ink-950 dark:text-paper-50 group-hover:text-[#046bd2] line-clamp-1">
                    {rel.title}
                  </h3>
                  <p className="text-[11px] text-ink-500 dark:text-ink-400 line-clamp-2">{rel.shortDesc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export const SkillsMarketplacePage: React.FC = () => {
  const { lang, isEn } = useTranslation();
  const costLabels = COST_LABELS_MAP[lang];
  const skillsCatalog = useMemo(() => getLocalizedSkills(lang), [lang]);
  const skillCategories = useMemo(() => getLocalizedSkillCategories(lang), [lang]);

  const location = useLocation();
  const slugMatch = location.pathname.match(/^\/ai-skills\/([^/]+)\/?$/);
  const activeSlug = slugMatch?.[1];

  const [selectedCategory, setSelectedCategory] = useState<SkillCategorySlug>('all');
  const [selectedCosts, setSelectedCosts] = useState<SkillCostType[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<SkillDifficulty[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recommended');
  const [onlyAcademic, setOnlyAcademic] = useState(false);
  const [onlyMakeInVNE, setOnlyMakeInVNE] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useSEO({
    title: isEn
      ? 'AI Agents Skills Marketplace — VNEconomics'
      : 'Sàn Skills cho AI Agents — VNEconomics Marketplace',
    description: isEn
      ? 'Curated library of SKILL.md and advanced prompt packs for Claude Code, Antigravity, Gemini CLI & Cursor covering Q1 research, finance, Web3 & Vibe Coding.'
      : 'Kho Skills (SKILL.md & gói Prompt chuyên sâu) cho Claude Code, Antigravity, Gemini CLI & Cursor về Nghiên cứu Q1, Khóa luận, Tài chính, Web3 & Vibe Coding.',
    canonicalPath: '/ai-skills/',
  });

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: skillsCatalog.length };
    for (const s of skillsCatalog) {
      counts[s.categorySlug] = (counts[s.categorySlug] || 0) + 1;
    }
    return counts;
  }, [skillsCatalog]);

  const academicCount = useMemo(
    () => skillsCatalog.filter((s) => s.isAcademicEEAT).length,
    [skillsCatalog],
  );
  const makeInVNECount = useMemo(
    () => skillsCatalog.filter((s) => s.isMakeInVNE).length,
    [skillsCatalog],
  );

  const toggleCost = (c: SkillCostType) => {
    setCurrentPage(1);
    setSelectedCosts((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const toggleDifficulty = (d: SkillDifficulty) => {
    setCurrentPage(1);
    setSelectedDifficulties((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const filteredSkills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = skillsCatalog.filter((s) => {
      if (selectedCategory !== 'all' && s.categorySlug !== selectedCategory) return false;
      if (selectedCosts.length > 0 && !selectedCosts.includes(s.costType)) return false;
      if (selectedDifficulties.length > 0 && !selectedDifficulties.includes(s.difficulty)) return false;
      if (onlyAcademic && !s.isAcademicEEAT) return false;
      if (onlyMakeInVNE && !s.isMakeInVNE) return false;
      if (q) {
        const hay = `${s.title} ${s.shortDesc} ${s.categoryName} ${s.tags.join(' ')} ${s.compatibleAgents.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortMode === 'recommended') {
      list = [...list].sort((a, b) => Number(b.isRecommended) - Number(a.isRecommended));
    } else if (sortMode === 'free-first') {
      list = [...list].sort((a, b) => a.pointsCost - b.pointsCost);
    } else if (sortMode === 'az') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title, lang));
    }
    return list;
  }, [skillsCatalog, selectedCategory, selectedCosts, selectedDifficulties, onlyAcademic, onlyMakeInVNE, searchQuery, sortMode, lang]);

  if (activeSlug) {
    return <SkillDetailView slug={activeSlug} />;
  }

  const totalPages = Math.max(1, Math.ceil(filteredSkills.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedSkills = filteredSkills.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="pb-12">
      {/* Hero Banner (Gradient Navy -> Blue matching marketing2student.com/ai-tools) */}
      <section className="w-full bg-gradient-to-r from-[#1c244b] via-[#1e2d67] to-[#046bd2] text-white py-7">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-4xl">
            <nav className="flex items-center gap-1.5 text-xs text-slate-200">
              <Link to="/" className="hover:underline">{isEn ? 'Home' : 'Trang chủ'}</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-semibold text-white">
                {isEn
                  ? `AI Agents Skills Marketplace (${skillsCatalog.length}+)`
                  : `Sàn Skills cho AI Agents (${skillsCatalog.length}+)`}
              </span>
            </nav>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-[10px] font-bold uppercase tracking-wider">
              <Bot className="w-3.5 h-3.5 text-amber-300" />
              AI AGENT SKILLS MARKETPLACE • CLAUDE • ANTIGRAVITY • CURSOR • GEMINI
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug">
              {isEn
                ? 'AI Agents Skills Marketplace — Q1 Research, Digital Economy, Web3 & Vibe Coding'
                : 'Sàn Skills cho AI Agents — Nghiên cứu Q1, Kinh tế số, Web3 & Vibe Coding'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 max-w-3xl leading-relaxed">
              {isEn ? (
                <>
                  Curated library of <code className="px-1.5 py-0.5 rounded bg-white/15 text-amber-200">SKILL.md</code> packages, APA 7 thesis &amp; Q1 peer-review workflows, macro analytics agents, Web3 Testnet kits, and Vibe Coding — unlock free ($0) or with VNE Points.
                </>
              ) : (
                <>
                  Kho tuyển chọn bộ kỹ năng <code className="px-1.5 py-0.5 rounded bg-white/15 text-amber-200">SKILL.md</code>, gói quy trình phản biện khóa luận/luận án chuẩn APA 7, Agent phân tích vĩ mô, Web3 Testnet và Vibe Coding — mở khóa miễn phí 0đ hoặc VNE Points.
                </>
              )}
            </p>
          </div>

          {/* Right Glassmorphism Stats Card */}
          <div className="shrink-0 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-4 grid grid-cols-2 divide-x divide-white/20 text-center min-w-[240px]">
            <div className="px-4">
              <div className="text-2xl sm:text-3xl font-black text-amber-300 tabular-nums">
                {skillsCatalog.length}+
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-200 mt-0.5">
                AI SKILLS
              </div>
            </div>
            <div className="px-4">
              <div className="text-2xl sm:text-3xl font-black text-emerald-300 tabular-nums">
                {skillCategories.length - 1}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-200 mt-0.5">
                {isEn ? 'CATEGORIES' : 'CHUYÊN MỤC'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main 2-Column Directory Layout */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-6">
        {/* Mobile Filter Toggle */}
        <div className="lg:hidden mb-4">
          <button
            type="button"
            onClick={() => setMobileFilterOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 text-xs font-bold text-ink-900 dark:text-paper-100"
          >
            <span className="inline-flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#046bd2]" />
              {isEn ? 'AI SKILLS FILTERS' : 'BỘ LỌC SÀN AI SKILLS'}
            </span>
            <span>{mobileFilterOpen ? (isEn ? 'Hide ▲' : 'Ẩn ▲') : isEn ? 'Open ▼' : 'Mở ▼'}</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row items-start gap-5">
          {/* Left Sidebar (w-64) */}
          <aside className={`${mobileFilterOpen ? 'block' : 'hidden'} lg:block w-full lg:w-64 shrink-0 space-y-4`}>
            <div className="bg-white dark:bg-ink-900 border border-slate-200/90 dark:border-ink-800 p-4 rounded-xl space-y-4">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-ink-900 dark:text-paper-100">
                <Filter className="w-3.5 h-3.5 text-[#046bd2]" />
                {isEn ? 'AI Skills Filters' : 'Bộ lọc Sàn AI Skills'}
              </div>

              {/* Category List */}
              <div className="pt-3 border-t border-slate-200 dark:border-ink-800 space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400 mb-2">
                  {isEn ? 'Skill Categories' : 'Chuyên mục Skills'}
                </div>
                {skillCategories.map((cat) => {
                  const active = selectedCategory === cat.slug;
                  return (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.slug);
                        setCurrentPage(1);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${
                        active
                          ? 'bg-sky-50 dark:bg-sky-950/50 text-[#046bd2] dark:text-sky-400 font-bold'
                          : 'text-ink-700 dark:text-ink-300 hover:bg-slate-50 dark:hover:bg-ink-800'
                      }`}
                    >
                      <span className="truncate">{cat.label}</span>
                      <span className="text-[11px] tabular-nums shrink-0 opacity-80">
                        ({categoryCounts[cat.slug] || 0})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Cost Checkboxes */}
              <div className="pt-3 border-t border-slate-200 dark:border-ink-800 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">
                  {isEn ? 'Cost & Unlock' : 'Chi phí & Mở khóa'}
                </div>
                {(['free', 'opensource', 'points'] as SkillCostType[]).map((c) => (
                  <label key={c} className="flex items-center gap-2 text-xs text-ink-700 dark:text-ink-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCosts.includes(c)}
                      onChange={() => toggleCost(c)}
                      className="rounded border-slate-300 text-[#046bd2] focus:ring-[#046bd2]"
                    />
                    <span>{costLabels[c]}</span>
                  </label>
                ))}
              </div>

              {/* Difficulty Checkboxes */}
              <div className="pt-3 border-t border-slate-200 dark:border-ink-800 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">
                  {isEn ? 'Difficulty Level' : 'Mức độ tiếp cận'}
                </div>
                {(['Cơ bản', 'Trung bình', 'Nâng cao'] as SkillDifficulty[]).map((d) => (
                  <label key={d} className="flex items-center gap-2 text-xs text-ink-700 dark:text-ink-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDifficulties.includes(d)}
                      onChange={() => toggleDifficulty(d)}
                      className="rounded border-slate-300 text-[#046bd2] focus:ring-[#046bd2]"
                    />
                    <span>{SKILL_DIFFICULTY_LABELS[lang][d]}</span>
                  </label>
                ))}
              </div>

              {/* Cross-link Cards */}
              <div className="pt-3 border-t border-slate-200 dark:border-ink-800 space-y-2.5">
                <Link
                  to="/thu-vien-sach/"
                  className="block p-3 rounded-xl bg-slate-50 dark:bg-ink-950 border border-slate-200 dark:border-ink-800 hover:border-[#046bd2] transition-colors"
                >
                  <div className="text-xs font-bold text-[#046bd2] dark:text-sky-400 flex items-center justify-between">
                    {isEn ? 'Ebook & Curriculum Library' : 'Thư viện Sách & Giáo trình'} <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[11px] text-ink-500 dark:text-ink-400 mt-1">
                    {isEn
                      ? '59+ free ($0) Digital Economy, Blockchain, AI & Digital Marketing books.'
                      : '60+ sách Kinh tế số, Blockchain, AI & Digital Marketing 0đ.'}
                  </p>
                </Link>

                <Link
                  to="/ai-lab/"
                  className="block p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 hover:border-emerald-500 transition-colors"
                >
                  <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                    AI BYOK Copilot Lab <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[11px] text-ink-600 dark:text-ink-400 mt-1">
                    {isEn
                      ? 'Paste your own API Key to test any Skill directly in the browser.'
                      : 'Dán API Key cá nhân để chạy thử các Skill ngay trên trình duyệt.'}
                  </p>
                </Link>
              </div>
            </div>
          </aside>

          {/* Right Main Content */}
          <section className="flex-1 min-w-0 w-full space-y-3">
            {/* Search Box + Counter */}
            <div className="bg-white dark:bg-ink-900 border border-slate-200/90 dark:border-ink-800 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={
                    isEn
                      ? 'Search Q1, APA 7, Thesis, Cardano, MCP, Vibe Coding...'
                      : 'Tìm Q1, APA 7, Khóa luận, Cardano, MCP, Vibe Coding...'
                  }
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-ink-700 bg-slate-50 dark:bg-ink-950 text-xs text-ink-900 dark:text-paper-100 focus:outline-none focus:border-[#046bd2]"
                />
              </div>
              <div className="text-xs font-semibold text-ink-600 dark:text-ink-400 tabular-nums">
                {isEn ? (
                  <>
                    Showing <span className="text-[#046bd2] font-bold">{filteredSkills.length}</span> AI Skills
                  </>
                ) : (
                  <>
                    Hiển thị <span className="text-[#046bd2] font-bold">{filteredSkills.length}</span> AI Skills
                  </>
                )}
              </div>
            </div>

            {/* Sort & Quick Filter Bar */}
            <div className="bg-slate-200/70 dark:bg-ink-900/90 p-3 rounded-lg flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-ink-600 dark:text-ink-400 mr-1">
                {isEn ? 'Sort:' : 'Sắp xếp:'}
              </span>
              {(
                [
                  ['recommended', isEn ? 'Recommended' : 'Khuyên dùng'],
                  ['free-first', isEn ? 'Free first' : 'Miễn phí lên trước'],
                  ['az', isEn ? 'Name A–Z' : 'Tên A–Z'],
                ] as [SortMode, string][]
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSortMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    sortMode === mode
                      ? 'bg-[#046bd2] text-white shadow-xs'
                      : 'bg-white dark:bg-ink-800 text-ink-700 dark:text-ink-300 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOnlyAcademic((v) => !v);
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    onlyAcademic
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-ink-800 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                  }`}
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  {isEn ? `Academic / EEAT (${academicCount})` : `Chuẩn NCKH / EEAT (${academicCount})`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOnlyMakeInVNE((v) => !v);
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    onlyMakeInVNE
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white dark:bg-ink-800 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  Make-in-VNE ({makeInVNECount})
                </button>
              </div>
            </div>

            {/* Cards Grid (4 cols xl, 5 cols 2xl) */}
            {pagedSkills.length === 0 ? (
              <div className="rounded-xl border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-10 text-center space-y-3">
                <Layers className="w-10 h-10 text-ink-400 mx-auto" />
                <p className="text-sm font-semibold text-ink-700 dark:text-ink-300">
                  {isEn ? 'No AI Skills match the current filters.' : 'Không tìm thấy AI Skill nào khớp bộ lọc hiện tại.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedCosts([]);
                    setSelectedDifficulties([]);
                    setOnlyAcademic(false);
                    setOnlyMakeInVNE(false);
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#046bd2] text-white text-xs font-semibold"
                >
                  {isEn ? 'Reset all filters' : 'Đặt lại tất cả bộ lọc'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5">
                {pagedSkills.map((skill) => (
                  <article
                    key={skill.slug}
                    className="group rounded-xl border border-slate-200/90 dark:border-ink-800 bg-white dark:bg-ink-900 hover:border-[#046bd2] transition-all overflow-hidden flex flex-col"
                  >
                    <Link to={`/ai-skills/${skill.slug}/`} className="block overflow-hidden">
                      <div className="group-hover:scale-[1.03] transition-transform duration-300">
                        <SkillCoverVisual skill={skill} lang={lang} />
                      </div>
                    </Link>

                    <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-[#046bd2] dark:text-sky-400 truncate">
                          {skill.categoryName}
                        </div>
                        <Link to={`/ai-skills/${skill.slug}/`}>
                          <h2 className="text-xs sm:text-sm font-extrabold text-ink-950 dark:text-paper-50 group-hover:text-[#046bd2] line-clamp-1">
                            {skill.title}
                          </h2>
                        </Link>
                        <p className="text-[11px] text-ink-500 dark:text-ink-400 line-clamp-2 leading-relaxed">
                          {skill.shortDesc}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 dark:border-ink-800 flex items-center justify-between gap-1.5 text-[10px]">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold border ${
                            skill.costType === 'points'
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          {skill.costType === 'points' ? `${skill.pointsCost} VNE` : costLabels[skill.costType]}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300 font-medium truncate">
                          <Tag className="w-2.5 h-2.5 shrink-0" />
                          {skill.primaryTag}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-6">
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="w-9 h-9 rounded-lg border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 flex items-center justify-center text-xs disabled:opacity-40"
                  aria-label={isEn ? 'Previous page' : 'Trang trước'}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 rounded-lg text-xs font-bold tabular-nums transition-colors ${
                      safePage === page
                        ? 'bg-[#046bd2] text-white'
                        : 'border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 text-ink-700 dark:text-ink-300 hover:border-[#046bd2]'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="w-9 h-9 rounded-lg border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 flex items-center justify-center text-xs disabled:opacity-40"
                  aria-label={isEn ? 'Next page' : 'Trang sau'}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
