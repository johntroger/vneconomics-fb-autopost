import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Flame,
  History,
  PieChart,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useTranslation } from '../../core/i18n/index.ts';
import {
  computeLivePaperPrices,
  fetchMarketBundle,
  getCachedMarketBundle,
  subscribeBinanceRealtime,
  type MarketBundle,
} from '../market/marketFeedService.ts';
import { placePaperTrade, spendVnePoints, updateLiveMarketPrices, type PaperPosition } from '../game/vneGameService.ts';
import { callUserAI } from '../ai/userAIService.ts';
import {
  APT_BETAS,
  ASSET_ORDER,
  computeKellyCriterion,
  computeMarkowitzMPT,
  computeParametricVarCvar,
  computeRiskParityWeights,
  CORR_MATRIX,
  QUANT_MODELS,
  runMonteCarloGbm,
  type AssetKey,
  type QuantModelId,
} from './quantModelsService.ts';

interface AssetAllocation {
  gold: number;
  equities: number;
  crypto: number;
  bonds: number;
  usd: number;
}

interface MacroScenarioSpec {
  id: string;
  titleVi: string;
  titleEn: string;
  descVi: string;
  descEn: string;
  rateDelta: number; // %
  fxDelta: number; // %
  cpiShock: number; // %
  impacts: Record<AssetKey, number>; // % impact
}

const MACRO_SCENARIOS: MacroScenarioSpec[] = [
  {
    id: 'btc_halving',
    titleVi: 'Chu kỳ Halving & Dòng tiền ETF',
    titleEn: 'Bitcoin Halving & ETF Inflows',
    descVi: 'Thanh khoản toàn cầu nới lỏng, dòng vốn tổ chức chảy mạnh vào tài sản số và cổ phiếu tăng trưởng.',
    descEn: 'Global liquidity expands; institutional inflows accelerate into digital assets and growth equities.',
    rateDelta: -0.5,
    fxDelta: 0.5,
    cpiShock: 2.8,
    impacts: { gold: 5.5, equities: 11.5, crypto: 34.0, bonds: 4.5, usd: 0.5 },
  },
  {
    id: 'fed_hike',
    titleVi: 'FED Tăng lãi suất (+75 bps)',
    titleEn: 'FED Aggressive Hike (+75 bps)',
    descVi: 'Chi phí vốn tăng nhanh, đồng USD mạnh lên gây áp lực lên cổ phiếu, bất động sản và crypto.',
    descEn: 'Capital costs jump, DXY rallies, pressuring equities and crypto while boosting USD and cash yields.',
    rateDelta: 1.5,
    fxDelta: 3.8,
    cpiShock: 4.2,
    impacts: { gold: 2.5, equities: -10.5, crypto: -18.0, bonds: 6.2, usd: 4.0 },
  },
  {
    id: 'supply_shock',
    titleVi: 'Đứt gãy Chuỗi cung ứng & Dầu tăng vọt',
    titleEn: 'Global Supply Shock & Oil Spike',
    descVi: 'Giá năng lượng và chi phí vận tải tăng mạnh đẩy lạm phát lên cao; dòng tiền trú ẩn vào Vàng.',
    descEn: 'Energy and freight costs surge, triggering stagflation fears; capital rotates into Gold.',
    rateDelta: 0.75,
    fxDelta: 2.5,
    cpiShock: 6.5,
    impacts: { gold: 16.5, equities: -11.0, crypto: -9.5, bonds: 3.0, usd: 2.8 },
  },
  {
    id: 'vn_fx_inflation',
    titleVi: 'Lạm phát > 5% & Áp lực Tỷ giá VND',
    titleEn: 'Inflation > 5% & VND FX Pressure',
    descVi: 'Tỷ giá USD/VND tăng căng thẳng, lãi suất huy động nhích lên; Vàng SJC và USD phòng hộ tốt.',
    descEn: 'USD/VND rises sharply, domestic deposit rates climb; Gold and USD hedge purchasing power.',
    rateDelta: 1.0,
    fxDelta: 5.5,
    cpiShock: 5.4,
    impacts: { gold: 12.0, equities: -4.5, crypto: 3.0, bonds: 5.8, usd: 5.5 },
  },
  {
    id: 'black_swan',
    titleVi: 'Khủng hoảng Thanh khoản (Black Swan)',
    titleEn: 'Liquidity Crunch (Black Swan)',
    descVi: 'Bán tháo diện rộng tài sản rủi ro; tiền mặt, trái phiếu chính phủ và vàng giữ giá trị danh mục.',
    descEn: 'Broad risk-off deleveraging; sovereign bonds, cash and gold preserve portfolio capital.',
    rateDelta: -1.5,
    fxDelta: 4.5,
    cpiShock: 1.8,
    impacts: { gold: 9.0, equities: -24.0, crypto: -38.0, bonds: 7.5, usd: 4.8 },
  },
  {
    id: 'ai_soft_landing',
    titleVi: 'Bùng nổ Kinh tế số & AI (Soft Landing)',
    titleEn: 'AI & Digital Economy Boom (Soft Landing)',
    descVi: 'Năng suất lao động tăng mạnh nhờ AI, lạm phát hạ nhiệt êm dịu; cổ phiếu và crypto dẫn dắt.',
    descEn: 'AI productivity boom with disinflation; equities and digital assets lead strong gains.',
    rateDelta: -0.75,
    fxDelta: -0.5,
    cpiShock: 2.2,
    impacts: { gold: 3.5, equities: 18.0, crypto: 26.0, bonds: 5.0, usd: -0.5 },
  },
];

