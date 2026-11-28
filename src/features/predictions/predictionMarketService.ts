import { getLanguage } from '../../core/i18n/i18nService.ts';
import { claimPracticePoints } from '../game/vneGameService.ts';
import {
  VNE_CARDANO_TESTNET_TREASURY,
  VNE_EVM_TREASURY_ADDRESS,
} from '../sim/simLabsService.ts';
import {
  executeCardanoTestnetOnChainAction,
  executeEvmTestnetOnChainAction,
  type CardanoWalletState,
  type EvmWalletState,
  type OnChainTestnetProof,
} from '../web3/multiChainWalletService.ts';

export type PredictionCategory = 'macro' | 'crypto' | 'ai-tech' | 'policy' | 'climate';
export type PredictionMarketType = 'binary' | 'multi';
export type PredictionStatus = 'active' | 'resolved' | 'pending_review' | 'rejected';
export type PredictionChainFamily = 'evm' | 'cardano';
export type PredictionTxMode = 'send-token' | 'zero-gas';
export type PredictionSide = 'YES' | 'NO';

export interface AiMarketModerationEval {
  verdict: 'approve' | 'needs_revision' | 'reject';
  score: number; // 0 - 100
  summary: string;
  criteria: {
    clarity: number;
    verifiability: number;
    timeline_validity: number;
    safety_compliance: number;
  };
  red_flags: string[];
  key_strengths: string[];
  suggested_notes: string;
  model: string;
  evaluated_at: string;
}

export interface AiOracleResolutionEval {
  suggested_verdict: 'YES' | 'NO' | 'UNCERTAIN';
  suggested_outcome_id?: string;
  confidence_score: number; // 0 - 100
  evidence_summary: string;
  live_data_snapshot?: string;
  source_urls: string[];
  red_flags: string[];
  model: string;
  scanned_at: string;
}

export interface PredictionOutcome {
  id: string;
  labelVi: string;
  labelEn: string;
  yesPct: number; // 1 - 99
  yesPool: number; // simulated AMM depth in VNE units
  noPool: number;
  color: string;
  history: number[]; // 12-point historical % series
}

export interface PredictionMarket {
  id: string;
  slug: string;
  type: PredictionMarketType;
  category: PredictionCategory;
  status: PredictionStatus;
  titleVi: string;
  titleEn: string;
  subtitleVi: string;
  subtitleEn: string;
  rulesVi: string;
  rulesEn: string;
  resolutionSourceLabel: string;
  resolutionSourceUrl: string;
  endDate: string; // YYYY-MM-DD
  volumeVne: number;
  liquidityVne: number;
  supportedChains: PredictionChainFamily[];
  outcomes: PredictionOutcome[];
  resolvedOutcomeId?: string;
  resolvedSide?: PredictionSide;
  outcomeResults?: Record<string, PredictionSide>;
  resolutionEvidenceUrl?: string;
  resolutionNote?: string;
  resolvedAt?: string;
  isCommunityCreated?: boolean;
  creatorAddress?: string;
  creatorTxHash?: string;
  creatorExplorerUrl?: string;
  aiModeration?: AiMarketModerationEval;
  aiOracleScan?: AiOracleResolutionEval;
  createdAt: string;
}

export interface PredictionPosition {
  id: string;
  marketId: string;
  outcomeId: string;
  outcomeLabelVi: string;
  outcomeLabelEn: string;
  marketTitleVi: string;
  marketTitleEn: string;
  side: PredictionSide;
  shares: number;
  avgPriceCents: number;
  costVneEquivalent: number;
  tokenAmount: number;
  tokenSymbol: 'tETH' | 'tADA';
  txMode: PredictionTxMode;
  chainFamily: PredictionChainFamily;
  network: string;
  txHash: string;
  explorerUrl: string;
  claimed?: boolean;
  createdAt: string;
}

export interface PredictionActivity {
  id: string;
  marketId: string;
  outcomeLabelVi: string;
  outcomeLabelEn: string;
  action: 'BUY' | 'SELL' | 'CREATE' | 'CLAIM';
  side?: PredictionSide;
  shares?: number;
  priceCents?: number;
  tokenAmount: number;
  tokenSymbol: 'tETH' | 'tADA';
  txMode: PredictionTxMode;
  actor: string;
  txHash: string;
  explorerUrl: string;
  createdAt: string;
}

export interface OrderBookLevel {
  priceCents: number;
  shares: number;
  totalVne: number;
}

export interface OutcomeOrderBook {
  asks: OrderBookLevel[];
  bids: OrderBookLevel[];
  lastPriceCents: number;
  spreadCents: number;
}

export const KEY_CUSTOM_MARKETS = 'vne_prediction_custom_markets_v1';
export const KEY_MARKET_OVERRIDES = 'vne_prediction_market_overrides_v1';
export const KEY_POSITIONS = 'vne_prediction_positions_v1';
export const KEY_ACTIVITY = 'vne_prediction_activity_v1';
export const KEY_WATCHLIST = 'vne_prediction_watchlist_v1';
export const PREDICTIONS_UPDATED_EVENT = 'vne:predictions-updated';

// Conversion rates to VNE unit (1 Share pays 100 VNE when resolved YES/NO correctly)
export const TOKEN_TO_VNE_RATE: Record<'tETH' | 'tADA', number> = {
  tETH: 60000, // 0.001 tETH = 60 VNE value
  tADA: 15, // 1 tADA = 15 VNE value
};

