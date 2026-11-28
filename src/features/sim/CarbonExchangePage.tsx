import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  BookOpen,
  Coins,
  History,
  Layers,
  Leaf,
  Trees,
  X,
} from 'lucide-react';
import { useTranslation } from '../../core/i18n/index.ts';
import { useSEO } from '../../core/seo/useSEO.ts';
import { getPointsState, POINTS_UPDATED_EVENT } from '../game/vneGameService.ts';
import {
  CARBON_EXCHANGE_PAIRS,
  DAILY_EXCHANGE_PROFIT_CAP_VNE,
  VNE_PEG_VND,
  calculateUnrealizedPnlVne,
  cancelLimitOrder,
  closeExchangePosition,
  computeMarketMakerQuote,
  estimateOrderBookExecution,
  getCarbonRetirementStats,
  getExchangeHistory,
  getExchangeLimitOrders,
  getExchangePositions,
  getTodayExchangeProfitVne,
  placeExchangeOrder,
  processAutomatedTriggers,
  retireCarbonPosition,
  type OrderSide,
  type OrderType,
} from './simExchangeService.ts';

interface CarbonLiveQuote {
  symbol: string;
  vnePrice: number;
  refVne: number;
  changePct: number;
}

export const CarbonExchangePage: React.FC = () => {
  const { isEn } = useTranslation();

  useSEO({
    title: isEn
      ? 'Carbon Credit Exchange (Yêu Trồng Cây Bridge • 1 VNE = 1,000 VND) | VNEconomics'
      : 'Sàn Giao dịch Tín chỉ Carbon (Kết nối Yêu Trồng Cây • 1 VNE = 1.000 VNĐ) | VNEconomics',
    description: isEn
      ? 'Trade VNE-TREE/VNE, MANGROVE-VN/VNE, Verra VCS, Gold Standard & EU-ETS Carbon Credits with Market Maker Order Book and Retire tCO2e for tree planting.'
      : 'Giao dịch tín chỉ Carbon VNE-TREE/VNE, MANGROVE-VN/VNE, Verra VCS, Gold Standard & EU-ETS với Market Maker và khử Carbon (Retire) cho dự án Yêu Trồng Cây.',
    canonicalPath: '/mo-phong/san-tin-chi-carbon/',
  });

  const [points, setPoints] = useState(() => getPointsState().totalPoints);
  const [selectedSymbol, setSelectedSymbol] = useState('VNETREE');

  const [quotes, setQuotes] = useState<Record<string, CarbonLiveQuote>>(() => {
    const init: Record<string, CarbonLiveQuote> = {};
    for (const c of CARBON_EXCHANGE_PAIRS) {
      init[c.symbol] = {
        symbol: c.symbol,
        vnePrice: c.defaultVne,
        refVne: c.defaultVne,
        changePct: 0,
      };
    }
    return init;
  });

  const [side, setSide] = useState<OrderSide>('long');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [leverage, setLeverage] = useState<1 | 2 | 5>(1);
  const [marginVne, setMarginVne] = useState(25);
  const [limitPriceVne, setLimitPriceVne] = useState('');
  const [tpPriceVne, setTpPriceVne] = useState('');
  const [slPriceVne, setSlPriceVne] = useState('');

  const [positions, setPositions] = useState(() => getExchangePositions('carbon'));
  const [limits, setLimits] = useState(() => getExchangeLimitOrders('carbon'));
  const [history, setHistory] = useState(() => getExchangeHistory('carbon'));
  const [todayProfit, setTodayProfit] = useState(() => getTodayExchangeProfitVne());
  const [retiredStats, setRetiredStats] = useState(() => getCarbonRetirementStats());
  const [activeTab, setActiveTab] = useState<'positions' | 'limits' | 'history'>('positions');
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null);

  const syncAll = () => {
    setPoints(getPointsState().totalPoints);
    setPositions(getExchangePositions('carbon'));
    setLimits(getExchangeLimitOrders('carbon'));
    setHistory(getExchangeHistory('carbon'));
    setTodayProfit(getTodayExchangeProfitVne());
    setRetiredStats(getCarbonRetirementStats());
  };

  useEffect(() => {
    window.addEventListener(POINTS_UPDATED_EVENT, syncAll);
    return () => window.removeEventListener(POINTS_UPDATED_EVENT, syncAll);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setQuotes((prev) => {
        const next: Record<string, CarbonLiveQuote> = { ...prev };
        const pMap: Record<string, number> = {};
        for (const c of CARBON_EXCHANGE_PAIRS) {
          const cur = prev[c.symbol];
          const nextVne = Number(Math.max(50, cur.vnePrice * (1 + (Math.random() - 0.495) * 0.005)).toFixed(2));
          const changePct = Number((((nextVne - cur.refVne) / cur.refVne) * 100).toFixed(2));
          next[c.symbol] = { ...cur, vnePrice: nextVne, changePct };
          pMap[c.symbol] = nextVne;
        }
        const autoNotice = processAutomatedTriggers('carbon', pMap);
        if (autoNotice) {
          setNotice({ ok: true, msg: autoNotice });
          syncAll();
        }
        return next;
      });
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const activePair = CARBON_EXCHANGE_PAIRS.find((c) => c.symbol === selectedSymbol) || CARBON_EXCHANGE_PAIRS[0];
  const activeQuote = quotes[activePair.symbol];

  const mmQuote = useMemo(
    () =>
      computeMarketMakerQuote({
        symbol: activePair.symbol,
        midPriceVne: activeQuote.vnePrice,
        volatilityPct: activeQuote.changePct,
        marketKind: 'carbon',
      }),
    [activePair.symbol, activeQuote.vnePrice, activeQuote.changePct, positions.length, history.length],
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
    Object.keys(quotes).forEach((k) => {
      map[k] = quotes[k].vnePrice;
    });
    return map;
  }, [quotes]);

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const res = placeExchangeOrder({
      marketKind: 'carbon',
      symbol: activePair.symbol,
      pairLabel: activePair.pairLabel,
      side,
      orderType,
      leverage,
      marginVne,
      currentPriceVne: mmExec.execPriceVne,
      limitPriceVne: orderType === 'limit' ? Number(limitPriceVne) || activeQuote.vnePrice : undefined,
      takeProfitVne: Number(tpPriceVne) > 0 ? Number(tpPriceVne) : undefined,
      stopLossVne: Number(slPriceVne) > 0 ? Number(slPriceVne) : undefined,
    });
    setNotice({ ok: res.ok, msg: res.message });
    syncAll();
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header Banner */}
      <section className="rounded-2xl bg-gradient-to-r from-[#052E16] via-[#15803D] to-[#10B981] text-white p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/learn-and-earn/"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {isEn ? 'Sim Hub' : 'Trung tâm Mô phỏng'}
            </Link>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-emerald-100 text-[11px] font-bold">
              <Trees className="w-3.5 h-3.5" />
              {isEn ? 'Yêu Trồng Cây Bridge Ready' : 'Sẵn sàng kết nối Dự án Yêu Trồng Cây'}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-200 text-[11px] font-bold">
              1 VNE = {VNE_PEG_VND.toLocaleString('en-US')} {isEn ? 'VND' : 'VNĐ'}
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">
            {isEn ? 'Carbon Credit Exchange (*/VNE)' : 'Sàn Giao dịch Tín chỉ Carbon (*/VNE)'}
          </h1>
          <p className="text-xs text-emerald-100">
            {isEn
              ? `Trade VNE-TREE, Mekong Mangrove, Verra VCS & EU-ETS (tCO2e) • Retire credits for Yêu Trồng Cây to earn +15 VNE ESG Bonus.`
              : `Giao dịch tín chỉ VNE-TREE, Rừng ngập mặn ĐBSCL, Verra VCS & EU-ETS (tCO2e) • Khử Carbon (Retire) cho dự án Yêu Trồng Cây nhận +15 VNE ESG.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/15">
            <div className="text-[10px] text-emerald-100/80">{isEn ? 'VNE Balance' : 'Ví VNE khả dụng'}</div>
            <div className="text-xl font-extrabold tabular-nums text-amber-300 inline-flex items-center gap-1">
              <Coins className="w-4 h-4" /> {points} VNE
            </div>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/15">
            <div className="text-[10px] text-emerald-100/80">{isEn ? 'Retired / Trees' : 'Đã khử / Cây xanh'}</div>
            <div className="text-base font-extrabold tabular-nums text-emerald-100">
              {retiredStats.totalTonsRetired} tCO2e • {retiredStats.totalTreesEquivalent} {isEn ? 'trees' : 'cây'}
            </div>
          </div>
          <Link
            to="/mo-phong/san-hang-hoa/"
            className="px-3 py-2 rounded-xl bg-white text-ink-950 text-xs font-bold hover:bg-emerald-50"
          >
            {isEn ? 'Commodities' : 'Sàn Hàng hóa'}
          </Link>
        </div>
      </section>

      {/* Carbon Credit Pair Selector */}
      <div className="flex flex-wrap gap-2">
        {CARBON_EXCHANGE_PAIRS.map((c) => {
          const q = quotes[c.symbol];
          const active = c.symbol === selectedSymbol;
          return (
            <button
              key={c.symbol}
              type="button"
              onClick={() => setSelectedSymbol(c.symbol)}
              className={`px-3 py-2 rounded-xl border text-left text-xs transition-colors tabular-nums ${
                active
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-paper-50 dark:bg-ink-900 border-paper-300 dark:border-ink-800 hover:border-emerald-600'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                <span>{c.pairLabel}</span>
                {c.isTreeProjectLinked && (
                  <Leaf className={`w-3.5 h-3.5 ${active ? 'text-emerald-200' : 'text-emerald-600'}`} />
                )}
                <span className={active ? 'text-emerald-100' : q.changePct >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  {q.changePct >= 0 ? '+' : ''}{q.changePct.toFixed(2)}%
                </span>
              </div>
              <div className={`text-[11px] ${active ? 'text-emerald-100' : 'text-ink-500'}`}>
                {q.vnePrice.toLocaleString('en-US')} VNE/tCO2e • {c.standard}
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

      {/* 3-Column Trading Terminal */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <section className="xl:col-span-6 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold">{activePair.pairLabel}</span>
              <span className="text-ink-500">• {isEn ? activePair.nameEn : activePair.nameVi}</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold tabular-nums">
                {activeQuote.vnePrice.toLocaleString('en-US')} VNE/tCO2e
              </span>
            </div>
            <span className="text-[11px] font-semibold text-ink-500">
              1 tCO2e ≈ {activePair.treesPerTon} {isEn ? 'trees' : 'cây xanh'}
            </span>
          </div>
          <iframe
            title={`TradingView ${activePair.pairLabel}`}
            src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(activePair.tvSymbol)}&interval=D&theme=light&style=1&locale=${isEn ? 'en' : 'vi_VN'}`}
            className="w-full h-[430px] rounded-xl border border-paper-200 dark:border-ink-800"
            loading="lazy"
          />
        </section>

        {/* Market Maker Order Book */}
        <section className="xl:col-span-3 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-xs uppercase tracking-wider text-ink-500 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              {isEn ? 'MM Order Book (VNE)' : 'Sổ lệnh Market Maker'}
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 tabular-nums">
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
              {activeQuote.vnePrice.toLocaleString('en-US')} VNE
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
                      orderType === ot ? 'bg-emerald-700 text-white border-emerald-700' : 'border-paper-300 dark:border-ink-700'
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
                  placeholder={String(activeQuote.vnePrice)}
                  className="w-full px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 tabular-nums"
                />
              </div>
            )}

            <div>
              <div className="flex justify-between mb-1">
                <label className="font-semibold">{isEn ? 'Order Margin (VNE)' : 'Vốn vào lệnh (VNE)'}</label>
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
                    className="flex-1 py-1 rounded bg-paper-200 dark:bg-ink-800 hover:bg-emerald-500/15 font-bold"
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
                <span className="text-ink-500">{isEn ? 'Est. Exec Price (MM):' : 'Giá khớp dự kiến (MM):'}</span>
                <strong>{mmExec.execPriceVne.toLocaleString('en-US')} VNE</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">{isEn ? 'Order Book Slippage:' : 'Trượt giá (Slippage):'}</span>
                <strong className="text-emerald-600">
                  {orderType === 'limit' ? '0% (+0.02% Maker Rebate)' : `${mmExec.slippagePct}% (${mmExec.levelsSwept} lvl)`}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">{isEn ? 'Today Profit Cap:' : 'Lãi hôm nay:'}</span>
                <strong>{Math.round(todayProfit)} / {DAILY_EXCHANGE_PROFIT_CAP_VNE} VNE</strong>
              </div>
            </div>

            <button
              type="submit"
              className={`w-full py-2.5 rounded-xl text-white font-bold transition-colors ${
                side === 'long' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {side === 'long'
                ? isEn ? `Buy ${activePair.code}` : `Đặt lệnh MUA ${activePair.code}`
                : isEn ? `Sell / Short ${activePair.code}` : `Đặt lệnh BÁN ${activePair.code}`}
            </button>
          </form>
        </section>
      </div>

      {/* Bottom Positions (with Retire Carbon for Yêu Trồng Cây), Limits & History */}
      <section className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-paper-200 dark:border-ink-800 pb-3 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('positions')}
            className={`px-3.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 ${
              activeTab === 'positions' ? 'bg-emerald-700 text-white' : 'text-ink-600 dark:text-ink-300'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            {isEn ? `Carbon Holdings (${positions.length})` : `Tín chỉ đang giữ (${positions.length})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('limits')}
            className={`px-3.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 ${
              activeTab === 'limits' ? 'bg-emerald-700 text-white' : 'text-ink-600 dark:text-ink-300'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            {isEn ? `Limit Orders (${limits.length})` : `Lệnh chờ Limit (${limits.length})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 ${
              activeTab === 'history' ? 'bg-emerald-700 text-white' : 'text-ink-600 dark:text-ink-300'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            {isEn ? `Trade History (${history.length})` : `Lịch sử Giao dịch (${history.length})`}
          </button>
        </div>

        {activeTab === 'positions' && (
          positions.length === 0 ? (
            <div className="text-xs text-ink-500 py-4 text-center">
              {isEn
                ? 'No Carbon Credit positions yet. Buy VNE-TREE/VNE above to trade or retire credits for Yêu Trồng Cây!'
                : 'Chưa có tín chỉ Carbon nào. Hãy mua VNE-TREE/VNE ở trên để giao dịch hoặc khử Carbon trồng cây!'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left tabular-nums">
                <thead>
                  <tr className="border-b border-paper-200 dark:border-ink-800 text-ink-500">
                    <th className="py-2">{isEn ? 'Credit' : 'Loại tín chỉ'}</th>
                    <th className="py-2 text-right">tCO2e</th>
                    <th className="py-2 text-right">{isEn ? 'Entry (VNE)' : 'Giá vào'}</th>
                    <th className="py-2 text-right">{isEn ? 'Mark (VNE)' : 'Thị giá'}</th>
                    <th className="py-2 text-right">{isEn ? 'Unrealized PnL' : 'Lời / Lỗ'}</th>
                    <th className="py-2 text-right">{isEn ? 'Actions' : 'Thao tác'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-200 dark:divide-ink-800">
                  {positions.map((pos) => {
                    const mark = livePriceMap[pos.symbol] || pos.entryPriceVne;
                    const { pnlVne, roePct } = calculateUnrealizedPnlVne(pos, mark);
                    return (
                      <tr key={pos.id}>
                        <td className="py-2.5 font-bold">{pos.pairLabel} ({pos.leverage}x)</td>
                        <td className="py-2.5 text-right">{pos.units.toFixed(4)}</td>
                        <td className="py-2.5 text-right">{pos.entryPriceVne.toLocaleString('en-US')}</td>
                        <td className="py-2.5 text-right font-semibold">{mark.toLocaleString('en-US')}</td>
                        <td className={`py-2.5 text-right font-bold ${pnlVne >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {pnlVne >= 0 ? '+' : ''}{pnlVne} VNE ({roePct >= 0 ? '+' : ''}{roePct}%)
                        </td>
                        <td className="py-2.5 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              const res = closeExchangePosition({ positionId: pos.id, exitPriceVne: mark });
                              setNotice({ ok: res.ok, msg: res.message });
                              syncAll();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#146EBE] hover:bg-[#0f5ba0] text-white font-bold"
                          >
                            {isEn ? 'Close' : 'Chốt lệnh'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const res = retireCarbonPosition(pos.id);
                              setNotice({ ok: res.ok, msg: res.message });
                              syncAll();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold inline-flex items-center gap-1"
                          >
                            <Trees className="w-3 h-3" /> {isEn ? 'Retire (+15 VNE)' : 'Khử Carbon (+15 VNE)'}
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
              {isEn ? 'No settled Carbon trades yet.' : 'Chưa có lịch sử giao dịch tín chỉ Carbon nào.'}
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
