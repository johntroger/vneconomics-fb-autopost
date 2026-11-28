import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Globe, Loader2, Radio } from 'lucide-react';
import { useTranslation } from '../../core/i18n/index.ts';

interface PrNewswireWidgetProps {
  mode: 'widget' | 'landing';
}

const SCRIPT_URLS: Record<'widget' | 'landing', string> = {
  widget: 'https://tools.prnewswire.com/vi/live/23618/widget.js',
  landing: 'https://tools.prnewswire.com/vi/live/23618/landing.js',
};

const CONTAINER_IDS: Record<'widget' | 'landing', string> = {
  widget: 'w23618_widget',
  landing: 'w23618_landing',
};

/**
 * PR Newswire live auto-updating partner widget (#w23618_widget on Home, #w23618_landing on /tin-quoc-te/).
 * Keeps English mode 100% free of automatic Vietnamese wire content unless user explicitly opts in.
 */
export const PrNewswireWidget: React.FC<PrNewswireWidgetProps> = ({ mode }) => {
  const { isEn } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [forceLoadInEn, setForceLoadInEn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const shouldMountRemote = !isEn || forceLoadInEn;
  const containerId = CONTAINER_IDS[mode];

  useEffect(() => {
    if (!shouldMountRemote) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    // Clear previous scripts & container markup cleanly on re-mount / StrictMode
    document.querySelectorAll(`script[data-vne-prn="${mode}"]`).forEach((el) => el.remove());
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    const script = document.createElement('script');
    script.src = SCRIPT_URLS[mode];
    script.async = true;
    script.dataset.vnePrn = mode;

    const fallbackTimer = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 3000);

    script.onload = () => {
      window.clearTimeout(fallbackTimer);
      if (!cancelled) setLoading(false);
    };

    script.onerror = () => {
      window.clearTimeout(fallbackTimer);
      if (!cancelled) {
        setLoading(false);
        setLoadError(true);
      }
    };

    document.head.appendChild(script);

    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimer);
      script.remove();
    };
  }, [mode, shouldMountRemote]);

  if (isEn && !forceLoadInEn) {
    return (
      <div className="rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-100/80 dark:bg-ink-950/70 p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#146EBE] dark:text-sky-400">
            <Radio className="w-3.5 h-3.5 text-emerald-500" />
            PR Newswire Partner Wire (ID 23618)
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-paper-200 dark:bg-ink-800 text-ink-600 dark:text-ink-300 font-medium">
            Regional Edition Filter
          </span>
        </div>
        <p className="text-xs sm:text-sm text-ink-700 dark:text-ink-300 leading-relaxed">
          The auto-updating PR Newswire Vietnam partner wire (<code className="text-xs">{containerId}</code>) publishes press releases in Vietnamese. To keep the English edition pure English, you can read the English global newswire directly or opt in to load the live partner wire below.
        </p>
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <a
            href="https://www.prnewswire.com/news-releases/business-technology-latest-news/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-semibold transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            Browse Global Tech &amp; Business Wire (English)
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            type="button"
            onClick={() => setForceLoadInEn(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 text-xs font-semibold text-ink-800 dark:text-paper-200 hover:border-[#146EBE] transition-colors"
          >
            Load Live Partner Wire (Vietnamese Source)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white text-slate-900 rounded-xl p-4 sm:p-5 border border-paper-200 dark:border-ink-700 overflow-x-auto space-y-3">
      {loading && (
        <div className="flex items-center gap-2 text-xs text-slate-500 py-3">
          <Loader2 className="w-4 h-4 animate-spin text-[#146EBE]" />
          <span>
            {isEn
              ? 'Connecting to PR Newswire auto-updating feed...'
              : 'Đang đồng bộ dòng tin PR Newswire tự động cập nhật...'}
          </span>
        </div>
      )}

      <div ref={containerRef} id={containerId} className="min-h-[260px]" />

      {loadError && (
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-3">
          <span>
            {isEn
              ? 'Unable to load the external PR Newswire script in this network context.'
              : 'Không thể tải script PR Newswire trực tiếp trong môi trường mạng hiện tại.'}
          </span>
          <a
            href={isEn ? 'https://www.prnewswire.com/news-releases/' : 'https://www.prnewswire.com/apac/vi/'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-[#146EBE] hover:underline"
          >
            {isEn ? 'Open PR Newswire' : 'Mở trang PR Newswire'} <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
};
