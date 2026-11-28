import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  Award,
  BookOpen,
  Coins,
  History,
  TrendingUp,
  X,
} from 'lucide-react';
import { useTranslation } from '../../core/i18n/index.ts';
import { useSEO } from '../../core/seo/useSEO.ts';
import { getPointsState, POINTS_UPDATED_EVENT } from '../game/vneGameService.ts';
import {
  DAILY_EXCHANGE_PROFIT_CAP_VNE,
  STOCK_EXCHANGE_TICKERS,
  VNE_PEG_VND,
  calculateUnrealizedPnlVne,
  cancelLimitOrder,
  claimStockDividends,
  closeExchangePosition,
  computeMarketMakerQuote,
  estimateOrderBookExecution,
  getExchangeHistory,
  getExchangeLimitOrders,
  getExchangePositions,
  getTodayExchangeProfitVne,
  placeExchangeOrder,
  processAutomatedTriggers,
  type OrderType,
} from './simExchangeService.ts';

interface StockLiveQuote {
  ticker: string;
  refVne: number;
  ceilingVne: number;
  floorVne: number;
  lastVne: number;
  changePct: number;
  volumeShares: number;
}

function getHosePriceColor(last: number, ref: number, ceiling: number, floor: number): string {
  if (last >= ceiling - 0.01) return 'text-purple-600 dark:text-purple-400'; // Trần
  if (last <= floor + 0.01) return 'text-cyan-600 dark:text-cyan-400'; // Sàn
  if (last > ref) return 'text-emerald-600 dark:text-emerald-400'; // Tăng
  if (last < ref) return 'text-rose-600 dark:text-rose-400'; // Giảm
  return 'text-amber-500'; // Tham chiếu
}

