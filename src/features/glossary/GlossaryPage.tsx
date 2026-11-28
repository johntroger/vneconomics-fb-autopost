import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  BookMarked,
  BookOpen,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Cpu,
  Globe,
  GraduationCap,
  KeyRound,
  Link as LinkIcon,
  Maximize2,
  Minimize2,
  Network,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Type,
  Volume2,
  X,
} from 'lucide-react';
import { useSEO } from '../../core/seo/useSEO.ts';
import { useTranslation } from '../../core/i18n/index.ts';
import { sanitizeHtmlContent } from '../../core/utils/sanitize.ts';
import {
  getLexiconEntries,
  getLexiconEntryBySlug,
  LEXICON_DOMAINS,
  type GlossaryDomain,
  type LexiconEntry,
} from './glossaryEnrichment.ts';

const KEY_BOOKMARKS = 'vne_lexicon_bookmarks';
const KEY_RECENT = 'vne_lexicon_recent';

function speakAcademicTerm(text: string, onStart: () => void, onEnd: () => void): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const clean = text.replace(/\s*\([^)]*\)/g, '').trim();
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = 'en-US';
    utter.rate = 0.92;
    utter.onstart = onStart;
    utter.onend = onEnd;
    utter.onerror = onEnd;
    window.speechSynthesis.speak(utter);
  } catch {
    onEnd();
  }
}