const PRESETS: { id: string; vi: string; en: string; weights: AssetAllocation }[] = [
  { id: 'defensive', vi: 'Phòng thủ', en: 'Defensive', weights: { gold: 25, equities: 15, crypto: 5, bonds: 40, usd: 15 } },
  { id: 'all_weather', vi: 'Cân bằng (All-Weather)', en: 'All-Weather', weights: { gold: 20, equities: 35, crypto: 15, bonds: 20, usd: 10 } },
  { id: 'digital_growth', vi: 'Tăng trưởng Số', en: 'Digital Growth', weights: { gold: 10, equities: 35, crypto: 40, bonds: 10, usd: 5 } },
  { id: 'inflation_hedge', vi: 'Chống Lạm phát', en: 'Inflation Hedge', weights: { gold: 40, equities: 20, crypto: 15, bonds: 10, usd: 15 } },
];

const ASSET_META: Record<AssetKey, { vi: string; en: string; color: string; vol: number }> = {
  gold: { vi: 'Vàng SJC / XAU', en: 'Gold (SJC / XAU)', color: '#D97706', vol: 12 },
  equities: { vi: 'Chứng khoán VN30 / SPX', en: 'Equities (VN30 / SPX)', color: '#146EBE', vol: 19 },
  crypto: { vi: 'Crypto (BTC & ADA)', en: 'Crypto (BTC & ADA)', color: '#8B5CF6', vol: 52 },
  bonds: { vi: 'Trái phiếu & Tiết kiệm', en: 'Bonds & Deposits', color: '#059669', vol: 3 },
  usd: { vi: 'Ngoại tệ USD', en: 'USD Cash Reserve', color: '#0D9488', vol: 4 },
};

interface StressRunRecord {
  id: string;
  scenarioName: string;
  capitalVnd: number;
  returnPct: number;
  pnlVnd: number;
  sharpe: number;
  createdAt: string;
}

const KEY_MACRO_HISTORY = 'vne_macro_stress_runs_v1';

function readStressRuns(): StressRunRecord[] {
  try {
    const raw = localStorage.getItem(KEY_MACRO_HISTORY);
    return raw ? (JSON.parse(raw) as StressRunRecord[]) : [];
  } catch {
    return [];
  }
}