export const PREDICTION_CATEGORIES: Array<{
  id: PredictionCategory | 'all';
  labelVi: string;
  labelEn: string;
}> = [
  { id: 'all', labelVi: 'Tất cả Sự kiện', labelEn: 'All Markets' },
  { id: 'macro', labelVi: 'Kinh tế Vĩ mô & Lãi suất', labelEn: 'Macro & Interest Rates' },
  { id: 'crypto', labelVi: 'Crypto & Blockchain', labelEn: 'Crypto & Blockchain' },
  { id: 'ai-tech', labelVi: 'AI & Công nghệ', labelEn: 'AI & Tech' },
  { id: 'policy', labelVi: 'Chính sách & Thương mại', labelEn: 'Policy & Trade' },
  { id: 'climate', labelVi: 'Khí hậu & Tín chỉ Carbon', labelEn: 'Climate & Carbon' },
];

const DEFAULT_MARKETS: PredictionMarket[] = [
  {
    id: 'pm_fed_rate_q2',
    slug: 'fed-rate-cut-q2',
    type: 'binary',
    category: 'macro',
    status: 'active',
    titleVi: 'Fed có cắt giảm lãi suất điều hành thêm ít nhất 25 bps trước tháng 06/2027?',
    titleEn: 'Will the Federal Reserve cut policy rates by at least 25 bps before June 2027?',
    subtitleVi: 'Theo dõi kỳ vọng chính sách tiền tệ FOMC và tác động lên dòng vốn toàn cầu.',
    subtitleEn: 'Track FOMC monetary policy expectations and global liquidity impact.',
    rulesVi:
      'Thị trường phân xử YES nếu biên bản chính thức của FOMC công bố mức giảm tối thiểu 0.25% (25 điểm cơ bản) đối với lãi suất quỹ liên bang trước 23:59 UTC ngày 31/05/2027.',
    rulesEn:
      'Resolves YES if the official FOMC statement announces a cut of at least 25 bps to the target federal funds rate before May 31, 2027 23:59 UTC.',
    resolutionSourceLabel: 'Federal Reserve FOMC',
    resolutionSourceUrl: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
    endDate: '2027-05-31',
    volumeVne: 148200,
    liquidityVne: 42500,
    supportedChains: ['evm', 'cardano'],
    outcomes: [
      {
        id: 'fed_yes',
        labelVi: 'Fed cắt giảm ≥ 25 bps',
        labelEn: 'Fed cuts ≥ 25 bps',
        yesPct: 64,
        yesPool: 18000,
        noPool: 32000,
        color: '#10B981',
        history: [48, 51, 50, 54, 57, 55, 59, 61, 60, 63, 62, 64],
      },
    ],
    createdAt: '2026-11-10T08:00:00.000Z',
  },
  {
    id: 'pm_btc_target_2027',
    slug: 'bitcoin-price-milestone-2027',
    type: 'multi',
    category: 'crypto',
    status: 'active',
    titleVi: 'Mốc giá nào Bitcoin (BTC) sẽ chạm tới đầu tiên trong nửa đầu 2027?',
    titleEn: 'Which price milestone will Bitcoin (BTC) reach first in H1 2027?',
    subtitleVi: 'Tham chiếu giá giao ngay trung bình trên Coinbase & Binance (BTC/USDT).',
    subtitleEn: 'Referenced against spot index across Coinbase & Binance (BTC/USDT).',
    rulesVi:
      'Mỗi kịch bản được phân xử YES nếu giá đóng cửa nến 1H trên Binance Spot đạt hoặc vượt ngưỡng tương ứng (hoặc giảm xuống dưới ngưỡng đối với kịch bản giảm) trong giai đoạn hiệu lực.',
    rulesEn:
      'Each outcome resolves YES if a 1H candle close on Binance Spot reaches or crosses the stated threshold during the market window.',
    resolutionSourceLabel: 'CoinGecko / Binance Spot',
    resolutionSourceUrl: 'https://www.coingecko.com/en/coins/bitcoin',
    endDate: '2027-06-30',
    volumeVne: 294600,
    liquidityVne: 78000,
    supportedChains: ['evm', 'cardano'],
    outcomes: [
      {
        id: 'btc_120k',
        labelVi: '↑ Vượt mốc $120,000',
        labelEn: '↑ Above $120,000',
        yesPct: 58,
        yesPool: 21000,
        noPool: 29000,
        color: '#146EBE',
        history: [41, 44, 46, 49, 48, 52, 54, 53, 55, 57, 56, 58],
      },
      {
        id: 'btc_150k',
        labelVi: '↑ Vượt mốc $150,000',
        labelEn: '↑ Above $150,000',
        yesPct: 31,
        yesPool: 34500,
        noPool: 15500,
        color: '#F59E0B',
        history: [22, 24, 23, 25, 27, 26, 28, 29, 30, 29, 30, 31],
      },
      {
        id: 'btc_85k',
        labelVi: '↓ Kiểm định lại $85,000',
        labelEn: '↓ Retest $85,000',
        yesPct: 19,
        yesPool: 40500,
        noPool: 9500,
        color: '#EF4444',
        history: [28, 26, 25, 24, 22, 23, 21, 20, 21, 19, 20, 19],
      },
    ],
    createdAt: '2026-11-12T10:30:00.000Z',
  },
  {
    id: 'pm_vn_gdp_growth',
    slug: 'vietnam-gdp-growth-target',
    type: 'multi',
    category: 'macro',
    status: 'active',
    titleVi: 'Tăng trưởng GDP Việt Nam cả năm 2026 đạt vùng nào theo Tổng cục Thống kê?',
    titleEn: 'What range will Vietnam full-year 2026 GDP growth fall into (GSO)?',
    subtitleVi: 'Dự báo chỉ tiêu vĩ mô Việt Nam dựa trên số liệu xuất khẩu, FDI và tiêu dùng nội địa.',
    subtitleEn: 'Vietnam macro forecast based on exports, FDI disbursement, and domestic demand.',
    rulesVi:
      'Phân xử dựa trên Thông cáo báo chí Tình hình kinh tế - xã hội Quý IV và cả năm 2026 do Tổng cục Thống kê (GSO) công bố chính thức.',
    rulesEn:
      'Resolved according to the official Q4 and Full-Year 2026 Socio-Economic Report published by the General Statistics Office of Vietnam (GSO).',
    resolutionSourceLabel: 'General Statistics Office (GSO)',
    resolutionSourceUrl: 'https://www.gso.gov.vn/',
    endDate: '2027-01-15',
    volumeVne: 96400,
    liquidityVne: 31200,
    supportedChains: ['evm', 'cardano'],
    outcomes: [
      {
        id: 'gdp_65_70',
        labelVi: 'Từ 6.5% – 7.0%',
        labelEn: '6.5% – 7.0%',
        yesPct: 52,
        yesPool: 14400,
        noPool: 15600,
        color: '#059669',
        history: [45, 46, 48, 47, 49, 50, 51, 50, 52, 51, 52, 52],
      },
      {
        id: 'gdp_above_70',
        labelVi: 'Trên 7.0%',
        labelEn: 'Above 7.0%',
        yesPct: 34,
        yesPool: 19800,
        noPool: 10200,
        color: '#146EBE',
        history: [29, 30, 31, 32, 31, 33, 32, 34, 33, 34, 34, 34],
      },
      {
        id: 'gdp_below_65',
        labelVi: 'Dưới 6.5%',
        labelEn: 'Below 6.5%',
        yesPct: 14,
        yesPool: 25800,
        noPool: 4200,
        color: '#F97316',
        history: [26, 24, 21, 21, 20, 17, 17, 16, 15, 15, 14, 14],
      },
    ],
    createdAt: '2026-11-15T09:00:00.000Z',
  },
  {
    id: 'pm_carbon_tree_offset',
    slug: 'carbon-credit-verra-price-2027',
    type: 'binary',
    category: 'climate',
    status: 'active',
    titleVi: 'Giá tín chỉ Carbon tự nguyện (VCS Nature-Based) có vượt $18/tCO2e trong Q1/2027?',
    titleEn: 'Will Voluntary Nature-Based Carbon Credits (VCS) trade above $18/tCO2e in Q1 2027?',
    subtitleVi: 'Liên kết dữ liệu Sàn Tín chỉ Carbon & Dự án Yêu Trồng Cây.',
    subtitleEn: 'Linked with VNE Carbon Credit Exchange & Tree Planting Initiative.',
    rulesVi:
      'Phân xử YES nếu chỉ số tham chiếu Nature-Based Carbon Standard (Verra VCS) ghi nhận mức giao dịch đóng cửa ≥ $18.00/tCO2e trong tối thiểu 5 ngày giao dịch liên tiếp.',
    rulesEn:
      'Resolves YES if the Nature-Based Carbon Standard (Verra VCS) benchmark closes at or above $18.00/tCO2e for at least 5 consecutive trading days.',
    resolutionSourceLabel: 'Verra / Carbon Benchmark',
    resolutionSourceUrl: 'https://verra.org/',
    endDate: '2027-03-31',
    volumeVne: 68400,
    liquidityVne: 24000,
    supportedChains: ['evm', 'cardano'],
    outcomes: [
      {
        id: 'vcs_yes',
        labelVi: 'Vượt $18 / tCO2e',
        labelEn: 'Above $18 / tCO2e',
        yesPct: 71,
        yesPool: 8700,
        noPool: 21300,
        color: '#16A34A',
        history: [55, 57, 60, 62, 61, 64, 66, 68, 67, 69, 70, 71],
      },
    ],
    createdAt: '2026-11-18T11:20:00.000Z',
  },
  {
    id: 'pm_ai_agent_enterprise',
    slug: 'ai-agent-enterprise-adoption',
    type: 'binary',
    category: 'ai-tech',
    status: 'active',
    titleVi: 'Hơn 50% doanh nghiệp niêm yết VN30 công bố triển khai AI Agent nội bộ trước 09/2027?',
    titleEn: 'Will over 50% of VN30 listed firms announce internal AI Agent deployment before Sep 2027?',
    subtitleVi: 'Đo lường tốc độ chuyển đổi số doanh nghiệp bằng AI tự chủ & RAG.',
    subtitleEn: 'Measuring enterprise adoption of autonomous AI Agents & RAG workflows.',
    rulesVi:
      'Tính theo báo cáo thường niên hoặc thông cáo chuyển đổi số chính thức của ít nhất 16/30 doanh nghiệp trong rổ chỉ số VN30.',
    rulesEn:
      'Verified via official annual reports or digital transformation releases by at least 16 out of 30 VN30 constituent companies.',
    resolutionSourceLabel: 'HOSE / VN30 Annual Reports',
    resolutionSourceUrl: 'https://www.hsx.vn/',
    endDate: '2027-08-31',
    volumeVne: 82300,
    liquidityVne: 29500,
    supportedChains: ['evm', 'cardano'],
    outcomes: [
      {
        id: 'ai_yes',
        labelVi: '≥ 16/30 DN VN30 triển khai',
        labelEn: '≥ 16/30 VN30 firms adopt',
        yesPct: 68,
        yesPool: 9600,
        noPool: 20400,
        color: '#8B5CF6',
        history: [52, 54, 56, 58, 60, 61, 63, 64, 65, 66, 67, 68],
      },
    ],
    createdAt: '2026-11-20T07:45:00.000Z',
  },
  {
    id: 'pm_digital_asset_sandbox',
    slug: 'vn-digital-asset-legal-framework',
    type: 'binary',
    category: 'policy',
    status: 'resolved',
    resolvedOutcomeId: 'sandbox_yes',
    resolvedSide: 'YES',
    titleVi: 'Việt Nam ban hành khung pháp lý thí điểm (Sandbox) cho Tài sản số & Giao dịch Web3?',
    titleEn: 'Did Vietnam enact a regulatory Sandbox framework for Digital Assets & Web3?',
    subtitleVi: 'Kèo mẫu đã phân xử — người giữ cổ phần YES có thể Claim thưởng VNE Points.',
    subtitleEn: 'Resolved benchmark market — YES shareholders can claim VNE Points payout.',
    rulesVi:
      'Phân xử YES khi Nghị quyết hoặc Luật Công nghiệp Công nghệ số quy định hành lang thí điểm tài sản số được ban hành chính thức.',
    rulesEn:
      'Resolved YES upon official enactment of the Digital Technology Industry Law / Digital Asset Sandbox resolution.',
    resolutionSourceLabel: 'Cổng Thông tin Chính phủ',
    resolutionSourceUrl: 'https://chinhphu.vn/',
    endDate: '2026-11-01',
    volumeVne: 112500,
    liquidityVne: 35000,
    supportedChains: ['evm', 'cardano'],
    outcomes: [
      {
        id: 'sandbox_yes',
        labelVi: 'Ban hành khung Sandbox',
        labelEn: 'Sandbox Framework Enacted',
        yesPct: 100,
        yesPool: 1000,
        noPool: 49000,
        color: '#0EA5E9',
        history: [68, 72, 75, 79, 83, 86, 89, 92, 95, 98, 99, 100],
      },
    ],
    createdAt: '2026-10-01T08:00:00.000Z',
  },
];

