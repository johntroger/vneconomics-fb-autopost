import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  BookOpen,
  Coins,
  History,
  Layers,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { useTranslation } from '../../core/i18n/index.ts';
import { useSEO } from '../../core/seo/useSEO.ts';
import { getPointsState, POINTS_UPDATED_EVENT } from '../game/vneGameService.ts';
import {
  fetchMarketBundle,
  getCachedMarketBundle,
  subscribeBinanceRealtime,
  type MarketBundle,
} from '../market/marketFeedService.ts';
import {
  CRYPTO_EXCHANGE_PAIRS,
  DAILY_EXCHANGE_PROFIT_CAP_VNE,
  VNE_PEG_VND,
  calculateUnrealizedPnlVne,
  cancelLimitOrder,
  closeExchangePosition,
  computeMarketMakerQuote,
  estimateOrderBookExecution,
  getExchangeHistory,
  getExchangeLimitOrders,
  getExchangePositions,
  getTodayExchangeProfitVne,
  placeExchangeOrder,
  processAutomatedTriggers,
  usdToVnePrice,
  type OrderSide,
  type OrderType,
} from './simExchangeService.ts';

export const CryptoExchangePage: React.FC = () => {
  const { isEn } = useTranslation();

  useSEO({
    title: isEn
      ? 'Crypto Exchange Simulator (*/VNE • 1 VNE = 1,000 VND) | VNEconomics'
      : 'Sàn Giao dịch Crypto Mô phỏng (*/VNE • 1 VNE = 1.000 VNĐ) | VNEconomics',
    description: isEn
      ? 'Trade ADA/VNE, BTC/VNE, ETH/VNE, SOL/VNE with real-time Binance WebSocket prices, Order Book, Limit & TP/SL orders using VNE Points.'
      : 'Giao dịch ADA/VNE, BTC/VNE, ETH/VNE, SOL/VNE với giá Binance WebSocket realtime, Sổ lệnh, Limit & TP/SL bằng VNE Points.',
    canonicalPath: '/mo-phong/san-crypto/',
  });

  const [points, setPoints] = useState(() => getPointsState().totalPoints);
  const [bundle, setBundle] = useState<MarketBundle>(() => getCachedMarketBundle());
  const [wsLive, setWsLive] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('ADAUSDT');

  // Order Ticket state
  const [side, setSide] = useState<OrderSide>('long');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [leverage, setLeverage] = useState<1 | 2 | 5>(1);
  const [marginVne, setMarginVne] = useState(25);
  const [limitPriceVne, setLimitPriceVne] = useState('');
  const [tpPriceVne, setTpPriceVne] = useState('');
  const [slPriceVne, setSlPriceVne] = useState('');

  const [positions, setPositions] = useState(() => getExchangePositions('crypto'));
  const [limits, setLimits] = useState(() => getExchangeLimitOrders('crypto'));
  const [history, setHistory] = useState(() => getExchangeHistory('crypto'));
  const [todayProfit, setTodayProfit] = useState(() => getTodayExchangeProfitVne());
  const [activeTab, setActiveTab] = useState<'positions' | 'limits' | 'history'>('positions');
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null);

  const syncAll = () => {
    setPoints(getPointsState().totalPoints);
    setPositions(getExchangePositions('crypto'));
    setLimits(getExchangeLimitOrders('crypto'));
    setHistory(getExchangeHistory('crypto'));
    setTodayProfit(getTodayExchangeProfitVne());
  };

  useEffect(() => {
    window.addEventListener(POINTS_UPDATED_EVENT, syncAll);
    return () => window.removeEventListener(POINTS_UPDATED_EVENT, syncAll);
  }, []);

  useEffect(() => {
    void fetchMarketBundle(false).then((next) => setBundle(next));
    const syms = CRYPTO_EXCHANGE_PAIRS.map((p) => p.symbol);
    const unsub = subscribeBinanceRealtime(syms, (sym, price, pct) => {
      setWsLive(true);
      setBundle((prev) => {
        const nextTickers = {
          ...prev.crypto.tickers,
          [sym]: {
            ...(prev.crypto.tickers[sym] || { symbol: sym, high24h: price, low24h: price, quoteVolume: 0 }),
            symbol: sym,
            price,
            changePercent24h: pct,
          },
        };
        const usdVnd = prev.forex.usdVnd || 25450;
        const priceMap: Record<string, number> = {};
        for (const p of CRYPTO_EXCHANGE_PAIRS) {
          const usd = nextTickers[p.symbol]?.price ?? p.defaultUsd;
          priceMap[p.symbol] = usdToVnePrice(usd, usdVnd);
        }
        const autoNotice = processAutomatedTriggers('crypto', priceMap);
        if (autoNotice) {
          setNotice({ ok: true, msg: autoNotice });
          syncAll();
        }
        return { ...prev, crypto: { ...prev.crypto, tickers: nextTickers } };
      });
    });
    return () => unsub();
  }, []);

  const usdVnd = bundle.forex.usdVnd || 25450;
  const activePair = CRYPTO_EXCHANGE_PAIRS.find((p) => p.symbol === selectedSymbol) || CRYPTO_EXCHANGE_PAIRS[0];
  const activeTicker = bundle.crypto.tickers[activePair.symbol];
  const activeUsd = activeTicker?.price ?? activePair.defaultUsd;
  const activePriceVne = usdToVnePrice(activeUsd, usdVnd);
  const activeChange24h = activeTicker?.changePercent24h ?? 0;

  // Avellaneda-Stoikov Market Maker Order Book + Slippage Estimation
  const mmQuote = useMemo(
    () =>
      computeMarketMakerQuote({
        symbol: activePair.symbol,
        midPriceVne: activePriceVne,
        volatilityPct: activeChange24h,
        marketKind: 'crypto',
      }),
    [activePair.symbol, activePriceVne, activeChange24h, positions.length, history.length],
  );

  const mmExec = useMemo(
    () =>
      estimateOrderBookExecution({
        side,
        notionalVne: marginVne * leverage,
        quote: mmQuote,
      }),
    [side, marginVne, leverage, mmQuote],
  );

  const livePriceMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of CRYPTO_EXCHANGE_PAIRS) {
      const usd = bundle.crypto.tickers[p.symbol]?.price ?? p.defaultUsd;
      map[p.symbol] = usdToVnePrice(usd, usdVnd);
    }
    return map;
  }, [bundle.crypto.tickers, usdVnd]);

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const res = placeExchangeOrder({
      marketKind: 'crypto',
      symbol: activePair.symbol,
      pairLabel: activePair.pairLabel,
      side,
      orderType,
      leverage,
      marginVne,
      currentPriceVne: mmExec.execPriceVne,
      limitPriceVne: orderType === 'limit' ? Number(limitPriceVne) || activePriceVne : undefined,
      takeProfitVne: Number(tpPriceVne) > 0 ? Number(tpPriceVne) : undefined,
      stopLossVne: Number(slPriceVne) > 0 ? Number(slPriceVne) : undefined,
    });
    setNotice({ ok: res.ok, msg: res.message });
    syncAll();
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Top Exchange Header */}
      <section className="rounded-2xl bg-gradient-to-r from-[#0B1120] via-[#172554] to-[#146EBE] text-white p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/learn-and-earn/"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {isEn ? 'Sim Hub' : 'Trung tâm Mô phỏng'}
            </Link>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[11px] font-bold text-emerald-200">
              <span className={`w-2 h-2 rounded-full ${wsLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {wsLive ? 'BINANCE WEBSOCKET LIVE' : 'LIVE SNAPSHOT'}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-200 text-[11px] font-bold">
              1 VNE = {VNE_PEG_VND.toLocaleString('en-US')} {isEn ? 'VND' : 'VNĐ'}
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">
            {isEn ? 'Crypto Exchange Simulator (*/VNE)' : 'Sàn Giao dịch Crypto Mô phỏng (*/VNE)'}
          </h1>
          <p className="text-xs text-sky-100">
            {isEn
              ? `Trade live Binance WebSocket prices directly in VNE Points • 0.1% fee • Daily net profit cap: +${DAILY_EXCHANGE_PROFIT_CAP_VNE} VNE/day.`
              : `Giao dịch trực tiếp bằng VNE Points theo giá Binance WebSocket từng giây • Phí 0.1% • Trần lãi rút: +${DAILY_EXCHANGE_PROFIT_CAP_VNE} VNE/ngày.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/15">
            <div className="text-[10px] text-sky-100/80">{isEn ? 'VNE Balance' : 'Ví VNE khả dụng'}</div>
            <div className="text-xl font-extrabold tabular-nums text-amber-300 inline-flex items-center gap-1">
              <Coins className="w-4 h-4" /> {points} VNE
            </div>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/15">
            <div className="text-[10px] text-sky-100/80">{isEn ? 'Today Profit' : 'Lãi hôm nay'}</div>
            <div className="text-xl font-extrabold tabular-nums text-emerald-300">
              {Math.round(todayProfit)}/{DAILY_EXCHANGE_PROFIT_CAP_VNE}
            </div>
          </div>
          <Link
            to="/mo-phong/san-chung-khoan/"
            className="px-3.5 py-2.5 rounded-xl bg-white text-ink-950 text-xs font-bold hover:bg-sky-50"
          >
            {isEn ? 'Switch to Stock Exchange →' : 'Sang Sàn Chứng khoán →'}
          </Link>
        </div>
      </section>

      {/* Pair Selector Bar */}
      <div className="flex flex-wrap gap-2">
        {CRYPTO_EXCHANGE_PAIRS.map((p) => {
          const t = bundle.crypto.tickers[p.symbol];
          const usd = t?.price ?? p.defaultUsd;
          const vnePrice = usdToVnePrice(usd, usdVnd);
          const pct = t?.changePercent24h ?? 0;
          const active = p.symbol === selectedSymbol;
          return (
            <button
              key={p.symbol}
              type="button"
              onClick={() => setSelectedSymbol(p.symbol)}
              className={`px-3 py-2 rounded-xl border text-left text-xs transition-colors tabular-nums ${
                active
                  ? 'bg-[#146EBE] text-white border-[#146EBE]'
                  : 'bg-paper-50 dark:bg-ink-900 border-paper-300 dark:border-ink-800 hover:border-[#146EBE]'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                <span>{p.pairLabel}</span>
                <span className={active ? 'text-sky-100' : pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                </span>
              </div>
              <div className={`text-[11px] ${active ? 'text-sky-100' : 'text-ink-500'}`}>
                {vnePrice.toLocaleString('en-US')} VNE
              </div>
            </button>
          );
        })}
      </div>

      {notice && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex flex-wrap items-center justify-between gap-2 ${
            notice.ok
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
          }`}
        >
          <span>{notice.msg}</span>
          {!notice.ok && (
            <Link to="/mo-phong/testnet-swap/" className="underline font-bold text-[#146EBE]">
              {isEn ? 'Swap Testnet → VNE' : 'Nạp thêm VNE từ Testnet →'}
            </Link>
          )}
        </div>
      )}

      {/* 3-Column Trading Terminal: Chart (6) + Order Book (3) + Order Ticket (3) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* TradingView Chart */}
        <section className="xl:col-span-6 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold">{activePair.pairLabel}</span>
              <span className="px-2 py-0.5 rounded bg-paper-200 dark:bg-ink-800 font-semibold">
                {activePriceVne.toLocaleString('en-US')} VNE
              </span>
              <span className="text-ink-500 tabular-nums">(${activeUsd.toLocaleString('en-US')})</span>
            </div>
            <span className={`font-bold tabular-nums inline-flex items-center gap-1 ${activeChange24h >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {activeChange24h >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {activeChange24h >= 0 ? '+' : ''}{activeChange24h.toFixed(2)}% (24h)
            </span>
          </div>
          <iframe
            title={`TradingView ${activePair.pairLabel}`}
            src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(activePair.tvSymbol)}&interval=60&theme=light&style=1&locale=${isEn ? 'en' : 'vi_VN'}`}
            className="w-full h-[430px] rounded-xl border border-paper-200 dark:border-ink-800"
            loading="lazy"
          />
        </section>

        {/* Live Market Maker Order Book Ladder */}
        <section className="xl:col-span-3 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-xs uppercase tracking-wider text-ink-500 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#146EBE]" />
              {isEn ? 'MM Order Book (VNE)' : 'Sổ lệnh Market Maker'}
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-[#146EBE] tabular-nums">
              Spread: {mmQuote.spreadPct}%
            </span>
          </div>
          <div className="space-y-1 text-xs tabular-nums">
            <div className="flex justify-between text-[11px] text-ink-400 pb-1 border-b border-paper-200 dark:border-ink-800">
              <span>{isEn ? 'Price (VNE)' : 'Giá (VNE)'}</span>
              <span>{isEn ? 'Depth (VNE)' : 'Thanh khoản'}</span>
            </div>
            {mmQuote.asks.map((a, idx) => (
              <button
                key={`ask-${idx}`}
                type="button"
                onClick={() => {
                  setOrderType('limit');
                  setLimitPriceVne(String(a.priceVne));
                }}
                className="w-full flex justify-between py-1 px-1.5 rounded hover:bg-rose-500/10 text-rose-600 font-semibold"
              >
                <span>{a.priceVne.toLocaleString('en-US')}</span>
                <span className="text-ink-600 dark:text-ink-300">{a.sizeVne} VNE</span>
              </button>
            ))}

            <div className="py-2 my-1 text-center font-extrabold text-sm bg-paper-100 dark:bg-ink-950 rounded-lg border border-paper-200 dark:border-ink-800">
              {activePriceVne.toLocaleString('en-US')} VNE
              <div className="text-[10px] font-normal text-ink-500">
                MM Skew: {mmQuote.skewBps > 0 ? `+${mmQuote.skewBps}` : mmQuote.skewBps} bps
              </div>
            </div>

            {mmQuote.bids.map((b, idx) => (
              <button
                key={`bid-${idx}`}
                type="button"
                onClick={() => {
                  setOrderType('limit');
                  setLimitPriceVne(String(b.priceVne));
                }}
                className="w-full flex justify-between py-1 px-1.5 rounded hover:bg-emerald-500/10 text-emerald-600 font-semibold"
              >
                <span>{b.priceVne.toLocaleString('en-US')}</span>
                <span className="text-ink-600 dark:text-ink-300">{b.sizeVne} VNE</span>
              </button>
            ))}
          </div>
          <div className="text-[11px] text-ink-500 pt-1">
            {isEn ? 'Limit orders earn +0.02% Maker Rebate.' : 'Lệnh Limit được hoàn phí Maker +0.02%.'}
          </div>
        </section>

        {/* Order Ticket */}
        <section className="xl:col-span-3 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-4 space-y-4">
          <form onSubmit={handleSubmitOrder} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-paper-200 dark:bg-ink-950">
              <button
                type="button"
                onClick={() => setSide('long')}
                className={`py-2 rounded-lg font-bold transition-colors ${side === 'long' ? 'bg-emerald-600 text-white' : 'text-ink-600 dark:text-ink-300'}`}
              >
                {isEn ? 'Buy / Long' : 'Mua / Long'}
              </button>
              <button
                type="button"
                onClick={() => setSide('short')}
                className={`py-2 rounded-lg font-bold transition-colors ${side === 'short' ? 'bg-rose-600 text-white' : 'text-ink-600 dark:text-ink-300'}`}
              >
                {isEn ? 'Sell / Short' : 'Bán / Short'}
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1.5">
                {(['market', 'limit'] as OrderType[]).map((ot) => (
                  <button
                    key={ot}
                    type="button"
                    onClick={() => setOrderType(ot)}
                    className={`px-3 py-1 rounded-lg font-bold border ${
                      orderType === ot ? 'bg-[#146EBE] text-white border-[#146EBE]' : 'border-paper-300 dark:border-ink-700'
                    }`}
                  >
                    {ot === 'market' ? 'Market' : 'Limit'}
                  </button>
                ))}
              </div>

              <div className="flex gap-1">
                {([1, 2, 5] as const).map((lev) => (
                  <button
                    key={lev}
                    type="button"
                    onClick={() => setLeverage(lev)}
                    className={`px-2 py-1 rounded-lg font-bold border ${
                      leverage === lev ? 'bg-amber-500 text-white border-amber-500' : 'border-paper-300 dark:border-ink-700'
                    }`}
                  >
                    {lev}x
                  </button>
                ))}
              </div>
            </div>

            {orderType === 'limit' && (
              <div>
                <label className="font-semibold block mb-1">{isEn ? 'Limit Price (VNE)' : 'Giá đặt chờ Limit (VNE)'}</label>
                <input
                  type="number"
                  step="any"
                  value={limitPriceVne}
                  onChange={(e) => setLimitPriceVne(e.target.value)}
                  placeholder={String(activePriceVne)}
                  className="w-full px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 tabular-nums"
                />
              </div>
            )}

            <div>
              <div className="flex justify-between mb-1">
                <label className="font-semibold">{isEn ? 'Order Margin (VNE)' : 'Số vốn vào lệnh (VNE)'}</label>
                <span className="text-ink-500 tabular-nums">{isEn ? 'Avail:' : 'Có:'} {points} VNE</span>
              </div>
              <input
                type="number"
                min={10}
                value={marginVne}
                onChange={(e) => setMarginVne(Math.max(10, Number(e.target.value) || 10))}
                className="w-full px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 tabular-nums font-bold"
              />
              <div className="flex gap-1.5 mt-1.5">
                {[10, 25, 50, 100].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMarginVne(v)}
                    className="flex-1 py-1 rounded bg-paper-200 dark:bg-ink-800 hover:bg-[#146EBE]/15 font-bold"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold block mb-1 text-[11px]">Take Profit (VNE)</label>
                <input
                  type="number"
                  step="any"
                  value={tpPriceVne}
                  onChange={(e) => setTpPriceVne(e.target.value)}
                  placeholder={isEn ? 'Optional' : 'Tùy chọn'}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 tabular-nums"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-[11px]">Stop Loss (VNE)</label>
                <input
                  type="number"
                  step="any"
                  value={slPriceVne}
                  onChange={(e) => setSlPriceVne(e.target.value)}
                  placeholder={isEn ? 'Optional' : 'Tùy chọn'}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 tabular-nums"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-paper-100 dark:bg-ink-950 border border-paper-200 dark:border-ink-800 space-y-1 text-[11px] tabular-nums">
              <div className="flex justify-between">
                <span className="text-ink-500">{isEn ? 'Position Size:' : 'Quy mô vị thế:'}</span>
                <strong>{(marginVne * leverage).toLocaleString('en-US')} VNE ({leverage}x)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">{isEn ? 'Est. Exec Price (MM):' : 'Giá khớp dự kiến (MM):'}</span>
                <strong>{mmExec.execPriceVne.toLocaleString('en-US')} VNE</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">{isEn ? 'Order Book Slippage:' : 'Trượt giá (Slippage):'}</span>
                <strong className={mmExec.slippagePct > 0.15 ? 'text-amber-600' : 'text-emerald-600'}>
                  {orderType === 'limit' ? '0% (+0.02% Maker Rebate)' : `${mmExec.slippagePct}% (${mmExec.levelsSwept} lvl)`}
                </strong>
              </div>
            </div>

            <button
              type="submit"
              className={`w-full py-2.5 rounded-xl text-white font-bold transition-colors ${
                side === 'long' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {side === 'long'
                ? isEn ? `Buy / Long ${activePair.base}` : `Đặt lệnh MUA ${activePair.base}`
                : isEn ? `Sell / Short ${activePair.base}` : `Đặt lệnh BÁN KHỐNG ${activePair.base}`}
            </button>
          </form>
        </section>
      </div>

      {/* Bottom Positions, Limit Orders & Settlement History */}
      <section className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-paper-200 dark:border-ink-800 pb-3 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('positions')}
            className={`px-3.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 ${
              activeTab === 'positions' ? 'bg-[#146EBE] text-white' : 'text-ink-600 dark:text-ink-300'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            {isEn ? `Open Positions (${positions.length})` : `Vị thế đang mở (${positions.length})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('limits')}
            className={`px-3.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 ${
              activeTab === 'limits' ? 'bg-[#146EBE] text-white' : 'text-ink-600 dark:text-ink-300'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            {isEn ? `Limit Orders (${limits.length})` : `Lệnh chờ Limit (${limits.length})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 ${
              activeTab === 'history' ? 'bg-[#146EBE] text-white' : 'text-ink-600 dark:text-ink-300'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            {isEn ? `Trade History (${history.length})` : `Lịch sử Chốt lệnh (${history.length})`}
          </button>
        </div>

        {activeTab === 'positions' && (
          positions.length === 0 ? (
            <div className="text-xs text-ink-500 py-4 text-center">
              {isEn ? 'No open Crypto positions yet. Place an order above to start!' : 'Chưa có vị thế Crypto nào đang mở. Hãy đặt lệnh phía trên!'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left tabular-nums">
                <thead>
                  <tr className="border-b border-paper-200 dark:border-ink-800 text-ink-500">
                    <th className="py-2">{isEn ? 'Pair' : 'Cặp'}</th>
                    <th className="py-2">{isEn ? 'Side' : 'Hướng'}</th>
                    <th className="py-2 text-right">{isEn ? 'Margin' : 'Vốn'}</th>
                    <th className="py-2 text-right">{isEn ? 'Entry (VNE)' : 'Giá vào'}</th>
                    <th className="py-2 text-right">{isEn ? 'Mark (VNE)' : 'Giá hiện tại'}</th>
                    <th className="py-2 text-right">{isEn ? 'Liq. Price' : 'Giá thanh lý'}</th>
                    <th className="py-2 text-right">{isEn ? 'Unrealized PnL' : 'Lời / Lỗ tạm tính'}</th>
                    <th className="py-2 text-right">{isEn ? 'Action' : 'Thao tác'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-200 dark:divide-ink-800">
                  {positions.map((pos) => {
                    const mark = livePriceMap[pos.symbol] || pos.entryPriceVne;
                    const { pnlVne, roePct } = calculateUnrealizedPnlVne(pos, mark);
                    return (
                      <tr key={pos.id}>
                        <td className="py-2.5 font-bold">{pos.pairLabel} ({pos.leverage}x)</td>
                        <td className={`py-2.5 font-bold uppercase ${pos.side === 'long' ? 'text-emerald-600' : 'text-rose-600'}`}>{pos.side}</td>
                        <td className="py-2.5 text-right">{pos.marginVne} VNE</td>
                        <td className="py-2.5 text-right">{pos.entryPriceVne.toLocaleString('en-US')}</td>
                        <td className="py-2.5 text-right font-semibold">{mark.toLocaleString('en-US')}</td>
                        <td className="py-2.5 text-right text-amber-600">{pos.liquidationPriceVne ? pos.liquidationPriceVne.toLocaleString('en-US') : '—'}</td>
                        <td className={`py-2.5 text-right font-bold ${pnlVne >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {pnlVne >= 0 ? '+' : ''}{pnlVne} VNE ({roePct >= 0 ? '+' : ''}{roePct}%)
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const res = closeExchangePosition({ positionId: pos.id, exitPriceVne: mark });
                              setNotice({ ok: res.ok, msg: res.message });
                              syncAll();
                            }}
                            className="px-3 py-1 rounded-lg bg-[#146EBE] hover:bg-[#0f5ba0] text-white font-bold"
                          >
                            {isEn ? 'Close' : 'Chốt lệnh'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {activeTab === 'limits' && (
          limits.length === 0 ? (
            <div className="text-xs text-ink-500 py-4 text-center">
              {isEn ? 'No pending Limit orders.' : 'Không có lệnh chờ Limit nào.'}
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              {limits.map((o) => (
                <div key={o.id} className="p-3 rounded-xl border border-paper-200 dark:border-ink-800 flex items-center justify-between">
                  <div>
                    <strong>{o.pairLabel}</strong> • {o.side.toUpperCase()} {o.leverage}x @ <strong>{o.limitPriceVne} VNE</strong> ({o.marginVne} VNE)
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const res = cancelLimitOrder(o.id);
                      setNotice({ ok: res.ok, msg: res.message });
                      syncAll();
                    }}
                    className="px-2.5 py-1 rounded-lg border border-rose-300 text-rose-600 font-bold inline-flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> {isEn ? 'Cancel' : 'Hủy lệnh'}
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'history' && (
          history.length === 0 ? (
            <div className="text-xs text-ink-500 py-4 text-center">
              {isEn ? 'No closed trades yet.' : 'Chưa có lịch sử chốt lệnh nào.'}
            </div>
          ) : (
            <div className="space-y-2 text-xs tabular-nums">
              {history.slice(0, 15).map((h) => (
                <div key={h.id} className="p-3 rounded-xl border border-paper-200 dark:border-ink-800 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong>{h.pairLabel}</strong> ({h.side.toUpperCase()} {h.leverage}x) • {h.entryPriceVne} → {h.exitPriceVne} VNE
                  </div>
                  <span className={`font-bold ${h.pnlVne >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {h.pnlVne >= 0 ? '+' : ''}{h.pnlVne} VNE
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </section>
    </div>
  );
};
