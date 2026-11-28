import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, TrendingUp, BookOpen, Gamepad2, Sparkles } from 'lucide-react';
import { useTranslation } from '../i18n/index.ts';

export const MobileBottomNav: React.FC = () => {
  const { isEn, t } = useTranslation();
  const itemClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium py-1.5 ${
      isActive ? 'text-editorial-teal dark:text-emerald-400' : 'text-ink-500 dark:text-ink-400'
    }`;

  return (
    <nav
      aria-label={isEn ? 'Mobile navigation' : 'Điều hướng di động'}
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-paper-50/95 dark:bg-ink-950/95 backdrop-blur border-t border-paper-300 dark:border-ink-800 grid grid-cols-5"
    >
      <NavLink to="/" end className={itemClass}>
        <Home className="w-4 h-4" />
        <span>{t('mobile.home')}</span>
      </NavLink>
      <NavLink to="/thi-truong/" className={itemClass}>
        <TrendingUp className="w-4 h-4" />
        <span>{t('mobile.market')}</span>
      </NavLink>
      <NavLink to="/thu-vien-sach/" className={itemClass}>
        <BookOpen className="w-4 h-4" />
        <span>{t('mobile.library')}</span>
      </NavLink>
      <NavLink to="/ai-lab/" className={itemClass}>
        <Sparkles className="w-4 h-4" />
        <span>{t('mobile.ai')}</span>
      </NavLink>
      <NavLink to="/learn-and-earn/" className={itemClass}>
        <Gamepad2 className="w-4 h-4" />
        <span>{t('mobile.sim')}</span>
      </NavLink>
    </nav>
  );
};
