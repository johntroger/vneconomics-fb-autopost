import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Coins,
  ExternalLink,
  Filter,
  Flame,
  Layers,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { useTranslation } from '../../core/i18n/index.ts';
import { useSEO } from '../../core/seo/useSEO.ts';
import {
  connectCardanoWallet,
  connectEvmTestnetWallet,
  detectCardanoWallets,
  switchToBaseSepolia,
  type CardanoWalletState,
  type EvmWalletState,
} from '../web3/multiChainWalletService.ts';
import {
  buildOutcomeOrderBook,
  claimResolvedPredictionPosition,
  createCustomPredictionMarket,
  getPredictionActivity,
  getPredictionMarkets,
  getPredictionPositions,
  getPredictionWatchlist,
  placePredictionBetOnChain,
  PREDICTION_CATEGORIES,
  PREDICTIONS_UPDATED_EVENT,
  quoteBuyShares,
  quoteSellShares,
  sellPredictionPositionOnChain,
  togglePredictionWatchlist,
  type PredictionActivity,
  type PredictionCategory,
  type PredictionChainFamily,
  type PredictionMarket,
  type PredictionMarketType,
  type PredictionPosition,
  type PredictionSide,
  type PredictionStatus,
  type PredictionTxMode,
} from './predictionMarketService.ts';
import { validateNewMarketLocally } from './predictionOracleService.ts';

type SortMode = 'volume' | 'newest' | 'ending' | 'competitive';
type ChartTimeframe = '1H' | '6H' | '1D' | '1W' | '1M' | 'ALL';

const SemiGauge: React.FC<{ pct: number; isEn: boolean }> = ({ pct, isEn }) => {
  const clamped = Math.max(1, Math.min(99, pct));
  const radius = 24;
  const circumference = Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const stroke = clamped >= 60 ? '#10B981' : clamped <= 35 ? '#EF4444' : '#146EBE';

  return (
    <div className="flex flex-col items-center shrink-0">
      <svg width="60" height="36" viewBox="0 0 60 36" className="overflow-visible">
        <path
          d="M 6 32 A 24 24 0 0 1 54 32"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          className="text-paper-300 dark:text-ink-700"
        />
        <path
          d="M 6 32 A 24 24 0 0 1 54 32"
          fill="none"
          stroke={stroke}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <text
          x="30"
          y="29"
          textAnchor="middle"
          className="fill-ink-950 dark:fill-paper-50 text-[12px] font-bold"
        >
          {clamped}%
        </text>
      </svg>
      <span className="text-[10px] font-medium text-ink-500 -mt-1">
        {isEn ? 'chance' : 'xác suất'}
      </span>
    </div>
  );
};

