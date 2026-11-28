import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  Coins,
  Filter,
  Flame,
  Layers,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Swords,
  Target,
  XCircle,
} from 'lucide-react';
import { useTranslation } from '../../core/i18n/index.ts';
import { useSEO } from '../../core/seo/useSEO.ts';
import { markTermMastered } from '../account/accountService.ts';
import { claimPracticePoints, hasRegisteredAccount } from '../game/vneGameService.ts';
import { getLexiconEntries, type GlossaryDomain } from '../glossary/glossaryEnrichment.ts';
import {
  getDailyQuests,
  getDiagnosticTagLabel,
  getLocalizedPracticeQuestions,
  getMistakeVault,
  getPracticeHistory,
  getSrsMap,
  isSrsDue,
  markQuestClaimed,
  previewSrsInterval,
  recordPracticeMistake,
  resolvePracticeMistake,
  savePracticeSession,
  submitSrsReview,
  type DiagnosticTag,
  type PracticeQuestion,
} from './practiceEngine.ts';

type PracticeTab = 'arena' | 'flashcards' | 'mistakes' | 'quests' | 'analytics';
type ArenaMode = 'classic' | 'blitz60';

export const PracticeArenaPage: React.FC = () => {
  const { lang, isEn, t } = useTranslation();
  const [activeTab, setActiveTab] = useState<PracticeTab>('arena');
  const [domainFilter, setDomainFilter] = useState<'all' | GlossaryDomain>('all');
  const [arenaMode, setArenaMode] = useState<ArenaMode>('classic');
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [blitzActive, setBlitzActive] = useState(false);
  const [blitzSecondsLeft, setBlitzSecondsLeft] = useState(60);

  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(() => {
    try {
      return Number(localStorage.getItem('vne_practice_best_combo_v1') || 0);
    } catch {
      return 0;
    }
  });
  const [quizFinished, setQuizFinished] = useState(false);

  const [srsVersion, setSrsVersion] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);

  const [mistakeVersion, setMistakeVersion] = useState(0);
  const [revengeIndex, setRevengeIndex] = useState(0);
  const [revengeSelected, setRevengeSelected] = useState<number | null>(null);

  const [questVersion, setQuestVersion] = useState(0);
  const questState = useMemo(() => getDailyQuests(lang), [lang, questVersion]);
  const [toastMsg, setToastMsg] = useState('');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  useSEO({
    title: isEn
      ? 'Digital Economy, Blockchain & AI Practice Arena | VNEconomics'
      : 'Đấu trường Luyện tập Kinh tế số, Blockchain & AI | VNEconomics',
    description: isEn
      ? 'Master Digital Economy, Blockchain & AI via SM-2 Spaced Repetition flashcards, diagnostic quiz sprints, and Mistake Vault.'
      : 'Luyện tập kiến thức Kinh tế số, Blockchain & AI bằng Flashcard SM-2, Trắc nghiệm Arena, Kho Lỗi sai (Mistake Vault) và Nhiệm vụ hằng ngày.',
    canonicalPath: '/luyen-tap/',
  });

  const localizedBank = useMemo(() => getLocalizedPracticeQuestions(lang), [lang]);
  const questions = useMemo(() => {
    const base = domainFilter === 'all' ? localizedBank : localizedBank.filter((q) => q.domain === domainFilter);
    if (shuffleSeed === 0) return base;
    const copy = [...base];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = (i * 7 + shuffleSeed * 13) % (i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, [localizedBank, domainFilter, shuffleSeed]);

  const practiceHistory = useMemo(() => getPracticeHistory(), [questVersion, quizFinished]);
  const analyticsStats = useMemo(() => {
    const totalAnswered = practiceHistory.reduce((s, h) => s + h.total, 0);
    const totalCorrect = practiceHistory.reduce((s, h) => s + h.score, 0);
    const accuracyPct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

    const allMistakes = getMistakeVault();
    const tagCounts: Record<DiagnosticTag, number> = {
      'nham-lan-khai-niem': 0,
      'bay-ky-thuat': 0,
      'ngu-canh-vi-mo': 0,
      'ao-giac-ai': 0,
    };
    allMistakes.forEach((m) => {
      const tag = m.question.diagnosticTag;
      if (tag in tagCounts) tagCounts[tag] += m.mistakeCount;
    });

    const domainScores: Record<GlossaryDomain, { correct: number; total: number }> = {
      'kinh-te-so': { correct: 0, total: 0 },
      blockchain: { correct: 0, total: 0 },
      ai: { correct: 0, total: 0 },
    };
    practiceHistory.forEach((h) => {
      if (h.domain !== 'all' && h.domain in domainScores) {
        domainScores[h.domain].correct += h.score;
        domainScores[h.domain].total += h.total;
      }
    });

    return { totalAnswered, totalCorrect, accuracyPct, tagCounts, domainScores };
  }, [practiceHistory, mistakeVersion]);

  const currentQuestion: PracticeQuestion | undefined = questions[quizIndex];

  const srsMap = useMemo(() => getSrsMap(), [srsVersion]);
  const flashcards = useMemo(() => {
    const entries = getLexiconEntries(lang).filter((e) => e.isFlagship || domainFilter === 'all' || e.domain === domainFilter);
    const filtered = domainFilter === 'all' ? entries : entries.filter((e) => e.domain === domainFilter);
    const dueFirst = [...filtered].sort((a, b) => Number(isSrsDue(srsMap[b.slug])) - Number(isSrsDue(srsMap[a.slug])));
    return dueFirst.slice(0, 30);
  }, [domainFilter, srsMap, lang]);

  const currentCard = flashcards[cardIndex % Math.max(1, flashcards.length)];

  const mistakes = useMemo(() => {
    const map = new Map(localizedBank.map((q) => [q.id, q]));
    return getMistakeVault()
      .filter((m) => !m.resolved)
      .map((m) => ({
        ...m,
        question: map.get(m.id) || m.question,
      }));
  }, [mistakeVersion, localizedBank]);

  const currentMistake = mistakes[revengeIndex % Math.max(1, mistakes.length)];

  const resetQuiz = (nextDomain?: 'all' | GlossaryDomain, nextMode?: ArenaMode) => {
    if (nextDomain) setDomainFilter(nextDomain);
    if (nextMode) setArenaMode(nextMode);
    setQuizIndex(0);
    setSelectedOption(null);
    setScore(0);
    setCombo(0);
    setQuizFinished(false);
    if ((nextMode ?? arenaMode) === 'blitz60') {
      setBlitzSecondsLeft(60);
      setBlitzActive(Boolean(nextMode === 'blitz60'));
    } else {
      setBlitzActive(false);
    }
  };

  // 60s Blitz countdown timer
  useEffect(() => {
    if (arenaMode !== 'blitz60' || !blitzActive || quizFinished) return;
    if (blitzSecondsLeft <= 0) {
      setBlitzActive(false);
      setQuizFinished(true);
      const earned = score * 6 + (score >= 5 ? 25 : 0);
      savePracticeSession(domainFilter, score, Math.max(1, quizIndex + 1), earned);
      if (earned > 0) {
        const res = claimPracticePoints(earned, `60s Blitz (${score} correct)`);
        setToastMsg(res.message);
      }
      setQuestVersion((v) => v + 1);
      return;
    }
    const id = setTimeout(() => setBlitzSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [arenaMode, blitzActive, blitzSecondsLeft, domainFilter, quizFinished, quizIndex, score]);

  const handleSelectOption = (idx: number) => {
    if (selectedOption !== null || !currentQuestion) return;
    if (arenaMode === 'blitz60' && !blitzActive) setBlitzActive(true);
    setSelectedOption(idx);
    if (idx === currentQuestion.correctIndex) {
      setScore((s) => s + 1);
      setCombo((c) => {
        const nextC = c + 1;
        if (nextC > bestCombo) {
          setBestCombo(nextC);
          try {
            localStorage.setItem('vne_practice_best_combo_v1', String(nextC));
          } catch {
            // Ignore
          }
        }
        return nextC;
      });
    } else {
      setCombo(0);
      recordPracticeMistake(currentQuestion, idx);
      setMistakeVersion((v) => v + 1);
    }
  };

  const handleNextQuestion = () => {
    if (quizIndex + 1 < questions.length) {
      setQuizIndex((i) => i + 1);
      setSelectedOption(null);
    } else {
      setBlitzActive(false);
      setQuizFinished(true);
      const earned = score * 5 + (score === questions.length ? 15 : 0) + (arenaMode === 'blitz60' && score >= 5 ? 25 : 0);
      savePracticeSession(domainFilter, score, questions.length, earned);
      if (earned > 0) {
        const res = claimPracticePoints(earned, `Arena Sprint (${score}/${questions.length})`);
        setToastMsg(res.message);
      }
      setQuestVersion((v) => v + 1);
    }
  };

  // Keyboard shortcuts (1-4 to pick A/B/C/D, Enter to advance)
  useEffect(() => {
    if (activeTab !== 'arena' || quizFinished || !currentQuestion) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (['1', '2', '3', '4'].includes(e.key) && selectedOption === null) {
        const idx = Number(e.key) - 1;
        if (idx < currentQuestion.options.length) handleSelectOption(idx);
      } else if (e.key === 'Enter' && selectedOption !== null) {
        e.preventDefault();
        handleNextQuestion();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const handleSrsGrade = (grade: 1 | 3 | 4 | 5) => {
    if (!currentCard) return;
    submitSrsReview(currentCard.slug, grade);
    if (grade >= 4) markTermMastered(currentCard.slug);
    setSrsVersion((v) => v + 1);
    setCardFlipped(false);
    setCardIndex((i) => (i + 1) % Math.max(1, flashcards.length));
    setQuestVersion((v) => v + 1);
  };

  const handleRevengeAnswer = (idx: number) => {
    if (!currentMistake || revengeSelected !== null) return;
    setRevengeSelected(idx);
    if (idx === currentMistake.question.correctIndex) {
      resolvePracticeMistake(currentMistake.id);
      const res = claimPracticePoints(10, `Mistake Vault cleared: ${currentMistake.question.domainLabel}`);
      setToastMsg(
        res.ok
          ? isEn
            ? '+10 VNE Points credited to your wallet! Cleared 1 item from Mistake Vault.'
            : '+10 VNE Points đã cộng vào ví! Đã giải quyết 1 lỗi trong Mistake Vault.'
          : res.message,
      );
      setQuestVersion((v) => v + 1);
    }
  };

  const handleNextRevenge = () => {
    setRevengeSelected(null);
    setMistakeVersion((v) => v + 1);
    setRevengeIndex(0);
  };

  const handleClaimQuest = (questId: 'arena_sprint' | 'srs_review' | 'revenge_mistake', reward: number, title: string) => {
    const res = claimPracticePoints(reward, `Daily Quest: ${title}`);
    if (!res.ok) {
      setToastMsg(res.message);
      return;
    }
    markQuestClaimed(questId);
    setQuestVersion((v) => v + 1);
    setToastMsg(
      isEn ? `+${reward} VNE Points claimed to your wallet!` : `+${reward} VNE Points đã cộng vào ví từ nhiệm vụ ngày!`,
    );
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-12">
      <section className="rounded-2xl bg-gradient-to-r from-[#1c244b] via-[#1e2d67] to-[#146EBE] text-white p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2.5 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-[10px] font-bold uppercase tracking-wider">
            <Swords className="w-3.5 h-3.5 text-amber-300" />
            {t('practice.badge')}
          </span>
          <h1 className="font-serif text-2xl sm:text-4xl font-bold leading-tight">
            {t('practice.title')}
          </h1>
          <p className="text-xs sm:text-sm text-sky-100 leading-relaxed">{t('practice.desc')}</p>
        </div>
      </section>

      {!hasRegisteredAccount() && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 font-medium">
            {isEn
              ? 'Default balance is 10 VNE Points (resets to 100 VNE daily). Register a free account to earn extra VNE Points from practice into your wallet!'
              : 'Mặc định bạn có 10 VNE Points (tự động reset 100 VNE mỗi ngày). Hãy đăng ký tài khoản miễn phí để tham gia luyện tập và kiếm thêm VNE Points vào ví!'}
          </div>
          <Link
            to="/tai-khoan/"
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-bold transition-colors"
          >
            {isEn ? 'Register Account' : 'Đăng ký tài khoản'} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {toastMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span className="inline-flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-500" />
            {toastMsg}
          </span>
          <button type="button" onClick={() => setToastMsg('')} className="underline">
            {isEn ? 'Dismiss' : 'Ẩn'}
          </button>
        </div>
      )}

      {/* Mastery & Analytics KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs tabular-nums">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900">
          <div className="text-ink-500">{isEn ? 'Accuracy & Sessions' : 'Độ chính xác & Phiên'}</div>
          <div className="text-xl font-extrabold text-[#146EBE]">
            {analyticsStats.accuracyPct}% <span className="text-xs font-semibold text-ink-500">({practiceHistory.length} {isEn ? 'runs' : 'lượt'})</span>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900">
          <div className="text-ink-500">{isEn ? 'SM-2 Cards Due' : 'Thẻ SM-2 cần ôn'}</div>
          <div className="text-xl font-extrabold text-emerald-600">
            {flashcards.filter((c) => isSrsDue(srsMap[c.slug])).length} / {flashcards.length}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900">
          <div className="text-ink-500">{isEn ? 'Best Streak Combo' : 'Chuỗi Combo Kỷ lục'}</div>
          <div className="text-xl font-extrabold text-amber-600 inline-flex items-center gap-1">
            <Flame className="w-4 h-4" /> x{bestCombo}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900">
          <div className="text-ink-500">{isEn ? 'Mistake Vault' : 'Lỗi cần phục thù'}</div>
          <div className="text-xl font-extrabold text-rose-600">{mistakes.length}</div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start">
        <button
          type="button"
          onClick={() => setMobileFilterOpen((v) => !v)}
          className="lg:hidden inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 text-xs font-bold shadow-xs"
        >
          <Filter className="w-3.5 h-3.5 text-[#146EBE]" />
          <span>{mobileFilterOpen ? (isEn ? 'Hide Filters' : 'Thu gọn Bộ lọc') : (isEn ? 'Practice Filters' : 'Bộ lọc Luyện tập')}</span>
        </button>

        <aside className={`${mobileFilterOpen ? 'block' : 'hidden'} lg:block w-full lg:w-64 xl:w-72 shrink-0 lg:sticky lg:top-20 rounded-2xl border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-4 space-y-5 text-xs`}>
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-ink-900 dark:text-paper-50 pb-2 border-b border-slate-200 dark:border-ink-800">
            <Filter className="w-4 h-4 text-[#146EBE]" />
            <span>{isEn ? 'Practice Filters' : 'Bộ lọc Luyện tập'}</span>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500 px-2 pb-1">
              {isEn ? 'Knowledge Pillars' : 'Chuyên mục Kiến thức'}
            </div>
            {(['all', 'kinh-te-so', 'blockchain', 'ai'] as const).map((dom) => {
              const cnt = dom === 'all' ? localizedBank.length : localizedBank.filter((q) => q.domain === dom).length;
              const label =
                dom === 'all'
                  ? isEn ? 'All Pillars' : 'Tất cả Trụ cột'
                  : dom === 'kinh-te-so'
                    ? isEn ? 'Digital Economy' : 'Kinh tế số'
                    : dom === 'blockchain'
                      ? 'Blockchain & Web3'
                      : 'AI & Agents';
              return (
                <button
                  key={dom}
                  type="button"
                  onClick={() => resetQuiz(dom)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                    domainFilter === dom
                      ? 'bg-[#146EBE]/10 text-[#146EBE] dark:text-sky-300 font-bold'
                      : 'text-ink-700 dark:text-ink-300 hover:bg-slate-100 dark:hover:bg-ink-800 font-medium'
                  }`}
                >
                  <span className="truncate">{label}</span>
                  <span className="tabular-nums text-[11px]">({cnt})</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-ink-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500 px-1">
              {isEn ? 'Arena Mode' : 'Chế độ Đấu trường'}
            </div>
            {(['classic', 'blitz60'] as const).map((m) => (
              <label key={m} className="flex items-center gap-2.5 px-1 py-0.5 cursor-pointer text-ink-700 dark:text-ink-300">
                <input
                  type="checkbox"
                  checked={arenaMode === m}
                  onChange={() => {
                    setActiveTab('arena');
                    resetQuiz(undefined, m);
                  }}
                  className="rounded border-slate-300 text-[#146EBE] focus:ring-[#146EBE]"
                />
                <span className="font-medium">
                  {m === 'classic' ? (isEn ? 'Classic Practice' : 'Luyện tập Tự do') : isEn ? '60s Blitz (+25 VNE)' : 'Tốc độ 60s (+25 VNE)'}
                </span>
              </label>
            ))}
          </div>
        </aside>

        <div className="flex-1 min-w-0 w-full space-y-6">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-ink-800 pb-3">
        {(
          [
            ['arena', t('practice.tabArena'), Swords],
            ['flashcards', t('practice.tabFlashcards'), Layers],
            ['mistakes', t('practice.tabMistakes', { count: mistakes.length }), AlertTriangle],
            ['quests', t('practice.tabQuests'), Target],
            ['analytics', isEn ? 'Analytics & History' : 'Phân tích & Lịch sử', BarChart3],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === id
                ? 'bg-[#146EBE] text-white shadow-xs'
                : 'bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 text-ink-700 dark:text-ink-300 hover:border-[#146EBE]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: ARENA QUIZ */}
      {activeTab === 'arena' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-6 sm:p-8 space-y-5">
            {quizFinished ? (
              <div className="text-center space-y-4 py-6">
                <Award className="w-12 h-12 text-[#146EBE] mx-auto" />
                <h2 className="font-serif text-2xl font-bold text-ink-950 dark:text-paper-50">
                  {isEn ? 'Practice Session Completed!' : 'Hoàn thành phiên luyện tập!'}
                </h2>
                <p className="text-sm text-ink-600 dark:text-ink-400">
                  {isEn ? 'You scored ' : 'Bạn trả lời đúng '}
                  <strong className="text-[#146EBE]">
                    {score}/{questions.length}
                  </strong>
                  {isEn
                    ? '. Missed questions were automatically logged into your '
                    : ' câu. Các câu sai đã tự động lưu vào '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('mistakes')}
                    className="text-amber-600 font-bold underline"
                  >
                    Mistake Vault
                  </button>
                  {isEn ? ' for review.' : ' để bạn ôn lại.'}
                </p>
                <button
                  type="button"
                  onClick={() => resetQuiz()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-bold"
                >
                  <RotateCcw className="w-4 h-4" /> {isEn ? 'Start New Round' : 'Luyện lại lượt mới'}
                </button>
              </div>
            ) : currentQuestion ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-ink-800 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => resetQuiz(undefined, 'classic')}
                      className={`px-3 py-1.5 rounded-lg font-bold border ${
                        arenaMode === 'classic'
                          ? 'bg-[#146EBE] text-white border-[#146EBE]'
                          : 'border-slate-200 dark:border-ink-700 text-ink-600 dark:text-ink-300'
                      }`}
                    >
                      {isEn ? 'Classic Mode' : 'Luyện tập Tự do'}
                    </button>
                    <button
                      type="button"
                      onClick={() => resetQuiz(undefined, 'blitz60')}
                      className={`px-3 py-1.5 rounded-lg font-bold border inline-flex items-center gap-1 ${
                        arenaMode === 'blitz60'
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'border-slate-200 dark:border-ink-700 text-ink-600 dark:text-ink-300'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {isEn ? '60s Blitz (+25 VNE)' : 'Tốc độ 60s (+25 VNE)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShuffleSeed((s) => s + 1);
                        resetQuiz();
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-ink-700 font-semibold inline-flex items-center gap-1 hover:border-[#146EBE]"
                    >
                      <Shuffle className="w-3.5 h-3.5" /> {isEn ? 'Shuffle' : 'Trộn câu'}
                    </button>
                  </div>
                  {arenaMode === 'blitz60' && (
                    <span className={`px-3 py-1 rounded-full font-extrabold tabular-nums ${blitzSecondsLeft <= 10 ? 'bg-rose-600 text-white animate-pulse' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600'}`}>
                      ⏱ {blitzSecondsLeft}s
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#146EBE] dark:text-sky-300 font-bold">
                    {currentQuestion.domainLabel} • {isEn ? 'Question' : 'Câu'} {quizIndex + 1}/{questions.length}
                  </span>
                  <div className="flex items-center gap-3 font-bold tabular-nums">
                    <span className="text-ink-400 hidden sm:inline font-normal">
                      {isEn ? 'Keys 1-4 • Enter' : 'Phím 1-4 • Enter'}
                    </span>
                    <span className="text-amber-600 inline-flex items-center gap-1">
                      <Flame className="w-4 h-4" /> Combo x{combo}
                    </span>
                    <span className="text-emerald-600">
                      {isEn ? 'Correct:' : 'Đúng:'} {score}
                    </span>
                  </div>
                </div>

                <h2 className="font-serif text-lg sm:text-xl font-bold text-ink-950 dark:text-paper-50 leading-snug">
                  {currentQuestion.prompt}
                </h2>

                <div className="space-y-2.5">
                  {currentQuestion.options.map((opt, idx) => {
                    const isAnswered = selectedOption !== null;
                    const isCorrect = idx === currentQuestion.correctIndex;
                    const isChosen = idx === selectedOption;
                    let cls =
                      'border-slate-200 dark:border-ink-700 bg-slate-50 dark:bg-ink-950 hover:border-[#146EBE]';
                    if (isAnswered) {
                      if (isCorrect) {
                        cls = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200';
                      } else if (isChosen) {
                        cls = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200';
                      }
                    }

                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={isAnswered}
                        onClick={() => handleSelectOption(idx)}
                        className={`w-full text-left p-4 rounded-xl border text-xs sm:text-sm font-medium transition-colors flex items-start gap-3 ${cls}`}
                      >
                        <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-bold shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="flex-1 pt-0.5">{opt}</span>
                        {isAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                        {isAnswered && isChosen && !isCorrect && <XCircle className="w-5 h-5 text-rose-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {selectedOption !== null && (
                  <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#146EBE] dark:text-sky-300">
                      <span>{isEn ? 'Expert Explanation' : 'Giải thích chuyên sâu'}</span>
                      <span className="px-2 py-0.5 rounded bg-white dark:bg-ink-900 border border-blue-200 dark:border-blue-800 text-[10px]">
                        {isEn ? 'Diagnosis:' : 'Chẩn đoán:'} {getDiagnosticTagLabel(currentQuestion.diagnosticTag, lang)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-ink-800 dark:text-ink-200 leading-relaxed">
                      {currentQuestion.explanation}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      {currentQuestion.relatedSlug ? (
                        <Link
                          to={`/tu-dien/${currentQuestion.relatedSlug}/`}
                          className="text-xs font-semibold text-[#146EBE] hover:underline inline-flex items-center gap-1"
                        >
                          <BookOpen className="w-3.5 h-3.5" />{' '}
                          {isEn ? 'Inspect in Lexicon' : 'Xem mục từ trong Từ điển'}
                        </Link>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        onClick={handleNextQuestion}
                        className="px-4 py-2 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        {quizIndex + 1 < questions.length
                          ? isEn
                            ? 'Next Question'
                            : 'Câu tiếp theo'
                          : isEn
                            ? 'Finish & Claim VNE'
                            : 'Hoàn thành & Nhận VNE'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>

          <aside className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-5 space-y-3">
              <h3 className="font-bold text-sm text-ink-950 dark:text-paper-50 inline-flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#146EBE]" />
                {isEn ? '3-Loop Mastery Workflow' : 'Quy trình Luyện tập 3 Vòng'}
              </h3>
              <ol className="text-xs text-ink-600 dark:text-ink-400 space-y-2 list-decimal pl-4 leading-relaxed">
                <li>
                  <strong>{isEn ? 'Loop 1 (SM-2 Flashcards):' : 'Vòng 1 (Flashcard SM-2):'}</strong>{' '}
                  {isEn
                    ? 'Recall core definitions and conceptual traps at spaced intervals.'
                    : 'Ghi nhớ khái niệm cốt lõi & cạm bẫy theo lịch lặp lại ngắt quãng.'}
                </li>
                <li>
                  <strong>{isEn ? 'Loop 2 (Arena Sprint):' : 'Vòng 2 (Arena Sprint):'}</strong>{' '}
                  {isEn
                    ? 'Tackle scenario quizzes on macroeconomics, Blockchain architecture & AI.'
                    : 'Thi đấu trắc nghiệm tình huống vĩ mô, kiến trúc Blockchain & AI.'}
                </li>
                <li>
                  <strong>{isEn ? 'Loop 3 (Mistake Vault):' : 'Vòng 3 (Mistake Vault):'}</strong>{' '}
                  {isEn
                    ? 'Missed items are logged with diagnostic tags for targeted Revenge Drills.'
                    : 'Tự động gom câu sai kèm nhãn chẩn đoán để luyện lại cho tới khi sạch lỗi.'}
                </li>
              </ol>
            </div>
          </aside>
        </div>
      )}

      {/* TAB 2: FLASHCARD SM-2 */}
      {activeTab === 'flashcards' && currentCard && (
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="flex items-center justify-between text-xs text-ink-500">
            <span>
              {isEn ? 'Card' : 'Thẻ'} {cardIndex + 1}/{flashcards.length} • {currentCard.domainLabel}
            </span>
            <span className="font-semibold text-[#146EBE]">
              {isSrsDue(srsMap[currentCard.slug])
                ? isEn
                  ? 'Due for review today'
                  : 'Đến hạn ôn tập hôm nay'
                : isEn
                  ? 'Scheduled for later'
                  : 'Đã lên lịch ôn tập'}
            </span>
          </div>

          <div
            onClick={() => setCardFlipped((f) => !f)}
            className="cursor-pointer rounded-2xl border-2 border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-7 sm:p-10 min-h-[260px] flex flex-col justify-between shadow-sm hover:border-[#146EBE] transition-colors"
          >
            {!cardFlipped ? (
              <div className="my-auto text-center space-y-3">
                <span className="inline-block px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#146EBE] text-xs font-bold">
                  {currentCard.domainLabel}
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink-950 dark:text-paper-50">
                  {currentCard.term}
                </h2>
                {currentCard.ipa && <p className="text-sm font-mono text-ink-400">{currentCard.ipa}</p>}
                <p className="text-xs text-ink-400 pt-2">
                  {isEn
                    ? 'Click card to flip for definition & conceptual traps'
                    : 'Nhấp vào thẻ để lật xem định nghĩa & cạm bẫy học thuật'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-[#146EBE]">{currentCard.vietnamese}</h3>
                  <Link
                    to={`/tu-dien/${currentCard.slug}/`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs font-semibold text-[#146EBE] hover:underline"
                  >
                    {isEn ? 'Open in Lexicon →' : 'Mở từ điển →'}
                  </Link>
                </div>
                <p className="text-sm text-ink-800 dark:text-ink-200 leading-relaxed">{currentCard.coreDefinition}</p>
                {currentCard.pitfalls && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                    <strong>{isEn ? 'Pitfall:' : 'Cạm bẫy:'}</strong> {currentCard.pitfalls}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(
              [
                [1, isEn ? 'Again' : 'Quên hẳn', 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'],
                [3, isEn ? 'Hard' : 'Nhớ khó', 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'],
                [4, isEn ? 'Good' : 'Nhớ tốt', 'bg-sky-50 border-sky-200 text-[#146EBE] hover:bg-sky-100'],
                [5, isEn ? 'Easy' : 'Rất dễ', 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'],
              ] as const
            ).map(([grade, label, style]) => (
              <button
                key={grade}
                type="button"
                onClick={() => handleSrsGrade(grade)}
                className={`p-3 rounded-xl border text-center transition-colors ${style}`}
              >
                <div className="text-xs font-bold">{label}</div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  {isEn ? 'Next: ' : 'Ôn lại sau '}
                  {previewSrsInterval(srsMap[currentCard.slug], grade, lang)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MISTAKE VAULT */}
      {activeTab === 'mistakes' && (
        <div className="max-w-3xl mx-auto">
          {!currentMistake ? (
            <div className="rounded-2xl border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-10 text-center space-y-3">
              <Sparkles className="w-10 h-10 text-emerald-500 mx-auto" />
              <h2 className="font-serif text-xl font-bold text-ink-950 dark:text-paper-50">
                {isEn ? 'Mistake Vault Is Empty!' : 'Kho Lỗi sai đang trống!'}
              </h2>
              <p className="text-xs text-ink-600 dark:text-ink-400">
                {isEn
                  ? 'Any incorrect answers from Quiz Arena are automatically queued here for targeted practice.'
                  : 'Mọi câu trả lời sai ở Đấu trường Trắc nghiệm sẽ tự động được lưu tại đây để bạn luyện lại.'}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('arena')}
                className="px-4 py-2 rounded-xl bg-[#146EBE] text-white text-xs font-bold"
              >
                {isEn ? 'Go to Quiz Arena' : 'Vào Đấu trường Trắc nghiệm'}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-white dark:bg-ink-900 p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold">
                  Revenge Drill • {mistakes.length} {isEn ? 'remaining' : 'lỗi chưa vá'}
                </span>
                <span className="text-ink-500 font-semibold">
                  {getDiagnosticTagLabel(currentMistake.question.diagnosticTag, lang)}
                </span>
              </div>
              <h2 className="font-serif text-lg font-bold text-ink-950 dark:text-paper-50">
                {currentMistake.question.prompt}
              </h2>
              <div className="space-y-2">
                {currentMistake.question.options.map((opt, idx) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={revengeSelected !== null}
                    onClick={() => handleRevengeAnswer(idx)}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm font-medium ${
                      revengeSelected === null
                        ? 'border-slate-200 dark:border-ink-700 hover:border-[#146EBE]'
                        : idx === currentMistake.question.correctIndex
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                          : idx === revengeSelected
                            ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40'
                            : 'border-slate-200 dark:border-ink-800 opacity-60'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {revengeSelected !== null && (
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-ink-600 dark:text-ink-300">{currentMistake.question.explanation}</span>
                  <button
                    type="button"
                    onClick={handleNextRevenge}
                    className="shrink-0 ml-3 px-4 py-2 rounded-xl bg-[#146EBE] text-white text-xs font-bold inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> {isEn ? 'Continue' : 'Tiếp tục'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DAILY QUESTS */}
      {activeTab === 'quests' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {questState.quests.map((q) => {
            const pct = Math.round((q.current / q.target) * 100);
            return (
              <div
                key={q.id}
                className="rounded-2xl border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#146EBE]">+{q.rewardVne} VNE Points</span>
                    <span className="text-xs font-mono tabular-nums text-ink-500">
                      {q.current}/{q.target}
                    </span>
                  </div>
                  <h3 className="font-serif text-lg font-bold text-ink-950 dark:text-paper-50">{q.title}</h3>
                  <p className="text-xs text-ink-600 dark:text-ink-400">{q.desc}</p>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-ink-800 overflow-hidden">
                    <div className="h-full bg-[#146EBE] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {q.claimed ? (
                  <span className="text-xs font-bold text-emerald-600">
                    {isEn ? '✓ Claimed today' : '✓ Đã nhận thưởng hôm nay'}
                  </span>
                ) : q.completed ? (
                  <button
                    type="button"
                    onClick={() => handleClaimQuest(q.id, q.rewardVne, q.title)}
                    className="w-full py-2 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-bold"
                  >
                    {isEn ? `Claim +${q.rewardVne} VNE Points` : `Nhận +${q.rewardVne} VNE Points`}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab(q.id === 'arena_sprint' ? 'arena' : q.id === 'srs_review' ? 'flashcards' : 'mistakes')
                    }
                    className="w-full py-2 rounded-xl border border-slate-200 dark:border-ink-700 text-xs font-semibold hover:border-[#146EBE]"
                  >
                    {isEn ? 'Start Quest →' : 'Thực hiện ngay →'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 5: ANALYTICS & HISTORY */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-6 space-y-4">
            <h2 className="font-serif text-lg font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#146EBE]" />
              {isEn ? 'Diagnostic Error Breakdown' : 'Phân tích Nhóm Lỗi sai (Diagnostic Tags)'}
            </h2>
            <div className="space-y-3 text-xs">
              {(Object.keys(analyticsStats.tagCounts) as DiagnosticTag[]).map((tag) => {
                const count = analyticsStats.tagCounts[tag];
                const maxVal = Math.max(1, ...Object.values(analyticsStats.tagCounts));
                const pct = Math.round((count / maxVal) * 100);
                return (
                  <div key={tag} className="space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span>{getDiagnosticTagLabel(tag, lang)}</span>
                      <span className="tabular-nums text-rose-600">{count} {isEn ? 'misses' : 'lỗi'}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-ink-800 overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('mistakes')}
              className="px-4 py-2 rounded-xl bg-[#146EBE] text-white text-xs font-bold"
            >
              {isEn ? 'Drill Mistakes Now →' : 'Ôn ngay trong Mistake Vault →'}
            </button>
          </section>

          <section className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-6 space-y-4">
            <h2 className="font-serif text-lg font-bold">
              {isEn ? 'Recent Practice Sessions' : 'Lịch sử Phiên Luyện tập Gần nhất'}
            </h2>
            {practiceHistory.length === 0 ? (
              <div className="text-xs text-ink-500 py-6 text-center">
                {isEn ? 'Complete a quiz round in Arena to view your session analytics.' : 'Hãy hoàn thành 1 lượt luyện tập ở tab Arena để xem thống kê chi tiết.'}
              </div>
            ) : (
              <div className="space-y-2 text-xs tabular-nums">
                {practiceHistory.slice(0, 8).map((h) => (
                  <div key={h.id} className="p-3 rounded-xl border border-slate-200 dark:border-ink-800 flex items-center justify-between">
                    <div>
                      <strong className="uppercase">{h.domain}</strong> • {h.score}/{h.total} {isEn ? 'correct' : 'đúng'}
                    </div>
                    <span className="font-bold text-emerald-600">+{h.pointsEarned} VNE</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};