function isEnLang(): boolean {
  return getLanguage() === 'en';
}

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(PREDICTIONS_UPDATED_EVENT));
  } catch {
    // Ignore storage quota errors
  }
}

export interface MarketStateOverride {
  volumeVne?: number;
  status?: PredictionStatus;
  resolvedOutcomeId?: string;
  resolvedSide?: PredictionSide;
  outcomeResults?: Record<string, PredictionSide>;
  resolutionEvidenceUrl?: string;
  resolutionNote?: string;
  resolvedAt?: string;
  aiModeration?: AiMarketModerationEval;
  aiOracleScan?: AiOracleResolutionEval;
  outcomes?: Array<{ id: string; yesPct: number; yesPool: number; noPool: number; history: number[] }>;
}

export function getPredictionMarkets(options?: { includePending?: boolean }): PredictionMarket[] {
  const custom = safeReadJson<PredictionMarket[]>(KEY_CUSTOM_MARKETS, []);
  const overrides = safeReadJson<Record<string, MarketStateOverride>>(KEY_MARKET_OVERRIDES, {});

  const merged = [...custom, ...DEFAULT_MARKETS].map((market) => {
    const ov = overrides[market.id];
    if (!ov) return market;
    return {
      ...market,
      volumeVne: ov.volumeVne ?? market.volumeVne,
      status: ov.status ?? market.status,
      resolvedOutcomeId: ov.resolvedOutcomeId ?? market.resolvedOutcomeId,
      resolvedSide: ov.resolvedSide ?? market.resolvedSide,
      outcomeResults: ov.outcomeResults ?? market.outcomeResults,
      resolutionEvidenceUrl: ov.resolutionEvidenceUrl ?? market.resolutionEvidenceUrl,
      resolutionNote: ov.resolutionNote ?? market.resolutionNote,
      resolvedAt: ov.resolvedAt ?? market.resolvedAt,
      aiModeration: ov.aiModeration ?? market.aiModeration,
      aiOracleScan: ov.aiOracleScan ?? market.aiOracleScan,
      outcomes: ov.outcomes
        ? market.outcomes.map((o) => {
            const matched = ov.outcomes?.find((x) => x.id === o.id);
            return matched ? { ...o, ...matched } : o;
          })
        : market.outcomes,
    };
  });

  if (options?.includePending) return merged;
  return merged.filter((m) => m.status === 'active' || m.status === 'resolved');
}

