import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Coins, Cpu, TrendingUp, Wrench, ArrowUpCircle, CheckCircle2, Award, ShieldCheck } from 'lucide-react';
import {
  buySimAsset,
  claimDailyCheckin,
  getEconomySimState,
  getPointEvents,
  getPointsState,
  maintainAndHarvestAsset,
  placePaperTrade,
  REFERENCE_MARKET_PRICES,
  SIM_ASSET_CATALOG,
  updateLiveMarketPrices,
  upgradeSimAsset,
  type PaperPosition,
} from './vneGameService.ts';
import { computeLivePaperPrices, fetchMarketBundle } from '../market/marketFeedService.ts';
import { useTranslation } from '../../core/i18n/index.ts';
import { useSEO } from '../../core/seo/useSEO.ts';

const TIER_TITLES_EN: Record<number, string> = {
  1: 'Digital Economy Learner',
  2: 'On-chain Researcher',
  3: 'Digital Asset Strategist',
  4: 'VNE Master Architect',
};

const ASSET_NAMES_EN: Record<string, { name: string; desc: string }> = {
  validator_node: {
    name: 'Cardano / EVM Validator Node',
    desc: 'Operate a Testnet transaction validator node and earn steady VNE Points per cycle.',
  },
  ai_gpu_cluster: {
    name: 'AI Data Analytics GPU Cluster',
    desc: 'Process economic & market forecast models with higher yield and faster wear.',
  },
  digital_store: {
    name: 'Knowledge & E-Commerce Hub',
    desc: 'Automate distribution of digital research publications and courses.',
  },
  green_bond: {
    name: 'Green Economy Bond',
    desc: 'Sustainable simulation asset with minimal efficiency decay.',
  },
};

const MARKET_LABELS_EN: Record<PaperPosition['symbol'], string> = {
  SJC: 'SJC Gold (Tael)',
  BTC: 'Bitcoin (BTC)',
  ADA: 'Cardano (ADA)',
  VNINDEX: 'VN30 Index Fund (Cert)',
};