export const MacroLabPanel: React.FC<{ onPointsChanged: (ok: boolean, msg: string) => void }> = ({
  onPointsChanged,
}) => {
  const { isEn } = useTranslation();

  const [bundle, setBundle] = useState<MarketBundle>(() => getCachedMarketBundle());
  const [wsLive, setWsLive] = useState(false);

  const [capitalVnd, setCapitalVnd] = useState(500_000_000);
  const [weights, setWeights] = useState<AssetAllocation>(PRESETS[1].weights);
  const [scenarioId, setScenarioId] = useState<string>(MACRO_SCENARIOS[0].id);

  // Custom macro sliders (fine-tune on top of scenario)
  const [rateDelta, setRateDelta] = useState(MACRO_SCENARIOS[0].rateDelta);
  const [fxDelta, setFxDelta] = useState(MACRO_SCENARIOS[0].fxDelta);
  const [cpiShock, setCpiShock] = useState(MACRO_SCENARIOS[0].cpiShock);

  const [runs, setRuns] = useState<StressRunRecord[]>(() => readStressRuns());
  const [aiReview, setAiReview] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  // 6 International Quant Models state
  const [activeModelId, setActiveModelId] = useState<QuantModelId>('markowitz');
  const [mcYears, setMcYears] = useState<1 | 3 | 5>(3);
  const [mcSeed, setMcSeed] = useState(20261127);

  useEffect(() => {
    void fetchMarketBundle(false).then((next) => {
      setBundle(next);
      updateLiveMarketPrices(computeLivePaperPrices(next));
    });
    const unsub = subscribeBinanceRealtime(['BTCUSDT', 'ADAUSDT', 'PAXGUSDT'], (sym, price, pct) => {
      setWsLive(true);
      setBundle((prev) => ({
        ...prev,
        crypto: {
          ...prev.crypto,
          tickers: {
            ...prev.crypto.tickers,
            [sym]: {
              ...(prev.crypto.tickers[sym] || { symbol: sym, high24h: price, low24h: price, quoteVolume: 0 }),
              symbol: sym,
              price,
              changePercent24h: pct,
            },
          },
        },
        gold: sym === 'PAXGUSDT' ? { ...prev.gold, xauUsd: price, xauChange24h: pct } : prev.gold,
      }));
    });
    return () => unsub();
  }, []);

  const activeScenario = MACRO_SCENARIOS.find((s) => s.id === scenarioId) || MACRO_SCENARIOS[0];

  const handleSelectScenario = (sc: MacroScenarioSpec) => {
    setScenarioId(sc.id);
    setRateDelta(sc.rateDelta);
    setFxDelta(sc.fxDelta);
    setCpiShock(sc.cpiShock);
  };

  const totalWeight = weights.gold + weights.equities + weights.crypto + weights.bonds + weights.usd;

  // Quantitative stress calculation combining base scenario + live custom policy deltas
  const simulation = useMemo(() => {
    const safeTotal = totalWeight > 0 ? totalWeight : 100;
    const rateDiff = rateDelta - activeScenario.rateDelta;
    const fxDiff = fxDelta - activeScenario.fxDelta;
    const cpiDiff = cpiShock - activeScenario.cpiShock;

    const adjustedImpacts: Record<AssetKey, number> = {
      gold: activeScenario.impacts.gold + cpiDiff * 1.8 + fxDiff * 0.6 - rateDiff * 1.2,
      equities: activeScenario.impacts.equities - rateDiff * 4.5 - cpiDiff * 1.4 - fxDiff * 0.5,
      crypto: activeScenario.impacts.crypto - rateDiff * 7.5 - cpiDiff * 1.2 + fxDiff * 0.4,
      bonds: activeScenario.impacts.bonds + rateDiff * 0.8 - cpiDiff * 0.5,
      usd: activeScenario.impacts.usd + fxDiff * 1.0 + rateDiff * 0.5,
    };

    const breakdown = (Object.keys(ASSET_META) as AssetKey[]).map((key) => {
      const normPct = (weights[key] / safeTotal) * 100;
      const beforeVnd = Math.round((capitalVnd * normPct) / 100);
      const impactPct = Number(adjustedImpacts[key].toFixed(2));
      const pnlVnd = Math.round((beforeVnd * impactPct) / 100);
      return {
        key,
        normPct: Number(normPct.toFixed(1)),
        beforeVnd,
        impactPct,
        afterVnd: beforeVnd + pnlVnd,
        pnlVnd,
      };
    });

    const totalPnlVnd = breakdown.reduce((sum, b) => sum + b.pnlVnd, 0);
    const totalReturnPct = capitalVnd > 0 ? (totalPnlVnd / capitalVnd) * 100 : 0;

    const normMap: Record<AssetKey, number> = {
      gold: breakdown.find((b) => b.key === 'gold')?.normPct || 0,
      equities: breakdown.find((b) => b.key === 'equities')?.normPct || 0,
      crypto: breakdown.find((b) => b.key === 'crypto')?.normPct || 0,
      bonds: breakdown.find((b) => b.key === 'bonds')?.normPct || 0,
      usd: breakdown.find((b) => b.key === 'usd')?.normPct || 0,
    };

    // Use Markowitz MPT covariance-adjusted volatility & Sharpe
    const mpt = computeMarkowitzMPT(normMap, totalReturnPct, 4.7);
    const varCvar = computeParametricVarCvar(capitalVnd, totalReturnPct, mpt.portfolioVolPct);
    const mc = runMonteCarloGbm({
      capitalVnd,
      expectedReturnPct: totalReturnPct,
      portfolioVolPct: mpt.portfolioVolPct,
      years: mcYears,
      pathsCount: 500,
      seed: mcSeed,
    });
    const riskParityWeights = computeRiskParityWeights();
    const kelly = computeKellyCriterion(
      totalReturnPct,
      mpt.portfolioVolPct,
      normMap.equities + normMap.crypto,
      4.7,
    );

    const maxDrawdown = Number((-Math.max(2, mpt.portfolioVolPct * 0.75 + Math.max(0, -totalReturnPct * 0.45))).toFixed(1));
    const riskScore = Math.min(10, Math.max(1, Math.round(mpt.portfolioVolPct / 3.5)));

    return {
      breakdown,
      normMap,
      totalPnlVnd,
      totalAfterVnd: capitalVnd + totalPnlVnd,
      totalReturnPct: Number(totalReturnPct.toFixed(2)),
      portfolioVol: mpt.portfolioVolPct,
      sharpe: mpt.sharpeRatio,
      maxDrawdown,
      riskScore,
      mpt,
      varCvar,
      mc,
      riskParityWeights,
      kelly,
    };
  }, [activeScenario, capitalVnd, cpiShock, fxDelta, mcSeed, mcYears, rateDelta, totalWeight, weights]);

  const activeModelMeta = QUANT_MODELS.find((m) => m.id === activeModelId) || QUANT_MODELS[0];

  const handleRunOfficialStressTest = () => {
    const spend = spendVnePoints(15, `Macro Stress-Test: ${activeScenario.id}`);
    if (!spend.ok) {
      onPointsChanged(false, spend.message);
      return;
    }
    const rec: StressRunRecord = {
      id: `run_${Date.now()}`,
      scenarioName: isEn ? activeScenario.titleEn : activeScenario.titleVi,
      capitalVnd,
      returnPct: simulation.totalReturnPct,
      pnlVnd: simulation.totalPnlVnd,
      sharpe: simulation.sharpe,
      createdAt: new Date().toISOString(),
    };
    const next = [rec, ...runs].slice(0, 10);
    setRuns(next);
    try {
      localStorage.setItem(KEY_MACRO_HISTORY, JSON.stringify(next));
    } catch {
      // Ignore
    }
    onPointsChanged(
      true,
      isEn
        ? `Stress-Test report saved (-15 VNE)! Projected Return: ${simulation.totalReturnPct >= 0 ? '+' : ''}${simulation.totalReturnPct}% (Sharpe ${simulation.sharpe}).`
        : `Đã lưu báo cáo Stress-Test (-15 VNE)! Lợi suất dự phóng: ${simulation.totalReturnPct >= 0 ? '+' : ''}${simulation.totalReturnPct}% (Sharpe ${simulation.sharpe}).`,
    );
  };

  const handleQuickPaperTrade = (symbol: PaperPosition['symbol'], amountVnd: number) => {
    updateLiveMarketPrices(computeLivePaperPrices(bundle));
    const res = placePaperTrade(symbol, amountVnd);
    onPointsChanged(res.ok, res.message);
  };

  const handleAskAiStrategist = async () => {
    setAiBusy(true);
    setAiReview('');
    try {
      const allocSummary = simulation.breakdown.map((b) => `${ASSET_META[b.key].en}: ${b.normPct}%`).join(', ');
      const reply = await callUserAI({
        prompt: isEn
          ? `Act as a senior macro portfolio strategist. Evaluate this allocation (${allocSummary}) under "${activeScenario.titleEn}" (Rate ${rateDelta}%, FX ${fxDelta}%, CPI ${cpiShock}%). Projected return: ${simulation.totalReturnPct}%, Sharpe: ${simulation.sharpe}, Max Drawdown: ${simulation.maxDrawdown}%. Give 3 concise rebalancing actions.`
          : `Đóng vai chuyên gia chiến lược danh mục vĩ mô. Đánh giá tỷ trọng phân bổ (${allocSummary}) dưới kịch bản "${activeScenario.titleVi}" (Lãi suất ${rateDelta}%, Tỷ giá ${fxDelta}%, CPI ${cpiShock}%). Lợi suất dự phóng: ${simulation.totalReturnPct}%, Sharpe: ${simulation.sharpe}, Max Drawdown: ${simulation.maxDrawdown}%. Đề xuất 3 hành động tái cơ cấu ngắn gọn.`,
      });
      setAiReview(reply);
    } catch (err) {
      onPointsChanged(
        false,
        err instanceof Error
          ? err.message
          : isEn
            ? 'Configure your personal AI Key (BYOK) in AI Lab to use Macro Strategist.'
            : 'Hãy cấu hình AI Key cá nhân (BYOK) tại Phòng AI Lab để dùng cố vấn Vĩ mô.',
      );
    } finally {
      setAiBusy(false);
    }
  };

  const fmtVnd = (n: number) => `${Math.round(n).toLocaleString(isEn ? 'en-US' : 'vi-VN')} ${isEn ? 'VND' : '₫'}`;

  return (
    <div className="space-y-6">
      {/* Live Market Telemetry Strip */}
      <div className="rounded-xl border border-paper-300 dark:border-ink-800 bg-ink-950 text-paper-50 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs tabular-nums">
        <div className="flex items-center gap-2 font-bold">
          <span className={`w-2 h-2 rounded-full ${wsLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span>{isEn ? 'LIVE MACRO FEED' : 'DỮ LIỆU VĨ MÔ REALTIME'}</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span>BTC: <strong>${Math.round(bundle.crypto.tickers.BTCUSDT?.price || 0).toLocaleString('en-US')}</strong></span>
          <span>ADA: <strong>${(bundle.crypto.tickers.ADAUSDT?.price || 0).toFixed(4)}</strong></span>
          <span>XAU: <strong>${(bundle.gold.xauUsd || 0).toFixed(1)}</strong></span>
          <span>USD/VND: <strong>{Math.round(bundle.forex.usdVnd || 25450).toLocaleString('en-US')}</strong></span>
          <span>VN GDP: <strong className="text-emerald-300">{bundle.macro.indicators.gdpGrowth?.latest?.value ?? 7.09}%</strong></span>
          <span>VN CPI: <strong className="text-amber-300">{bundle.macro.indicators.cpiInflation?.latest?.value ?? 3.63}%</strong></span>
        </div>
        <Link to="/thi-truong/" className="text-sky-300 hover:underline font-semibold">
          {isEn ? 'Full Market Hub →' : 'Bảng Thị trường →'}
        </Link>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT: Portfolio Allocation & Policy Sliders */}
        <div className="xl:col-span-5 space-y-5">
          <section className="p-5 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-serif text-lg font-bold flex items-center gap-2">
                <PieChart className="w-5 h-5 text-[#146EBE]" />
                {isEn ? '1. Portfolio Allocation Builder' : '1. Thiết kế Danh mục Tài sản'}
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-paper-200 dark:bg-ink-800">
                {isEn ? `Total Weight: ${totalWeight}%` : `Tổng tỷ trọng: ${totalWeight}%`}
              </span>
            </div>

            {/* Capital Selector */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-ink-500">{isEn ? 'Capital:' : 'Quy mô vốn:'}</span>
              {[100_000_000, 500_000_000, 1_000_000_000, 5_000_000_000].map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => setCapitalVnd(cap)}
                  className={`px-2.5 py-1 rounded-lg font-bold border ${
                    capitalVnd === cap
                      ? 'bg-[#146EBE] text-white border-[#146EBE]'
                      : 'border-paper-300 dark:border-ink-700 hover:border-[#146EBE]'
                  }`}
                >
                  {cap >= 1_000_000_000 ? `${cap / 1_000_000_000} ${isEn ? 'B' : 'Tỷ'}` : `${cap / 1_000_000} ${isEn ? 'M' : 'Triệu'}`}
                </button>
              ))}
            </div>

            {/* Preset Templates */}
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setWeights(p.weights)}
                  className="px-2.5 py-1 rounded-lg bg-paper-200/80 dark:bg-ink-800 hover:bg-[#146EBE]/15 hover:text-[#146EBE] font-semibold transition-colors"
                >
                  {isEn ? p.en : p.vi}
                </button>
              ))}
            </div>

            {/* Stacked Visual Allocation Bar */}
            <div className="h-3.5 w-full rounded-full overflow-hidden flex bg-paper-200 dark:bg-ink-800">
              {simulation.breakdown.map((b) => (
                <div
                  key={b.key}
                  style={{ width: `${b.normPct}%`, backgroundColor: ASSET_META[b.key].color }}
                  title={`${isEn ? ASSET_META[b.key].en : ASSET_META[b.key].vi}: ${b.normPct}%`}
                />
              ))}
            </div>

            {/* 5 Asset Sliders */}
            <div className="space-y-3 text-xs">
              {(Object.keys(ASSET_META) as AssetKey[]).map((key) => {
                const meta = ASSET_META[key];
                const b = simulation.breakdown.find((x) => x.key === key)!;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                        {isEn ? meta.en : meta.vi}
                      </span>
                      <span className="tabular-nums text-ink-600 dark:text-ink-300">
                        <strong>{b.normPct}%</strong> • {fmtVnd(b.beforeVnd)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={weights[key]}
                      onChange={(e) => setWeights((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                      className="w-full accent-[#146EBE]"
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {/* Custom Macro Policy Sliders */}
          <section className="p-5 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-bold flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-500" />
                {isEn ? '2. Fine-Tune Macro Shocks' : '2. Tinh chỉnh Biến số Vĩ mô (What-If)'}
              </h3>
              <button
                type="button"
                onClick={() => handleSelectScenario(activeScenario)}
                className="text-[11px] font-semibold text-[#146EBE] hover:underline inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> {isEn ? 'Reset' : 'Mặc định'}
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>{isEn ? 'Policy Rate Delta (FED / SBV)' : 'Biến động Lãi suất Điều hành'}</span>
                  <span className="tabular-nums">{rateDelta > 0 ? `+${rateDelta}%` : `${rateDelta}%`}</span>
                </div>
                <input
                  type="range"
                  min={-2}
                  max={3}
                  step={0.25}
                  value={rateDelta}
                  onChange={(e) => setRateDelta(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>{isEn ? 'USD/VND Exchange Rate Shock' : 'Cú sốc Tỷ giá USD/VND'}</span>
                  <span className="tabular-nums">{fxDelta > 0 ? `+${fxDelta}%` : `${fxDelta}%`}</span>
                </div>
                <input
                  type="range"
                  min={-5}
                  max={10}
                  step={0.5}
                  value={fxDelta}
                  onChange={(e) => setFxDelta(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>{isEn ? 'Inflation (CPI) Scenario' : 'Kịch bản Lạm phát CPI'}</span>
                  <span className="tabular-nums">{cpiShock}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={9}
                  step={0.2}
                  value={cpiShock}
                  onChange={(e) => setCpiShock(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT: 6 Macro Scenarios + Quantitative Results + Paper Trade Execution */}
        <div className="xl:col-span-7 space-y-5">
          {/* 6 Scenario Cards */}
          <section className="p-5 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-3">
            <h2 className="font-serif text-lg font-bold flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-500" />
              {isEn ? '3. Select Macro Shock Scenario (6 Regimes)' : '3. Chọn Kịch bản Cú sốc Vĩ mô (6 Bối cảnh)'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {MACRO_SCENARIOS.map((sc) => {
                const active = sc.id === scenarioId;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => handleSelectScenario(sc)}
                    className={`p-3.5 rounded-xl border text-left transition-colors space-y-1 ${
                      active
                        ? 'border-[#146EBE] bg-[#146EBE]/10 dark:bg-sky-950/40'
                        : 'border-paper-300 dark:border-ink-800 bg-paper-100/60 dark:bg-ink-950 hover:border-[#146EBE]'
                    }`}
                  >
                    <div className="text-xs font-bold leading-snug">{isEn ? sc.titleEn : sc.titleVi}</div>
                    <div className="text-[11px] text-ink-500 dark:text-ink-400 line-clamp-2">
                      {isEn ? sc.descEn : sc.descVi}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Quantitative Output KPI Cards + Per-Asset Breakdown Table */}
          <section className="p-5 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-lg font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                {isEn ? '4. Quantitative Stress-Test Projection' : '4. Kết quả Phân tích Định lượng Danh mục'}
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleRunOfficialStressTest}
                  className="px-4 py-2 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isEn ? 'Save Stress-Test Report (15 VNE)' : 'Lưu Báo cáo Stress-Test (15 VNE)'}
                </button>
                <button
                  type="button"
                  onClick={handleAskAiStrategist}
                  disabled={aiBusy}
                  className="px-3.5 py-2 rounded-xl border border-[#146EBE] text-[#146EBE] dark:text-sky-400 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {aiBusy ? (isEn ? 'Reviewing...' : 'Đang phân tích...') : isEn ? 'AI Rebalance (BYOK)' : 'Cố vấn AI (BYOK)'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
              <div className="p-3.5 rounded-xl bg-paper-100 dark:bg-ink-950 border border-paper-200 dark:border-ink-800">
                <div className="text-[11px] text-ink-500">{isEn ? 'Projected Return' : 'Lợi suất Dự phóng'}</div>
                <div className={`text-xl font-extrabold flex items-center gap-1 ${simulation.totalReturnPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {simulation.totalReturnPct >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {simulation.totalReturnPct >= 0 ? '+' : ''}{simulation.totalReturnPct}%
                </div>
                <div className="text-[11px] text-ink-500">{simulation.totalPnlVnd >= 0 ? '+' : ''}{fmtVnd(simulation.totalPnlVnd)}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-paper-100 dark:bg-ink-950 border border-paper-200 dark:border-ink-800">
                <div className="text-[11px] text-ink-500">{isEn ? 'Projected NAV' : 'Giá trị Sau Cú sốc'}</div>
                <div className="text-base font-extrabold text-ink-950 dark:text-paper-50 mt-0.5">
                  {fmtVnd(simulation.totalAfterVnd)}
                </div>
                <div className="text-[11px] text-ink-500">{isEn ? `Vol: ${simulation.portfolioVol}%` : `Độ biến động: ${simulation.portfolioVol}%`}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-paper-100 dark:bg-ink-950 border border-paper-200 dark:border-ink-800">
                <div className="text-[11px] text-ink-500">Sharpe Ratio</div>
                <div className="text-xl font-extrabold text-[#146EBE] dark:text-sky-400">{simulation.sharpe}</div>
                <div className="text-[11px] text-ink-500">{isEn ? 'Risk-adjusted' : 'Hiệu suất / Rủi ro'}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-paper-100 dark:bg-ink-950 border border-paper-200 dark:border-ink-800">
                <div className="text-[11px] text-ink-500 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-rose-500" /> Max Drawdown
                </div>
                <div className="text-xl font-extrabold text-rose-600">{simulation.maxDrawdown}%</div>
                <div className="text-[11px] text-ink-500">{isEn ? `Risk Score: ${simulation.riskScore}/10` : `Điểm rủi ro: ${simulation.riskScore}/10`}</div>
              </div>
            </div>

            {/* Per-Asset Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-paper-200 dark:border-ink-800 text-ink-500">
                    <th className="py-2">{isEn ? 'Asset Class' : 'Lớp Tài sản'}</th>
                    <th className="py-2 text-right">{isEn ? 'Weight' : 'Tỷ trọng'}</th>
                    <th className="py-2 text-right">{isEn ? 'Shock %' : 'Tác động %'}</th>
                    <th className="py-2 text-right">{isEn ? 'P&L (VND)' : 'Lãi / Lỗ (VNĐ)'}</th>
                    <th className="py-2 text-right">{isEn ? 'Value After' : 'Giá trị sau'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-200 dark:divide-ink-800 tabular-nums">
                  {simulation.breakdown.map((b) => {
                    const pos = b.impactPct >= 0;
                    return (
                      <tr key={b.key}>
                        <td className="py-2 font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ASSET_META[b.key].color }} />
                          {isEn ? ASSET_META[b.key].en : ASSET_META[b.key].vi}
                        </td>
                        <td className="py-2 text-right">{b.normPct}%</td>
                        <td className={`py-2 text-right font-bold ${pos ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {pos ? '+' : ''}{b.impactPct}%
                        </td>
                        <td className={`py-2 text-right font-semibold ${pos ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {b.pnlVnd >= 0 ? '+' : ''}{fmtVnd(b.pnlVnd)}
                        </td>
                        <td className="py-2 text-right font-bold">{fmtVnd(b.afterVnd)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {aiReview && (
              <div className="p-4 rounded-xl border border-editorial-teal/40 bg-editorial-teal/5 text-xs whitespace-pre-wrap leading-relaxed">
                <div className="font-bold text-editorial-teal mb-1">
                  {isEn ? 'AI Macro Strategist Rebalancing Advice' : 'Khuyến nghị Tái cơ cấu từ Cố vấn Vĩ mô AI'}
                </div>
                {aiReview}
              </div>
            )}

            {/* Quick Live-Price Paper Trade Execution */}
            <div className="pt-3 border-t border-paper-200 dark:border-ink-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-ink-600 dark:text-ink-300">
                {isEn ? 'Execute 10M Virtual Paper Trade (Live Price, +5 VNE):' : 'Đặt nhanh lệnh Paper Trading 10M ảo (Giá thực, +5 VNE):'}
              </span>
              <div className="flex flex-wrap gap-2">
                {(['BTC', 'ADA', 'SJC', 'VNINDEX'] as PaperPosition['symbol'][]).map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => handleQuickPaperTrade(sym, 10_000_000)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    {isEn ? `Buy ${sym}` : `Mua ${sym}`}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 5. 6 INTERNATIONAL QUANTITATIVE MODELS SELECTOR */}
          <section className="p-5 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-4">
            <div className="space-y-1">
              <h2 className="font-serif text-lg font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#146EBE]" />
                {isEn
                  ? '5. Institutional Quantitative Models (6 Global Standards)'
                  : '5. Bộ 6 Mô hình Định lượng Chuẩn Quốc tế (Chọn công thức)'}
              </h2>
              <p className="text-xs text-ink-500">
                {isEn
                  ? 'Switch between globally recognized academic & institutional risk models to inspect your portfolio from 6 analytical angles.'
                  : 'Chuyển đổi giữa 6 mô hình tài chính định lượng kinh điển để soi chiếu danh mục dưới nhiều góc nhìn học thuật & quản trị rủi ro.'}
              </p>
            </div>

            {/* 6 Model Tabs */}
            <div className="flex flex-wrap gap-1.5">
              {QUANT_MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveModelId(m.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    activeModelId === m.id
                      ? 'bg-[#146EBE] text-white border-[#146EBE]'
                      : 'border-paper-300 dark:border-ink-700 text-ink-700 dark:text-ink-300 hover:border-[#146EBE]'
                  }`}
                >
                  {isEn ? m.shortEn : m.shortVi}
                </button>
              ))}
            </div>

            {/* Formula & Citation Box */}
            <div className="p-4 rounded-xl bg-ink-950 text-paper-50 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="font-bold text-sky-300">{isEn ? activeModelMeta.titleEn : activeModelMeta.titleVi}</span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-amber-300 font-semibold">
                  {activeModelMeta.citation}
                </span>
              </div>
              <div className="font-mono text-xs sm:text-sm text-emerald-300 py-1 overflow-x-auto">
                {activeModelMeta.formulaText}
              </div>
              <p className="text-[11px] text-paper-300 leading-relaxed">
                {isEn ? activeModelMeta.descEn : activeModelMeta.descVi}
              </p>
            </div>

            {/* MODEL 1: MARKOWITZ MPT */}
            {activeModelId === 'markowitz' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs tabular-nums">
                  <div className="p-3.5 rounded-xl bg-paper-100 dark:bg-ink-950 border border-paper-200 dark:border-ink-800">
                    <div className="text-ink-500">{isEn ? 'Covariance Volatility (σ_p)' : 'Độ biến động MPT (σ_p)'}</div>
                    <div className="text-xl font-extrabold text-[#146EBE]">{simulation.mpt.portfolioVolPct}%</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-paper-100 dark:bg-ink-950 border border-paper-200 dark:border-ink-800">
                    <div className="text-ink-500">{isEn ? 'Unhedged Linear Vol' : 'Biến động chưa đa dạng hóa'}</div>
                    <div className="text-xl font-extrabold text-ink-700 dark:text-paper-200">{simulation.mpt.linearVolPct}%</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <div className="text-emerald-700 dark:text-emerald-300">{isEn ? 'Diversification Benefit' : 'Rủi ro giảm nhờ Đa dạng hóa'}</div>
                    <div className="text-xl font-extrabold text-emerald-600">−{simulation.mpt.diversificationSavedPct}%</div>
                  </div>
                </div>
                <div className="overflow-x-auto text-[11px]">
                  <table className="w-full text-center border-collapse tabular-nums">
                    <thead>
                      <tr className="text-ink-500 border-b border-paper-200 dark:border-ink-800">
                        <th className="py-1.5 text-left">{isEn ? 'Correlation (ρ)' : 'Tương quan (ρ)'}</th>
                        {ASSET_ORDER.map((k) => (
                          <th key={k} className="py-1.5 uppercase">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-paper-200 dark:divide-ink-800">
                      {ASSET_ORDER.map((rowKey) => (
                        <tr key={rowKey}>
                          <td className="py-1.5 text-left font-bold uppercase">{rowKey}</td>
                          {ASSET_ORDER.map((colKey) => {
                            const corr = CORR_MATRIX[rowKey][colKey];
                            return (
                              <td
                                key={colKey}
                                className={`py-1.5 font-semibold ${
                                  corr < 0 ? 'text-emerald-600' : corr === 1 ? 'text-ink-400' : 'text-amber-600'
                                }`}
                              >
                                {corr.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* MODEL 2: VAR & CVAR */}
            {activeModelId === 'var_cvar' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs tabular-nums">
                <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <div className="text-amber-700 dark:text-amber-300 font-semibold">VaR 95% (1Y)</div>
                  <div className="text-lg font-extrabold text-amber-700 dark:text-amber-300">−{simulation.varCvar.var95Pct}%</div>
                  <div className="text-[11px] text-ink-500">−{fmtVnd(simulation.varCvar.var95Vnd)}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <div className="text-amber-700 dark:text-amber-300 font-semibold">CVaR 95% (Tail)</div>
                  <div className="text-lg font-extrabold text-amber-700 dark:text-amber-300">−{simulation.varCvar.cvar95Pct}%</div>
                  <div className="text-[11px] text-ink-500">−{fmtVnd(simulation.varCvar.cvar95Vnd)}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800">
                  <div className="text-rose-700 dark:text-rose-300 font-semibold">VaR 99% (Basel III)</div>
                  <div className="text-lg font-extrabold text-rose-600">−{simulation.varCvar.var99Pct}%</div>
                  <div className="text-[11px] text-ink-500">−{fmtVnd(simulation.varCvar.var99Vnd)}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800">
                  <div className="text-rose-700 dark:text-rose-300 font-semibold">CVaR 99% (Extreme)</div>
                  <div className="text-lg font-extrabold text-rose-600">−{simulation.varCvar.cvar99Pct}%</div>
                  <div className="text-[11px] text-ink-500">−{fmtVnd(simulation.varCvar.cvar99Vnd)}</div>
                </div>
              </div>
            )}

            {/* MODEL 3: MONTE CARLO GBM */}
            {activeModelId === 'monte_carlo' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-ink-500">{isEn ? 'Horizon:' : 'Kỳ hạn:'}</span>
                    {([1, 3, 5] as const).map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setMcYears(y)}
                        className={`px-2.5 py-1 rounded-lg font-bold border ${
                          mcYears === y ? 'bg-[#146EBE] text-white border-[#146EBE]' : 'border-paper-300 dark:border-ink-700'
                        }`}
                      >
                        {y} {isEn ? 'Yr' : 'Năm'}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMcSeed((s) => s + 997)}
                    className="px-3 py-1.5 rounded-lg bg-paper-200 dark:bg-ink-800 hover:bg-[#146EBE] hover:text-white font-bold inline-flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {isEn ? 'Re-run 500 Paths' : 'Chạy lại 500 kịch bản'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs tabular-nums">
                  <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800">
                    <div className="text-rose-700 dark:text-rose-300 font-semibold">{isEn ? 'P10 (Bearish 10%)' : 'Phân vị P10 (Bi quan)'}</div>
                    <div className="text-base font-extrabold text-rose-600 mt-0.5">{fmtVnd(simulation.mc.p10Vnd)}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-paper-100 dark:bg-ink-950 border border-paper-300 dark:border-ink-700">
                    <div className="text-ink-500 font-semibold">{isEn ? 'P50 (Median Outcome)' : 'Phân vị P50 (Trung vị)'}</div>
                    <div className="text-base font-extrabold text-[#146EBE] mt-0.5">{fmtVnd(simulation.mc.p50Vnd)}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                    <div className="text-emerald-700 dark:text-emerald-300 font-semibold">{isEn ? 'P90 (Bullish 90%)' : 'Phân vị P90 (Lạc quan)'}</div>
                    <div className="text-base font-extrabold text-emerald-600 mt-0.5">{fmtVnd(simulation.mc.p90Vnd)}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-xs tabular-nums pt-1">
                  <span>
                    {isEn ? 'Probability of Loss (< Capital):' : 'Xác suất Lỗ vốn (< Vốn gốc):'}{' '}
                    <strong className="text-rose-600">{simulation.mc.lossProbPct}%</strong>
                  </span>
                  <span>
                    {isEn ? 'Probability of 2x Wealth:' : 'Xác suất Nhân đôi Tài sản (2x):'}{' '}
                    <strong className="text-emerald-600">{simulation.mc.doubleProbPct}%</strong>
                  </span>
                </div>
              </div>
            )}

            {/* MODEL 4: APT MULTI-FACTOR BETA MATRIX */}
            {activeModelId === 'apt_factor' && (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left tabular-nums">
                  <thead>
                    <tr className="border-b border-paper-200 dark:border-ink-800 text-ink-500">
                      <th className="py-2">{isEn ? 'Asset Class' : 'Lớp Tài sản'}</th>
                      <th className="py-2 text-right">β Rate (+1%)</th>
                      <th className="py-2 text-right">β CPI (+1%)</th>
                      <th className="py-2 text-right">β USD/VND (+1%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-paper-200 dark:divide-ink-800">
                    {ASSET_ORDER.map((k) => {
                      const b = APT_BETAS[k];
                      return (
                        <tr key={k}>
                          <td className="py-2 font-bold">{isEn ? ASSET_META[k].en : ASSET_META[k].vi}</td>
                          <td className={`py-2 text-right font-semibold ${b.betaRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {b.betaRate > 0 ? `+${b.betaRate}` : b.betaRate}%
                          </td>
                          <td className={`py-2 text-right font-semibold ${b.betaCpi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {b.betaCpi > 0 ? `+${b.betaCpi}` : b.betaCpi}%
                          </td>
                          <td className={`py-2 text-right font-semibold ${b.betaFx >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {b.betaFx > 0 ? `+${b.betaFx}` : b.betaFx}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* MODEL 5: RISK PARITY / ALL-WEATHER */}
            {activeModelId === 'risk_parity' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 tabular-nums">
                  {ASSET_ORDER.map((k) => (
                    <div key={k} className="p-3 rounded-xl bg-paper-100 dark:bg-ink-950 border border-paper-200 dark:border-ink-800">
                      <div className="font-bold text-[11px] truncate">{isEn ? ASSET_META[k].en : ASSET_META[k].vi}</div>
                      <div className="text-lg font-extrabold text-[#146EBE]">{simulation.riskParityWeights[k]}%</div>
                      <div className="text-[10px] text-ink-500">
                        {isEn ? `Now: ${simulation.normMap[k]}%` : `Hiện tại: ${simulation.normMap[k]}%`}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setWeights(simulation.riskParityWeights);
                    onPointsChanged(
                      true,
                      isEn
                        ? 'Applied Risk Parity (Inverse-Volatility) optimal weights to your portfolio!'
                        : 'Đã áp dụng tỷ trọng tối ưu Risk Parity (Ngang bằng Rủi ro) vào danh mục!',
                    );
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {isEn ? 'Apply Risk Parity Weights to Portfolio' : 'Áp dụng tỷ trọng Risk Parity vào Danh mục'}
                </button>
              </div>
            )}

            {/* MODEL 6: KELLY CRITERION */}
            {activeModelId === 'kelly' && (
              <div className="space-y-3 text-xs tabular-nums">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-paper-100 dark:bg-ink-950 border border-paper-200 dark:border-ink-800">
                    <div className="text-ink-500">{isEn ? 'Full Kelly (f*)' : 'Full Kelly (Tối đa lý thuyết)'}</div>
                    <div className="text-xl font-extrabold text-[#146EBE]">{simulation.kelly.fullKellyPct}%</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <div className="text-emerald-700 dark:text-emerald-300">{isEn ? 'Safe Half-Kelly (½ f*)' : 'Half-Kelly Khuyến nghị (½ f*)'}</div>
                    <div className="text-xl font-extrabold text-emerald-600">{simulation.kelly.halfKellyPct}%</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-paper-100 dark:bg-ink-950 border border-paper-200 dark:border-ink-800">
                    <div className="text-ink-500">{isEn ? 'Your Risky Weight (Eq+Crypto)' : 'Tỷ trọng Rủi ro hiện tại (CP+Crypto)'}</div>
                    <div className="text-xl font-extrabold">{simulation.kelly.currentRiskyPct}%</div>
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-100/70 dark:bg-ink-950 font-semibold">
                  {simulation.kelly.status === 'negative_edge' &&
                    (isEn
                      ? 'Diagnosis: Expected return is below the risk-free rate (4.7%) under this shock — Kelly recommends 0% risky allocation (defensive cash/bonds/gold).'
                      : 'Chẩn đoán: Lợi suất kỳ vọng thấp hơn lãi suất phi rủi ro (4.7%) trong kịch bản này — Kelly khuyến nghị đưa tỷ trọng rủi ro về 0% (ưu tiên phòng thủ).')}
                  {simulation.kelly.status === 'over_leveraged' &&
                    (isEn
                      ? 'Diagnosis: Your risky weight exceeds Half-Kelly — consider trimming Crypto/Equities to reduce ruin risk.'
                      : 'Chẩn đoán: Tỷ trọng tài sản rủi ro vượt mức Half-Kelly an toàn — nên hạ bớt Crypto/Cổ phiếu để giảm rủi ro sụt giảm sâu.')}
                  {simulation.kelly.status === 'under_allocated' &&
                    (isEn
                      ? 'Diagnosis: Conservative allocation below Half-Kelly — room to add growth assets if your horizon is > 3 years.'
                      : 'Chẩn đoán: Danh mục đang thận trọng dưới ngưỡng Half-Kelly — còn dư địa tăng tài sản tăng trưởng nếu đầu tư > 3 năm.')}
                  {simulation.kelly.status === 'optimal' &&
                    (isEn
                      ? 'Diagnosis: Optimal sizing! Your risky allocation aligns closely with the Safe Half-Kelly frontier.'
                      : 'Chẩn đoán: Quy mô phân bổ tối ưu! Tỷ trọng rủi ro đang nằm sát vùng Half-Kelly an toàn.')}
                </div>
              </div>
            )}
          </section>

          {/* Stress-Test Run History */}
          {runs.length > 0 && (
            <section className="p-5 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-3">
              <h3 className="font-serif text-base font-bold flex items-center gap-2">
                <History className="w-4 h-4 text-[#146EBE]" />
                {isEn ? 'Saved Stress-Test Reports' : 'Lịch sử Báo cáo Stress-Test đã lưu'}
              </h3>
              <div className="space-y-2 text-xs tabular-nums">
                {runs.slice(0, 5).map((r) => (
                  <div key={r.id} className="p-3 rounded-xl border border-paper-200 dark:border-ink-800 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <strong>{r.scenarioName}</strong> • {fmtVnd(r.capitalVnd)}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-bold ${r.returnPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {r.returnPct >= 0 ? '+' : ''}{r.returnPct}% ({r.pnlVnd >= 0 ? '+' : ''}{fmtVnd(r.pnlVnd)})
                      </span>
                      <span className="text-ink-500">Sharpe {r.sharpe}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