export function getPendingCustomMarkets(): PredictionMarket[] {
  return getPredictionMarkets({ includePending: true }).filter((m) => m.status === 'pending_review');
}

function updateMarketOverride(marketId: string, patch: Partial<MarketStateOverride>): void {
  const overrides = safeReadJson<Record<string, MarketStateOverride>>(KEY_MARKET_OVERRIDES, {});
  overrides[marketId] = {
    ...(overrides[marketId] || {}),
    ...patch,
  };
  safeWriteJson(KEY_MARKET_OVERRIDES, overrides);
}

export function saveMarketAiModeration(marketId: string, aiModeration: AiMarketModerationEval): void {
  updateMarketOverride(marketId, { aiModeration });
}

export function saveMarketAiOracleScan(marketId: string, aiOracleScan: AiOracleResolutionEval): void {
  updateMarketOverride(marketId, { aiOracleScan });
}

export function approvePendingMarket(marketId: string, note?: string): void {
  updateMarketOverride(marketId, {
    status: 'active',
    resolutionNote: note,
  });
}

export function rejectPendingMarket(marketId: string, reason: string): void {
  updateMarketOverride(marketId, {
    status: 'rejected',
    resolutionNote: reason,
  });
}

export function resolveMarketOutcome(params: {
  marketId: string;
  outcomeResults: Record<string, PredictionSide>;
  primaryOutcomeId: string;
  primarySide: PredictionSide;
  evidenceUrl?: string;
  note?: string;
}): void {
  const markets = getPredictionMarkets({ includePending: true });
  const target = markets.find((m) => m.id === params.marketId);
  const updatedOutcomes = target?.outcomes.map((o) => {
    const res = params.outcomeResults[o.id];
    const finalPct = res === 'YES' ? 100 : res === 'NO' ? 0 : o.yesPct;
    return {
      id: o.id,
      yesPct: finalPct,
      yesPool: finalPct === 100 ? 1000 : 49000,
      noPool: finalPct === 100 ? 49000 : 1000,
      history: [...o.history.slice(1), finalPct],
    };
  });

  updateMarketOverride(params.marketId, {
    status: 'resolved',
    resolvedOutcomeId: params.primaryOutcomeId,
    resolvedSide: params.primarySide,
    outcomeResults: params.outcomeResults,
    resolutionEvidenceUrl: params.evidenceUrl?.trim() || target?.resolutionSourceUrl,
    resolutionNote: params.note?.trim() || '',
    resolvedAt: new Date().toISOString(),
    outcomes: updatedOutcomes,
  });
}

