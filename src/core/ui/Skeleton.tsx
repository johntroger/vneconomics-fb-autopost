import React from 'react';

export const PageSkeleton: React.FC = () => (
  <div className="w-full px-4 sm:px-6 lg:px-8 py-8 animate-pulse space-y-6">
    <div className="h-5 w-40 rounded bg-paper-300 dark:bg-ink-800" />
    <div className="h-10 w-3/4 rounded bg-paper-300 dark:bg-ink-800" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="h-48 rounded-xl bg-paper-200 dark:bg-ink-900 border border-paper-300 dark:border-ink-800" />
      <div className="h-48 rounded-xl bg-paper-200 dark:bg-ink-900 border border-paper-300 dark:border-ink-800" />
      <div className="h-48 rounded-xl bg-paper-200 dark:bg-ink-900 border border-paper-300 dark:border-ink-800" />
    </div>
  </div>
);