export const GameHubPage: React.FC = () => {
  const { isEn } = useTranslation();

  useSEO({
    title: isEn
      ? 'VNE Economy Sim, VNE Points & Testnet NFT Mint ($0) | VNEconomics'
      : 'VNE Mô phỏng, VNE Points & Đúc NFT Testnet (0đ) | VNEconomics',
    description: isEn
      ? 'Earn VNE Points from reading and practicing, operate simulated digital assets, Paper Trade at live market prices, and unlock books/Testnet NFTs for $0.'
      : 'Tích lũy VNE Points từ đọc bài và học tập, vận hành tài sản số mô phỏng, Paper Trading theo giá thị trường thật và mở khóa tài liệu/NFT Testnet 0đ.',
    canonicalPath: '/learn-and-earn/',
  });

  const [points, setPoints] = useState(() => getPointsState());
  const [events, setEvents] = useState(() => getPointEvents());
  const [sim, setSim] = useState(() => getEconomySimState());
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null);
  const [tradeSymbol, setTradeSymbol] = useState<PaperPosition['symbol']>('BTC');
  const [tradeAmount, setTradeAmount] = useState('10000000');
  const [livePricesTick, setLivePricesTick] = useState(0);

  React.useEffect(() => {
    let active = true;
    void fetchMarketBundle().then((bundle) => {
      if (!active) return;
      updateLiveMarketPrices(computeLivePaperPrices(bundle));
      setLivePricesTick((v) => v + 1);
    });
    return () => {
      active = false;
    };
  }, []);

  const refresh = (ok: boolean, msg: string) => {
    setPoints(getPointsState());
    setEvents(getPointEvents());
    setSim(getEconomySimState());
    setNotice({ ok, msg });
  };

  const handleCheckin = () => {
    const res = claimDailyCheckin();
    refresh(res.ok, res.message);
  };

  const handleTrade = (e: React.FormEvent) => {
    e.preventDefault();
    const res = placePaperTrade(tradeSymbol, Number(tradeAmount));
    refresh(res.ok, res.message);
  };

  const portfolioValueVnd = sim.positions.reduce(
    (sum, p) => sum + p.units * REFERENCE_MARKET_PRICES[p.symbol].priceVnd,
    sim.simCashVnd,
  );
  const tierDisplayTitle = isEn ? TIER_TITLES_EN[points.tierLevel] || points.tierTitle : points.tierTitle;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Status Banner */}
      <section className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            {isEn
              ? '100% Learning & Testnet Sandbox — Zero Real Money'
              : '100% Học tập & Testnet Sandbox — Không thu tiền thật'}
          </span>
          <h1 className="font-serif text-3xl font-bold text-ink-950 dark:text-paper-50">
            {isEn ? 'VNE Economy Sim & Learn-to-Earn Hub' : 'VNE Mô phỏng & Trung tâm Learn-to-Earn'}
          </h1>
          <p className="text-sm text-ink-600 dark:text-ink-400 max-w-2xl">
            {isEn ? (
              <>
                Earn <strong>VNE Points</strong> via daily check-ins, reading analyses, and running simulated digital assets to unlock research publications, AI Skills, and Testnet NFT Certificates.
              </>
            ) : (
              <>
                Kiếm <strong>VNE Points</strong> qua điểm danh, đọc bài phân tích và vận hành tài sản số để mở khóa tài liệu chuyên khảo, AI Skills và đúc Chứng chỉ NFT trên Testnet.
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="px-5 py-3 rounded-xl bg-paper-100 dark:bg-ink-950 border border-paper-300 dark:border-ink-800">
            <div className="text-[11px] uppercase tracking-wider text-ink-500">
              {isEn ? 'Current Balance' : 'Số dư hiện tại'}
            </div>
            <div className="text-2xl font-bold tabular-nums text-ink-950 dark:text-paper-50 flex items-center gap-1.5">
              <Coins className="w-5 h-5 text-amber-500" />
              {points.totalPoints} VNE
            </div>
            <div className="text-xs text-editorial-teal font-semibold mt-0.5">
              {isEn ? `Tier ${points.tierLevel}: ${tierDisplayTitle}` : `Cấp ${points.tierLevel}: ${points.tierTitle}`}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCheckin}
            className="px-5 py-3 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-bold transition-colors shadow-xs"
          >
            {isEn ? 'Daily Check-in +20 VNE' : 'Điểm danh nhận +20 VNE'}
            <span className="block text-[11px] font-normal opacity-80">
              {isEn ? `Streak: ${points.dailyStreak} days` : `Chuỗi: ${points.dailyStreak} ngày`}
            </span>
          </button>

          <Link
            to="/luyen-tap/"
            className="px-5 py-3 rounded-xl border border-[#146EBE] text-[#146EBE] dark:text-sky-300 dark:border-sky-500 hover:bg-[#146EBE]/10 text-xs font-bold transition-colors"
          >
            {isEn ? 'Practice Arena' : 'Đấu trường Luyện tập'}
            <span className="block text-[11px] font-normal opacity-80">Flashcard SM-2 • Quiz • Vault</span>
          </Link>
        </div>
      </section>

      {notice && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 border ${
            notice.ok
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice.msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Digital Assets Sim (Lazy State Evaluation) */}
        <section className="lg:col-span-7 space-y-5">
          <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold flex items-center gap-2">
                <Cpu className="w-5 h-5 text-editorial-teal" />
                {isEn ? `Active Digital Assets (${sim.assets.length})` : `Tài sản Số đang vận hành (${sim.assets.length})`}
              </h2>
              <span className="text-xs text-ink-500 tabular-nums">
                {isEn ? `Reputation EXP: ${sim.reputationExp}` : `EXP Uy tín: ${sim.reputationExp}`}
              </span>
            </div>

            <div className="space-y-3">
              {sim.assets.map((asset) => {
                const assetDisplayName = isEn ? ASSET_NAMES_EN[asset.kind]?.name || asset.name : asset.name;
                return (
                <div
                  key={asset.id}
                  className="p-4 rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-100 dark:bg-ink-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-sm text-ink-950 dark:text-paper-50">
                      {assetDisplayName}{' '}
                      <span className="text-xs px-2 py-0.5 rounded bg-editorial-teal/10 text-editorial-teal ml-1">
                        Lv.{asset.level}
                      </span>
                    </div>
                    <div className="text-xs text-ink-600 dark:text-ink-400 tabular-nums">
                      {isEn
                        ? `Efficiency: ${asset.efficiency}% • Yield: ${asset.baseYieldPerHour * asset.level} VNE/harvest`
                        : `Hiệu suất: ${asset.efficiency}% • Sản lượng: ${asset.baseYieldPerHour * asset.level} VNE/lượt`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const r = maintainAndHarvestAsset(asset.id);
                        refresh(r.ok, r.message);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-editorial-teal text-white text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      {isEn ? 'Harvest & Maintain' : 'Thu hoạch & Bảo trì'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const r = upgradeSimAsset(asset.id);
                        refresh(r.ok, r.message);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                      {isEn ? `Upgrade (${asset.level * 25} VNE)` : `Nâng (${asset.level * 25} VNE)`}
                    </button>
                  </div>
                </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-paper-200 dark:border-ink-800 space-y-2">
              <div className="text-xs font-semibold text-ink-700 dark:text-ink-400">
                {isEn ? 'Deploy Additional Digital Assets:' : 'Triển khai thêm Tài sản Số:'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(Object.keys(SIM_ASSET_CATALOG) as Array<keyof typeof SIM_ASSET_CATALOG>).map((kind) => {
                  const spec = SIM_ASSET_CATALOG[kind];
                  const enSpec = ASSET_NAMES_EN[kind];
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => {
                        const r = buySimAsset(kind);
                        refresh(r.ok, r.message);
                      }}
                      className="p-3 rounded-xl border border-paper-300 dark:border-ink-800 text-left hover:border-editorial-teal transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-ink-950 dark:text-paper-50">
                        <span>{isEn && enSpec ? enSpec.name : spec.name}</span>
                        <span className="text-amber-600 tabular-nums">{spec.costPoints} VNE</span>
                      </div>
                      <p className="text-[11px] text-ink-500 mt-1">{isEn && enSpec ? enSpec.desc : spec.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Paper Trading */}
          <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-xl font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-editorial-navy dark:text-sky-400" />
                {isEn ? 'Simulated Investing (Paper Trading $0)' : 'Đầu tư Mô phỏng (Paper Trading 0đ)'}
              </h2>
              <span className="text-xs font-mono tabular-nums text-editorial-teal" data-live-tick={livePricesTick}>
                {isEn
                  ? `Virtual Portfolio: ${Math.round(portfolioValueVnd).toLocaleString('en-US')} VND (Sim)`
                  : `Tổng tài sản ảo: ${Math.round(portfolioValueVnd).toLocaleString('vi-VN')} ₫`}
              </span>
            </div>

            <form onSubmit={handleTrade} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <select
                value={tradeSymbol}
                onChange={(e) => setTradeSymbol(e.target.value as PaperPosition['symbol'])}
                className="px-3 py-2 rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 text-xs"
              >
                {(Object.keys(REFERENCE_MARKET_PRICES) as PaperPosition['symbol'][]).map((sym) => (
                  <option key={sym} value={sym}>
                    {isEn ? MARKET_LABELS_EN[sym] : REFERENCE_MARKET_PRICES[sym].label} — {REFERENCE_MARKET_PRICES[sym].priceVnd.toLocaleString(isEn ? 'en-US' : 'vi-VN')} {isEn ? 'VND' : '₫'}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={100000}
                step={1000000}
                value={tradeAmount}
                onChange={(e) => setTradeAmount(e.target.value)}
                className="px-3 py-2 rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 text-xs tabular-nums"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-semibold transition-colors"
              >
                {isEn ? 'Place Order (+5 VNE)' : 'Đặt lệnh (+5 VNE)'}
              </button>
            </form>

            <div className="text-xs text-ink-600 dark:text-ink-400 tabular-nums">
              {isEn ? 'Available Virtual Cash: ' : 'Tiền mặt ảo khả dụng: '}
              <strong>
                {sim.simCashVnd.toLocaleString(isEn ? 'en-US' : 'vi-VN')} {isEn ? 'VND (Sim)' : '₫'}
              </strong>
            </div>

            {sim.positions.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sim.positions.map((pos) => (
                  <div key={pos.symbol} className="p-3 rounded-lg bg-paper-100 dark:bg-ink-950/60 border border-paper-300 dark:border-ink-800 text-xs tabular-nums">
                    <div className="font-bold">{isEn ? MARKET_LABELS_EN[pos.symbol] || pos.label : pos.label}</div>
                    <div className="text-ink-600 dark:text-ink-400">
                      {isEn
                        ? `Units: ${pos.units} • Entry Price: ${pos.entryPriceVnd.toLocaleString('en-US')} VND`
                        : `Số lượng: ${pos.units} • Giá vốn: ${pos.entryPriceVnd.toLocaleString('vi-VN')} ₫`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right: NFT Mint Gate + Points Ledger */}
        <aside className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-6 space-y-3">
            <div className="flex items-center gap-2 font-serif text-lg font-bold">
              <Award className="w-5 h-5 text-amber-500" />
              {isEn ? 'Mint Testnet Passport & Certificate NFTs' : 'Đúc NFT Hộ chiếu & Chứng chỉ Testnet'}
            </div>
            <p className="text-xs text-ink-600 dark:text-ink-400 leading-relaxed">
              {isEn ? (
                <>
                  Once you reach <strong>90 VNE Points</strong> or complete an Academy course, you qualify for a Voucher Nonce to mint your <strong>Digital Economy Passport NFT (VNE-PASSPORT)</strong> and <strong>Course Certificate NFT (VNE-CERT)</strong> on EVM Testnet / Cardano Preprod.
                </>
              ) : (
                <>
                  Khi đạt từ <strong>90 VNE Points</strong> trở lên hoặc hoàn thành khóa học trong Học viện, bạn đủ điều kiện nhận Voucher Nonce để đúc <strong>NFT Hộ chiếu Kinh tế số (VNE-PASSPORT)</strong> và <strong>NFT Chứng chỉ (VNE-CERT)</strong> trên EVM Testnet / Cardano Preprod (kết nối tại Giai đoạn 4).
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                to="/thu-vien-sach/"
                className="px-3.5 py-2 rounded-lg bg-editorial-teal text-white text-xs font-semibold"
              >
                {isEn ? 'Redeem VNE for Books & Skills' : 'Dùng VNE mở khóa Sách & AI Skills'}
              </Link>
              <Link
                to="/cardano-hub/"
                className="px-3.5 py-2 rounded-lg border border-paper-300 dark:border-ink-700 text-xs font-semibold"
              >
                {isEn ? 'Connect Testnet Wallet →' : 'Kết nối Ví Testnet →'}
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-6 space-y-3">
            <h3 className="font-bold text-sm text-ink-950 dark:text-paper-50">
              {isEn ? 'Recent VNE Points Activity' : 'Lịch sử VNE Points gần đây'}
            </h3>
            {events.length === 0 ? (
              <p className="text-xs text-ink-500">
                {isEn ? 'No activity yet. Try checking in or harvesting a Node!' : 'Chưa có biến động. Hãy thử điểm danh hoặc thu hoạch Node!'}
              </p>
            ) : (
              <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {events.slice(0, 15).map((ev) => (
                  <li
                    key={ev.id}
                    className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-paper-200 dark:border-ink-800 last:border-0"
                  >
                    <span className="text-ink-700 dark:text-ink-300 line-clamp-1">{ev.reason}</span>
                    <span
                      className={`font-mono font-bold tabular-nums shrink-0 ${
                        ev.delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {ev.delta >= 0 ? `+${ev.delta}` : ev.delta} VNE
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
