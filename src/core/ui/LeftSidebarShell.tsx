import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, LayoutGrid } from 'lucide-react';

export interface SidebarNavItem {
  id: string;
  to: string;
  title: string;
  accentColor: string;
  active?: boolean;
}

export interface SidebarNavGroup {
  label: string;
  items: SidebarNavItem[];
}

interface LeftSidebarShellProps {
  sidebarTitle: string;
  groups: SidebarNavGroup[];
  children: React.ReactNode;
}

export const LeftSidebarShell: React.FC<LeftSidebarShellProps> = ({
  sidebarTitle,
  groups,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left E-Commerce-Style Category Sidebar */}
        <aside className="w-full lg:w-64 xl:w-72 shrink-0 lg:sticky lg:top-20 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="w-full px-4 py-3.5 flex items-center justify-between border-b border-paper-200 dark:border-ink-800 lg:cursor-default"
          >
            <span className="font-serif font-bold text-sm text-ink-950 dark:text-paper-50 inline-flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-[#146EBE]" />
              {sidebarTitle}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-ink-500 lg:hidden transition-transform ${mobileOpen ? 'rotate-180' : ''}`}
            />
          </button>

          <nav
            aria-label={sidebarTitle}
            className={`${mobileOpen ? 'block' : 'hidden'} lg:block p-2.5 space-y-4 max-h-[calc(100vh-7.5rem)] overflow-y-auto`}
          >
            {groups.map((group) => (
              <div key={group.label} className="space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <Link
                      key={item.id}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors ${
                        item.active
                          ? 'bg-[#146EBE]/12 text-[#146EBE] dark:bg-sky-500/15 dark:text-sky-300 font-bold border-l-4 border-[#146EBE]'
                          : 'text-ink-800 dark:text-paper-200 hover:bg-paper-100 dark:hover:bg-ink-800 font-medium'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: item.accentColor }}
                      />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 w-full space-y-6">{children}</main>
      </div>
    </div>
  );
};