export const GlossaryPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { lang: globalLang, setLanguage: setGlobalLanguage } = useTranslation();
  const languageMode = globalLang;
  const setLanguageMode = setGlobalLanguage;

  const allEntries = useMemo(() => getLexiconEntries(globalLang), [globalLang]);
  const entriesMap = useMemo(() => new Map(allEntries.map((e) => [e.slug, e])), [allEntries]);

  const [selectedSlug, setSelectedSlug] = useState<string>(() => {
    if (slug && getLexiconEntryBySlug(slug, globalLang)) return slug;
    return allEntries[0]?.slug || '';
  });

  useEffect(() => {
    if (slug && entriesMap.has(slug)) {
      setSelectedSlug(slug);
    }
  }, [slug, entriesMap]);

  const [domainFilter, setDomainFilter] = useState<'all' | GlossaryDomain>('all');
  const [entryFilter, setEntryFilter] = useState<'all' | 'term' | 'acronym' | 'saved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<number>(0);
  const [mobileTab, setMobileTab] = useState<'list' | 'detail'>(slug ? 'detail' : 'list');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);

  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(KEY_BOOKMARKS);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [recentSlugs, setRecentSlugs] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(KEY_RECENT);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const detailScrollRef = useRef<HTMLDivElement>(null);

  const activeEntry: LexiconEntry | undefined = useMemo(
    () => entriesMap.get(selectedSlug) || allEntries[0],
    [entriesMap, selectedSlug, allEntries],
  );

  // Sync recent history
  useEffect(() => {
    if (!activeEntry) return;
    setRecentSlugs((prev) => {
      const updated = [activeEntry.slug, ...prev.filter((s) => s !== activeEntry.slug)].slice(0, 6);
      try {
        localStorage.setItem(KEY_RECENT, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
    if (detailScrollRef.current) {
      detailScrollRef.current.scrollTo({ top: 0 });
    }
    setReadingProgress(0);
  }, [activeEntry]);

  // Filtered entries for left sidebar
  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allEntries.filter((item) => {
      if (domainFilter !== 'all' && item.domain !== domainFilter) return false;
      if (entryFilter === 'term' && item.entryType !== 'term') return false;
      if (entryFilter === 'acronym' && item.entryType !== 'acronym') return false;
      if (entryFilter === 'saved' && !bookmarks.includes(item.slug)) return false;
      if (!q) return true;
      const hay = `${item.term} ${item.vietnamese} ${item.coreDefinition} ${item.tags.join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allEntries, domainFilter, entryFilter, bookmarks, searchQuery]);

  // A-Z jump letters
  const alphabetLetters = useMemo(() => {
    const set = new Set<string>();
    for (const item of filteredEntries) {
      const ch = item.term.charAt(0).toUpperCase();
      if (/[A-Z]/.test(ch)) set.add(ch);
    }
    return Array.from(set).sort();
  }, [filteredEntries]);

  // Keyboard shortcuts: `/`, `Ctrl+B`, `F`, `ArrowUp/ArrowDown`
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toUpperCase();
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA';

      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed((v) => !v);
        return;
      }
      if ((e.key === 'f' || e.key === 'F') && !isTyping && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsZenMode((v) => !v);
        return;
      }
      if (e.key === 'Escape' && isZenMode) {
        setIsZenMode(false);
        return;
      }
      if (!isTyping && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && filteredEntries.length > 0) {
        e.preventDefault();
        const idx = filteredEntries.findIndex((i) => i.slug === activeEntry?.slug);
        const nextIdx =
          e.key === 'ArrowDown'
            ? idx < filteredEntries.length - 1
              ? idx + 1
              : 0
            : idx > 0
              ? idx - 1
              : filteredEntries.length - 1;
        const next = filteredEntries[nextIdx];
        if (next) {
          setSelectedSlug(next.slug);
          navigate(`/tu-dien/${next.slug}/`, { replace: true });
          document.getElementById(`lex-item-${next.slug}`)?.scrollIntoView({ block: 'nearest' });
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [filteredEntries, activeEntry, isZenMode, navigate]);

  const selectEntry = (targetSlug: string) => {
    setSelectedSlug(targetSlug);
    setMobileTab('detail');
    navigate(`/tu-dien/${targetSlug}/`, { replace: true });
  };

  const toggleBookmark = (targetSlug: string) => {
    setBookmarks((prev) => {
      const next = prev.includes(targetSlug) ? prev.filter((s) => s !== targetSlug) : [targetSlug, ...prev];
      try {
        localStorage.setItem(KEY_BOOKMARKS, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const scrollToLetter = (letter: string) => {
    const match = filteredEntries.find((item) => item.term.toUpperCase().startsWith(letter));
    if (match) {
      selectEntry(match.slug);
      document.getElementById(`lex-item-${match.slug}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDetailScroll = () => {
    const el = detailScrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setReadingProgress(max > 0 ? Math.min(100, Math.round((el.scrollTop / max) * 100)) : 0);
  };

  const fontSizeClass =
    fontSizeLevel === -1 ? 'text-sm' : fontSizeLevel === 1 ? 'text-lg' : fontSizeLevel === 2 ? 'text-xl' : 'text-base';

  const isHtmlMechanism = Boolean(activeEntry?.mechanism && /<[a-z][\s\S]*>/i.test(activeEntry.mechanism));

  useSEO({
    title: slug && activeEntry
      ? languageMode === 'en'
        ? `What is ${activeEntry.term}? | Digital Economy, Blockchain & AI Lexicon`
        : `${activeEntry.term} là gì? | Từ điển Kinh tế số, Blockchain & AI`
      : languageMode === 'en'
        ? `Digital Economy, Blockchain & AI Lexicon (${allEntries.length}+ terms)`
        : `Từ điển Chuyên sâu Kinh tế số, Blockchain & AI (${allEntries.length}+ thuật ngữ)`,
    description:
      activeEntry?.coreDefinition ||
      (languageMode === 'en'
        ? 'Specialized Digital Economy, Blockchain & AI Lexicon following AEO standards.'
        : 'Từ điển thuật ngữ chuyên sâu Kinh tế số, Blockchain & AI chuẩn AEO.'),
    canonicalPath: slug && activeEntry ? `/tu-dien/${activeEntry.slug}/` : '/tu-dien/',
    jsonLd: activeEntry
      ? {
          '@context': 'https://schema.org',
          '@type': 'DefinedTerm',
          name: activeEntry.term,
          description: activeEntry.coreDefinition,
          inDefinedTermSet: 'https://vneconomics.com/tu-dien/',
        }
      : {
          '@context': 'https://schema.org',
          '@type': 'DefinedTermSet',
          name:
            languageMode === 'en'
              ? 'VNEconomics Digital Economy, Blockchain & AI Lexicon'
              : 'Từ điển Chuyên sâu Kinh tế số, Blockchain & AI VNEconomics',
          url: 'https://vneconomics.com/tu-dien/',
        },
  });

  return (
    <div
      className={
        isZenMode
          ? 'fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-ink-950 overflow-hidden'
          : 'flex flex-col min-h-[calc(100vh-110px)] lg:h-[calc(100vh-110px)] bg-slate-50 dark:bg-ink-950 overflow-hidden'
      }
    >
      {/* 1. LEXICON TOP WORKSPACE BAR (modeled after vnresearch-dictionary) */}
      <div className="shrink-0 border-b border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#046bd2] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
            <BookMarked className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-ink-950 dark:text-paper-50 truncate">
                {languageMode === 'en'
                  ? 'Digital Economy, Blockchain & AI Lexicon'
                  : 'Từ điển Kinh tế số, Blockchain & AI'}
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#046bd2] dark:text-sky-400 text-[10px] font-bold tabular-nums border border-blue-200 dark:border-blue-800">
                {allEntries.length} {languageMode === 'en' ? 'entries' : 'mục từ'}
              </span>
            </div>
          </div>
        </div>

        {/* Domain Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {LEXICON_DOMAINS.map((dom) => (
            <button
              key={dom.key}
              type="button"
              onClick={() => setDomainFilter(dom.key)}
              className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                domainFilter === dom.key
                  ? 'bg-[#046bd2] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 hover:bg-slate-200 dark:hover:bg-ink-700'
              }`}
            >
              {languageMode === 'en' ? dom.labelEn : dom.label}
            </button>
          ))}
        </div>

        {/* Right Controls: Language Switcher, Font Size, Zen Mode, Print */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-ink-700 p-0.5 bg-slate-100 dark:bg-ink-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLanguageMode('vi')}
              className={`px-2 py-1 rounded-md transition flex items-center gap-1 ${
                languageMode === 'vi'
                  ? 'bg-white dark:bg-ink-700 text-[#046bd2] dark:text-sky-300 shadow-xs font-bold'
                  : 'text-ink-500 hover:text-ink-800 dark:hover:text-paper-200'
              }`}
            >
              <span>🇻🇳</span>
              <span className="hidden xl:inline">{languageMode === 'en' ? 'VI' : 'Anh - Việt'}</span>
            </button>
            <button
              type="button"
              onClick={() => setLanguageMode('en')}
              className={`px-2 py-1 rounded-md transition flex items-center gap-1 ${
                languageMode === 'en'
                  ? 'bg-[#046bd2] text-white shadow-xs font-bold'
                  : 'text-ink-500 hover:text-ink-800 dark:hover:text-paper-200'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span className="hidden xl:inline">English</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setFontSizeLevel((v) => (v >= 2 ? -1 : v + 1))}
            title={languageMode === 'en' ? 'Change reading font size (A- / A / A+)' : 'Đổi cỡ chữ đọc (A- / A / A+)'}
            className="hidden sm:inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-ink-700 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:bg-slate-100 dark:hover:bg-ink-800"
          >
            <Type className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsZenMode((v) => !v)}
            title={
              isZenMode
                ? languageMode === 'en'
                  ? 'Exit Zen Mode (Esc)'
                  : 'Thoát chế độ tập trung (Esc)'
                : languageMode === 'en'
                  ? 'Enter Zen Reading Mode (F)'
                  : 'Chế độ đọc tập trung Zen Mode (F)'
            }
            className="hidden md:inline-flex p-1.5 rounded-lg border border-slate-200 dark:border-ink-700 text-ink-700 dark:text-ink-300 hover:bg-slate-100 dark:hover:bg-ink-800"
          >
            {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            title={languageMode === 'en' ? 'Print entry (Ctrl + P)' : 'In mục từ (Ctrl + P)'}
            className="hidden md:inline-flex p-1.5 rounded-lg border border-slate-200 dark:border-ink-700 text-ink-700 dark:text-ink-300 hover:bg-slate-100 dark:hover:bg-ink-800"
          >
            <Printer className="w-4 h-4" />
          </button>

          <Link
            to="/luyen-tap/"
            className="hidden xl:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-bold transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" /> {languageMode === 'en' ? 'SM-2 Practice' : 'Luyện tập SM-2'}
          </Link>
        </div>
      </div>

        <div className="sm:hidden flex border-b border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('list')}
          className={`flex-1 py-2.5 text-xs font-semibold border-b-2 ${
            mobileTab === 'list' ? 'border-[#046bd2] text-[#046bd2]' : 'border-transparent text-ink-500'
          }`}
        >
          {languageMode === 'en' ? `Directory (${filteredEntries.length})` : `Danh mục (${filteredEntries.length})`}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('detail')}
          className={`flex-1 py-2.5 text-xs font-semibold border-b-2 ${
            mobileTab === 'detail' ? 'border-[#046bd2] text-[#046bd2]' : 'border-transparent text-ink-500'
          }`}
        >
          {languageMode === 'en' ? 'Entry Detail' : 'Chi tiết mục từ'}
        </button>
      </div>

      {/* 2. MAIN TWO-COLUMN SPLIT WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT PANE: Search, Recent, Tabs, A-Z & Scrollable Term List */}
        <aside
          className={`border-r border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 flex flex-col h-full transition-all duration-200 shrink-0 ${
            isSidebarCollapsed ? 'w-0 overflow-hidden border-none' : 'w-full sm:w-80 md:w-96'
          } ${mobileTab === 'detail' ? 'hidden sm:flex' : 'flex'}`}
        >
          {/* Pinned Search & Filters */}
          <div className="shrink-0 p-3 border-b border-slate-200 dark:border-ink-800 bg-slate-50/70 dark:bg-ink-950/60 space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  languageMode === 'en'
                    ? 'Search terms (press / to focus)...'
                    : 'Tra cứu thuật ngữ (nhấn / để gõ)...'
                }
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#046bd2] text-ink-900 dark:text-paper-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Recent Searches Quick Chips */}
            {recentSlugs.length > 0 && !searchQuery && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
                <span className="text-ink-400 shrink-0 font-medium">
                  {languageMode === 'en' ? 'Recent:' : 'Gần đây:'}
                </span>
                {recentSlugs.map((rs) => {
                  const ent = entriesMap.get(rs);
                  if (!ent) return null;
                  return (
                    <button
                      key={rs}
                      type="button"
                      onClick={() => selectEntry(rs)}
                      className={`shrink-0 px-2 py-0.5 rounded-md border text-[11px] transition ${
                        rs === activeEntry?.slug
                          ? 'bg-blue-100 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-[#046bd2] dark:text-sky-300 font-semibold'
                          : 'bg-slate-100 dark:bg-ink-800 border-slate-200 dark:border-ink-700 text-ink-600 dark:text-ink-400 hover:border-blue-300'
                      }`}
                    >
                      {ent.term.split(' (')[0]}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Sub-Tabs: Tất cả | Thuật ngữ | Viết tắt | Đã lưu */}
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-0.5 bg-slate-200/70 dark:bg-ink-800 p-0.5 rounded-lg">
                {(
                  [
                    ['all', languageMode === 'en' ? 'All' : 'Tất cả'],
                    ['term', languageMode === 'en' ? 'Terms' : 'Thuật ngữ'],
                    ['acronym', 'ACR'],
                  ] as const
                ).map(([k, lbl]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setEntryFilter(k)}
                    className={`px-2 py-1 rounded-md font-semibold transition ${
                      entryFilter === k
                        ? 'bg-white dark:bg-ink-700 text-[#046bd2] dark:text-sky-300 shadow-xs'
                        : 'text-ink-600 dark:text-ink-400'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setEntryFilter('saved')}
                  className={`px-2 py-1 rounded-md font-semibold transition inline-flex items-center gap-1 ${
                    entryFilter === 'saved'
                      ? 'bg-amber-400 text-amber-950 shadow-xs'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  <Star className="w-3 h-3 fill-current" />
                  <span>{bookmarks.length}</span>
                </button>
              </div>
              <span className="text-ink-400 font-mono tabular-nums">
                {filteredEntries.length} {languageMode === 'en' ? 'terms' : 'mục'}
              </span>
            </div>
          </div>

          {/* A-Z Alphabet Jump Strip */}
          {alphabetLetters.length > 0 && (
            <div className="shrink-0 px-2 py-1.5 border-b border-slate-100 dark:border-ink-800 bg-slate-50/50 dark:bg-ink-900/50">
              <div className="flex flex-wrap items-center gap-0.5 text-[11px] font-mono">
                {alphabetLetters.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => scrollToLetter(l)}
                    className="w-5 h-5 flex items-center justify-center rounded text-ink-500 hover:text-[#046bd2] hover:bg-blue-50 dark:hover:bg-ink-800 font-semibold"
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Independent Scrollable Term List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-ink-800/70">
            {filteredEntries.length === 0 ? (
              <div className="p-8 text-center text-ink-400 space-y-2">
                <BookOpen className="w-7 h-7 mx-auto opacity-60" />
                <p className="text-xs font-medium">
                  {languageMode === 'en' ? 'No matching terminology found.' : 'Không tìm thấy thuật ngữ phù hợp.'}
                </p>
              </div>
            ) : (
              filteredEntries.map((item, idx) => {
                const isSelected = item.slug === activeEntry?.slug;
                const isBookmarked = bookmarks.includes(item.slug);
                return (
                  <button
                    key={item.slug}
                    id={`lex-item-${item.slug}`}
                    type="button"
                    onClick={() => selectEntry(item.slug)}
                    className={`w-full text-left p-3 transition flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-[#046bd2] pl-2.5'
                        : 'hover:bg-slate-50 dark:hover:bg-ink-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isBookmarked && <Star className="w-3 h-3 shrink-0 fill-amber-400 text-amber-500" />}
                        <span
                          className={`text-sm font-semibold truncate ${
                            isSelected ? 'text-[#046bd2] dark:text-sky-300' : 'text-ink-900 dark:text-paper-100'
                          }`}
                        >
                          {item.term}
                        </span>
                      </div>
                      {item.entryType === 'acronym' ? (
                        <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                          ACR
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-ink-800 text-ink-500 tabular-nums">
                          {idx + 1}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-600 dark:text-ink-400 line-clamp-1">
                      {languageMode === 'vi' ? item.vietnamese : item.coreDefinitionEn}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-ink-400 font-mono">
                      <span>{item.domainLabel}</span>
                      {item.isFlagship && (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                          ★ {languageMode === 'en' ? 'Core' : 'Cốt lõi'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Collapse Sidebar Toggle */}
        {!isZenMode && (
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((v) => !v)}
            title={
              isSidebarCollapsed
                ? languageMode === 'en'
                  ? 'Expand sidebar (Ctrl+B)'
                  : 'Mở danh mục (Ctrl+B)'
                : languageMode === 'en'
                  ? 'Collapse sidebar (Ctrl+B)'
                  : 'Thu gọn danh mục (Ctrl+B)'
            }
            className="hidden sm:flex absolute z-20 top-1/2 -translate-y-1/2 bg-white dark:bg-ink-800 border border-slate-200 dark:border-ink-700 rounded-r-md p-1 shadow-md text-ink-500 hover:text-[#046bd2]"
            style={{ left: isSidebarCollapsed ? '0px' : 'clamp(320px, 20vw + 100px, 384px)' }}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* RIGHT PANE: Detailed Scholarly Article View */}
        <main
          ref={detailScrollRef}
          onScroll={handleDetailScroll}
          className={`flex-1 h-full overflow-y-auto bg-white dark:bg-ink-950 px-4 sm:px-8 lg:px-12 py-6 relative ${
            mobileTab === 'list' ? 'hidden sm:block' : 'block'
          }`}
        >
          {/* Reading Progress Bar */}
          <div
            className="sticky top-0 left-0 h-0.5 bg-[#046bd2] z-20 transition-all duration-75 -mt-6 mb-5"
            style={{ width: `${readingProgress}%` }}
          />

          {activeEntry && (
            <article className={`w-full space-y-6 pb-10 ${fontSizeClass}`}>
              {/* 1. Entry Header */}
              <header className="border-b border-slate-200 dark:border-ink-800 pb-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-ink-950 dark:text-paper-50 tracking-tight">
                        {activeEntry.term}
                      </h1>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-ink-800 text-ink-600 dark:text-ink-400 italic">
                        [{activeEntry.partOfSpeech}]
                      </span>
                      {activeEntry.isFlagship && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold">
                          ★ {languageMode === 'en' ? 'Core Term' : 'Thuật ngữ Cốt lõi'}
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-semibold inline-flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> DefinedTerm AEO
                      </span>
                    </div>

                    {/* IPA + Pronunciation */}
                    <div className="flex items-center gap-2 text-sm text-ink-500 font-mono">
                      <span>{activeEntry.ipa || '/.../'}</span>
                      <button
                        type="button"
                        onClick={() =>
                          speakAcademicTerm(
                            activeEntry.term,
                            () => setIsSpeaking(true),
                            () => setIsSpeaking(false),
                          )
                        }
                        className={`px-2 py-1 rounded-md transition inline-flex items-center gap-1 text-xs font-sans ${
                          isSpeaking
                            ? 'bg-[#046bd2] text-white animate-pulse'
                            : 'text-[#046bd2] hover:bg-blue-50 dark:hover:bg-ink-800'
                        }`}
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>{languageMode === 'en' ? 'Pronounce' : 'Phát âm'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => toggleBookmark(activeEntry.slug)}
                      className={`px-2.5 py-1.5 text-xs font-medium border rounded-lg transition inline-flex items-center gap-1 ${
                        bookmarks.includes(activeEntry.slug)
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 font-semibold'
                          : 'border-slate-200 dark:border-ink-700 text-ink-700 dark:text-ink-300 hover:bg-slate-50 dark:hover:bg-ink-800'
                      }`}
                    >
                      <Bookmark
                        className={`w-3.5 h-3.5 ${bookmarks.includes(activeEntry.slug) ? 'fill-amber-400 text-amber-500' : ''}`}
                      />
                      <span>
                        {bookmarks.includes(activeEntry.slug)
                          ? languageMode === 'en'
                            ? 'Saved'
                            : 'Đã lưu'
                          : languageMode === 'en'
                            ? 'Save'
                            : 'Lưu lại'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(window.location.href, 'share')}
                      className="px-2.5 py-1.5 text-xs font-medium border border-slate-200 dark:border-ink-700 rounded-lg text-ink-700 dark:text-ink-300 hover:bg-slate-50 dark:hover:bg-ink-800 inline-flex items-center gap-1"
                    >
                      {copiedKey === 'share' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <LinkIcon className="w-3.5 h-3.5" />}
                      <span>
                        {copiedKey === 'share'
                          ? languageMode === 'en'
                            ? 'Link copied'
                            : 'Đã chép link'
                          : languageMode === 'en'
                            ? 'Share'
                            : 'Chia sẻ'}
                      </span>
                    </button>
                  </div>
                </div>

                {languageMode === 'vi' && (
                  <p className="text-lg font-bold text-[#046bd2] dark:text-sky-400">
                    {activeEntry.vietnamese}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {activeEntry.tags.map((tg) => (
                    <span
                      key={tg}
                      className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-ink-800 text-ink-600 dark:text-ink-400"
                    >
                      #{tg}
                    </span>
                  ))}
                </div>
              </header>

              {/* Sticky In-Flow TOC */}
              <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                <span className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider shrink-0 mr-1">
                  {languageMode === 'en' ? 'Jump to:' : 'Chuyển nhanh:'}
                </span>
                <button
                  type="button"
                  onClick={() => scrollToSection('section-definition')}
                  className="shrink-0 px-2.5 py-1 rounded-lg text-xs bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-[#046bd2] dark:text-sky-300 font-semibold inline-flex items-center gap-1"
                >
                  <BookOpen className="w-3 h-3" /> {languageMode === 'en' ? 'Definition' : 'Định nghĩa'}
                </button>
                {activeEntry.mechanism && (
                  <button
                    type="button"
                    onClick={() => scrollToSection('section-mechanism')}
                    className="shrink-0 px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-ink-800 border border-slate-200 dark:border-ink-700 text-ink-700 dark:text-ink-300 inline-flex items-center gap-1"
                  >
                    <Cpu className="w-3 h-3" /> {languageMode === 'vi' ? 'Cơ chế' : 'Mechanism'}
                  </button>
                )}
                {activeEntry.pitfalls && (
                  <button
                    type="button"
                    onClick={() => scrollToSection('section-pitfalls')}
                    className="shrink-0 px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-ink-800 border border-slate-200 dark:border-ink-700 text-ink-700 dark:text-ink-300 inline-flex items-center gap-1"
                  >
                    <AlertTriangle className="w-3 h-3" /> {languageMode === 'vi' ? 'Cạm bẫy' : 'Pitfalls'}
                  </button>
                )}
                {activeEntry.benchmarks && (
                  <button
                    type="button"
                    onClick={() => scrollToSection('section-benchmarks')}
                    className="shrink-0 px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-ink-800 border border-slate-200 dark:border-ink-700 text-ink-700 dark:text-ink-300 inline-flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> {languageMode === 'vi' ? 'Ngưỡng số' : 'Benchmarks'}
                  </button>
                )}
                {activeEntry.relatedSlugs && activeEntry.relatedSlugs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => scrollToSection('section-related')}
                    className="shrink-0 px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-ink-800 border border-slate-200 dark:border-ink-700 text-ink-700 dark:text-ink-300 inline-flex items-center gap-1"
                  >
                    <Network className="w-3 h-3" /> {languageMode === 'vi' ? 'Liên quan' : 'Related'}
                  </button>
                )}
              </nav>

              {/* 2. Core Definition Card */}
              <section
                id="section-definition"
                className="p-5 rounded-xl border-l-4 border-[#046bd2] bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs font-bold text-[#046bd2] dark:text-sky-300 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    {languageMode === 'vi' ? 'Định nghĩa cốt lõi' : 'Core Definition'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        languageMode === 'vi' ? activeEntry.coreDefinition : activeEntry.coreDefinitionEn,
                        'def',
                      )
                    }
                    className="text-ink-400 hover:text-[#046bd2]"
                    title={languageMode === 'vi' ? 'Sao chép định nghĩa' : 'Copy definition'}
                  >
                    {copiedKey === 'def' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="font-serif leading-relaxed text-ink-900 dark:text-paper-100">
                  {languageMode === 'vi' ? activeEntry.coreDefinition : activeEntry.coreDefinitionEn}
                </p>
              </section>

              {/* 3. Operational Mechanism / Full Explanation */}
              {activeEntry.mechanism && (
                <section
                  id="section-mechanism"
                  className="p-5 rounded-xl border border-slate-200 dark:border-ink-800 bg-slate-50/70 dark:bg-ink-900 space-y-2.5"
                >
                  <h2 className="text-xs font-bold uppercase tracking-wider text-ink-700 dark:text-ink-300 inline-flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-[#046bd2]" />
                    {languageMode === 'vi'
                      ? 'Cơ chế vận hành & Giải thích chuyên sâu'
                      : 'Operational Mechanism & Deep Explanation'}
                  </h2>
                  {isHtmlMechanism ? (
                    <div
                      className="text-sm leading-relaxed text-ink-700 dark:text-ink-300 space-y-3 [&_a]:text-[#046bd2] [&_a]:underline"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtmlContent(activeEntry.mechanism) }}
                    />
                  ) : (
                    <p className="text-sm leading-relaxed text-ink-700 dark:text-ink-300">{activeEntry.mechanism}</p>
                  )}
                </section>
              )}

              {/* 4. Pitfalls Warning Card */}
              {activeEntry.pitfalls && (
                <section
                  id="section-pitfalls"
                  className="p-5 rounded-xl border-l-4 border-amber-500 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2"
                >
                  <h2 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 inline-flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {languageMode === 'vi'
                      ? 'Cạm bẫy dùng từ & Lỗi học thuật thường gặp'
                      : 'Terminological Pitfalls & Common Mistakes'}
                  </h2>
                  <p className="text-sm leading-relaxed text-ink-800 dark:text-ink-200">{activeEntry.pitfalls}</p>
                </section>
              )}

              {/* 5. Benchmarks & Empirical Context */}
              {activeEntry.benchmarks && (
                <section
                  id="section-benchmarks"
                  className="p-5 rounded-xl border-l-4 border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-2"
                >
                  <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 inline-flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    {languageMode === 'vi'
                      ? 'Ngưỡng tham chiếu & Chỉ số thực tiễn'
                      : 'Empirical Benchmarks & Key Metrics'}
                  </h2>
                  <p className="text-sm leading-relaxed text-ink-800 dark:text-ink-200">{activeEntry.benchmarks}</p>
                </section>
              )}

              {/* 6. Related Terms Cross-links */}
              {activeEntry.relatedSlugs && activeEntry.relatedSlugs.length > 0 && (
                <section id="section-related" className="space-y-2.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-ink-600 dark:text-ink-400 inline-flex items-center gap-1.5">
                    <Network className="w-3.5 h-3.5 text-[#046bd2]" />
                    {languageMode === 'vi'
                      ? 'Thuật ngữ liên quan (Cross-Reference)'
                      : 'Related Terms (Cross-Reference)'}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {activeEntry.relatedSlugs.map((relSlug) => {
                      const rel = entriesMap.get(relSlug);
                      if (!rel) return null;
                      return (
                        <button
                          key={relSlug}
                          type="button"
                          onClick={() => selectEntry(relSlug)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-ink-700 bg-slate-50 dark:bg-ink-900 hover:border-[#046bd2] text-xs font-semibold text-ink-800 dark:text-paper-200 transition"
                        >
                          {rel.term} →
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* 7. Seminal Citation & AI BYOK Helper CTA */}
              <section
                id="section-citations"
                className="p-5 rounded-xl border border-slate-200 dark:border-ink-800 bg-slate-50 dark:bg-ink-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-ink-500 inline-flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" />
                    {languageMode === 'vi' ? 'Nguồn & Trích dẫn tham khảo' : 'Seminal Citation & Source'}
                  </div>
                  <p className="text-xs text-ink-700 dark:text-ink-300">
                    {activeEntry.seminalCitation || activeEntry.sourceLabel}
                  </p>
                </div>
                <Link
                  to="/ai-lab/"
                  className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#046bd2] hover:bg-[#0356aa] text-white text-xs font-bold transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  {languageMode === 'vi' ? 'Hỏi AI BYOK giải thích sâu hơn' : 'Ask AI BYOK for Deep Explanation'}
                </Link>
              </section>
            </article>
          )}
        </main>
      </div>
    </div>
  );
};
