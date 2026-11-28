import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Activity,
  ArrowRightLeft,
  Calculator,
  Coins,
  Globe2,
  Landmark,
  Layers,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { useSEO } from '../../core/seo/useSEO.ts';
import { useTranslation } from '../../core/i18n/index.ts';
import { callUserAI } from '../ai/userAIService.ts';
import type { MarketType } from '../../core/types/index.ts';
import {
  FALLBACK_MARKET_BUNDLE,
  MARKET_MENU_ITEMS,
  fetchMarketBundle,
  getCachedMarketBundle,
  subscribeBinanceRealtime,
  type MarketBundle,
} from './marketFeedService.ts';

function formatUsd(val: number, decimals = 2): string {
  if (!Number.isFinite(val)) return '$0.00';
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function formatCompactUsd(val: number): string {
  if (!Number.isFinite(val) || val <= 0) return '$0';
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  return `$${val.toLocaleString('en-US')}`;
}

function formatVnd(val: number, isEn: boolean): string {
  return `${Math.round(val).toLocaleString(isEn ? 'en-US' : 'vi-VN')} ${isEn ? 'VND' : '₫'}`;
}

export const MarketHubPage: React.FC<{ marketType?: MarketType }> = ({ marketType }) => {
  const { isEn } = useTranslation();
  const location = useLocation();

  const activeType: MarketType = useMemo(() => {
    if (marketType) return marketType;
    if (location.pathname.includes('vi-mo-hang-hoa')) return 'macro';
    if (location.pathname.includes('defi-onchain') || location.pathname.includes('defi-cardano')) return 'defi';
    if (location.pathname.includes('gia-vang')) return 'gold';
    if (location.pathname.includes('gia-crypto')) return 'crypto';
    if (location.pathname.includes('ty-gia')) return 'forex';
    if (location.pathname.includes('lai-suat')) return 'interest_rate';
    if (location.pathname.includes('chung-khoan')) return 'stock';
    return 'overview';
  }, [marketType, location.pathname]);

  const activeSpec = MARKET_MENU_ITEMS.find((m) => m.type === activeType) || MARKET_MENU_ITEMS[0];
  const specTitle = isEn ? activeSpec.titleEn : activeSpec.titleVi;
  const specDesc = isEn ? activeSpec.descEn : activeSpec.descVi;

  const [bundle, setBundle] = useState<MarketBundle>(() => getCachedMarketBundle());
  const [refreshing, setRefreshing] = useState(false);
  const [wsLive, setWsLive] = useState(false);
  const [selectedCryptoSymbol, setSelectedCryptoSymbol] = useState('BTCUSDT');
  const [sjcChartDays, setSjcChartDays] = useState<7 | 30 | 180 | 365>(7);
  const [defiChainFilter, setDefiChainFilter] = useState<string>('All');

  // FX Converter state
  const [fxAmount, setFxAmount] = useState(100);
  const [fxFrom, setFxFrom] = useState('USD');
  const [fxTo, setFxTo] = useState('VND');

  // Compound Interest Calculator state
  const [principal, setPrincipal] = useState(100000000);
  const [annualRate, setAnnualRate] = useState(5.2);
  const [years, setYears] = useState(5);
  const futureValue = Math.round(principal * Math.pow(1 + annualRate / 100, years));

  // AI BYOK analysis
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  useSEO({
    title: isEn ? `${specTitle} | VNEconomics Market Data` : `${specTitle} | Dữ liệu Thị trường VNEconomics`,
    description: specDesc,
    canonicalPath: location.pathname,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: specTitle,
      description: specDesc,
      creator: { '@type': 'Organization', name: 'VNEconomics' },
      url: `https://vneconomics.com${activeSpec.path}`,
    },
  });

  const loadMarketData = async (force = false) => {
    setRefreshing(true);
    try {
      const next = await fetchMarketBundle(force);
      setBundle(next);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadMarketData(false);
  }, []);

  // Load official giavangvietnam.com widget script when viewing /gia-vang/
  useEffect(() => {
    if (activeType !== 'gold') return;
    const container = document.getElementById('gia-vang-viet-nam');
    if (!container) return;
    container.innerHTML = '';
    const script = document.createElement('script');
    script.src = `https://cls.giavangvietnam.com/js/widget.js?t=${Date.now()}`;
    script.async = true;
    document.body.appendChild(script);
    return () => {
      try {
        script.remove();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [activeType]);

  // Subscribe to Binance real-time WebSocket ticks
  useEffect(() => {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'PAXGUSDT'];
    const unsub = subscribeBinanceRealtime(symbols, (symbol, price, changePercent24h) => {
      setWsLive(true);
      setBundle((prev) => {
        const existing = prev.crypto.tickers[symbol] || FALLBACK_MARKET_BUNDLE.crypto.tickers[symbol];
        const nextTickers = {
          ...prev.crypto.tickers,
          [symbol]: {
            ...existing,
            symbol,
            price,
            changePercent24h,
          },
        };
        let nextGold = prev.gold;
        if (symbol === 'PAXGUSDT') {
          const usdVnd = prev.forex.usdVnd || 25450;
          const globalVndPerTael = Math.round(price * 1.20565303 * usdVnd);
          const sjcSell = prev.gold.vnGoldItems.length > 0 ? prev.gold.sjcReferenceSellVnd : Math.round(globalVndPerTael * 1.042);
          nextGold = {
            ...prev.gold,
            xauUsd: price,
            xauChange24h: changePercent24h,
            globalVndPerTael,
            sjcReferenceSellVnd: sjcSell,
            spreadVnd: sjcSell - globalVndPerTael,
          };
        }
        return {
          ...prev,
          crypto: { ...prev.crypto, tickers: nextTickers },
          gold: nextGold,
        };
      });
    });
    return () => unsub();
  }, []);

  const handleAnalyzeMarket = async () => {
    setAiLoading(true);
    setAiError('');
    setAiAnalysis('');
    try {
      const btc = bundle.crypto.tickers.BTCUSDT?.price ?? 0;
      const ada = bundle.crypto.tickers.ADAUSDT?.price ?? 0;
      const xau = bundle.gold.xauUsd ?? 0;
      const usdVnd = bundle.forex.usdVnd ?? 25450;
      const contextStr = `BTC=${formatUsd(btc)}, ADA=${formatUsd(ada, 4)}, XAU=${formatUsd(xau)}, USD/VND=${usdVnd}`;
      const reply = await callUserAI({
        prompt: isEn
          ? `Provide a concise analytical framework in English for "${activeSpec.titleEn}" (${activeSpec.descEn}). Live snapshot: ${contextStr}. Include 3 key macroeconomic indicators investors should watch and 2 practical risk management scenarios.`
          : `Hãy đưa ra khung phân tích nhanh cho chuyên mục "${activeSpec.titleVi}" (${activeSpec.descVi}). Số liệu hiện tại: ${contextStr}. Trình bày 3 chỉ báo vĩ mô nhà đầu tư Việt Nam cần theo dõi hiện nay và 2 kịch bản quản trị rủi ro ngắn gọn.`,
      });
      setAiAnalysis(reply);
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : isEn
            ? 'Personal AI Key (BYOK) is not configured yet.'
            : 'Chưa cấu hình AI Key cá nhân (BYOK).',
      );
    } finally {
      setAiLoading(false);
    }
  };

  // Live FX Converter calculation
  const fxConverted = useMemo(() => {
    const rates = bundle.forex.crossUsd || { USD: 1, VND: bundle.forex.usdVnd };
    const fromRate = fxFrom === 'USD' ? 1 : rates[fxFrom] || (fxFrom === 'VND' ? bundle.forex.usdVnd : 1);
    const toRate = fxTo === 'USD' ? 1 : rates[fxTo] || (fxTo === 'VND' ? bundle.forex.usdVnd : 1);
    if (!fromRate || !toRate) return 0;
    return (fxAmount / fromRate) * toRate;
  }, [bundle.forex, fxAmount, fxFrom, fxTo]);

  const cryptoList = useMemo(() => {
    const order = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'];
    return order
      .map((sym) => bundle.crypto.tickers[sym])
      .filter((t): t is NonNullable<typeof t> => Boolean(t));
  }, [bundle.crypto.tickers]);

  const fngLatest = bundle.crypto.fearAndGreed?.[0];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Live Market Ticker Strip */}
      <div className="rounded-xl border border-paper-300 dark:border-ink-800 bg-ink-950 text-paper-50 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-semibold">
          <span className={`w-2 h-2 rounded-full ${wsLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span>{wsLive ? (isEn ? 'LIVE WEBSOCKET' : 'TRỰC TIẾP REALTIME') : isEn ? 'CACHED SNAPSHOT' : 'DỮ LIỆU ĐỒNG BỘ'}</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 tabular-nums">
          <span>
            BTC: <strong>{formatUsd(bundle.crypto.tickers.BTCUSDT?.price || 0, 0)}</strong>
          </span>
          <span>
            ADA: <strong>{formatUsd(bundle.crypto.tickers.ADAUSDT?.price || 0, 4)}</strong>
          </span>
          <span>
            XAU: <strong>{formatUsd(bundle.gold.xauUsd || 0, 2)}</strong>
          </span>
          <span>
            USD/VND: <strong>{Math.round(bundle.forex.usdVnd || 25450).toLocaleString('en-US')}</strong>
          </span>
          {fngLatest && (
            <span>
              {isEn ? 'Fear & Greed:' : 'Tâm lý:'}{' '}
              <strong className="text-amber-300">{fngLatest.value}/100 ({fngLatest.classification})</strong>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void loadMarketData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          {isEn ? 'Refresh' : 'Làm mới'}
        </button>
      </div>

      {/* Header + 8 Market Tabs */}
      <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-6 sm:p-8 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-editorial-teal">
              Dataset Schema • {activeSpec.sourceLabel}
            </span>
            <h1 className="font-serif text-3xl font-bold text-ink-950 dark:text-paper-50">
              {specTitle}
            </h1>
            <p className="text-sm text-ink-600 dark:text-ink-400">{specDesc}</p>
          </div>
          <button
            type="button"
            onClick={handleAnalyzeMarket}
            disabled={aiLoading}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            {aiLoading
              ? isEn
                ? 'Analyzing...'
                : 'Đang phân tích...'
              : isEn
                ? 'Analyze with AI (BYOK)'
                : 'Phân tích bằng AI (BYOK)'}
          </button>
        </div>
      </div>

      {aiError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
          <span>{aiError}</span>
          <Link to="/ai-lab/" className="font-bold underline">{isEn ? 'Configure AI Key →' : 'Cài đặt AI Key →'}</Link>
        </div>
      )}

      {aiAnalysis && (
        <div className="p-6 rounded-2xl border border-editorial-teal/40 bg-paper-50 dark:bg-ink-900 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-editorial-teal">
            {isEn ? `AI BYOK Analysis for ${specTitle}` : `Nhận định AI BYOK cho ${specTitle}`}
          </div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">{aiAnalysis}</div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-8 space-y-6">
          {/* 1. OVERVIEW DASHBOARD */}
          {activeType === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <Link to="/gia-crypto/" className="p-5 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 hover:border-amber-500 transition-colors space-y-1.5">
                  <div className="text-xs font-semibold text-ink-500 flex items-center justify-between">
                    <span>Bitcoin (BTC)</span>
                    <Coins className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-xl font-bold tabular-nums">{formatUsd(bundle.crypto.tickers.BTCUSDT?.price || 0, 0)}</div>
                  <div className={`text-xs font-semibold tabular-nums ${(bundle.crypto.tickers.BTCUSDT?.changePercent24h || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {(bundle.crypto.tickers.BTCUSDT?.changePercent24h || 0) >= 0 ? '+' : ''}
                    {(bundle.crypto.tickers.BTCUSDT?.changePercent24h || 0).toFixed(2)}% (24h)
                  </div>
                </Link>

                <Link to="/gia-vang/" className="p-5 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 hover:border-amber-600 transition-colors space-y-1.5">
                  <div className="text-xs font-semibold text-ink-500 flex items-center justify-between">
                    <span>{isEn ? 'Spot Gold (XAU)' : 'Vàng Thế giới (XAU)'}</span>
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-xl font-bold tabular-nums">{formatUsd(bundle.gold.xauUsd, 2)}</div>
                  <div className="text-xs text-ink-500 tabular-nums">
                    {isEn ? 'VN Equiv:' : 'Quy đổi:'} {formatVnd(bundle.gold.globalVndPerTael, isEn)}
                  </div>
                </Link>

                <Link to="/ty-gia-ngoai-te/" className="p-5 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 hover:border-editorial-teal transition-colors space-y-1.5">
                  <div className="text-xs font-semibold text-ink-500 flex items-center justify-between">
                    <span>USD / VND</span>
                    <DollarSign className="w-4 h-4 text-editorial-teal" />
                  </div>
                  <div className="text-xl font-bold tabular-nums">{Math.round(bundle.forex.usdVnd).toLocaleString('en-US')}</div>
                  <div className="text-xs text-ink-500">Vietcombank / Open FX</div>
                </Link>

                <Link to="/thi-truong/defi-onchain/" className="p-5 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 hover:border-sky-500 transition-colors space-y-1.5">
                  <div className="text-xs font-semibold text-ink-500 flex items-center justify-between">
                    <span>{isEn ? 'Global DeFi TVL' : 'Tổng DeFi TVL'}</span>
                    <Layers className="w-4 h-4 text-sky-500" />
                  </div>
                  <div className="text-xl font-bold tabular-nums">{formatCompactUsd(bundle.defi.totalDefiTvlUsd || 0)}</div>
                  <div className="text-xs text-ink-500">DeFiLlama Live TVL</div>
                </Link>
              </div>

              <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#146EBE]" />
                    {isEn ? 'Live Crypto & Digital Assets Matrix (Binance WebSocket)' : 'Bảng giá Tài sản số Realtime (Binance WebSocket)'}
                  </h2>
                  <Link to="/gia-crypto/" className="text-xs font-semibold text-[#146EBE] hover:underline">
                    {isEn ? 'Full Crypto View →' : 'Xem chi tiết →'}
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-paper-200 dark:border-ink-800 text-ink-500">
                        <th className="py-2 pr-3">{isEn ? 'Asset' : 'Tài sản'}</th>
                        <th className="py-2 px-3 text-right">{isEn ? 'Price (USD)' : 'Giá (USD)'}</th>
                        <th className="py-2 px-3 text-right">{isEn ? 'Est. VND' : 'Quy đổi VNĐ'}</th>
                        <th className="py-2 pl-3 text-right">24h %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-paper-200 dark:divide-ink-800 tabular-nums">
                      {cryptoList.map((t) => {
                        const pos = t.changePercent24h >= 0;
                        return (
                          <tr key={t.symbol} className="hover:bg-paper-100/70 dark:hover:bg-ink-800/40">
                            <td className="py-2.5 pr-3 font-bold">{t.symbol.replace('USDT', '')} / USDT</td>
                            <td className="py-2.5 px-3 text-right font-semibold">{formatUsd(t.price, t.price < 5 ? 4 : 2)}</td>
                            <td className="py-2.5 px-3 text-right text-ink-600 dark:text-ink-300">{formatVnd(t.price * bundle.forex.usdVnd, isEn)}</td>
                            <td className={`py-2.5 pl-3 text-right font-bold ${pos ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {pos ? '+' : ''}{t.changePercent24h.toFixed(2)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <TrendingUp className="w-4 h-4 text-editorial-teal" />
                  {isEn ? 'Global Market Overview Chart (VN-Index / S&P 500)' : 'Biểu đồ Thị trường Chứng khoán (VN-Index)'}
                </div>
                <iframe
                  title="TradingView Overview Chart"
                  src={`https://s.tradingview.com/widgetembed/?symbol=HOSE%3AVNINDEX&interval=D&theme=light&style=1&locale=${isEn ? 'en' : 'vi_VN'}`}
                  className="w-full h-[420px] rounded-xl border border-paper-200 dark:border-ink-800"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* 2. GOLD PRICES & SPREAD */}
          {activeType === 'gold' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl border border-amber-300/60 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 space-y-1">
                  <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    {isEn ? 'Global Spot Gold (XAU/USD)' : 'Vàng Thế giới (XAU/USD)'}
                  </div>
                  <div className="text-2xl font-bold tabular-nums">{formatUsd(bundle.gold.xauUsd, 2)} / oz</div>
                  <div className="text-xs text-ink-600 dark:text-ink-300 tabular-nums">
                    ≈ {formatVnd(bundle.gold.globalVndPerTael, isEn)} / {isEn ? 'tael' : 'lượng'}
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-1">
                  <div className="text-xs font-semibold text-ink-500">
                    {isEn ? 'VN Reference Gold (SJC/9999)' : 'Tham chiếu Vàng VN (SJC/9999)'}
                  </div>
                  <div className="text-2xl font-bold tabular-nums">{formatVnd(bundle.gold.sjcReferenceSellVnd, isEn)}</div>
                  <div className="text-xs text-ink-500">USD/VND = {Math.round(bundle.gold.usdVnd).toLocaleString('en-US')}</div>
                </div>

                <div className="p-5 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-1">
                  <div className="text-xs font-semibold text-ink-500">
                    {isEn ? 'Domestic vs Global Spread' : 'Chênh lệch Nội địa – Thế giới'}
                  </div>
                  <div className={`text-2xl font-bold tabular-nums ${bundle.gold.spreadVnd >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {bundle.gold.spreadVnd >= 0 ? '+' : ''}{formatVnd(bundle.gold.spreadVnd, isEn)}
                  </div>
                  <div className="text-xs text-ink-500">{isEn ? 'Auto-calculated per tael (37.5g)' : 'Tự động tính trên 1 lượng (37.5g)'}</div>
                </div>
              </div>

              {bundle.gold.vnGoldItems.length > 0 && (
                <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-3">
                  <h2 className="font-bold text-sm">{isEn ? 'Domestic Gold Price Board' : 'Bảng giá Vàng Trong nước (BTMC / SJC)'}</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-paper-200 dark:border-ink-800 text-ink-500">
                          <th className="py-2">{isEn ? 'Product' : 'Loại vàng'}</th>
                          <th className="py-2">{isEn ? 'Purity' : 'Hàm lượng'}</th>
                          <th className="py-2 text-right">{isEn ? 'Buy' : 'Mua vào'}</th>
                          <th className="py-2 text-right">{isEn ? 'Sell' : 'Bán ra'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-paper-200 dark:divide-ink-800 tabular-nums">
                        {bundle.gold.vnGoldItems.map((g) => (
                          <tr key={g.name}>
                            <td className="py-2 font-semibold">{g.name}</td>
                            <td className="py-2 text-ink-500">{g.karat}</td>
                            <td className="py-2 text-right">{formatVnd(g.buyVnd, isEn)}</td>
                            <td className="py-2 text-right font-bold">{formatVnd(g.sellVnd, isEn)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                    {isEn
                      ? `SJC Gold Price Chart (${sjcChartDays} Days — giavangvietnam.com)`
                      : `Biểu đồ Giá Vàng SJC ${sjcChartDays === 7 ? 'Tuần qua' : `${sjcChartDays} ngày`} (giavangvietnam.com)`}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    {([7, 30, 180, 365] as const).map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setSjcChartDays(days)}
                        className={`px-2.5 py-1 rounded-lg font-semibold border transition-colors ${
                          sjcChartDays === days
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'border-paper-300 dark:border-ink-700 text-ink-600 dark:text-ink-300 hover:border-amber-500'
                        }`}
                      >
                        {days === 7
                          ? isEn ? '7D' : '7 ngày'
                          : days === 30
                            ? isEn ? '30D' : '30 ngày'
                            : days === 180
                              ? isEn ? '6M' : '6 tháng'
                              : isEn ? '1Y' : '1 năm'}
                      </button>
                    ))}
                  </div>
                </div>
                <iframe
                  title={isEn ? 'SJC Gold Price Chart (giavangvietnam.com)' : 'Biểu đồ giá vàng SJC tuần qua (giavangvietnam.com)'}
                  src={`https://data.giavangvietnam.com/api/sjc/view/${sjcChartDays}`}
                  className="w-full h-[420px] rounded-xl border border-paper-200 dark:border-ink-800 bg-white"
                  loading="lazy"
                />
              </div>

              <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Coins className="w-4 h-4 text-amber-500" />
                    {isEn
                      ? 'Vietnam Gold Live Board: SJC, PNJ, DOJI, Phu Quy, BTMC, Mi Hong'
                      : 'Bảng Giá Vàng Trực tuyến: SJC, PNJ, DOJI, Phú Quý, BTMC, Mi Hồng'}
                  </div>
                  <a
                    href="https://giavangvietnam.com/bieu-do-gia-vang-sjc-tuan-qua/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-[#146EBE] hover:underline"
                  >
                    giavangvietnam.com ↗
                  </a>
                </div>
                <div className="rounded-xl bg-white p-3 border border-paper-200 dark:border-ink-800 overflow-x-auto">
                  <div
                    id="gia-vang-viet-nam"
                    data-show-chart="true"
                    show-chart="true"
                    show-prices="sjc,pnj,doji,phuquy,btmc,mihong"
                    show-xauusd="true"
                    show-exchange="true"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. CRYPTO & DIGITAL ASSETS */}
          {activeType === 'crypto' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-1">
                  <div className="text-xs font-semibold text-ink-500">{isEn ? 'Global Market Cap' : 'Tổng vốn hóa Thị trường'}</div>
                  <div className="text-2xl font-bold tabular-nums">
                    {formatCompactUsd(bundle.crypto.global?.totalMarketCapUsd || 3240000000000)}
                  </div>
                  <div className="text-xs text-ink-500">
                    BTC.D: <strong>{(bundle.crypto.global?.btcDominance || 57.4).toFixed(1)}%</strong> • ETH.D:{' '}
                    <strong>{(bundle.crypto.global?.ethDominance || 12.6).toFixed(1)}%</strong>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-1">
                  <div className="text-xs font-semibold text-ink-500">{isEn ? '24h Global Volume' : 'Khối lượng GD 24h'}</div>
                  <div className="text-2xl font-bold tabular-nums">
                    {formatCompactUsd(bundle.crypto.global?.totalVolume24hUsd || 145000000000)}
                  </div>
                  <div className="text-xs text-ink-500">CoinGecko Global Feed</div>
                </div>

                <div className="p-5 rounded-2xl border border-amber-300/60 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 space-y-1">
                  <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    {isEn ? 'Crypto Fear & Greed Index' : 'Chỉ số Tham lam & Sợ hãi'}
                  </div>
                  <div className="text-2xl font-bold tabular-nums">
                    {fngLatest?.value ?? 72} / 100
                  </div>
                  <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    {fngLatest?.classification ?? 'Greed'} (Alternative.me)
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="font-bold text-sm flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-500" />
                    {isEn ? 'Real-time Spot Prices (Click row to switch chart)' : 'Bảng giá Spot Realtime (Bấm vào mã để đổi biểu đồ)'}
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-paper-200 dark:border-ink-800 text-ink-500">
                        <th className="py-2">{isEn ? 'Pair' : 'Cặp tiền'}</th>
                        <th className="py-2 text-right">{isEn ? 'Last Price' : 'Giá khớp'}</th>
                        <th className="py-2 text-right">{isEn ? 'VND Equiv.' : 'Quy đổi VNĐ'}</th>
                        <th className="py-2 text-right">24h %</th>
                        <th className="py-2 text-right">24h Vol</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-paper-200 dark:divide-ink-800 tabular-nums">
                      {cryptoList.map((t) => {
                        const pos = t.changePercent24h >= 0;
                        const active = selectedCryptoSymbol === t.symbol;
                        return (
                          <tr
                            key={t.symbol}
                            onClick={() => setSelectedCryptoSymbol(t.symbol)}
                            className={`cursor-pointer transition-colors ${active ? 'bg-[#146EBE]/10' : 'hover:bg-paper-100 dark:hover:bg-ink-800/50'}`}
                          >
                            <td className="py-2.5 font-bold">{t.symbol.replace('USDT', '')}/USDT</td>
                            <td className="py-2.5 text-right font-semibold">{formatUsd(t.price, t.price < 5 ? 4 : 2)}</td>
                            <td className="py-2.5 text-right text-ink-600 dark:text-ink-300">{formatVnd(t.price * bundle.forex.usdVnd, isEn)}</td>
                            <td className={`py-2.5 text-right font-bold ${pos ? 'text-emerald-600' : 'text-rose-600'}`}>
                              <span className="inline-flex items-center gap-0.5">
                                {pos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {pos ? '+' : ''}{t.changePercent24h.toFixed(2)}%
                              </span>
                            </td>
                            <td className="py-2.5 text-right text-ink-500">{formatCompactUsd(t.quoteVolume)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-3">
                <div className="font-bold text-sm">
                  TradingView: BINANCE:{selectedCryptoSymbol}
                </div>
                <iframe
                  title="TradingView Crypto Chart"
                  src={`https://s.tradingview.com/widgetembed/?symbol=BINANCE%3A${selectedCryptoSymbol}&interval=D&theme=light&style=1&locale=${isEn ? 'en' : 'vi_VN'}`}
                  className="w-full h-[460px] rounded-xl border border-paper-200 dark:border-ink-800"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* 4. FOREX & CONVERTER */}
          {activeType === 'forex' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-4">
                <h2 className="font-bold text-sm flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-editorial-teal" />
                  {isEn ? 'Instant Multi-Currency Converter (Live Rates)' : 'Máy tính Quy đổi Ngoại tệ Tức thì (Tỷ giá thực tế)'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end text-xs">
                  <div>
                    <label className="font-semibold block mb-1">{isEn ? 'Amount' : 'Số tiền'}</label>
                    <input
                      type="number"
                      min={0}
                      value={fxAmount}
                      onChange={(e) => setFxAmount(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-3 py-2.5 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 tabular-nums font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">{isEn ? 'From Currency' : 'Từ đồng tiền'}</label>
                    <select
                      value={fxFrom}
                      onChange={(e) => setFxFrom(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 font-semibold"
                    >
                      {['USD', 'VND', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD', 'CNY', 'KRW'].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">{isEn ? 'To Currency' : 'Sang đồng tiền'}</label>
                    <select
                      value={fxTo}
                      onChange={(e) => setFxTo(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 font-semibold"
                    >
                      {['VND', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD', 'CNY', 'KRW'].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-editorial-teal/10 border border-editorial-teal/30 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs text-ink-600 dark:text-ink-300">
                    {fxAmount.toLocaleString('en-US')} {fxFrom} =
                  </span>
                  <span className="text-2xl font-bold text-editorial-teal dark:text-emerald-300 tabular-nums">
                    {fxConverted.toLocaleString(isEn ? 'en-US' : 'vi-VN', { maximumFractionDigits: fxTo === 'VND' ? 0 : 4 })} {fxTo}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="font-bold text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-editorial-teal" />
                    {isEn ? 'Vietcombank Official Exchange Rates' : 'Bảng Tỷ giá Niêm yết Chính thức Vietcombank'}
                  </h2>
                  <span className="text-[11px] text-ink-500">{bundle.forex.vcbDate}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-paper-200 dark:border-ink-800 text-ink-500">
                        <th className="py-2">{isEn ? 'Code' : 'Mã NT'}</th>
                        <th className="py-2">{isEn ? 'Currency' : 'Tên ngoại tệ'}</th>
                        <th className="py-2 text-right">{isEn ? 'Buy Cash' : 'Mua tiền mặt'}</th>
                        <th className="py-2 text-right">{isEn ? 'Buy Transfer' : 'Mua CK'}</th>
                        <th className="py-2 text-right">{isEn ? 'Sell' : 'Bán ra'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-paper-200 dark:divide-ink-800 tabular-nums">
                      {bundle.forex.vcbRates.slice(0, 14).map((r) => (
                        <tr key={r.code}>
                          <td className="py-2 font-bold text-[#146EBE]">{r.code}</td>
                          <td className="py-2 text-ink-600 dark:text-ink-300">{r.name}</td>
                          <td className="py-2 text-right">{r.buyCash > 0 ? r.buyCash.toLocaleString('en-US') : '—'}</td>
                          <td className="py-2 text-right">{r.buyTransfer > 0 ? r.buyTransfer.toLocaleString('en-US') : '—'}</td>
                          <td className="py-2 text-right font-semibold">{r.sell > 0 ? r.sell.toLocaleString('en-US') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 5. INTEREST RATES */}
          {activeType === 'interest_rate' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="font-bold text-sm flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-emerald-600" />
                    {isEn
                      ? 'Vietnam Commercial Bank Deposit & Loan Rates (%/year)'
                      : 'So sánh Lãi suất Tiết kiệm & Cho vay Ngân hàng VN (%/năm)'}
                  </h2>
                  <span className="text-[11px] text-ink-500">
                    {isEn ? 'Click any 12M rate to load into calculator' : 'Bấm vào lãi suất 12T để nạp vào máy tính'}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-paper-200 dark:border-ink-800 text-ink-500">
                        <th className="py-2">{isEn ? 'Bank' : 'Ngân hàng'}</th>
                        <th className="py-2">{isEn ? 'Group' : 'Nhóm'}</th>
                        <th className="py-2 text-right">1M</th>
                        <th className="py-2 text-right">3M</th>
                        <th className="py-2 text-right">6M</th>
                        <th className="py-2 text-right">12M</th>
                        <th className="py-2 text-right">24M</th>
                        <th className="py-2 text-right">{isEn ? 'Avg Loan' : 'Vay TB'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-paper-200 dark:divide-ink-800 tabular-nums">
                      {bundle.rates.banks.map((b) => (
                        <tr
                          key={b.bank}
                          onClick={() => setAnnualRate(b.m12)}
                          className="cursor-pointer hover:bg-paper-100 dark:hover:bg-ink-800/50"
                        >
                          <td className="py-2.5 font-bold">{b.bank}</td>
                          <td className="py-2.5 text-ink-500">{b.group}</td>
                          <td className="py-2.5 text-right">{b.m1.toFixed(2)}%</td>
                          <td className="py-2.5 text-right">{b.m3.toFixed(2)}%</td>
                          <td className="py-2.5 text-right">{b.m6.toFixed(2)}%</td>
                          <td className="py-2.5 text-right font-bold text-emerald-600">{b.m12.toFixed(2)}%</td>
                          <td className="py-2.5 text-right">{b.m24.toFixed(2)}%</td>
                          <td className="py-2.5 text-right text-amber-600 font-semibold">{b.loanAvg.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Landmark className="w-4 h-4 text-editorial-teal" />
                  {isEn ? 'Extended 30+ Bank Rates (Google Looker Studio)' : 'Báo cáo Mở rộng 30+ Ngân hàng (Google Looker Studio)'}
                </div>
                <iframe
                  title={isEn ? 'VNEconomics Bank Interest Rates Table' : 'Bảng lãi suất ngân hàng VNEconomics'}
                  src="https://lookerstudio.google.com/embed/reporting/b1571a03-2fd0-466b-bcd7-7a6e642b6937/page/wWgSF"
                  className="w-full h-[420px] rounded-xl border border-paper-200 dark:border-ink-800"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* 6. STOCK MARKET */}
          {activeType === 'stock' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <TrendingUp className="w-4 h-4 text-editorial-teal" />
                  {isEn ? 'Vietnam Stock Market Benchmark (HOSE:VNINDEX)' : 'Biểu đồ Chỉ số Chứng khoán Việt Nam (HOSE:VNINDEX)'}
                </div>
                <iframe
                  title="TradingView VNINDEX Chart"
                  src={`https://s.tradingview.com/widgetembed/?symbol=HOSE%3AVNINDEX&interval=D&theme=light&style=1&locale=${isEn ? 'en' : 'vi_VN'}`}
                  className="w-full h-[460px] rounded-xl border border-paper-200 dark:border-ink-800"
                  loading="lazy"
                />
              </div>
              <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Globe2 className="w-4 h-4 text-[#146EBE]" />
                  {isEn ? 'US Equities Benchmark (S&P 500)' : 'Chỉ số Chứng khoán Mỹ (S&P 500)'}
                </div>
                <iframe
                  title="TradingView SPX Chart"
                  src={`https://s.tradingview.com/widgetembed/?symbol=FOREXCOM%3ASPXUSD&interval=D&theme=light&style=1&locale=${isEn ? 'en' : 'vi_VN'}`}
                  className="w-full h-[380px] rounded-xl border border-paper-200 dark:border-ink-800"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* 7. COMMODITIES & VIETNAM MACRO (WORLD BANK) */}
          {activeType === 'macro' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {[
                  { key: 'gdpGrowth', labelVi: 'Tăng trưởng GDP Việt Nam', labelEn: 'Vietnam GDP Growth' },
                  { key: 'cpiInflation', labelVi: 'Lạm phát CPI', labelEn: 'CPI Inflation' },
                  { key: 'gdpPerCapita', labelVi: 'GDP Bình quân đầu người', labelEn: 'GDP Per Capita' },
                  { key: 'fdiInflowPctGdp', labelVi: 'Dòng vốn FDI ròng (% GDP)', labelEn: 'Net FDI Inflow (% GDP)' },
                  { key: 'exportsPctGdp', labelVi: 'Xuất khẩu (% GDP)', labelEn: 'Exports (% of GDP)' },
                ].map((item) => {
                  const ind = bundle.macro.indicators[item.key];
                  return (
                    <div key={item.key} className="p-5 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-1.5">
                      <div className="text-xs font-semibold text-ink-500">{isEn ? item.labelEn : item.labelVi}</div>
                      <div className="text-2xl font-bold tabular-nums text-[#146EBE] dark:text-sky-400">
                        {ind?.latest ? `${ind.latest.value.toLocaleString('en-US')} ${ind.unit}` : '—'}
                      </div>
                      <div className="text-[11px] text-ink-500">
                        {ind?.latest ? `${isEn ? 'Year' : 'Năm'} ${ind.latest.year} • World Bank` : 'World Bank API'}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Globe2 className="w-4 h-4 text-purple-600" />
                  {isEn ? 'Global Crude Oil Benchmark (Brent / UKOIL)' : 'Biểu đồ Giá Dầu thô Brent Quốc tế (UKOIL)'}
                </div>
                <iframe
                  title="TradingView Brent Crude Chart"
                  src={`https://s.tradingview.com/widgetembed/?symbol=TVC%3AUKOIL&interval=D&theme=light&style=1&locale=${isEn ? 'en' : 'vi_VN'}`}
                  className="w-full h-[420px] rounded-xl border border-paper-200 dark:border-ink-800"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* 8. GLOBAL ON-CHAIN DEFI (CROSS-CHAIN TVL & PROTOCOLS) */}
          {activeType === 'defi' && (() => {
            const protocols =
              Array.isArray(bundle.defi.topProtocols) && bundle.defi.topProtocols.length > 0
                ? bundle.defi.topProtocols
                : FALLBACK_MARKET_BUNDLE.defi.topProtocols;
            const filteredProtocols =
              defiChainFilter === 'All'
                ? protocols
                : protocols.filter(
                    (p) => p.chain === defiChainFilter || (p.chains || []).includes(defiChainFilter),
                  );
            return (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl border border-sky-300/60 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-950/20 space-y-1">
                    <div className="text-xs font-semibold text-sky-700 dark:text-sky-400">
                      {isEn ? 'Global DeFi Total Value Locked (All Chains)' : 'Tổng giá trị khóa DeFi Toàn cầu (Đa chuỗi)'}
                    </div>
                    <div className="text-2xl font-bold tabular-nums">{formatCompactUsd(bundle.defi.totalDefiTvlUsd || 0)}</div>
                    <div className="text-xs text-ink-500">DeFiLlama Real-time Multi-Chain Feed</div>
                  </div>
                  <div className="p-5 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-1">
                    <div className="text-xs font-semibold text-ink-500">
                      {isEn ? 'Leading DeFi Chain' : 'Hệ sinh thái DeFi dẫn đầu'}
                    </div>
                    <div className="text-2xl font-bold tabular-nums">
                      {bundle.defi.topChains[0]?.name || 'Ethereum'} • {formatCompactUsd(bundle.defi.topChains[0]?.tvl || 0)}
                    </div>
                    <div className="text-xs text-ink-500">Liquid Staking • Lending • DEX • Restaking</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-3">
                  <h2 className="font-bold text-sm">{isEn ? 'Top Blockchains by DeFi TVL' : 'Xếp hạng Blockchain theo Tổng TVL'}</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    {bundle.defi.topChains.slice(0, 8).map((c) => (
                      <div key={c.name} className="p-3 rounded-xl border border-paper-200 dark:border-ink-800 bg-paper-100/60 dark:bg-ink-950">
                        <div className="font-bold">{c.name}</div>
                        <div className="text-editorial-teal font-semibold tabular-nums">{formatCompactUsd(c.tvl)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-bold text-sm flex items-center gap-2">
                      <Layers className="w-4 h-4 text-sky-600" />
                      {isEn ? 'Top Global DeFi Protocols (Live TVL)' : 'Top Giao thức DeFi Toàn cầu (TVL)'}
                    </h2>
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      {['All', 'Ethereum', 'Solana', 'Base', 'Arbitrum', 'Cardano'].map((chain) => (
                        <button
                          key={chain}
                          type="button"
                          onClick={() => setDefiChainFilter(chain)}
                          className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${
                            defiChainFilter === chain
                              ? 'bg-[#146EBE] text-white border-[#146EBE]'
                              : 'border-paper-300 dark:border-ink-700 text-ink-600 dark:text-ink-300 hover:border-[#146EBE]'
                          }`}
                        >
                          {chain === 'All' ? (isEn ? 'All Chains' : 'Tất cả') : chain}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-paper-200 dark:border-ink-800 text-ink-500">
                          <th className="py-2">{isEn ? 'Protocol' : 'Giao thức'}</th>
                          <th className="py-2">{isEn ? 'Chain' : 'Mạng chính'}</th>
                          <th className="py-2">{isEn ? 'Category' : 'Phân loại'}</th>
                          <th className="py-2 text-right">TVL (USD)</th>
                          <th className="py-2 text-right">1D %</th>
                          <th className="py-2 text-right">7D %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-paper-200 dark:divide-ink-800 tabular-nums">
                        {filteredProtocols.map((p) => (
                          <tr key={p.name}>
                            <td className="py-2.5 font-bold">{p.name}</td>
                            <td className="py-2.5 text-[#146EBE] font-semibold">{p.chain}</td>
                            <td className="py-2.5 text-ink-500">{p.category}</td>
                            <td className="py-2.5 text-right font-semibold">{formatCompactUsd(p.tvl)}</td>
                            <td className={`py-2.5 text-right font-semibold ${p.change1d >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {p.change1d >= 0 ? '+' : ''}{p.change1d.toFixed(2)}%
                            </td>
                            <td className={`py-2.5 text-right font-semibold ${p.change7d >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {p.change7d >= 0 ? '+' : ''}{p.change7d.toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </section>

        {/* Compound Interest & Paper Trading CTA */}
        <aside className="lg:col-span-4 space-y-5">
          <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-6 space-y-4">
            <h2 className="font-serif text-lg font-bold flex items-center gap-2">
              <Calculator className="w-4 h-4 text-editorial-teal" />
              {isEn ? 'Compound Interest Calculator' : 'Máy tính Lãi kép Đầu tư'}
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">
                  {isEn ? 'Initial Principal (VND / Unit)' : 'Số vốn ban đầu (VND)'}
                </label>
                <input
                  type="number"
                  step={5000000}
                  value={principal}
                  onChange={(e) => setPrincipal(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 tabular-nums"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">{isEn ? 'Annual Rate (%/yr)' : 'Lãi suất (%/năm)'}</label>
                  <input
                    type="number"
                    step={0.1}
                    value={annualRate}
                    onChange={(e) => setAnnualRate(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 tabular-nums"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">{isEn ? 'Years' : 'Số năm'}</label>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={years}
                    onChange={(e) => setYears(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 tabular-nums"
                  />
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-editorial-teal/10 dark:bg-emerald-950/40 border border-editorial-teal/30">
                <div className="text-[11px] text-ink-500">
                  {isEn ? 'Estimated Future Value' : 'Giá trị tương lai ước tính'}
                </div>
                <div className="text-xl font-bold tabular-nums text-editorial-teal dark:text-emerald-300">
                  {formatVnd(futureValue, isEn)}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-6 space-y-3">
            <h3 className="font-serif text-lg font-bold">
              {isEn ? 'Live-Synced Paper Trading ($0)' : 'Thực hành Đầu tư Giá Thực 0đ'}
            </h3>
            <p className="text-xs text-ink-600 dark:text-ink-400 leading-relaxed">
              {isEn ? (
                <>
                  Use 100M virtual funds in <strong>VNE Economy Sim</strong> with live BTC, ADA &amp; Gold reference prices synced from this dashboard.
                </>
              ) : (
                <>
                  Dùng 100 triệu ₫ tiền ảo trong <strong>VNE Mô phỏng</strong> với giá BTC, ADA &amp; Vàng được đồng bộ trực tiếp từ bảng dữ liệu thật này.
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/learn-and-earn/"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-semibold transition-colors"
              >
                {isEn ? 'Open Paper Trading →' : 'Mở VNE Mô phỏng →'}
              </Link>
              <Link
                to="/mo-phong/san-vi-mo/"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-paper-300 dark:border-ink-700 text-xs font-semibold hover:border-[#146EBE] transition-colors"
              >
                {isEn ? 'Quant Macro Lab' : 'Phòng Định lượng Vĩ mô'}
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
