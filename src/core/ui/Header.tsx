import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Wallet, Sun, Moon, Sparkles, Coins, Search, User, ChevronDown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.tsx';
import { useTranslation } from '../i18n/index.ts';
import { getLocalizedPillar, TOPIC_PILLARS } from '../config/pillars.ts';
import { searchHeaderIndex } from '../data/searchIndexService.ts';
import { useDebouncedValue } from '../utils/storageSchema.ts';
import { getPointsState, POINTS_UPDATED_EVENT, syncPointsAndUnlocksFromServer } from '../../features/game/vneGameService.ts';
import { getUserAIConfig, AI_UPDATED_EVENT } from '../../features/ai/userAIService.ts';
import {
  ACCOUNT_UPDATED_EVENT,
  getSavedProfile,
  subscribeAccountAuth,
  type UserAccountProfile,
} from '../../features/account/accountService.ts';
import { AuthModal } from '../../features/account/AuthModal.tsx';
import { UserProfileModal } from '../../features/account/UserProfileModal.tsx';
import { SIM_MENU_ITEMS } from '../../features/sim/simLabsService.ts';
import { MARKET_MENU_ITEMS } from '../../features/market/marketFeedService.ts';

const SOCIAL_LINKS = [
  {
    name: 'Facebook',
    href: 'https://www.facebook.com/vneconomics/',
    bg: '#3B5998',
    path: 'M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z',
  },
  {
    name: 'TikTok',
    href: 'https://www.tiktok.com/@vneconomics',
    bg: '#000000',
    path: 'M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z',
  },
  {
    name: 'Twitter / X',
    href: 'https://twitter.com/vneconomics_com',
    bg: '#1DA1F2',
    path: 'M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z',
  },
  {
    name: 'LinkedIn',
    href: 'https://www.linkedin.com/company/vneconomics/',
    bg: '#0077B5',
    path: 'M6.94 5a2 2 0 1 1-4-.002 2 2 0 0 1 4 .002zM7 8.48H3V21h4V8.48zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91l.04-1.68z',
  },
  {
    name: 'YouTube',
    href: 'https://www.youtube.com/@vn-economics',
    bg: '#CD201F',
    path: 'M21.58 7.19a2.75 2.75 0 0 0-1.94-1.94C17.93 4.8 12 4.8 12 4.8s-5.93 0-7.64.45a2.75 2.75 0 0 0-1.94 1.94A28.7 28.7 0 0 0 2 12a28.7 28.7 0 0 0 .42 4.81 2.75 2.75 0 0 0 1.94 1.94c1.71.45 7.64.45 7.64.45s5.93 0 7.64-.45a2.75 2.75 0 0 0 1.94-1.94A28.7 28.7 0 0 0 22 12a28.7 28.7 0 0 0-.42-4.81zM10 15.1V8.9l5.2 3.1-5.2 3.1z',
  },
  {
    name: 'Telegram',
    href: 'https://t.me/VNEconomic',
    bg: '#2CA5E0',
    path: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
  },
];