export function getPredictionPositions(): PredictionPosition[] {
  return safeReadJson<PredictionPosition[]>(KEY_POSITIONS, []);
}

export function getPredictionActivity(): PredictionActivity[] {
  const stored = safeReadJson<PredictionActivity[]>(KEY_ACTIVITY, []);
  if (stored.length > 0) return stored;
  return [
    {
      id: 'act_seed_1',
      marketId: 'pm_fed_rate_q2',
      outcomeLabelVi: 'Fed cắt giảm ≥ 25 bps',
      outcomeLabelEn: 'Fed cuts ≥ 25 bps',
      action: 'BUY',
      side: 'YES',
      shares: 14.5,
      priceCents: 64,
      tokenAmount: 0.0005,
      tokenSymbol: 'tETH',
      txMode: 'send-token',
      actor: '0x71C...8a92',
      txHash: '0x8f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f12',
      explorerUrl: 'https://sepolia.basescan.org/',
      createdAt: '2026-11-27T12:10:00.000Z',
    },
    {
      id: 'act_seed_2',
      marketId: 'pm_btc_target_2027',
      outcomeLabelVi: '↑ Vượt mốc $120,000',
      outcomeLabelEn: '↑ Above $120,000',
      action: 'BUY',
      side: 'YES',
      shares: 25.8,
      priceCents: 58,
      tokenAmount: 5,
      tokenSymbol: 'tADA',
      txMode: 'zero-gas',
      actor: 'addr_test1...9k2m',
      txHash: 'a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192',
      explorerUrl: 'https://preprod.cardanoscan.io/',
      createdAt: '2026-11-27T11:42:00.000Z',
    },
  ];
}

export function getPredictionWatchlist(): string[] {
  return safeReadJson<string[]>(KEY_WATCHLIST, []);
}

export function togglePredictionWatchlist(marketId: string): string[] {
  const list = getPredictionWatchlist();
  const next = list.includes(marketId) ? list.filter((id) => id !== marketId) : [...list, marketId];
  safeWriteJson(KEY_WATCHLIST, next);
  return next;
}

export interface TradeQuote {
  shares: number;
  avgPriceCents: number;
  toWinVne: number;
  priceImpactPct: number;
  newYesPct: number;
  costVne: number;
}

/**
 * Constant-Product AMM (CPMM) share pricing quote for Binary/Outcome Yes-No pools.
 * 1 Share settles for 100 VNE-cents (= 1.00 VNE unit) if the predicted side wins.
 */
export function quoteBuyShares(
  outcome: PredictionOutcome,
  side: PredictionSide,
  tokenAmount: number,
  tokenSymbol: 'tETH' | 'tADA',
  txMode: PredictionTxMode,
): TradeQuote {
  const effectiveToken = tokenAmount > 0 ? tokenAmount : txMode === 'zero-gas' ? 0.0005 : 0;
  const baseVne = effectiveToken * TOKEN_TO_VNE_RATE[tokenSymbol];
  const costVne = Math.max(1, Number(baseVne.toFixed(2)));

  const currentYesPct = Math.min(99, Math.max(1, outcome.yesPct));
  const currentPriceCents = side === 'YES' ? currentYesPct : 100 - currentYesPct;

  const totalPool = Math.max(1000, outcome.yesPool + outcome.noPool);
  const slippageImpact = Math.min(8, (costVne / totalPool) * 100);
  const avgPriceCents = Number(Math.min(99.5, Math.max(1, currentPriceCents + slippageImpact * 0.5)).toFixed(1));

  // Shares = costVne / (avgPriceCents / 100)
  const shares = Number((costVne / (avgPriceCents / 100)).toFixed(2));
  const toWinVne = Number(shares.toFixed(2)); // 1 share = 1.00 VNE unit at settlement

  const shift = Math.max(0.2, Math.min(6, (costVne / totalPool) * 35));
  const newYesPct =
    side === 'YES'
      ? Math.min(98, Math.round(currentYesPct + shift))
      : Math.max(2, Math.round(currentYesPct - shift));

  return {
    shares,
    avgPriceCents,
    toWinVne,
    priceImpactPct: Number(slippageImpact.toFixed(2)),
    newYesPct,
    costVne,
  };
}

