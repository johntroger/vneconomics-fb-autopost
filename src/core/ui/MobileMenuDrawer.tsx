import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, Coins, Sparkles, Wallet, X } from 'lucide-react';
import { getLocalizedPillar, TOPIC_PILLARS } from '../config/pillars.ts';
import { useTranslation } from '../i18n/index.ts';
import { MARKET_MENU_ITEMS } from '../../features/market/marketFeedService.ts';
import { SIM_MENU_ITEMS } from '../../features/sim/simLabsService.ts';

interface SocialLink {
  name: string;
  href: string;
  bg: string;
  path: string;
}

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  socialLinks: SocialLink[];
  points: number;
}

interface DrawerLink {
  to: string;
  label: string;
  color: string;
  end?: boolean;
}

interface DrawerGroup {
  id: string;
  label: string;
  links: DrawerLink[];
}

export const MobileMenuDrawer: React.FC<MobileMenuDrawerProps> = ({ isOpen, onClose, socialLinks, points }) => {
  const { lang, isEn, t } = useTranslation();
  const location = useLocation();
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const groups: DrawerGroup[] = [
    {
      id: 'topics',
      label: t('nav.topics'),
      links: [
        ...TOPIC_PILLARS.map((p) => ({
          to: `/${p.slug}/`,
          label: getLocalizedPillar(p, lang).name,
          color: p.accentColor,
        })),
        {
          to: '/tin-quoc-te/',
          label: isEn ? 'International News (Live Wire)' : 'Tin Quốc tế (PR Newswire)',
          color: '#146EBE',
        },
      ],
    },
    {
      id: 'market',
      label: t('nav.market'),
      links: MARKET_MENU_ITEMS.map((item) => ({
        to: item.path,
        label: isEn ? item.titleEn : item.titleVi,
        color: item.accentColor,
        end: item.type === 'overview',
      })),
    },
    {
      id: 'library',
      label: t('nav.library'),
      links: [
        { to: '/thu-vien-sach/', label: isEn ? 'Digital Book Library' : 'Thư viện Sách & Tài liệu', color: '#146EBE' },
        { to: '/tu-sach-cua-toi/', label: t('nav.myBookshelf'), color: '#10B981' },
        { to: '/ai-skills/', label: t('nav.aiSkills'), color: '#8B5CF6' },
      ],
    },
    {
      id: 'academy',
      label: t('nav.academy'),
      links: [
        { to: '/hoc-vien/', label: isEn ? 'Digital Economy Courses' : 'Khóa học Kinh tế số', color: '#0EA5E9' },
        { to: '/luyen-tap/', label: t('nav.practice'), color: '#F59E0B' },
        { to: '/tu-dien/', label: t('nav.glossary'), color: '#0D9488' },
      ],
    },
    {
      id: 'sim',
      label: t('nav.simNft'),
      links: SIM_MENU_ITEMS.map((item) => ({
        to: item.to,
        label: isEn ? item.titleEn : item.titleVi,
        color: item.accentColor,
      })),
    },
  ];

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 pl-4 pr-3 py-2.5 text-[13px] rounded-lg transition-colors ${
      isActive
        ? 'bg-[#146EBE]/10 text-[#146EBE] dark:text-sky-300 font-bold'
        : 'text-ink-800 dark:text-paper-200 active:bg-paper-100 dark:active:bg-ink-800'
    }`;

  return (
    <div className="lg:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={isEn ? 'Site menu' : 'Menu trang'}>
      <button
        type="button"
        aria-label={isEn ? 'Close menu' : 'Đóng menu'}
        onClick={onClose}
        className="absolute inset-0 bg-ink-950/55 backdrop-blur-[2px]"
      />

      <aside className="absolute inset-y-0 left-0 w-[86%] max-w-sm bg-paper-50 dark:bg-ink-950 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 h-14 border-b border-paper-300 dark:border-ink-800 shrink-0">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img
              src="/logo-vneconomics.png"
              alt="Logo VNEconomics"
              className="h-8 w-8 object-contain rounded-lg bg-white p-0.5 border border-paper-300 dark:border-ink-700"
            />
            <span className="font-serif font-bold text-base text-ink-950 dark:text-paper-50 truncate">VNEconomics</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label={isEn ? 'Close menu' : 'Đóng menu'}
            className="p-2 rounded-lg border border-paper-300 dark:border-ink-700 text-ink-700 dark:text-paper-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-1">
          <div className="grid grid-cols-2 gap-2 pb-3">
            <Link
              to="/learn-and-earn/"
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#146EBE] text-white text-xs font-bold"
            >
              <Coins className="w-4 h-4 text-amber-300" />
              <span className="tabular-nums">{points} VNE</span>
            </Link>
            <Link
              to="/du-bao/"
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#146EBE]/40 text-[#146EBE] dark:text-sky-300 text-xs font-bold"
            >
              {t('nav.predictions')}
            </Link>
            <Link
              to="/ai-lab/"
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-paper-300 dark:border-ink-700 text-ink-800 dark:text-paper-200 text-xs font-semibold"
            >
              <Sparkles className="w-4 h-4 text-editorial-teal" />
              {t('nav.aiKey')}
            </Link>
            <Link
              to="/cardano-hub/"
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-paper-300 dark:border-ink-700 text-ink-800 dark:text-paper-200 text-xs font-semibold"
            >
              <Wallet className="w-4 h-4 text-editorial-navy dark:text-sky-400" />
              {t('nav.testnetWallet')}
            </Link>
          </div>

          {groups.map((group) => {
            const expanded = openGroup === group.id;
            return (
              <div key={group.id} className="rounded-xl border border-paper-200 dark:border-ink-800 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenGroup(expanded ? null : group.id)}
                  aria-expanded={expanded}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-ink-900 dark:text-paper-100 bg-paper-100/60 dark:bg-ink-900/60"
                >
                  <span>{group.label}</span>
                  <ChevronDown className={`w-4 h-4 text-ink-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
                {expanded && (
                  <div className="p-1.5 space-y-0.5">
                    {group.links.map((item) => (
                      <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-medium">{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="shrink-0 border-t border-paper-300 dark:border-ink-800 px-4 py-3 flex items-center justify-center gap-2">
          {socialLinks.map((soc) => (
            <a
              key={soc.name}
              href={soc.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={soc.name}
              style={{ backgroundColor: soc.bg }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                <path d={soc.path} />
              </svg>
            </a>
          ))}
        </div>
      </aside>
    </div>
  );
};
