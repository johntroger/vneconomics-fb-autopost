import React from 'react';
import { Header } from './Header.tsx';
import { Footer } from './Footer.tsx';
import { MobileBottomNav } from './MobileBottomNav.tsx';
import { GoogleAnalytics } from '../seo/GoogleAnalytics.tsx';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col overflow-x-clip bg-paper-100 text-ink-900 dark:bg-ink-950 dark:text-paper-100">
      <GoogleAnalytics />
      <Header />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};