export function quoteSellShares(outcome: PredictionOutcome, side: PredictionSide, sharesToSell: number): {
  receiveVne: number;
  avgPriceCents: number;
} {
  const currentYesPct = Math.min(99, Math.max(1, outcome.yesPct));
  const bidCents = Math.max(1, (side === 'YES' ? currentYesPct : 100 - currentYesPct) - 0.5);
  const receiveVne = Number(((sharesToSell * bidCents) / 100).toFixed(2));
  return { receiveVne, avgPriceCents: bidCents };
}

export function buildOutcomeOrderBook(outcome: PredictionOutcome, tradeSide: PredictionSide): OutcomeOrderBook {
  const mid = tradeSide === 'YES' ? outcome.yesPct : 100 - outcome.yesPct;
  const clamp = (v: number) => Number(Math.min(99.5, Math.max(0.5, v)).toFixed(1));
  const spreadCents = 0.4;
  const bestAsk = clamp(mid + 0.2);
  const bestBid = clamp(mid - 0.2);

  const asks: OrderBookLevel[] = [3, 2, 1, 0].map((i) => {
    const priceCents = clamp(bestAsk + i * 0.5);
    const shares = Math.round(120 + i * 85 + (outcome.yesPool % 90));
    return { priceCents, shares, totalVne: Number(((priceCents / 100) * shares).toFixed(1)) };
  });

  const bids: OrderBookLevel[] = [0, 1, 2, 3].map((i) => {
    const priceCents = clamp(bestBid - i * 0.5);
    const shares = Math.round(140 + i * 95 + (outcome.noPool % 80));
    return { priceCents, shares, totalVne: Number(((priceCents / 100) * shares).toFixed(1)) };
  });

  return {
    asks,
    bids,
    lastPriceCents: clamp(mid),
    spreadCents,
  };
}

function toWeiHex(ethAmount: number): string {
  const wei = BigInt(Math.max(0, Math.round(ethAmount * 1e18)));
  return `0x${wei.toString(16)}`;
}

async function runHybridTestnetTx(params: {
  chainFamily: PredictionChainFamily;
  txMode: PredictionTxMode;
  tokenAmount: number;
  actionTag: string;
  evmState?: EvmWalletState | null;
  cardanoState?: CardanoWalletState | null;
  cardanoSubmittedTxHash?: string;
}): Promise<OnChainTestnetProof> {
  if (params.chainFamily === 'evm') {
    if (!params.evmState) {
      throw new Error(
        isEnLang()
          ? 'Please connect an EVM Testnet wallet (MetaMask / Rabby on Base or Ethereum Sepolia) first.'
          : 'Vui lòng kết nối ví EVM Testnet (MetaMask / Rabby trên Base hoặc Ethereum Sepolia) trước.',
      );
    }
    const valueWeiHex = params.txMode === 'send-token' ? toWeiHex(params.tokenAmount) : '0x0';
    return executeEvmTestnetOnChainAction({
      evm: params.evmState,
      toAddress: VNE_EVM_TREASURY_ADDRESS,
      actionTag: params.actionTag,
      valueWeiHex,
    });
  }

  if (!params.cardanoState) {
    throw new Error(
      isEnLang()
        ? 'Please connect a Cardano Preprod Testnet wallet (Lace / Eternl / Vespr) first.'
        : 'Vui lòng kết nối ví Cardano Preprod Testnet (Lace / Eternl / Vespr) trước.',
    );
  }
  return executeCardanoTestnetOnChainAction({
    cardano: params.cardanoState,
    actionTag: params.actionTag,
    submittedTxHash: params.cardanoSubmittedTxHash,
  });
}

function saveMarketOutcomeUpdate(marketId: string, outcomeId: string, newYesPct: number, addedVolumeVne: number): void {
  const markets = getPredictionMarkets();
  const target = markets.find((m) => m.id === marketId);
  if (!target) return;

  const overrides = safeReadJson<
    Record<
      string,
      {
        volumeVne: number;
        outcomes: Array<{ id: string; yesPct: number; yesPool: number; noPool: number; history: number[] }>;
      }
    >
  >(KEY_MARKET_OVERRIDES, {});

  const updatedOutcomes = target.outcomes.map((o) => {
    if (o.id !== outcomeId) {
      return { id: o.id, yesPct: o.yesPct, yesPool: o.yesPool, noPool: o.noPool, history: o.history };
    }
    const nextHistory = [...o.history.slice(1), newYesPct];
    return {
      id: o.id,
      yesPct: newYesPct,
      yesPool: Math.round((target.liquidityVne * (100 - newYesPct)) / 100),
      noPool: Math.round((target.liquidityVne * newYesPct) / 100),
      history: nextHistory,
    };
  });

  overrides[marketId] = {
    volumeVne: Math.round(target.volumeVne + addedVolumeVne),
    outcomes: updatedOutcomes,
  };
  safeWriteJson(KEY_MARKET_OVERRIDES, overrides);
}