export const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { lang, isEn, setLanguage, t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [points, setPoints] = useState(() => getPointsState().totalPoints);
  const [hasAiKey, setHasAiKey] = useState(() => Boolean(getUserAIConfig().apiKey));
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [marketsOpen, setMarketsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [academyOpen, setAcademyOpen] = useState(false);
  const [simOpen, setSimOpen] = useState(false);
  const [profile, setProfile] = useState<UserAccountProfile | null>(() => getSavedProfile());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const topicsRef = useRef<HTMLDivElement>(null);
  const marketsRef = useRef<HTMLDivElement>(null);
  const libraryRef = useRef<HTMLDivElement>(null);
  const academyRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTopicsOpen(false);
    setMarketsOpen(false);
    setLibraryOpen(false);
    setAcademyOpen(false);
    setSimOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const syncPoints = () => setPoints(getPointsState().totalPoints);
    const syncAi = () => setHasAiKey(Boolean(getUserAIConfig().apiKey));
    const syncAccount = () => setProfile(getSavedProfile());
    const unsubAuth = subscribeAccountAuth((p) => {
      setProfile(p);
      if (p?.provider === 'firebase') {
        void syncPointsAndUnlocksFromServer();
      }
    });
    window.addEventListener(POINTS_UPDATED_EVENT, syncPoints);
    window.addEventListener(AI_UPDATED_EVENT, syncAi);
    window.addEventListener(ACCOUNT_UPDATED_EVENT, syncAccount);
    window.addEventListener('storage', syncPoints);
    return () => {
      unsubAuth();
      window.removeEventListener(POINTS_UPDATED_EVENT, syncPoints);
      window.removeEventListener(AI_UPDATED_EVENT, syncAi);
      window.removeEventListener(ACCOUNT_UPDATED_EVENT, syncAccount);
      window.removeEventListener('storage', syncPoints);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (topicsRef.current && !topicsRef.current.contains(e.target as Node)) {
        setTopicsOpen(false);
      }
      if (marketsRef.current && !marketsRef.current.contains(e.target as Node)) {
        setMarketsOpen(false);
      }
      if (libraryRef.current && !libraryRef.current.contains(e.target as Node)) {
        setLibraryOpen(false);
      }
      if (academyRef.current && !academyRef.current.contains(e.target as Node)) {
        setAcademyOpen(false);
      }
      if (simRef.current && !simRef.current.contains(e.target as Node)) {
        setSimOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const debouncedSearch = useDebouncedValue(searchQuery, 180);
  const searchResults = useMemo(() => {
    if (debouncedSearch.trim().length < 2) return [];
    return searchHeaderIndex(debouncedSearch, 8, lang);
  }, [debouncedSearch, lang]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      navigate(searchResults[0].url);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const isTopicActive = TOPIC_PILLARS.some((p) => location.pathname.startsWith(`/${p.slug}`));
  const isMarketActive =
    location.pathname.startsWith('/thi-truong') ||
    location.pathname.startsWith('/gia-vang') ||
    location.pathname.startsWith('/gia-crypto') ||
    location.pathname.startsWith('/ty-gia-ngoai-te') ||
    location.pathname.startsWith('/lai-suat') ||
    location.pathname.startsWith('/gia-chung-khoan');
  const isLibraryActive =
    location.pathname.startsWith('/thu-vien-sach') ||
    location.pathname.startsWith('/tu-sach-cua-toi') ||
    location.pathname.startsWith('/ai-skills');
  const isAcademyActive =
    location.pathname.startsWith('/hoc-vien') ||
    location.pathname.startsWith('/luyen-tap') ||
    location.pathname.startsWith('/tu-dien');
  const isSimActive =
    location.pathname.startsWith('/learn-and-earn') ||
    location.pathname.startsWith('/mo-phong') ||
    location.pathname.startsWith('/cardano-hub');

  return (
    <>
      {/* Signature Blue Top Bar */}
      <div className="w-full bg-[#146EBE] text-white relative z-50">
        <div className="w-full px-3 sm:px-6 lg:px-8 py-2 grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-3">
          {/* Social Icons */}
          <div className="flex items-center justify-center lg:justify-start gap-1.5 shrink-0">
            {SOCIAL_LINKS.map((soc) => (
              <a
                key={soc.name}
                href={soc.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={soc.name}
                title={soc.name}
                style={{ backgroundColor: soc.bg }}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform shadow-sm"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden="true">
                  <path d={soc.path} />
                </svg>
              </a>
            ))}
          </div>

          {/* Centered Official Tagline */}
          <div className="hidden sm:block text-center text-xs sm:text-sm font-bold tracking-tight truncate px-2">
            {t('topBar.tagline')}
          </div>

          {/* Right: VI | EN Switcher + Search Pill */}
          <div className="flex items-center justify-end gap-2 w-full lg:w-auto shrink-0">
            <div
              role="group"
              aria-label="Chuyển đổi ngôn ngữ Việt / Anh"
              className="flex items-center rounded-full bg-white/15 border border-white/25 p-0.5 text-[11px] font-bold shrink-0"
            >
              <button
                type="button"
                onClick={() => setLanguage('vi')}
                className={`px-2 py-1 rounded-full transition-colors ${
                  lang === 'vi' ? 'bg-white text-[#146EBE] shadow-xs' : 'text-white/85 hover:text-white'
                }`}
              >
                🇻🇳 VI
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded-full transition-colors ${
                  lang === 'en' ? 'bg-white text-[#146EBE] shadow-xs' : 'text-white/85 hover:text-white'
                }`}
              >
                🌐 EN
              </button>
            </div>

          <div ref={searchBoxRef} className="relative flex-1 lg:w-64 lg:flex-none shrink-0">
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center rounded-full bg-white text-ink-900 border border-ink-950/20 px-3.5 py-1.5 shadow-sm"
            >
              <input
                type="search"
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                placeholder={t('common.searchPlaceholder')}
                aria-label="Tìm kiếm toàn trang"
                className="w-full bg-transparent text-xs sm:text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Tìm kiếm"
                className="text-ink-700 hover:text-[#146EBE] pl-1.5 shrink-0"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {searchOpen && searchQuery.trim().length >= 2 && (
              <div className="absolute right-0 mt-1.5 w-full sm:w-96 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 text-ink-900 dark:text-paper-100 shadow-xl overflow-hidden z-50">
                {searchResults.length === 0 ? (
                  <div className="p-3 text-xs text-ink-500">
                    {isEn
                      ? `No results found for "${searchQuery}".`
                      : `Không tìm thấy kết quả phù hợp cho “${searchQuery}”.`}
                  </div>
                ) : (
                  <ul className="max-h-80 overflow-y-auto divide-y divide-paper-200 dark:divide-ink-800">
                    {searchResults.map((item) => (
                      <li key={`${item.kind}-${item.url}`}>
                        <button
                          type="button"
                          onClick={() => {
                            navigate(item.url);
                            setSearchOpen(false);
                            setSearchQuery('');
                          }}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-paper-100 dark:hover:bg-ink-800 transition-colors"
                        >
                          <div className="text-[10px] font-bold uppercase text-editorial-teal">{item.kind}</div>
                          <div className="text-xs font-semibold line-clamp-1">{item.title}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Main Sticky Navigation */}
      <header className="sticky top-0 z-40 border-b border-paper-300/90 dark:border-ink-800 bg-paper-50/95 dark:bg-ink-950/95 backdrop-blur">
        <div className="w-full px-2 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-4">
          <Link to="/" className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 min-w-0">
            <img
              src="/logo-vneconomics.png"
              alt="Logo VNEconomics"
              className="h-7 w-7 sm:h-10 sm:w-10 object-contain rounded-lg bg-white p-0.5 border border-paper-300 dark:border-ink-700 shrink-0"
            />
            <div className="leading-tight min-w-0">
              <span className="font-serif font-bold text-[15px] sm:text-lg tracking-tight text-ink-950 dark:text-paper-50 block truncate">
                VNEconomics
              </span>
              <span className="text-[11px] uppercase tracking-wider text-ink-500 dark:text-ink-400 hidden 2xl:block">
                {isEn ? 'Digital Economy • AI • Blockchain' : 'Kinh tế số • AI • Blockchain'}
              </span>
            </div>
          </Link>

          <nav aria-label={isEn ? 'Main navigation' : 'Điều hướng chính'} className="hidden lg:flex flex-1 items-center justify-center gap-1.5 xl:gap-3.5 min-w-0">
            {/* Dropdown Chuyên mục (5 Trụ cột Tri thức) */}
            <div ref={topicsRef} className="relative">
              <button
                type="button"
                onClick={() => setTopicsOpen((v) => !v)}
                aria-expanded={topicsOpen}
                aria-haspopup="menu"
                className={`whitespace-nowrap text-xs font-medium px-1.5 xl:px-2 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 ${
                  isTopicActive
                    ? 'bg-[#146EBE]/10 text-[#146EBE] dark:bg-sky-500/15 dark:text-sky-300 font-semibold'
                    : 'text-ink-700 hover:text-ink-950 dark:text-ink-400 dark:hover:text-paper-100'
                }`}
              >
                <span>{t('nav.topics')}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${topicsOpen ? 'rotate-180' : ''}`} />
              </button>

              {topicsOpen && (
                <div
                  role="menu"
                  className="absolute left-0 mt-2 w-72 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 shadow-xl py-1.5 z-50"
                >
                  {TOPIC_PILLARS.map((p) => {
                    const loc = getLocalizedPillar(p, lang);
                    return (
                    <NavLink
                      key={p.slug}
                      to={`/${p.slug}/`}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3.5 py-2 text-xs transition-colors ${
                          isActive
                            ? 'bg-[#146EBE]/10 text-[#146EBE] dark:text-sky-300 font-bold'
                            : 'text-ink-800 dark:text-paper-200 hover:bg-paper-100 dark:hover:bg-ink-800'
                        }`
                      }
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: p.accentColor }}
                      />
                      <span className="font-semibold">{loc.name}</span>
                    </NavLink>
                    );
                  })}
                  <div className="my-1 border-t border-paper-200 dark:border-ink-800" />
                  <NavLink
                    to="/tin-quoc-te/"
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3.5 py-2 text-xs transition-colors ${
                        isActive
                          ? 'bg-[#146EBE]/10 text-[#146EBE] dark:text-sky-300 font-bold'
                          : 'text-ink-800 dark:text-paper-200 hover:bg-paper-100 dark:hover:bg-ink-800'
                      }`
                    }
                  >
                    <span className="w-2 h-2 rounded-full shrink-0 bg-[#146EBE]" />
                    <span className="font-semibold">{isEn ? 'International News (Live Wire)' : 'Tin Quốc tế (PR Newswire)'}</span>
                  </NavLink>
                </div>
              )}
            </div>

            {/* Dropdown Thị trường (8 chuyên trang Dữ liệu Realtime) */}
            <div ref={marketsRef} className="relative">
              <button
                type="button"
                onClick={() => setMarketsOpen((v) => !v)}
                aria-expanded={marketsOpen}
                aria-haspopup="menu"
                className={`whitespace-nowrap text-xs font-medium px-1.5 xl:px-2 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 ${
                  isMarketActive
                    ? 'bg-[#146EBE]/10 text-[#146EBE] dark:bg-sky-500/15 dark:text-sky-300 font-semibold'
                    : 'text-ink-700 hover:text-ink-950 dark:text-ink-400 dark:hover:text-paper-100'
                }`}
              >
                <span>{t('nav.market')}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${marketsOpen ? 'rotate-180' : ''}`} />
              </button>

              {marketsOpen && (
                <div
                  role="menu"
                  className="absolute left-0 mt-2 w-80 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 shadow-xl py-1.5 z-50"
                >
                  {MARKET_MENU_ITEMS.map((item) => (
                    <NavLink
                      key={item.type}
                      to={item.path}
                      end={item.type === 'overview'}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3.5 py-2 text-xs transition-colors ${
                          isActive
                            ? 'bg-[#146EBE]/10 text-[#146EBE] dark:text-sky-300 font-bold'
                            : 'text-ink-800 dark:text-paper-200 hover:bg-paper-100 dark:hover:bg-ink-800'
                        }`
                      }
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: item.accentColor }}
                      />
                      <span className="font-semibold">{isEn ? item.titleEn : item.titleVi}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>

            {/* Mục riêng trên Menu chính: Sàn Dự báo (/du-bao/) */}
            <NavLink
              to="/du-bao/"
              className={({ isActive }) =>
                `whitespace-nowrap text-xs font-medium px-2 xl:px-2.5 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 ${
                  isActive
                    ? 'bg-[#146EBE]/10 text-[#146EBE] dark:bg-sky-500/15 dark:text-sky-300 font-semibold'
                    : 'text-ink-700 hover:text-ink-950 dark:text-ink-400 dark:hover:text-paper-100'
                }`
              }
            >
              <span>{t('nav.predictions')}</span>
            </NavLink>
            {/* Dropdown Thư viện & Tài nguyên */}
            <div ref={libraryRef} className="relative">
              <button
                type="button"
                onClick={() => setLibraryOpen((v) => !v)}
                aria-expanded={libraryOpen}
                aria-haspopup="menu"
                className={`whitespace-nowrap text-xs font-medium px-2 xl:px-2.5 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 ${
                  isLibraryActive
                    ? 'bg-[#146EBE]/10 text-[#146EBE] dark:bg-sky-500/15 dark:text-sky-300 font-semibold'
                    : 'text-ink-700 hover:text-ink-950 dark:text-ink-400 dark:hover:text-paper-100'
                }`}
              >
                <span>{t('nav.library')}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${libraryOpen ? 'rotate-180' : ''}`} />
              </button>

              {libraryOpen && (
                <div
                  role="menu"
                  className="absolute left-0 mt-2 w-64 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 shadow-xl py-1.5 z-50"
                >
                  {[
                    { to: '/thu-vien-sach/', label: isEn ? 'Digital Book Library' : 'Thư viện Sách & Tài liệu', color: '#146EBE' },
                    { to: '/tu-sach-cua-toi/', label: t('nav.myBookshelf'), color: '#10B981' },
                    { to: '/ai-skills/', label: t('nav.aiSkills'), color: '#8B5CF6' },
                  ].map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3.5 py-2 text-xs transition-colors ${
                          isActive
                            ? 'bg-[#146EBE]/10 text-[#146EBE] dark:text-sky-300 font-bold'
                            : 'text-ink-800 dark:text-paper-200 hover:bg-paper-100 dark:hover:bg-ink-800'
                        }`
                      }
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>

            {/* Dropdown Học viện & Luyện tập */}
            <div ref={academyRef} className="relative">
              <button
                type="button"
                onClick={() => setAcademyOpen((v) => !v)}
                aria-expanded={academyOpen}
                aria-haspopup="menu"
                className={`whitespace-nowrap text-xs font-medium px-2 xl:px-2.5 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 ${
                  isAcademyActive
                    ? 'bg-[#146EBE]/10 text-[#146EBE] dark:bg-sky-500/15 dark:text-sky-300 font-semibold'
                    : 'text-ink-700 hover:text-ink-950 dark:text-ink-400 dark:hover:text-paper-100'
                }`}
              >
                <span>{t('nav.academy')}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${academyOpen ? 'rotate-180' : ''}`} />
              </button>

              {academyOpen && (
                <div
                  role="menu"
                  className="absolute left-0 mt-2 w-64 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 shadow-xl py-1.5 z-50"
                >
                  {[
                    { to: '/hoc-vien/', label: isEn ? 'Digital Economy Courses' : 'Khóa học Kinh tế số', color: '#0EA5E9' },
                    { to: '/luyen-tap/', label: t('nav.practice'), color: '#F59E0B' },
                    { to: '/tu-dien/', label: t('nav.glossary'), color: '#0D9488' },
                  ].map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3.5 py-2 text-xs transition-colors ${
                          isActive
                            ? 'bg-[#146EBE]/10 text-[#146EBE] dark:text-sky-300 font-bold'
                            : 'text-ink-800 dark:text-paper-200 hover:bg-paper-100 dark:hover:bg-ink-800'
                        }`
                      }
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
            {/* Dropdown Mô phỏng & NFT (giống menu Chuyên mục) */}
            <div ref={simRef} className="relative">
              <button
                type="button"
                onClick={() => setSimOpen((v) => !v)}
                aria-expanded={simOpen}
                aria-haspopup="menu"
                className={`whitespace-nowrap text-xs font-medium px-1.5 xl:px-2 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 ${
                  isSimActive
                    ? 'bg-[#146EBE]/10 text-[#146EBE] dark:bg-sky-500/15 dark:text-sky-300 font-semibold'
                    : 'text-ink-700 hover:text-ink-950 dark:text-ink-400 dark:hover:text-paper-100'
                }`}
              >
                <span>{t('nav.simNft')}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${simOpen ? 'rotate-180' : ''}`} />
              </button>

              {simOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-80 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 shadow-xl py-1.5 z-50"
                >
                  {SIM_MENU_ITEMS.map((item) => (
                    <NavLink
                      key={item.slug}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3.5 py-2 text-xs transition-colors ${
                          isActive
                            ? 'bg-[#146EBE]/10 text-[#146EBE] dark:text-sky-300 font-bold'
                            : 'text-ink-800 dark:text-paper-200 hover:bg-paper-100 dark:hover:bg-ink-800'
                        }`
                      }
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: item.accentColor }}
                      />
                      <span className="font-semibold">{isEn ? item.titleEn : item.titleVi}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0 lg:pl-3 lg:border-l lg:border-paper-200 dark:lg:border-ink-800">
            <Link
              to="/ai-lab/"
              title={isEn ? 'Connect your free personal AI Assistant (Gemini / OpenAI)' : 'Kết nối Trợ lý AI cá nhân miễn phí (Gemini / OpenAI)'}
              className="inline-flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-900 text-xs font-medium text-ink-800 dark:text-paper-200 hover:border-editorial-teal transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-editorial-teal dark:text-emerald-400" />
              <span className="hidden xl:inline">{t('nav.aiKey')}</span>
              <span
                className={`hidden sm:inline-block w-2 h-2 rounded-full ${hasAiKey ? 'bg-emerald-500' : 'bg-ink-400/50'}`}
                title={hasAiKey ? (isEn ? 'Personal Key connected' : 'Đã kết nối Key cá nhân') : isEn ? 'No Key set' : 'Chưa nhập Key'}
              />
            </Link>

            <Link
              to="/cardano-hub/"
              title={isEn ? 'Connect 0-Cost Testnet Wallet (EVM & Cardano)' : 'Kết nối Ví Blockchain Testnet 0đ (EVM & Cardano)'}
              className="inline-flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-900 text-xs font-medium text-ink-800 dark:text-paper-200 hover:border-editorial-navy transition-colors"
            >
              <Wallet className="w-3.5 h-3.5 text-editorial-navy dark:text-sky-400" />
              <span className="hidden xl:inline">{t('nav.testnetWallet')}</span>
            </Link>

            <Link
              to="/learn-and-earn/"
              title={isEn ? 'VNE Points & VNE Economy Sim' : 'VNE Points & VNE Mô phỏng'}
              className="inline-flex items-center gap-1 px-1.5 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-[11px] sm:text-xs font-semibold transition-colors shadow-xs whitespace-nowrap"
            >
              <Coins className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="tabular-nums">{points} VNE</span>
            </Link>

            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              title={profile ? profile.displayName : t('nav.account')}
              className="inline-flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-900 text-xs font-medium text-ink-800 dark:text-paper-200 hover:border-[#146EBE] transition-colors"
            >
              <User className="w-3.5 h-3.5 text-[#146EBE]" />
              <span className="hidden xl:inline max-w-[90px] truncate">
                {profile ? profile.displayName.split(' ').slice(-1)[0] : t('nav.account')}
              </span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isEn ? 'Toggle Light / Dark theme' : 'Chuyển giao diện Sáng / Tối'}
              className="p-1.5 sm:p-2 rounded-lg border border-paper-300 dark:border-ink-700 text-ink-700 dark:text-paper-200 hover:bg-paper-200 dark:hover:bg-ink-800 transition-colors"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="lg:hidden border-t border-paper-200 dark:border-ink-800/80 px-4 py-1.5 flex items-center gap-3 overflow-x-auto no-scrollbar text-xs text-ink-700 dark:text-ink-400">
          {TOPIC_PILLARS.map((p) => {
            const loc = getLocalizedPillar(p, lang);
            return (
              <Link key={p.slug} to={`/${p.slug}/`} className="whitespace-nowrap hover:text-editorial-teal">
                {loc.shortLabel}
              </Link>
            );
          })}
          <Link to="/thi-truong/" className="whitespace-nowrap hover:text-[#146EBE] font-semibold">
            {t('nav.market')}
          </Link>
          <Link to="/du-bao/" className="whitespace-nowrap hover:text-[#146EBE] font-bold text-[#146EBE] dark:text-sky-400">
            {t('nav.predictions')}
          </Link>
          <Link to="/gia-crypto/" className="whitespace-nowrap hover:text-[#146EBE]">
            {isEn ? 'Crypto' : 'Giá Crypto'}
          </Link>
          <Link to="/gia-vang/" className="whitespace-nowrap hover:text-[#146EBE]">
            {isEn ? 'Gold' : 'Giá Vàng'}
          </Link>
          <Link to="/ai-skills/" className="whitespace-nowrap inline-flex items-center gap-1 text-[#146EBE] dark:text-sky-400 font-semibold">
            <Sparkles className="w-3 h-3" /> {t('nav.aiSkills')}
          </Link>
          <Link to="/luyen-tap/" className="whitespace-nowrap inline-flex items-center gap-1 text-[#146EBE] dark:text-sky-400 font-semibold">
            <Sparkles className="w-3 h-3" /> {t('nav.practice')}
          </Link>
          <Link to="/learn-and-earn/" className="whitespace-nowrap inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
            <Coins className="w-3 h-3" /> {t('nav.simNft')}
          </Link>
          <Link to="/mo-phong/testnet-swap/" className="whitespace-nowrap hover:text-[#146EBE] font-semibold">
            {isEn ? 'Testnet Swap' : 'Đổi Testnet'}
          </Link>
          <Link to="/tu-dien/" className="whitespace-nowrap inline-flex items-center gap-1 text-editorial-teal font-medium">
            <Sparkles className="w-3 h-3" /> {t('nav.glossary')}
          </Link>
          <Link to="/tin-quoc-te/" className="whitespace-nowrap hover:text-[#146EBE]">
            {isEn ? 'International' : 'Tin Quốc tế'}
          </Link>
        </div>
      </header>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(p) => setProfile(p)}
      />
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        profile={profile}
        onOpenAuth={() => setAuthModalOpen(true)}
        onProfileChange={(p) => setProfile(p)}
      />
    </>
  );
};