export const StockExchangePage: React.FC = () => {
  const { isEn } = useTranslation();

  useSEO({
    title: isEn
      ? 'Stock Exchange Simulator (VN30 & US Equities • 1 VNE = 1,000 VND) | VNEconomics'
      : 'Sàn Giao dịch Chứng khoán Mô phỏng (VN30 & Quốc tế • 1 VNE = 1.000 VNĐ) | VNEconomics',
    description: isEn
      ? 'Trade HOSE VN30 (FPT, VCB, HPG, VNM, SSI) and NASDAQ (NVDA, AAPL) stocks priced in VNE Points with a 5-color live board & dividend yield.'
      : 'Giao dịch cổ phiếu VN30 (FPT, VCB, HPG, VNM, SSI) & NASDAQ (NVDA, AAPL) niêm yết bằng VNE Points với bảng điện 5 màu và nhận cổ tức.',
    canonicalPath: '/mo-phong/san-chung-khoan/',
  });

  const [points, setPoints] = useState(() => getPointsState().totalPoints);
  const [selectedTicker, setSelectedTicker] = useState('FPT');

  const [quotes, setQuotes] = useState<Record<string, StockLiveQuote>>(() => {
    const init: Record<string, StockLiveQuote> = {};
    for (const s of STOCK_EXCHANGE_TICKERS) {
      const ref = s.refPriceVne;
      init[s.ticker] = {
        ticker: s.ticker,
        refVne: ref,
        ceilingVne: Number((ref * 1.07).toFixed(2)),
        floorVne: Number((ref * 0.93).toFixed(2)),
        lastVne: ref,
        changePct: 0,
        volumeShares: Math.round(120000 + (ref * 137) % 450000),
      };
    }
    return init;
  });

  const [orderType, setOrderType] = useState<OrderType>('market');
  const [marginVne, setMarginVne] = useState(30);
  const [limitPriceVne, setLimitPriceVne] = useState('');
  const [tpPriceVne, setTpPriceVne] = useState('');
  const [slPriceVne, setSlPriceVne] = useState('');

  const [positions, setPositions] = useState(() => getExchangePositions('stock'));
  const [limits, setLimits] = useState(() => getExchangeLimitOrders('stock'));
  const [history, setHistory] = useState(() => getExchangeHistory('stock'));
  const [todayProfit, setTodayProfit] = useState(() => getTodayExchangeProfitVne());
  const [activeTab, setActiveTab] = useState<'positions' | 'limits' | 'history'>('positions');
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null);

  const syncAll = () => {
    setPoints(getPointsState().totalPoints);
    setPositions(getExchangePositions('stock'));
    setLimits(getExchangeLimitOrders('stock'));
    setHistory(getExchangeHistory('stock'));
    setTodayProfit(getTodayExchangeProfitVne());
  };

  useEffect(() => {
    window.addEventListener(POINTS_UPDATED_EVENT, syncAll);
    return () => window.removeEventListener(POINTS_UPDATED_EVENT, syncAll);
  }, []);

  // Client-side Micro-Tick Engine (0 server load at 10,000+ CCU) simulating HOSE +-7% band
  useEffect(() => {
    const timer = setInterval(() => {
      setQuotes((prev) => {
        const next: Record<string, StockLiveQuote> = { ...prev };
        const priceMap: Record<string, number> = {};
        for (const spec of STOCK_EXCHANGE_TICKERS) {
          const cur = prev[spec.ticker];
          const stepFactor = 1 + (Math.random() - 0.495) * 0.008;
          const clamped = Math.min(
            cur.ceilingVne,
            Math.max(cur.floorVne, Number((cur.lastVne * stepFactor).toFixed(2))),
          );
          const changePct = Number((((clamped - cur.refVne) / cur.refVne) * 100).toFixed(2));
          next[spec.ticker] = {
            ...cur,
            lastVne: clamped,
            changePct,
            volumeShares: cur.volumeShares + Math.round(Math.random() * 1400),
          };
          priceMap[spec.ticker] = clamped;
        }
        const autoNotice = processAutomatedTriggers('stock', priceMap);
        if (autoNotice) {
          setNotice({ ok: true, msg: autoNotice });
          syncAll();
        }
        return next;
      });
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const activeSpec = STOCK_EXCHANGE_TICKERS.find((s) => s.ticker === selectedTicker) || STOCK_EXCHANGE_TICKERS[0];
  const activeQuote = quotes[activeSpec.ticker];

  const mmQuote = useMemo(
    () =>
      computeMarketMakerQuote({
        symbol: activeSpec.ticker,
        midPriceVne: activeQuote.lastVne,
        volatilityPct: activeQuote.changePct,
        marketKind: 'stock',
      }),
    [activeSpec.ticker, activeQuote.lastVne, activeQuote.changePct, positions.length, history.length],
  );

  const mmExec = useMemo(
    () =>
      estimateOrderBookExecution({
        side: 'long',
        notionalVne: marginVne,
        quote: mmQuote,
      }),
    [marginVne, mmQuote],
  );

  const livePriceMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const k of Object.keys(quotes)) {
      map[k] = quotes[k].lastVne;
    }
    return map;
  }, [quotes]);

  const handlePlaceBuyOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const res = placeExchangeOrder({
      marketKind: 'stock',
      symbol: activeSpec.ticker,
      pairLabel: activeSpec.pairLabel,
      side: 'long',
      orderType,
      leverage: 1,
      marginVne,
      currentPriceVne: mmExec.execPriceVne,
      limitPriceVne: orderType === 'limit' ? Number(limitPriceVne) || activeQuote.lastVne : undefined,
      takeProfitVne: Number(tpPriceVne) > 0 ? Number(tpPriceVne) : undefined,
      stopLossVne: Number(slPriceVne) > 0 ? Number(slPriceVne) : undefined,
    });
    setNotice({ ok: res.ok, msg: res.message });
    syncAll();
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header Banner */}
      <section className="rounded-2xl bg-gradient-to-r from-[#0F172A] via-[#064E3B] to-[#0D9488] text-white p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/learn-and-earn/"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {isEn ? 'Sim Hub' : 'Trung tâm Mô phỏng'}
            </Link>
            <span className="px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-200 text-[11px] font-bold">
              1 VNE = {VNE_PEG_VND.toLocaleString('en-US')} {isEn ? 'VND (Exact HOSE Board Unit)' : 'VNĐ (Khớp chuẩn Bảng điện HOSE)'}
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">
            {isEn ? 'Stock Exchange Simulator (VN30 & US Equities)' : 'Sàn Giao dịch Chứng khoán Mô phỏng (VN30 & Quốc tế)'}
          </h1>
          <p className="text-xs text-emerald-100">
            {isEn
              ? `5-color Vietnam price board (±7% daily band) • 0.15% brokerage/tax sim • Daily dividends & +${DAILY_EXCHANGE_PROFIT_CAP_VNE} VNE/day profit cap.`
              : `Bảng điện 5 màu chuẩn HOSE (biên độ ±7%) • Phí & thuế 0.15% • Nhận cổ tức hàng ngày & trần lãi +${DAILY_EXCHANGE_PROFIT_CAP_VNE} VNE/ngày.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/15">
            <div className="text-[10px] text-emerald-100/80">{isEn ? 'VNE Balance' : 'Ví VNE khả dụng'}</div>
            <div className="text-xl font-extrabold tabular-nums text-amber-300 inline-flex items-center gap-1">
              <Coins className="w-4 h-4" /> {points} VNE
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const res = claimStockDividends();
              setNotice({ ok: res.ok, msg: res.message });
              syncAll();
            }}
            className="px-3.5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-ink-950 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Award className="w-4 h-4" /> {isEn ? 'Claim Dividends' : 'Nhận Cổ tức'}
          </button>
          <Link
            to="/mo-phong/san-crypto/"
            className="px-3.5 py-2.5 rounded-xl bg-white text-ink-950 text-xs font-bold hover:bg-emerald-50"
          >
            {isEn ? 'Switch to Crypto Exchange →' : 'Sang Sàn Crypto →'}
          </Link>
        </div>
      </section>

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

      {/* 5-Color Lightning Price Board + Order Ticket */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Lightning Price Board (5 columns) */}
        <section className="xl:col-span-5 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <h2 className="font-bold uppercase tracking-wider text-ink-600 dark:text-ink-300">
              {isEn ? 'Live Stock Board (1 VNE = 1,000 VND)' : 'Bảng Điện tử 5 Màu (Đơn vị: VNE = 1.000₫)'}
            </h2>
            <span className="text-[11px] text-ink-500">{isEn ? 'Click ticker to trade' : 'Bấm mã để giao dịch'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left tabular-nums">
              <thead>
                <tr className="border-b border-paper-200 dark:border-ink-800 text-[11px] text-ink-500">
                  <th className="py-2">{isEn ? 'Ticker' : 'Mã CK'}</th>
                  <th className="py-2 text-right text-purple-600">{isEn ? 'Ceil' : 'Trần'}</th>
                  <th className="py-2 text-right text-amber-500">{isEn ? 'Ref' : 'TC'}</th>
                  <th className="py-2 text-right text-cyan-600">{isEn ? 'Floor' : 'Sàn'}</th>
                  <th className="py-2 text-right">{isEn ? 'Match (VNE)' : 'Khớp (VNE)'}</th>
                  <th className="py-2 text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-200 dark:divide-ink-800">
                {STOCK_EXCHANGE_TICKERS.map((s) => {
                  const q = quotes[s.ticker];
                  const active = s.ticker === selectedTicker;
                  const color = getHosePriceColor(q.lastVne, q.refVne, q.ceilingVne, q.floorVne);
                  return (
                    <tr
                      key={s.ticker}
                      onClick={() => setSelectedTicker(s.ticker)}
                      className={`cursor-pointer transition-colors ${active ? 'bg-[#146EBE]/10' : 'hover:bg-paper-100 dark:hover:bg-ink-800/50'}`}
                    >
                      <td className="py-2 font-bold">
                        <div>{s.ticker}</div>
                        <div className="text-[10px] font-normal text-ink-500">{s.exchange}</div>
                      </td>
                      <td className="py-2 text-right text-purple-600 dark:text-purple-400">{q.ceilingVne.toFixed(1)}</td>
                      <td className="py-2 text-right text-amber-500">{q.refVne.toFixed(1)}</td>
                      <td className="py-2 text-right text-cyan-600 dark:text-cyan-400">{q.floorVne.toFixed(1)}</td>
                      <td className={`py-2 text-right font-extrabold ${color}`}>{q.lastVne.toFixed(2)}</td>
                      <td className={`py-2 text-right font-bold ${color}`}>
                        {q.changePct >= 0 ? '+' : ''}{q.changePct.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* TradingView Stock Chart (4 columns) */}
        <section className="xl:col-span-4 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-base font-extrabold">{activeSpec.pairLabel}</span>{' '}
              <span className="text-ink-500">• {isEn ? activeSpec.nameEn : activeSpec.nameVi}</span>
            </div>
            <span className="font-bold text-editorial-teal tabular-nums">
              {activeQuote.lastVne.toFixed(2)} VNE
            </span>
          </div>
          <iframe
            title={`TradingView ${activeSpec.ticker}`}
            src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(activeSpec.tvSymbol)}&interval=D&theme=light&style=1&locale=${isEn ? 'en' : 'vi_VN'}`}
            className="w-full h-[420px] rounded-xl border border-paper-200 dark:border-ink-800"
            loading="lazy"
          />
        </section>

        {/* Order Ticket (3 columns) */}
        <section className="xl:col-span-3 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-4 space-y-4">
          <div className="font-bold text-sm flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            {isEn ? `Buy ${activeSpec.pairLabel}` : `Đặt lệnh Mua ${activeSpec.pairLabel}`}
          </div>

          <form onSubmit={handlePlaceBuyOrder} className="space-y-3 text-xs">
            <div className="flex gap-1.5">
              {(['market', 'limit'] as OrderType[]).map((ot) => (
                <button
                  key={ot}
                  type="button"
                  onClick={() => setOrderType(ot)}
                  className={`flex-1 py-1.5 rounded-lg font-bold border ${
                    orderType === ot ? 'bg-[#146EBE] text-white border-[#146EBE]' : 'border-paper-300 dark:border-ink-700'
                  }`}
                >
                  {ot === 'market' ? (isEn ? 'Market (MP)' : 'Khớp ngay (MP)') : 'Limit (LO)'}
                </button>
              ))}
            </div>

            {orderType === 'limit' && (
              <div>
                <label className="font-semibold block mb-1">{isEn ? 'Limit Price (VNE)' : 'Giá đặt mua (VNE)'}</label>
                <input
                  type="number"
                  step="any"
                  value={limitPriceVne}
                  onChange={(e) => setLimitPriceVne(e.target.value)}
                  placeholder={String(activeQuote.lastVne)}
                  className="w-full px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 tabular-nums"
                />
              </div>
            )}

            <div>
              <div className="flex justify-between mb-1">
                <label className="font-semibold">{isEn ? 'Order Capital (VNE)' : 'Vốn mua (VNE)'}</label>
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
                {[10, 30, 50, 100].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMarginVne(v)}
                    className="flex-1 py-1 rounded bg-paper-200 dark:bg-ink-800 hover:bg-emerald-600/15 font-bold"
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
                <span className="text-ink-500">{isEn ? 'MM Best Ask / Spread:' : 'Giá Chào Bán MM / Spread:'}</span>
                <strong>{mmQuote.bestAskVne.toFixed(2)} VNE ({mmQuote.spreadPct}%)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">{isEn ? 'Est. Slippage:' : 'Trượt giá (Slippage):'}</span>
                <strong className="text-emerald-600">
                  {orderType === 'limit' ? '0% (+0.02% Maker Rebate)' : `${mmExec.slippagePct}%`}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">{isEn ? 'Dividend Yield:' : 'Cổ tức tham chiếu:'}</span>
                <strong className="text-emerald-600">{activeSpec.dividendYieldPct}% / yr</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">{isEn ? 'Today Profit Cap:' : 'Lãi hôm nay:'}</span>
                <strong>{Math.round(todayProfit)} / {DAILY_EXCHANGE_PROFIT_CAP_VNE} VNE</strong>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors"
            >
              {isEn ? `Buy ${activeSpec.ticker} (${marginVne} VNE)` : `Đặt lệnh Mua ${activeSpec.ticker} (${marginVne} VNE)`}
            </button>
          </form>
        </section>
      </div>

      {/* Bottom Portfolio Holdings, Limit Orders & History */}
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
            {isEn ? `Stock Holdings (${positions.length})` : `Cổ phiếu đang nắm giữ (${positions.length})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('limits')}
            className={`px-3.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 ${
              activeTab === 'limits' ? 'bg-[#146EBE] text-white' : 'text-ink-600 dark:text-ink-300'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            {isEn ? `Limit Orders (${limits.length})` : `Lệnh chờ LO (${limits.length})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 ${
              activeTab === 'history' ? 'bg-[#146EBE] text-white' : 'text-ink-600 dark:text-ink-300'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            {isEn ? `Trade History (${history.length})` : `Lịch sử Chốt lời/Lỗ (${history.length})`}
          </button>
        </div>

        {activeTab === 'positions' && (
          positions.length === 0 ? (
            <div className="text-xs text-ink-500 py-4 text-center">
              {isEn ? 'No stock holdings yet. Buy any VN30 or NASDAQ stock above!' : 'Chưa nắm giữ cổ phiếu nào. Hãy đặt lệnh mua phía trên!'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left tabular-nums">
                <thead>
                  <tr className="border-b border-paper-200 dark:border-ink-800 text-ink-500">
                    <th className="py-2">{isEn ? 'Ticker' : 'Mã CK'}</th>
                    <th className="py-2 text-right">{isEn ? 'Shares' : 'Số lượng'}</th>
                    <th className="py-2 text-right">{isEn ? 'Cost (VNE)' : 'Vốn'}</th>
                    <th className="py-2 text-right">{isEn ? 'Avg Price' : 'Giá vốn'}</th>
                    <th className="py-2 text-right">{isEn ? 'Market' : 'Thị giá'}</th>
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
                        <td className="py-2.5 font-bold">{pos.pairLabel}</td>
                        <td className="py-2.5 text-right">{pos.units.toFixed(4)}</td>
                        <td className="py-2.5 text-right">{pos.marginVne} VNE</td>
                        <td className="py-2.5 text-right">{pos.entryPriceVne.toFixed(2)}</td>
                        <td className="py-2.5 text-right font-semibold">{mark.toFixed(2)}</td>
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
                            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold"
                          >
                            {isEn ? 'Sell' : 'Bán chốt'}
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
              {isEn ? 'No pending Limit orders.' : 'Không có lệnh chờ LO nào.'}
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              {limits.map((o) => (
                <div key={o.id} className="p-3 rounded-xl border border-paper-200 dark:border-ink-800 flex items-center justify-between">
                  <div>
                    <strong>{o.pairLabel}</strong> • LO @ <strong>{o.limitPriceVne} VNE</strong> ({o.marginVne} VNE)
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
              {isEn ? 'No settled stock trades yet.' : 'Chưa có lịch sử bán chốt cổ phiếu nào.'}
            </div>
          ) : (
            <div className="space-y-2 text-xs tabular-nums">
              {history.slice(0, 15).map((h) => (
                <div key={h.id} className="p-3 rounded-xl border border-paper-200 dark:border-ink-800 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong>{h.pairLabel}</strong> • {h.entryPriceVne} → {h.exitPriceVne} VNE
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