export async function placePredictionBetOnChain(params: {
  market: PredictionMarket;
  outcome: PredictionOutcome;
  side: PredictionSide;
  chainFamily: PredictionChainFamily;
  txMode: PredictionTxMode;
  tokenAmount: number;
  evmState?: EvmWalletState | null;
  cardanoState?: CardanoWalletState | null;
  cardanoSubmittedTxHash?: string;
}): Promise<{ position: PredictionPosition; proof: OnChainTestnetProof; bonusVnePoints: number }> {
  const tokenSymbol: 'tETH' | 'tADA' = params.chainFamily === 'evm' ? 'tETH' : 'tADA';
  const quote = quoteBuyShares(params.outcome, params.side, params.tokenAmount, tokenSymbol, params.txMode);

  const actionTag = `PREDICT:${params.market.id}:${params.outcome.id}:${params.side}:${quote.shares}@${quote.avgPriceCents}c:${params.txMode}`;
  const proof = await runHybridTestnetTx({
    chainFamily: params.chainFamily,
    txMode: params.txMode,
    tokenAmount: params.tokenAmount,
    actionTag,
    evmState: params.evmState,
    cardanoState: params.cardanoState,
    cardanoSubmittedTxHash: params.cardanoSubmittedTxHash,
  });

  const actor =
    params.chainFamily === 'evm'
      ? `${params.evmState!.address.slice(0, 6)}...${params.evmState!.address.slice(-4)}`
      : `${params.cardanoState!.addressHex.slice(0, 10)}...${params.cardanoState!.addressHex.slice(-4)}`;

  const position: PredictionPosition = {
    id: `pos_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    marketId: params.market.id,
    outcomeId: params.outcome.id,
    outcomeLabelVi: params.outcome.labelVi,
    outcomeLabelEn: params.outcome.labelEn,
    marketTitleVi: params.market.titleVi,
    marketTitleEn: params.market.titleEn,
    side: params.side,
    shares: quote.shares,
    avgPriceCents: quote.avgPriceCents,
    costVneEquivalent: quote.costVne,
    tokenAmount: params.txMode === 'send-token' ? params.tokenAmount : 0,
    tokenSymbol,
    txMode: params.txMode,
    chainFamily: params.chainFamily,
    network: proof.network,
    txHash: proof.txHash,
    explorerUrl: proof.explorerUrl,
    createdAt: new Date().toISOString(),
  };

  const positions = getPredictionPositions();
  positions.unshift(position);
  safeWriteJson(KEY_POSITIONS, positions);

  const activity = getPredictionActivity();
  activity.unshift({
    id: `act_${Date.now()}`,
    marketId: params.market.id,
    outcomeLabelVi: params.outcome.labelVi,
    outcomeLabelEn: params.outcome.labelEn,
    action: 'BUY',
    side: params.side,
    shares: quote.shares,
    priceCents: quote.avgPriceCents,
    tokenAmount: position.tokenAmount,
    tokenSymbol,
    txMode: params.txMode,
    actor,
    txHash: proof.txHash,
    explorerUrl: proof.explorerUrl,
    createdAt: position.createdAt,
  });
  safeWriteJson(KEY_ACTIVITY, activity.slice(0, 50));

  saveMarketOutcomeUpdate(params.market.id, params.outcome.id, quote.newYesPct, quote.costVne);

  const bonusVnePoints = params.txMode === 'send-token' ? 10 : 5;
  claimPracticePoints(
    bonusVnePoints,
    isEnLang()
      ? `Prediction Market Trade (${params.side} ${params.outcome.labelEn})`
      : `Đặt cược Dự báo (${params.side} ${params.outcome.labelVi})`,
  );

  return { position, proof, bonusVnePoints };
}

export async function sellPredictionPositionOnChain(params: {
  position: PredictionPosition;
  market: PredictionMarket;
  outcome: PredictionOutcome;
  evmState?: EvmWalletState | null;
  cardanoState?: CardanoWalletState | null;
}): Promise<{ proof: OnChainTestnetProof; payoutVnePoints: number }> {
  const quote = quoteSellShares(params.outcome, params.position.side, params.position.shares);
  const proof = await runHybridTestnetTx({
    chainFamily: params.position.chainFamily,
    txMode: 'zero-gas',
    tokenAmount: 0,
    actionTag: `SELL_PREDICT:${params.position.marketId}:${params.position.id}:${params.position.shares}@${quote.avgPriceCents}c`,
    evmState: params.evmState,
    cardanoState: params.cardanoState,
  });

  const nextPositions = getPredictionPositions().filter((p) => p.id !== params.position.id);
  safeWriteJson(KEY_POSITIONS, nextPositions);

  const payoutVnePoints = Math.max(2, Math.round(quote.receiveVne));
  claimPracticePoints(
    payoutVnePoints,
    isEnLang()
      ? `Closed Prediction Position (+${payoutVnePoints} VNE)`
      : `Chốt vị thế Dự báo (+${payoutVnePoints} VNE)`,
  );

  const activity = getPredictionActivity();
  activity.unshift({
    id: `act_sell_${Date.now()}`,
    marketId: params.market.id,
    outcomeLabelVi: params.position.outcomeLabelVi,
    outcomeLabelEn: params.position.outcomeLabelEn,
    action: 'SELL',
    side: params.position.side,
    shares: params.position.shares,
    priceCents: quote.avgPriceCents,
    tokenAmount: 0,
    tokenSymbol: params.position.tokenSymbol,
    txMode: 'zero-gas',
    actor:
      params.position.chainFamily === 'evm' && params.evmState
        ? `${params.evmState.address.slice(0, 6)}...${params.evmState.address.slice(-4)}`
        : 'Testnet Trader',
    txHash: proof.txHash,
    explorerUrl: proof.explorerUrl,
    createdAt: new Date().toISOString(),
  });
  safeWriteJson(KEY_ACTIVITY, activity.slice(0, 50));

  return { proof, payoutVnePoints };
}

export function claimResolvedPredictionPosition(position: PredictionPosition, market: PredictionMarket): number {
  if (market.status !== 'resolved') return 0;
  const outcomeVerdict = market.outcomeResults?.[position.outcomeId];
  const won = outcomeVerdict
    ? outcomeVerdict === position.side
    : market.resolvedOutcomeId === position.outcomeId && market.resolvedSide === position.side;
  const reward = won ? Math.max(10, Math.round(position.shares)) : 0;

  const updated = getPredictionPositions().map((p) => (p.id === position.id ? { ...p, claimed: true } : p));
  safeWriteJson(KEY_POSITIONS, updated);

  if (reward > 0) {
    claimPracticePoints(
      reward,
      isEnLang() ? `Prediction Win Payout: ${market.titleEn}` : `Nhận thưởng Dự báo đúng: ${market.titleVi}`,
    );
  }
  return reward;
}

export async function createCustomPredictionMarket(params: {
  type: PredictionMarketType;
  category: PredictionCategory;
  title: string;
  subtitle: string;
  rules: string;
  resolutionSourceLabel: string;
  resolutionSourceUrl: string;
  endDate: string;
  outcomeLabels: string[];
  chainFamily: PredictionChainFamily;
  txMode: PredictionTxMode;
  seedTokenAmount: number;
  evmState?: EvmWalletState | null;
  cardanoState?: CardanoWalletState | null;
  cardanoSubmittedTxHash?: string;
}): Promise<{ market: PredictionMarket; proof: OnChainTestnetProof }> {
  const cleanTitle = params.title.trim();
  if (cleanTitle.length < 10) {
    throw new Error(
      isEnLang()
        ? 'Market question must be at least 10 characters.'
        : 'Câu hỏi dự báo cần tối thiểu 10 ký tự.',
    );
  }

  const labels =
    params.type === 'binary'
      ? [cleanTitle]
      : params.outcomeLabels.map((s) => s.trim()).filter(Boolean).slice(0, 5);

  if (params.type === 'multi' && labels.length < 2) {
    throw new Error(
      isEnLang()
        ? 'Multi-outcome markets require at least 2 outcomes.'
        : 'Kèo đa kịch bản cần ít nhất 2 lựa chọn.',
    );
  }

  const slug = `community-${Date.now().toString(36)}`;
  const proof = await runHybridTestnetTx({
    chainFamily: params.chainFamily,
    txMode: params.txMode,
    tokenAmount: params.seedTokenAmount,
    actionTag: `CREATE_MARKET:${slug}:${params.category}:${params.type}`,
    evmState: params.evmState,
    cardanoState: params.cardanoState,
    cardanoSubmittedTxHash: params.cardanoSubmittedTxHash,
  });

  const palette = ['#146EBE', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];
  const basePct = params.type === 'binary' ? 50 : Math.max(10, Math.round(100 / labels.length));

  const outcomes: PredictionOutcome[] = labels.map((lbl, idx) => ({
    id: `${slug}_opt_${idx}`,
    labelVi: lbl,
    labelEn: lbl,
    yesPct: basePct,
    yesPool: 5000,
    noPool: 5000,
    color: palette[idx % palette.length],
    history: Array.from({ length: 12 }, () => basePct),
  }));

  const creatorAddress =
    params.chainFamily === 'evm'
      ? params.evmState!.address
      : params.cardanoState!.addressHex;

  const market: PredictionMarket = {
    id: `pm_${slug}`,
    slug,
    type: params.type,
    category: params.category,
    status: 'pending_review',
    titleVi: cleanTitle,
    titleEn: cleanTitle,
    subtitleVi: params.subtitle.trim() || 'Thị trường dự báo do cộng đồng VNEconomics khởi tạo trên Testnet.',
    subtitleEn: params.subtitle.trim() || 'Community-created Testnet prediction market on VNEconomics.',
    rulesVi:
      params.rules.trim() ||
      'Phân xử dựa trên nguồn dữ liệu chính thức đã khai báo trước thời điểm đóng kèo.',
    rulesEn:
      params.rules.trim() ||
      'Resolved against the declared official source prior to market close.',
    resolutionSourceLabel: params.resolutionSourceLabel.trim() || 'Official Source',
    resolutionSourceUrl: params.resolutionSourceUrl.trim() || 'https://vneconomics.com/',
    endDate: params.endDate || '2027-06-30',
    volumeVne: Math.round(
      (params.txMode === 'send-token' ? params.seedTokenAmount : 0.0005) *
        TOKEN_TO_VNE_RATE[params.chainFamily === 'evm' ? 'tETH' : 'tADA'],
    ),
    liquidityVne: 10000,
    supportedChains: ['evm', 'cardano'],
    outcomes,
    isCommunityCreated: true,
    creatorAddress,
    creatorTxHash: proof.txHash,
    creatorExplorerUrl: proof.explorerUrl,
    createdAt: new Date().toISOString(),
  };

  const custom = safeReadJson<PredictionMarket[]>(KEY_CUSTOM_MARKETS, []);
  custom.unshift(market);
  safeWriteJson(KEY_CUSTOM_MARKETS, custom);

  claimPracticePoints(
    15,
    isEnLang() ? `Created Prediction Market (+15 VNE)` : `Tạo thị trường Dự báo mới (+15 VNE)`,
  );

  return { market, proof };
}

export const PREDICTION_TREASURY = {
  evm: VNE_EVM_TREASURY_ADDRESS,
  cardano: VNE_CARDANO_TESTNET_TREASURY,
};