const ProbabilityHistoryChart: React.FC<{
  market: PredictionMarket;
  timeframe: ChartTimeframe;
  onTimeframeChange: (tf: ChartTimeframe) => void;
  isEn: boolean;
}> = ({ market, timeframe, onTimeframeChange, isEn }) => {
  const tfSliceMap: Record<ChartTimeframe, number> = {
    '1H': 4,
    '6H': 6,
    '1D': 8,
    '1W': 10,
    '1M': 11,
    ALL: 12,
  };
  const take = tfSliceMap[timeframe];
  const width = 640;
  const height = 210;
  const padX = 28;
  const padY = 20;

  return (
    <div className="rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          {market.outcomes.map((o) => (
            <div key={o.id} className="inline-flex items-center gap-1.5 text-xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: o.color }} />
              <span className="text-ink-700 dark:text-paper-200">{isEn ? o.labelEn : o.labelVi}</span>
              <span className="font-bold text-ink-950 dark:text-paper-50">{o.yesPct}%</span>
            </div>
          ))}
        </div>

        <div className="inline-flex items-center rounded-lg bg-paper-100 dark:bg-ink-800 p-0.5 text-[11px] font-bold">
          {(['1H', '6H', '1D', '1W', '1M', 'ALL'] as ChartTimeframe[]).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => onTimeframeChange(tf)}
              className={`px-2 py-1 rounded-md transition-colors ${
                timeframe === tf
                  ? 'bg-paper-50 dark:bg-ink-700 text-[#146EBE] dark:text-sky-300 shadow-xs'
                  : 'text-ink-500 hover:text-ink-900 dark:hover:text-paper-100'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48">
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = padY + ((100 - pct) / 100) * (height - padY * 2);
            return (
              <g key={pct}>
                <line
                  x1={padX}
                  x2={width - 10}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="3 3"
                  className="text-paper-300 dark:text-ink-800"
                />
                <text
                  x={4}
                  y={y + 4}
                  className="fill-ink-400 text-[10px] font-medium"
                >
                  {pct}%
                </text>
              </g>
            );
          })}

          {market.outcomes.map((o) => {
            const pts = o.history.slice(-take);
            const stepX = (width - padX - 16) / Math.max(1, pts.length - 1);
            const pathD = pts
              .map((val, idx) => {
                const x = padX + idx * stepX;
                const y = padY + ((100 - val) / 100) * (height - padY * 2);
                return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
              })
              .join(' ');
            const lastX = padX + (pts.length - 1) * stepX;
            const lastY = padY + ((100 - pts[pts.length - 1]) / 100) * (height - padY * 2);
            return (
              <g key={o.id}>
                <path d={pathD} fill="none" stroke={o.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx={lastX} cy={lastY} r="4" fill={o.color} />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[11px] text-ink-500 pt-1 border-t border-paper-200 dark:border-ink-800">
        <span>
          {isEn ? 'Source' : 'Nguồn đối chiếu'}: <strong>{market.resolutionSourceLabel}</strong>
        </span>
        <span>
          {isEn ? 'AMM Testnet Pool Liquidity' : 'Thanh khoản AMM Testnet'}:{' '}
          <strong>{market.liquidityVne.toLocaleString()} VNE</strong>
        </span>
      </div>
    </div>
  );
};

export const PredictionMarketPage: React.FC = () => {
  const { isEn } = useTranslation();

  useSEO({
    title: isEn
      ? 'Prediction Market (Testnet Tokens) | VNEconomics'
      : 'Sàn Dự báo Kinh tế & Web3 (Token Testnet) | VNEconomics',
    description: isEn
      ? 'Polymarket-style prediction markets on Macro, Crypto, AI & Carbon Credits powered by EVM Sepolia & Cardano Preprod Testnet.'
      : 'Thị trường dự báo chuẩn Polymarket về Vĩ mô, Crypto, AI & Tín chỉ Carbon chạy bằng Token Testnet (EVM Sepolia & Cardano Preprod).',
    canonicalPath: '/du-bao/',
  });

  const [markets, setMarkets] = useState<PredictionMarket[]>(() => getPredictionMarkets());
  const [positions, setPositions] = useState<PredictionPosition[]>(() => getPredictionPositions());
  const [activity, setActivity] = useState<PredictionActivity[]>(() => getPredictionActivity());
  const [watchlist, setWatchlist] = useState<string[]>(() => getPredictionWatchlist());

  // Sidebar Filters (e-commerce style)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<PredictionCategory | 'all'>('all');
  const [chainFilter, setChainFilter] = useState<PredictionChainFamily[]>([]);
  const [statusFilter, setStatusFilter] = useState<PredictionStatus[]>(['active', 'resolved']);
  const [typeFilter, setTypeFilter] = useState<PredictionMarketType[]>([]);
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('volume');

  // Testnet Wallets
  const [evm, setEvm] = useState<EvmWalletState | null>(null);
  const [cardano, setCardano] = useState<CardanoWalletState | null>(null);
  const [cardanoWallets] = useState<string[]>(() => detectCardanoWallets());
  const [walletBusy, setWalletBusy] = useState(false);

  // Detail & Trade Ticket State
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null);
  const [tradeSide, setTradeSide] = useState<PredictionSide>('YES');
  const [tradeAction, setTradeAction] = useState<'buy' | 'sell'>('buy');
  const [tradeChain, setTradeChain] = useState<PredictionChainFamily>('evm');
  const [txMode, setTxMode] = useState<PredictionTxMode>('send-token');
  const [tokenAmount, setTokenAmount] = useState<number>(0.0005);
  const [cardanoTxInput, setCardanoTxInput] = useState('');
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('1M');
  const [detailTab, setDetailTab] = useState<'rules' | 'positions' | 'activity'>('rules');
  const [orderBookSide, setOrderBookSide] = useState<PredictionSide>('YES');
  const [tradeBusy, setTradeBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; msg: string; explorerUrl?: string } | null>(null);

  // Create Market Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [newType, setNewType] = useState<PredictionMarketType>('binary');
  const [newCategory, setNewCategory] = useState<PredictionCategory>('macro');
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newRules, setNewRules] = useState('');
  const [newSourceLabel, setNewSourceLabel] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newEndDate, setNewEndDate] = useState('2027-06-30');
  const [newOutcomesText, setNewOutcomesText] = useState('Phương án A\nPhương án B');
  const [createTxMode, setCreateTxMode] = useState<PredictionTxMode>('zero-gas');
  const [createBusy, setCreateBusy] = useState(false);

  useEffect(() => {
    const sync = () => {
      setMarkets(getPredictionMarkets());
      setPositions(getPredictionPositions());
      setActivity(getPredictionActivity());
      setWatchlist(getPredictionWatchlist());
    };
    window.addEventListener(PREDICTIONS_UPDATED_EVENT, sync);
    return () => window.removeEventListener(PREDICTIONS_UPDATED_EVENT, sync);
  }, []);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: markets.length };
    for (const c of PREDICTION_CATEGORIES) {
      if (c.id !== 'all') {
        counts[c.id] = markets.filter((m) => m.category === c.id).length;
      }
    }
    return counts;
  }, [markets]);

  const filteredMarkets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = markets.filter((m) => {
      if (categoryFilter !== 'all' && m.category !== categoryFilter) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(m.status)) return false;
      if (typeFilter.length > 0 && !typeFilter.includes(m.type)) return false;
      if (chainFilter.length > 0 && !chainFilter.some((c) => m.supportedChains.includes(c))) return false;
      if (watchlistOnly && !watchlist.includes(m.id)) return false;
      if (q) {
        const hay = `${m.titleVi} ${m.titleEn} ${m.subtitleVi} ${m.subtitleEn}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortMode === 'newest') return b.createdAt.localeCompare(a.createdAt);
      if (sortMode === 'ending') return a.endDate.localeCompare(b.endDate);
      if (sortMode === 'competitive') {
        const aDiff = Math.abs(50 - (a.outcomes[0]?.yesPct ?? 50));
        const bDiff = Math.abs(50 - (b.outcomes[0]?.yesPct ?? 50));
        return aDiff - bDiff;
      }
      return b.volumeVne - a.volumeVne;
    });
  }, [markets, categoryFilter, statusFilter, typeFilter, chainFilter, watchlistOnly, watchlist, searchQuery, sortMode]);

  const activeMarket = useMemo(
    () => markets.find((m) => m.id === selectedMarketId) ?? null,
    [markets, selectedMarketId],
  );

  const activeOutcome = useMemo(() => {
    if (!activeMarket) return null;
    return activeMarket.outcomes.find((o) => o.id === selectedOutcomeId) ?? activeMarket.outcomes[0] ?? null;
  }, [activeMarket, selectedOutcomeId]);

  const toggleArrFilter = <T,>(arr: T[], val: T, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const openMarketDetail = (market: PredictionMarket, outcomeId?: string, side: PredictionSide = 'YES') => {
    setSelectedMarketId(market.id);
    setSelectedOutcomeId(outcomeId || market.outcomes[0]?.id || null);
    setTradeSide(side);
    setOrderBookSide(side);
    setTradeAction('buy');
    setNotice(null);
  };

  const handleConnectEvm = async () => {
    setWalletBusy(true);
    try {
      const state = await connectEvmTestnetWallet();
      setEvm(state);
      setTradeChain('evm');
      setTokenAmount(0.0005);
      setNotice({
        ok: !state.isMainnetDanger,
        msg: state.isMainnetDanger
          ? isEn
            ? 'Mainnet blocked! Switch to Base Sepolia Testnet.'
            : 'Đã chặn Mainnet! Hãy chuyển sang mạng Base Sepolia Testnet.'
          : isEn
            ? `Connected ${state.walletName} (${state.networkName}).`
            : `Đã kết nối ${state.walletName} (${state.networkName}).`,
      });
    } catch (err) {
      setNotice({ ok: false, msg: err instanceof Error ? err.message : 'EVM connection failed.' });
    } finally {
      setWalletBusy(false);
    }
  };

  const handleConnectCardano = async (walletId: string) => {
    setWalletBusy(true);
    try {
      const state = await connectCardanoWallet(walletId);
      setCardano(state);
      setTradeChain('cardano');
      setTokenAmount(5);
      setNotice({
        ok: state.isTestnet,
        msg: state.isMainnetDanger
          ? isEn
            ? 'Cardano Mainnet blocked! Switch to Preprod Testnet.'
            : 'Đã chặn Cardano Mainnet! Hãy chuyển sang Preprod Testnet.'
          : isEn
            ? `Connected Cardano ${walletId.toUpperCase()} (Preprod).`
            : `Đã kết nối ví Cardano ${walletId.toUpperCase()} (Preprod).`,
      });
    } catch (err) {
      setNotice({ ok: false, msg: err instanceof Error ? err.message : 'Cardano connection failed.' });
    } finally {
      setWalletBusy(false);
    }
  };

  const handlePlaceBet = async () => {
    if (!activeMarket || !activeOutcome) return;
    setTradeBusy(true);
    setNotice(null);
    try {
      const { position, proof, bonusVnePoints } = await placePredictionBetOnChain({
        market: activeMarket,
        outcome: activeOutcome,
        side: tradeSide,
        chainFamily: tradeChain,
        txMode,
        tokenAmount,
        evmState: evm,
        cardanoState: cardano,
        cardanoSubmittedTxHash: cardanoTxInput,
      });
      setCardanoTxInput('');
      setDetailTab('positions');
      setNotice({
        ok: true,
        msg: isEn
          ? `Order filled: ${position.shares} ${position.side} shares @ ${position.avgPriceCents}¢ (+${bonusVnePoints} VNE Points)!`
          : `Khớp lệnh thành công: ${position.shares} cổ phần ${position.side} giá ${position.avgPriceCents}¢ (+${bonusVnePoints} VNE Points)!`,
        explorerUrl: proof.explorerUrl,
      });
    } catch (err) {
      setNotice({ ok: false, msg: err instanceof Error ? err.message : 'Transaction failed.' });
    } finally {
      setTradeBusy(false);
    }
  };

  const handleSellPosition = async (pos: PredictionPosition) => {
    const mkt = markets.find((m) => m.id === pos.marketId);
    const out = mkt?.outcomes.find((o) => o.id === pos.outcomeId) ?? mkt?.outcomes[0];
    if (!mkt || !out) return;
    setTradeBusy(true);
    try {
      const { proof, payoutVnePoints } = await sellPredictionPositionOnChain({
        position: pos,
        market: mkt,
        outcome: out,
        evmState: evm,
        cardanoState: cardano,
      });
      setNotice({
        ok: true,
        msg: isEn
          ? `Position closed early! Credited +${payoutVnePoints} VNE Points.`
          : `Đã bán chốt vị thế sớm! Cộng +${payoutVnePoints} VNE Points vào ví.`,
        explorerUrl: proof.explorerUrl,
      });
    } catch (err) {
      setNotice({ ok: false, msg: err instanceof Error ? err.message : 'Sell failed.' });
    } finally {
      setTradeBusy(false);
    }
  };

  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateBusy(true);
    setNotice(null);
    try {
      const outcomeLabels = newOutcomesText.split('\n').map((s) => s.trim()).filter(Boolean);
      const localCheck = validateNewMarketLocally({
        title: newTitle,
        type: newType,
        outcomeLabels,
        resolutionSourceUrl: newSourceUrl,
        endDate: newEndDate,
      });
      if (!localCheck.isValid) {
        throw new Error(localCheck.error || 'Invalid market fields.');
      }

      const { proof } = await createCustomPredictionMarket({
        type: newType,
        category: newCategory,
        title: newTitle,
        subtitle: newSubtitle,
        rules: newRules,
        resolutionSourceLabel: newSourceLabel,
        resolutionSourceUrl: newSourceUrl,
        endDate: newEndDate,
        outcomeLabels,
        chainFamily: tradeChain,
        txMode: createTxMode,
        seedTokenAmount: tradeChain === 'evm' ? 0.0005 : 5,
        evmState: evm,
        cardanoState: cardano,
        cardanoSubmittedTxHash: cardanoTxInput,
      });
      setCreateOpen(false);
      setNewTitle('');
      setNewSubtitle('');
      setNewRules('');
      setNotice({
        ok: true,
        msg: isEn
          ? 'Submitted! Your market is queued for AI & Admin approval (+15 VNE Points).'
          : 'Đã gửi đề xuất! Kèo mới đang chờ AI & Admin duyệt tại /admin/ (+15 VNE Points).',
        explorerUrl: proof.explorerUrl,
      });
    } catch (err) {
      setNotice({ ok: false, msg: err instanceof Error ? err.message : 'Create market failed.' });
    } finally {
      setCreateBusy(false);
    }
  };

  const tokenSymbol: 'tETH' | 'tADA' = tradeChain === 'evm' ? 'tETH' : 'tADA';
  const quickAmounts = tradeChain === 'evm' ? [0.0001, 0.0005, 0.001, 0.005] : [1, 5, 10, 25];

  const liveQuote = useMemo(() => {
    if (!activeOutcome) return null;
    return quoteBuyShares(activeOutcome, tradeSide, tokenAmount, tokenSymbol, txMode);
  }, [activeOutcome, tradeSide, tokenAmount, tokenSymbol, txMode]);

  const orderBook = useMemo(() => {
    if (!activeOutcome) return null;
    return buildOutcomeOrderBook(activeOutcome, orderBookSide);
  }, [activeOutcome, orderBookSide]);

  const marketPositions = useMemo(
    () => (activeMarket ? positions.filter((p) => p.marketId === activeMarket.id) : positions),
    [positions, activeMarket],
  );

  const marketActivity = useMemo(
    () => (activeMarket ? activity.filter((a) => a.marketId === activeMarket.id) : activity),
    [activity, activeMarket],
  );

  return (
    <div className="w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start">
        {/* Mobile/Tablet Filter Toggle */}
        <div className="w-full flex items-center justify-between lg:hidden">
          <button
            type="button"
            onClick={() => setMobileFilterOpen((v) => !v)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 text-xs font-bold shadow-xs"
          >
            <Filter className="w-3.5 h-3.5 text-[#146EBE]" />
            <span>
              {mobileFilterOpen
                ? isEn ? 'Hide Filters & Wallet' : 'Thu gọn Bộ lọc & Ví'
                : isEn ? 'Filters & Testnet Wallet' : 'Bộ lọc & Ví Testnet'}
            </span>
          </button>
          <span className="text-[11px] font-semibold text-ink-500">
            {filteredMarkets.length} {isEn ? 'markets' : 'kèo'}
          </span>
        </div>

        {/* LEFT SIDEBAR: E-Commerce Style Filter Sidebar */}
        <aside className={`${mobileFilterOpen ? 'block' : 'hidden'} lg:block w-full lg:w-72 shrink-0 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-4 space-y-5 lg:sticky lg:top-20`}>
          <div className="flex items-center gap-2 pb-3 border-b border-paper-200 dark:border-ink-800">
            <Filter className="w-4 h-4 text-[#146EBE]" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-ink-950 dark:text-paper-50">
              {isEn ? 'Prediction Filters' : 'Bộ lọc Sàn Dự báo'}
            </h2>
          </div>

          {/* Categories with Live Counts */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500 px-1">
              {isEn ? 'Market Categories' : 'Chủ đề Dự báo'}
            </div>
            {PREDICTION_CATEGORIES.map((cat) => {
              const active = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(cat.id);
                    setSelectedMarketId(null);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                    active
                      ? 'bg-[#146EBE]/10 text-[#146EBE] dark:bg-sky-500/15 dark:text-sky-300 font-bold'
                      : 'text-ink-700 dark:text-paper-300 hover:bg-paper-100 dark:hover:bg-ink-800 font-medium'
                  }`}
                >
                  <span className="truncate">{isEn ? cat.labelEn : cat.labelVi}</span>
                  <span className="text-[11px] tabular-nums opacity-80">({categoryCounts[cat.id] ?? 0})</span>
                </button>
              );
            })}
          </div>

          {/* Testnet Chains Checkbox */}
          <div className="space-y-2 pt-3 border-t border-paper-200 dark:border-ink-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500 px-1">
              {isEn ? 'Testnet Networks' : 'Mạng Testnet Hỗ trợ'}
            </div>
            {[
              { id: 'evm' as const, label: isEn ? 'EVM Sepolia (tETH)' : 'EVM Sepolia (tETH)' },
              { id: 'cardano' as const, label: isEn ? 'Cardano Preprod (tADA)' : 'Cardano Preprod (tADA)' },
            ].map((item) => (
              <label key={item.id} className="flex items-center gap-2.5 px-1 text-xs text-ink-800 dark:text-paper-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={chainFilter.includes(item.id)}
                  onChange={() => toggleArrFilter(chainFilter, item.id, setChainFilter)}
                  className="rounded border-paper-300 text-[#146EBE] focus:ring-[#146EBE]"
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>

          {/* Status & Market Type Checkboxes */}
          <div className="space-y-2 pt-3 border-t border-paper-200 dark:border-ink-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500 px-1">
              {isEn ? 'Status & Format' : 'Trạng thái & Loại kèo'}
            </div>
            <label className="flex items-center gap-2.5 px-1 text-xs text-ink-800 dark:text-paper-200 cursor-pointer">
              <input
                type="checkbox"
                checked={statusFilter.includes('active')}
                onChange={() => toggleArrFilter(statusFilter, 'active', setStatusFilter)}
                className="rounded border-paper-300 text-[#146EBE]"
              />
              <span>{isEn ? 'Active Markets' : 'Đang mở cược (Active)'}</span>
            </label>
            <label className="flex items-center gap-2.5 px-1 text-xs text-ink-800 dark:text-paper-200 cursor-pointer">
              <input
                type="checkbox"
                checked={statusFilter.includes('resolved')}
                onChange={() => toggleArrFilter(statusFilter, 'resolved', setStatusFilter)}
                className="rounded border-paper-300 text-[#146EBE]"
              />
              <span>{isEn ? 'Resolved (Claimable)' : 'Đã phân xử (Resolved)'}</span>
            </label>
            <label className="flex items-center gap-2.5 px-1 text-xs text-ink-800 dark:text-paper-200 cursor-pointer">
              <input
                type="checkbox"
                checked={typeFilter.includes('binary')}
                onChange={() => toggleArrFilter(typeFilter, 'binary', setTypeFilter)}
                className="rounded border-paper-300 text-[#146EBE]"
              />
              <span>{isEn ? 'Binary (Yes / No)' : 'Nhị phân (Yes / No)'}</span>
            </label>
            <label className="flex items-center gap-2.5 px-1 text-xs text-ink-800 dark:text-paper-200 cursor-pointer">
              <input
                type="checkbox"
                checked={typeFilter.includes('multi')}
                onChange={() => toggleArrFilter(typeFilter, 'multi', setTypeFilter)}
                className="rounded border-paper-300 text-[#146EBE]"
              />
              <span>{isEn ? 'Multi-Outcome' : 'Đa kịch bản (Multi)'}</span>
            </label>
          </div>

          {/* Testnet Wallet Box */}
          <div className="pt-3 border-t border-paper-200 dark:border-ink-800 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-ink-500">
              <span>{isEn ? 'Testnet Wallet ($0)' : 'Ví Testnet (0đ)'}</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            </div>

            {evm ? (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-[11px] space-y-1">
                <div className="font-bold text-emerald-700 dark:text-emerald-300 truncate">
                  {evm.walletName} • {evm.networkName}
                </div>
                <div className="font-mono text-ink-700 dark:text-paper-200">
                  {evm.address.slice(0, 6)}...{evm.address.slice(-4)}
                </div>
                {evm.isMainnetDanger && (
                  <button
                    type="button"
                    onClick={() => void switchToBaseSepolia().then(handleConnectEvm)}
                    className="mt-1 w-full py-1 rounded-lg bg-red-600 text-white font-bold"
                  >
                    {isEn ? 'Switch to Base Sepolia' : 'Chuyển sang Base Sepolia'}
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                disabled={walletBusy}
                onClick={() => void handleConnectEvm()}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-bold transition-colors"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>{isEn ? 'Connect EVM Sepolia' : 'Kết nối EVM Sepolia'}</span>
              </button>
            )}

            {cardano ? (
              <div className="rounded-xl bg-sky-500/10 border border-sky-500/30 p-2.5 text-[11px] space-y-1">
                <div className="font-bold text-sky-700 dark:text-sky-300">
                  Cardano {cardano.walletId.toUpperCase()} ({cardano.isTestnet ? 'Preprod' : 'MAINNET BLOCKED'})
                </div>
                <div className="font-mono text-ink-700 dark:text-paper-200 truncate">
                  {cardano.addressHex.slice(0, 14)}...
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(cardanoWallets.length > 0 ? cardanoWallets : ['lace', 'eternl']).slice(0, 3).map((wid) => (
                  <button
                    key={wid}
                    type="button"
                    disabled={walletBusy}
                    onClick={() => void handleConnectCardano(wid)}
                    className="flex-1 px-2 py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-800 text-[11px] font-semibold hover:border-[#146EBE] capitalize"
                  >
                    {wid} (tADA)
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* MAIN WORKSPACE */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Top Hero & Controls */}
          <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#146EBE]">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{isEn ? 'Polymarket-Style Testnet Sandbox' : 'Sàn Dự báo Kinh tế & Web3 (Testnet 0đ)'}</span>
              </div>
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-ink-950 dark:text-paper-50">
                {isEn
                  ? 'Prediction Markets — Trade Real-World Probabilities'
                  : 'Thị trường Dự báo — Đặt cược Xác suất bằng Token Testnet'}
              </h1>
              <p className="text-xs text-ink-600 dark:text-ink-400">
                {isEn
                  ? 'Hybrid Mode: Bet with real Testnet tokens (tETH/tADA) or 0-value gas signatures. Create community markets anytime.'
                  : 'Chế độ Hybrid: Chọn gửi Token Testnet thật (tETH/tADA) hoặc ký xác thực 0đ tiết kiệm Faucet. Tự do tạo kèo dự báo mới.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link
                to="/admin/"
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-800 hover:border-[#146EBE] text-xs font-bold transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#146EBE]" />
                <span>{isEn ? 'AI Oracle & Admin' : 'AI Oracle & Duyệt kèo'}</span>
              </Link>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-bold shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{isEn ? 'Create Market' : 'Tạo dự báo mới'}</span>
              </button>
            </div>
          </div>

          {notice && (
            <div
              className={`rounded-xl border px-4 py-3 text-xs flex flex-wrap items-center justify-between gap-2 ${
                notice.ok
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                  : 'border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-200'
              }`}
            >
              <span className="font-semibold">{notice.msg}</span>
              {notice.explorerUrl && (
                <a
                  href={notice.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold underline"
                >
                  <span>{isEn ? 'View Testnet Tx' : 'Xem giao dịch Testnet'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          {/* VIEW A: MARKET DETAIL + TRADE TICKET */}
          {activeMarket && activeOutcome ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedMarketId(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 text-xs font-bold hover:border-[#146EBE]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Back to All Markets' : 'Quay lại Sàn Dự báo'}</span>
                </button>

                <div className="flex items-center gap-2 text-xs text-ink-500">
                  <span>Vol: {activeMarket.volumeVne.toLocaleString()} VNE</span>
                  <span>•</span>
                  <span>
                    {isEn ? 'Closes' : 'Chốt sổ'}: {activeMarket.endDate}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 items-start">
                {/* Left Column: Header, Chart, Outcomes, Order Book, Rules/Positions/Activity */}
                <div className="space-y-4 min-w-0">
                  <div className="rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-[#146EBE]/10 text-[#146EBE] text-[10px] font-bold uppercase">
                        {activeMarket.category}
                      </span>
                      {activeMarket.isCommunityCreated && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                          {isEn ? 'Community Created' : 'Cộng đồng khởi tạo'}
                        </span>
                      )}
                      {activeMarket.status === 'resolved' && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                          {isEn ? 'Resolved: YES' : 'Đã phân xử: YES'}
                        </span>
                      )}
                    </div>
                    <h2 className="font-serif text-lg sm:text-xl font-bold text-ink-950 dark:text-paper-50">
                      {isEn ? activeMarket.titleEn : activeMarket.titleVi}
                    </h2>
                    <p className="text-xs text-ink-600 dark:text-ink-400">
                      {isEn ? activeMarket.subtitleEn : activeMarket.subtitleVi}
                    </p>
                    {activeMarket.creatorExplorerUrl && (
                      <a
                        href={activeMarket.creatorExplorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#146EBE] hover:underline"
                      >
                        <span>{isEn ? 'Creation Tx Proof' : 'Bằng chứng tạo kèo On-chain'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <ProbabilityHistoryChart
                    market={activeMarket}
                    timeframe={timeframe}
                    onTimeframeChange={setTimeframe}
                    isEn={isEn}
                  />

                  {/* Multi-Outcome Table */}
                  {activeMarket.type === 'multi' && (
                    <div className="rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 divide-y divide-paper-200 dark:divide-ink-800">
                      <div className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-500 flex justify-between">
                        <span>{isEn ? 'Outcome' : 'Kịch bản dự báo'}</span>
                        <span>{isEn ? 'Chance / Trade' : 'Xác suất / Đặt cược'}</span>
                      </div>
                      {activeMarket.outcomes.map((o) => {
                        const isSelected = o.id === activeOutcome.id;
                        return (
                          <div
                            key={o.id}
                            onClick={() => setSelectedOutcomeId(o.id)}
                            className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                              isSelected ? 'bg-[#146EBE]/5 dark:bg-sky-500/10' : 'hover:bg-paper-100 dark:hover:bg-ink-800/60'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: o.color }} />
                              <span className="text-xs sm:text-sm font-semibold truncate">{isEn ? o.labelEn : o.labelVi}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm font-extrabold tabular-nums w-10 text-right">{o.yesPct}%</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOutcomeId(o.id);
                                  setTradeSide('YES');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-600 text-emerald-700 hover:text-white dark:text-emerald-300 text-xs font-bold transition-colors"
                              >
                                Yes {o.yesPct}¢
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOutcomeId(o.id);
                                  setTradeSide('NO');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-600 text-rose-700 hover:text-white dark:text-rose-300 text-xs font-bold transition-colors"
                              >
                                No {100 - o.yesPct}¢
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Order Book */}
                  {orderBook && (
                    <div className="rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-ink-900 dark:text-paper-100">
                          {isEn ? 'Order Book' : 'Sổ lệnh (Order Book)'} — {isEn ? activeOutcome.labelEn : activeOutcome.labelVi}
                        </h3>
                        <div className="inline-flex rounded-lg bg-paper-100 dark:bg-ink-800 p-0.5 text-[11px] font-bold">
                          {(['YES', 'NO'] as PredictionSide[]).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setOrderBookSide(s)}
                              className={`px-2.5 py-1 rounded-md ${
                                orderBookSide === s
                                  ? 'bg-paper-50 dark:bg-ink-700 text-[#146EBE] shadow-xs'
                                  : 'text-ink-500'
                              }`}
                            >
                              {isEn ? `Trade ${s}` : `Cửa ${s}`}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 text-[10px] font-bold uppercase text-ink-400 px-2">
                        <span>{isEn ? 'Price' : 'Giá'}</span>
                        <span className="text-right">{isEn ? 'Shares' : 'Cổ phần'}</span>
                        <span className="text-right">{isEn ? 'Total (VNE)' : 'Tổng (VNE)'}</span>
                      </div>

                      <div className="space-y-1">
                        {orderBook.asks.map((lvl, idx) => (
                          <div
                            key={`ask-${idx}`}
                            className="grid grid-cols-3 text-xs px-2 py-1 rounded bg-rose-500/8 text-rose-700 dark:text-rose-300 font-mono"
                          >
                            <span className="font-bold">{lvl.priceCents}¢</span>
                            <span className="text-right">{lvl.shares}</span>
                            <span className="text-right">{lvl.totalVne}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-paper-100 dark:bg-ink-800 text-[11px] font-semibold text-ink-600 dark:text-ink-300">
                        <span>
                          {isEn ? 'Last' : 'Khớp gần nhất'}: <strong>{orderBook.lastPriceCents}¢</strong>
                        </span>
                        <span>
                          Spread: <strong>{orderBook.spreadCents}¢</strong>
                        </span>
                      </div>

                      <div className="space-y-1">
                        {orderBook.bids.map((lvl, idx) => (
                          <div
                            key={`bid-${idx}`}
                            className="grid grid-cols-3 text-xs px-2 py-1 rounded bg-emerald-500/8 text-emerald-700 dark:text-emerald-300 font-mono"
                          >
                            <span className="font-bold">{lvl.priceCents}¢</span>
                            <span className="text-right">{lvl.shares}</span>
                            <span className="text-right">{lvl.totalVne}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rules / Positions / Activity Tabs */}
                  <div className="rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 overflow-hidden">
                    <div className="flex border-b border-paper-200 dark:border-ink-800 text-xs font-bold">
                      {[
                        { id: 'rules' as const, label: isEn ? 'Rules & Oracle' : 'Quy tắc & Nguồn phân xử' },
                        { id: 'positions' as const, label: isEn ? `My Positions (${marketPositions.length})` : `Vị thế của tôi (${marketPositions.length})` },
                        { id: 'activity' as const, label: isEn ? `Live Activity (${marketActivity.length})` : `Hoạt động (${marketActivity.length})` },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setDetailTab(tab.id)}
                          className={`px-4 py-3 border-b-2 transition-colors ${
                            detailTab === tab.id
                              ? 'border-[#146EBE] text-[#146EBE]'
                              : 'border-transparent text-ink-500 hover:text-ink-900 dark:hover:text-paper-100'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="p-4 text-xs">
                      {detailTab === 'rules' && (
                        <div className="space-y-3">
                          <p className="text-ink-700 dark:text-paper-200 leading-relaxed">
                            {isEn ? activeMarket.rulesEn : activeMarket.rulesVi}
                          </p>
                          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-paper-200 dark:border-ink-800 text-ink-500">
                            <span>
                              {isEn ? 'Resolution Source' : 'Nguồn dữ liệu đối chiếu'}:{' '}
                              <a
                                href={activeMarket.resolutionSourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#146EBE] font-bold hover:underline inline-flex items-center gap-1"
                              >
                                {activeMarket.resolutionSourceLabel}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </span>
                            <span>
                              {isEn ? 'Treasury EVM' : 'Ví Treasury EVM'}:{' '}
                              <code className="font-mono text-[11px]">0x1A81...0C26</code>
                            </span>
                          </div>
                        </div>
                      )}

                      {detailTab === 'positions' && (
                        <div className="space-y-2.5">
                          {marketPositions.length === 0 ? (
                            <p className="text-ink-500">
                              {isEn
                                ? 'No Testnet positions on this market yet. Place an order on the right!'
                                : 'Chưa có vị thế Testnet nào trên sự kiện này. Hãy đặt lệnh ở khung bên phải!'}
                            </p>
                          ) : (
                            marketPositions.map((pos) => {
                              const sellQuote = quoteSellShares(activeOutcome, pos.side, pos.shares);
                              return (
                                <div
                                  key={pos.id}
                                  className="rounded-xl border border-paper-200 dark:border-ink-800 p-3 flex flex-wrap items-center justify-between gap-3"
                                >
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2 font-bold">
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] ${
                                          pos.side === 'YES'
                                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                        }`}
                                      >
                                        {pos.side}
                                      </span>
                                      <span>{isEn ? pos.outcomeLabelEn : pos.outcomeLabelVi}</span>
                                    </div>
                                    <div className="text-[11px] text-ink-500">
                                      {pos.shares} {isEn ? 'shares' : 'cổ phần'} @ {pos.avgPriceCents}¢ •{' '}
                                      {pos.txMode === 'send-token'
                                        ? `${pos.tokenAmount} ${pos.tokenSymbol}`
                                        : isEn
                                          ? '0-Token Gas Mode'
                                          : 'Chế độ 0 Token + Gas'}
                                    </div>
                                    <a
                                      href={pos.explorerUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] text-[#146EBE] hover:underline"
                                    >
                                      <span>{pos.network}</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {activeMarket.status === 'resolved' ? (
                                      pos.claimed ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                          {isEn ? 'Claimed' : 'Đã nhận thưởng'}
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const rew = claimResolvedPredictionPosition(pos, activeMarket);
                                            setNotice({
                                              ok: true,
                                              msg:
                                                rew > 0
                                                  ? isEn
                                                    ? `Claimed +${rew} VNE Points!`
                                                    : `Đã nhận thưởng +${rew} VNE Points!`
                                                  : isEn
                                                    ? 'Position settled (0 payout).'
                                                    : 'Vị thế đã tất toán (không trúng thưởng).',
                                            });
                                          }}
                                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold"
                                        >
                                          {isEn ? 'Claim Payout' : 'Nhận thưởng'}
                                        </button>
                                      )
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={tradeBusy}
                                        onClick={() => void handleSellPosition(pos)}
                                        className="px-3 py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 hover:border-rose-500 font-bold"
                                      >
                                        {isEn
                                          ? `Sell (~${Math.round(sellQuote.receiveVne)} VNE)`
                                          : `Bán sớm (~${Math.round(sellQuote.receiveVne)} VNE)`}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}

                      {detailTab === 'activity' && (
                        <div className="divide-y divide-paper-200 dark:divide-ink-800">
                          {marketActivity.length === 0 ? (
                            <p className="text-ink-500 py-2">
                              {isEn ? 'No activity recorded yet.' : 'Chưa có giao dịch gần đây.'}
                            </p>
                          ) : (
                            marketActivity.map((act) => (
                              <div key={act.id} className="py-2.5 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <span className="font-mono font-bold text-ink-900 dark:text-paper-100">{act.actor}</span>{' '}
                                  <span className="text-ink-600 dark:text-ink-400">
                                    {act.action} {act.shares} {act.side} ({isEn ? act.outcomeLabelEn : act.outcomeLabelVi}) @ {act.priceCents}¢
                                  </span>
                                </div>
                                <a
                                  href={act.explorerUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-semibold text-[#146EBE] hover:underline shrink-0 inline-flex items-center gap-1"
                                >
                                  <span>{act.txMode === 'send-token' ? `${act.tokenAmount} ${act.tokenSymbol}` : '0-Gas Sig'}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Sticky Polymarket Trade Ticket */}
                <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-4 space-y-4 xl:sticky xl:top-20 shadow-sm">
                  <div className="flex items-center justify-between border-b border-paper-200 dark:border-ink-800 pb-3">
                    <div className="flex items-center gap-3 text-xs font-extrabold">
                      <button
                        type="button"
                        onClick={() => setTradeAction('buy')}
                        className={`pb-1 border-b-2 ${
                          tradeAction === 'buy'
                            ? 'border-[#146EBE] text-[#146EBE]'
                            : 'border-transparent text-ink-500'
                        }`}
                      >
                        {isEn ? 'Buy' : 'Mua (Đặt cược)'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTradeAction('sell');
                          setDetailTab('positions');
                        }}
                        className={`pb-1 border-b-2 ${
                          tradeAction === 'sell'
                            ? 'border-[#146EBE] text-[#146EBE]'
                            : 'border-transparent text-ink-500'
                        }`}
                      >
                        {isEn ? 'Sell' : 'Bán sớm'}
                      </button>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-paper-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300">
                      AMM Market
                    </span>
                  </div>

                  {/* Selected Outcome Label */}
                  <div className="text-xs font-semibold text-ink-600 dark:text-ink-400">
                    {isEn ? 'Outcome' : 'Kịch bản'}:{' '}
                    <strong className="text-ink-950 dark:text-paper-50">
                      {isEn ? activeOutcome.labelEn : activeOutcome.labelVi}
                    </strong>
                  </div>

                  {/* YES / NO Toggle */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTradeSide('YES');
                        setOrderBookSide('YES');
                      }}
                      className={`py-2.5 rounded-xl text-xs font-extrabold border transition-all ${
                        tradeSide === 'YES'
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      Yes {activeOutcome.yesPct}¢
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTradeSide('NO');
                        setOrderBookSide('NO');
                      }}
                      className={`py-2.5 rounded-xl text-xs font-extrabold border transition-all ${
                        tradeSide === 'NO'
                          ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      No {100 - activeOutcome.yesPct}¢
                    </button>
                  </div>

                  {/* Chain Family Switch */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
                      {isEn ? 'Testnet Network' : 'Chọn mạng Testnet'}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setTradeChain('evm');
                          setTokenAmount(0.0005);
                        }}
                        className={`py-2 px-2 rounded-lg border ${
                          tradeChain === 'evm'
                            ? 'border-[#146EBE] bg-[#146EBE]/10 text-[#146EBE]'
                            : 'border-paper-300 dark:border-ink-700 text-ink-600 dark:text-ink-400'
                        }`}
                      >
                        EVM Sepolia (tETH)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTradeChain('cardano');
                          setTokenAmount(5);
                        }}
                        className={`py-2 px-2 rounded-lg border ${
                          tradeChain === 'cardano'
                            ? 'border-[#146EBE] bg-[#146EBE]/10 text-[#146EBE]'
                            : 'border-paper-300 dark:border-ink-700 text-ink-600 dark:text-ink-400'
                        }`}
                      >
                        Cardano Preprod (tADA)
                      </button>
                    </div>
                  </div>

                  {/* HYBRID MODE TOGGLE */}
                  <div className="rounded-xl border border-paper-200 dark:border-ink-800 bg-paper-100/70 dark:bg-ink-800/50 p-2.5 space-y-2">
                    <div className="text-[11px] font-bold text-ink-800 dark:text-paper-200">
                      {isEn ? 'Hybrid Testnet Execution Mode' : 'Chế độ Hybrid (Linh hoạt Faucet)'}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setTxMode('send-token')}
                        className={`py-1.5 px-2 rounded-lg border text-center ${
                          txMode === 'send-token'
                            ? 'bg-paper-50 dark:bg-ink-900 border-[#146EBE] text-[#146EBE] font-bold shadow-xs'
                            : 'border-transparent text-ink-500'
                        }`}
                      >
                        {isEn ? `Send ${tokenSymbol}` : `Gửi ${tokenSymbol} thật`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxMode('zero-gas')}
                        className={`py-1.5 px-2 rounded-lg border text-center ${
                          txMode === 'zero-gas'
                            ? 'bg-paper-50 dark:bg-ink-900 border-emerald-600 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs'
                            : 'border-transparent text-ink-500'
                        }`}
                      >
                        {isEn ? '0-Token + Gas' : '0 Token + Gas'}
                      </button>
                    </div>
                  </div>

                  {/* Amount Input */}
                  {tradeAction === 'buy' && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-ink-700 dark:text-paper-200">
                            {txMode === 'send-token'
                              ? isEn
                                ? `Stake Amount (${tokenSymbol})`
                                : `Mức cược (${tokenSymbol})`
                              : isEn
                                ? `Simulated Weight (${tokenSymbol})`
                                : `Quy mô lệnh (0đ gas, tính theo ${tokenSymbol})`}
                          </span>
                        </div>
                        <input
                          type="number"
                          step={tradeChain === 'evm' ? '0.0001' : '1'}
                          min={tradeChain === 'evm' ? '0.0001' : '1'}
                          value={tokenAmount}
                          onChange={(e) => setTokenAmount(Math.max(0, Number(e.target.value)))}
                          className="w-full px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950 text-sm font-bold tabular-nums focus:outline-none focus:border-[#146EBE]"
                        />
                        <div className="grid grid-cols-4 gap-1.5">
                          {quickAmounts.map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setTokenAmount(amt)}
                              className="py-1 rounded-lg bg-paper-100 dark:bg-ink-800 hover:bg-[#146EBE]/10 text-[11px] font-bold text-ink-700 dark:text-paper-200"
                            >
                              +{amt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {tradeChain === 'cardano' && (
                        <input
                          type="text"
                          value={cardanoTxInput}
                          onChange={(e) => setCardanoTxInput(e.target.value)}
                          placeholder={
                            isEn
                              ? 'Optional: paste Preprod txHash (or leave blank for CIP-8 sign)'
                              : 'Tùy chọn: dán Preprod txHash (hoặc để trống để ký CIP-8)'
                          }
                          className="w-full px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950 text-[11px]"
                        />
                      )}

                      {/* Live Quote Summary */}
                      {liveQuote && (
                        <div className="rounded-xl bg-paper-100 dark:bg-ink-800/70 p-3 space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-ink-500">{isEn ? 'Avg. Price' : 'Giá khớp TB'}</span>
                            <span className="font-bold tabular-nums">{liveQuote.avgPriceCents}¢</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-ink-500">{isEn ? 'Est. Shares' : 'Số cổ phần nhận'}</span>
                            <span className="font-bold tabular-nums">{liveQuote.shares}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-ink-500">{isEn ? 'To win (if right)' : 'Nhận nếu thắng'}</span>
                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {liveQuote.toWinVne.toLocaleString()} VNE
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] pt-1 border-t border-paper-200 dark:border-ink-700">
                            <span className="text-ink-500">{isEn ? 'Reward Bonus' : 'Thưởng học tập'}</span>
                            <span className="font-bold text-[#146EBE]">
                              +{txMode === 'send-token' ? 10 : 5} VNE Points
                            </span>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={tradeBusy || activeMarket.status === 'resolved'}
                        onClick={() => void handlePlaceBet()}
                        className="w-full py-3 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] disabled:opacity-50 text-white text-xs font-extrabold inline-flex items-center justify-center gap-2 shadow-sm transition-colors"
                      >
                        {tradeBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>
                          {activeMarket.status === 'resolved'
                            ? isEn
                              ? 'Market Resolved'
                              : 'Sự kiện đã phân xử'
                            : isEn
                              ? `Place ${tradeSide} Order (${txMode === 'send-token' ? `${tokenAmount} ${tokenSymbol}` : '0-Token Sig'})`
                              : `Đặt cược ${tradeSide} On-chain (${txMode === 'send-token' ? `${tokenAmount} ${tokenSymbol}` : 'Ký 0đ + Gas'})`}
                        </span>
                      </button>
                    </>
                  )}

                  {tradeAction === 'sell' && (
                    <div className="text-xs text-ink-600 dark:text-ink-300 space-y-2 py-2">
                      <p>
                        {isEn
                          ? 'Select any open position in the "My Positions" tab on the left to close early and lock in VNE Points.'
                          : 'Chọn vị thế đang mở ở tab "Vị thế của tôi" bên trái để bán sớm và thu hồi VNE Points theo giá thị trường.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* VIEW B: MARKET GRID */
            <div className="space-y-4">
              {/* Search & Sort Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isEn ? 'Search prediction markets...' : 'Tìm kiếm sự kiện dự báo...'}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 text-xs focus:outline-none focus:border-[#146EBE]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWatchlistOnly((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold ${
                      watchlistOnly
                        ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        : 'border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 text-ink-700 dark:text-paper-200'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{isEn ? `Watchlist (${watchlist.length})` : `Theo dõi (${watchlist.length})`}</span>
                  </button>

                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as SortMode)}
                    aria-label={isEn ? 'Sort markets' : 'Sắp xếp thị trường'}
                    className="px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 text-xs font-bold"
                  >
                    <option value="volume">{isEn ? 'Sort: Total Volume' : 'Sắp xếp: Khối lượng cao'}</option>
                    <option value="newest">{isEn ? 'Sort: Newest' : 'Sắp xếp: Mới nhất'}</option>
                    <option value="ending">{isEn ? 'Sort: Ending Soon' : 'Sắp xếp: Sắp chốt sổ'}</option>
                    <option value="competitive">{isEn ? 'Sort: Competitive (50/50)' : 'Sắp xếp: Kèo cân 50/50'}</option>
                  </select>
                </div>
              </div>

              {filteredMarkets.length === 0 ? (
                <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-10 text-center text-xs text-ink-500">
                  {isEn ? 'No prediction markets match your filters.' : 'Không có sự kiện dự báo nào khớp với bộ lọc hiện tại.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredMarkets.map((market) => {
                    const primaryOutcome = market.outcomes[0];
                    const isWatched = watchlist.includes(market.id);
                    return (
                      <article
                        key={market.id}
                        onClick={() => openMarketDetail(market)}
                        className="group rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 hover:border-[#146EBE] p-4 flex flex-col justify-between gap-4 cursor-pointer transition-all shadow-xs hover:shadow-md"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1.5 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-full bg-[#146EBE]/10 text-[#146EBE] text-[10px] font-bold uppercase">
                                  {market.category}
                                </span>
                                {market.isCommunityCreated && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                                    {isEn ? 'Community' : 'Cộng đồng'}
                                  </span>
                                )}
                                {market.status === 'resolved' && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                                    {isEn ? 'Resolved' : 'Đã chốt'}
                                  </span>
                                )}
                              </div>
                              <h3 className="text-sm font-bold text-ink-950 dark:text-paper-50 leading-snug line-clamp-2 group-hover:text-[#146EBE] transition-colors">
                                {isEn ? market.titleEn : market.titleVi}
                              </h3>
                            </div>

                            {market.type === 'binary' && primaryOutcome && (
                              <SemiGauge pct={primaryOutcome.yesPct} isEn={isEn} />
                            )}
                          </div>

                          {/* Binary Action Buttons */}
                          {market.type === 'binary' && primaryOutcome && (
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openMarketDetail(market, primaryOutcome.id, 'YES');
                                }}
                                className="py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-600 text-emerald-700 hover:text-white dark:text-emerald-300 text-xs font-extrabold transition-colors"
                              >
                                <span className="group-hover:hidden">Yes</span>
                                <span className="hidden group-hover:inline">Yes {primaryOutcome.yesPct}¢</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openMarketDetail(market, primaryOutcome.id, 'NO');
                                }}
                                className="py-2 rounded-xl bg-rose-500/15 hover:bg-rose-600 text-rose-700 hover:text-white dark:text-rose-300 text-xs font-extrabold transition-colors"
                              >
                                <span className="group-hover:hidden">No</span>
                                <span className="hidden group-hover:inline">No {100 - primaryOutcome.yesPct}¢</span>
                              </button>
                            </div>
                          )}

                          {/* Multi-Outcome Rows */}
                          {market.type === 'multi' && (
                            <div className="space-y-2 pt-1">
                              {market.outcomes.slice(0, 3).map((o) => (
                                <div key={o.id} className="flex items-center justify-between gap-2 text-xs">
                                  <span className="truncate font-medium text-ink-700 dark:text-paper-200 flex-1">
                                    {isEn ? o.labelEn : o.labelVi}
                                  </span>
                                  <span className="font-extrabold tabular-nums text-ink-950 dark:text-paper-50">
                                    {o.yesPct}%
                                  </span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openMarketDetail(market, o.id, 'YES');
                                      }}
                                      className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-600 text-emerald-700 hover:text-white dark:text-emerald-300 font-bold text-[11px]"
                                    >
                                      Yes
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openMarketDetail(market, o.id, 'NO');
                                      }}
                                      className="px-2 py-0.5 rounded bg-rose-500/15 hover:bg-rose-600 text-rose-700 hover:text-white dark:text-rose-300 font-bold text-[11px]"
                                    >
                                      No
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Card Footer */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-paper-200 dark:border-ink-800 text-[11px] text-ink-500">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 font-semibold">
                              <Coins className="w-3 h-3 text-amber-500" />
                              {market.volumeVne.toLocaleString()} VNE Vol.
                            </span>
                            <span>• {market.endDate}</span>
                          </div>
                          <button
                            type="button"
                            aria-label={isEn ? 'Bookmark market' : 'Lưu theo dõi'}
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePredictionWatchlist(market.id);
                            }}
                            className={`p-1 rounded hover:bg-paper-200 dark:hover:bg-ink-800 ${
                              isWatched ? 'text-amber-500' : 'text-ink-400'
                            }`}
                          >
                            <Bookmark className="w-3.5 h-3.5" fill={isWatched ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CREATE MARKET MODAL */}
      {createOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg rounded-2xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-paper-200 dark:border-ink-800 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#146EBE]" />
                <h2 className="font-serif text-lg font-bold">
                  {isEn ? 'Create Prediction Market (Testnet)' : 'Tạo Thị trường Dự báo mới (Testnet)'}
                </h2>
              </div>
              <button type="button" onClick={() => setCreateOpen(false)} className="p-1 rounded-lg hover:bg-paper-200 dark:hover:bg-ink-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleCreateMarket(e)} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewType('binary')}
                  className={`py-2 rounded-xl border font-bold inline-flex items-center justify-center gap-1.5 ${
                    newType === 'binary'
                      ? 'border-[#146EBE] bg-[#146EBE]/10 text-[#146EBE]'
                      : 'border-paper-300 dark:border-ink-700'
                  }`}
                >
                  <span>{isEn ? 'Binary (Yes / No)' : 'Nhị phân (Yes / No)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewType('multi')}
                  className={`py-2 rounded-xl border font-bold inline-flex items-center justify-center gap-1.5 ${
                    newType === 'multi'
                      ? 'border-[#146EBE] bg-[#146EBE]/10 text-[#146EBE]'
                      : 'border-paper-300 dark:border-ink-700'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Multi-Outcome' : 'Đa kịch bản'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold">{isEn ? 'Category' : 'Chuyên mục'}</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as PredictionCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
                  >
                    {PREDICTION_CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                      <option key={c.id} value={c.id}>
                        {isEn ? c.labelEn : c.labelVi}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold">{isEn ? 'Close Date' : 'Ngày chốt sổ'}</label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold">{isEn ? 'Market Question *' : 'Câu hỏi dự báo *'}</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={
                    isEn
                      ? 'e.g. Will Ethereum reach $5,000 before Q3 2027?'
                      : 'Ví dụ: Lãi suất huy động bình quân có giảm dưới 4.5% trong Q2/2027?'
                  }
                  className="w-full px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
                />
              </div>

              {newType === 'multi' && (
                <div className="space-y-1">
                  <label className="font-bold">
                    {isEn ? 'Outcomes (one per line, 2–5 options)' : 'Các kịch bản (mỗi dòng 1 lựa chọn, tối đa 5)'}
                  </label>
                  <textarea
                    rows={3}
                    value={newOutcomesText}
                    onChange={(e) => setNewOutcomesText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold">{isEn ? 'Resolution Rules' : 'Quy tắc phân xử kết quả'}</label>
                <textarea
                  rows={2}
                  value={newRules}
                  onChange={(e) => setNewRules(e.target.value)}
                  placeholder={
                    isEn
                      ? 'Specify exact resolution criteria and timestamp...'
                      : 'Mô tả điều kiện thắng/thua và nguồn đối chiếu chính thức...'
                  }
                  className="w-full px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newSourceLabel}
                  onChange={(e) => setNewSourceLabel(e.target.value)}
                  placeholder={isEn ? 'Source name (e.g. GSO, Fed)' : 'Tên nguồn (VD: GSO, Fed)'}
                  className="px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
                />
                <input
                  type="url"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
                />
              </div>

              {/* Hybrid mode for Create Market */}
              <div className="rounded-xl bg-paper-100 dark:bg-ink-800 p-3 space-y-2">
                <div className="font-bold">{isEn ? 'On-Chain Signature Mode' : 'Chế độ Ký Testnet khởi tạo kèo'}</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateTxMode('zero-gas')}
                    className={`py-1.5 rounded-lg border font-bold ${
                      createTxMode === 'zero-gas'
                        ? 'border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'border-transparent text-ink-500'
                    }`}
                  >
                    {isEn ? '0-Token + Gas (Save Faucet)' : '0 Token + Gas (Tiết kiệm Faucet)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateTxMode('send-token')}
                    className={`py-1.5 rounded-lg border font-bold ${
                      createTxMode === 'send-token'
                        ? 'border-[#146EBE] bg-[#146EBE]/10 text-[#146EBE]'
                        : 'border-transparent text-ink-500'
                    }`}
                  >
                    {isEn ? `Seed ${tradeChain === 'evm' ? '0.0005 tETH' : '5 tADA'}` : `Nạp ${tradeChain === 'evm' ? '0.0005 tETH' : '5 tADA'}`}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={createBusy}
                className="w-full py-2.5 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white font-extrabold inline-flex items-center justify-center gap-2"
              >
                {createBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isEn ? 'Sign & Publish Market on Testnet (+15 VNE)' : 'Ký ví Testnet & Đăng thị trường (+15 VNE)'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
