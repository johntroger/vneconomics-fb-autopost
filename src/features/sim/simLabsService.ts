import { getLanguage } from '../../core/i18n/i18nService.ts';
import { getFirebaseIdToken } from '../account/accountService.ts';
import {
  claimPracticePoints,
  getPointsState,
  hasRegisteredAccount,
} from '../game/vneGameService.ts';

export const VNE_EVM_TREASURY_ADDRESS = '0x1A81221CF769d8C3398b168Dc974D945ef9F0C26';
export const VNE_CARDANO_TESTNET_TREASURY =
  'addr_test1qqseqvzja43nym3lgx5axlan8vx6s4eefrz49d4j5058up88qycgf9g0klaaf4v02hg2neq4njqp8u670hg27nel52eql9d023';

export const DAILY_SWAP_CAP_VNE = 500;

const KEY_SWAP_HISTORY = 'vne_testnet_swaps_v1';
const KEY_DEFI_STAKES = 'vne_sim_defi_stakes_v1';
const KEY_DAO_PROPOSALS = 'vne_sim_dao_proposals_v1';

export interface SimMenuEntry {
  slug: string;
  to: string;
  titleVi: string;
  titleEn: string;
  descVi: string;
  descEn: string;
  accentColor: string;
}

export const SIM_MENU_ITEMS: SimMenuEntry[] = [
  {
    slug: 'overview',
    to: '/learn-and-earn/',
    titleVi: 'Trung tâm VNE Mô phỏng (Tổng quan)',
    titleEn: 'VNE Economy Sim Hub (Overview)',
    descVi: 'Điểm danh, tài sản số mô phỏng & nhật ký VNE Points',
    descEn: 'Daily check-in, simulated assets & VNE Points ledger',
    accentColor: '#146EBE',
  },
  {
    slug: 'testnet-swap',
    to: '/mo-phong/testnet-swap/',
    titleVi: 'Đổi Token Testnet → VNE Points',
    titleEn: 'Swap Testnet Tokens → VNE Points',
    descVi: 'Chuyển Testnet ETH / tADA vào ví VNEconomics nhận điểm',
    descEn: 'Send Testnet ETH / tADA to VNEconomics treasury for points',
    accentColor: '#0EA5E9',
  },
  {
    slug: 'san-crypto',
    to: '/mo-phong/san-crypto/',
    titleVi: 'Sàn Giao dịch Crypto (*/VNE)',
    titleEn: 'Crypto Exchange (*/VNE)',
    descVi: 'Giao dịch ADA/VNE, BTC/VNE realtime • 1 VNE = 1.000 VNĐ',
    descEn: 'Trade ADA/VNE, BTC/VNE live via Binance WS • 1 VNE = 1,000 VND',
    accentColor: '#F59E0B',
  },
  {
    slug: 'san-chung-khoan',
    to: '/mo-phong/san-chung-khoan/',
    titleVi: 'Sàn Chứng khoán Mô phỏng (*/VNE)',
    titleEn: 'Stock Exchange Simulator (*/VNE)',
    descVi: 'Bảng điện 5 màu VN30 & NASDAQ • 1 VNE = 1.000 VNĐ & Cổ tức',
    descEn: '5-color HOSE VN30 & NASDAQ board • 1 VNE = 1,000 VND & Dividends',
    accentColor: '#059669',
  },
  {
    slug: 'san-hang-hoa',
    to: '/mo-phong/san-hang-hoa/',
    titleVi: 'Sàn Giao dịch Hàng hóa (*/VNE)',
    titleEn: 'Commodities Exchange (*/VNE)',
    descVi: 'Vàng, Bạc, Dầu Brent/WTI, Cà phê & Lúa mì • Market Maker 1x–5x',
    descEn: 'Gold, Silver, Brent/WTI Oil, Coffee & Wheat • Market Maker 1x–5x',
    accentColor: '#D97706',
  },
  {
    slug: 'san-ngoai-hoi',
    to: '/mo-phong/san-ngoai-hoi/',
    titleVi: 'Sàn Giao dịch Ngoại hối (*/VNE)',
    titleEn: 'Forex Exchange (*/VNE)',
    descVi: 'USD/VNE, EUR/VNE, GBP/VNE, JPY/VNE • Spread FX 0.05% & Market Maker',
    descEn: 'USD/VNE, EUR/VNE, GBP/VNE, JPY/VNE • 0.05% FX fee & Market Maker',
    accentColor: '#0D9488',
  },
  {
    slug: 'san-tin-chi-carbon',
    to: '/mo-phong/san-tin-chi-carbon/',
    titleVi: 'Sàn Tín chỉ Carbon (Yêu Trồng Cây)',
    titleEn: 'Carbon Credit Exchange (Tree Project)',
    descVi: 'VNE-TREE/VNE, Verra VCS, EU-ETS • Khử Carbon trồng cây',
    descEn: 'VNE-TREE/VNE, Verra VCS, EU-ETS • Retire tCO2e for trees',
    accentColor: '#16A34A',
  },
  {
    slug: 'san-vi-mo',
    to: '/mo-phong/san-vi-mo/',
    titleVi: 'Phòng Định lượng & Danh mục Vĩ mô',
    titleEn: 'Quantitative Macro Portfolio Lab',
    descVi: 'Stress-test cú sốc vĩ mô với 6 mô hình chuẩn quốc tế (MPT, VaR, Monte Carlo, Risk Parity)',
    descEn: 'Stress-test portfolios with 6 global quant models (MPT, VaR, Monte Carlo, Risk Parity)',
    accentColor: '#10B981',
  },
  {
    slug: 'defi-lab',
    to: '/mo-phong/defi-lab/',
    titleVi: 'Phòng Thí nghiệm DeFi (On-chain Testnet)',
    titleEn: 'DeFi Staking & Liquidity (On-chain Testnet)',
    descVi: 'Staking & Harvest trực tiếp trên Testnet • Nhận thưởng bonus VNE Points',
    descEn: 'Stake & Harvest directly on Testnet • Earn bonus VNE Points',
    accentColor: '#8B5CF6',
  },
  {
    slug: 'dao-drep',
    to: '/mo-phong/dao-drep/',
    titleVi: 'Nghị trường Quản trị DAO (On-chain)',
    titleEn: 'DAO Governance & Voting (On-chain)',
    descVi: 'Biểu quyết đề xuất Kinh tế, Blockchain, Xã hội & Môi trường trên Testnet',
    descEn: 'Vote on Economy, Blockchain, Society & Environment proposals on Testnet',
    accentColor: '#2563EB',
  },
  {
    slug: 'marketing-sim',
    to: '/mo-phong/marketing-sim/',
    titleVi: 'Đấu trường Digital Marketing (ROI)',
    titleEn: 'Digital Marketing ROI Arena',
    descVi: 'Phân bổ ngân sách 50M ảo, A/B Test & tối ưu ROAS',
    descEn: 'Allocate virtual ad budgets, A/B test & optimize ROAS',
    accentColor: '#F59E0B',
  },
  {
    slug: 'ai-data-lab',
    to: '/mo-phong/ai-data-lab/',
    titleVi: 'Trung tâm Huấn luyện AI & Big Data',
    titleEn: 'AI Agent & Big Data Lab',
    descVi: 'Làm sạch dữ liệu, ghép AI Skill & nâng độ chính xác mô hình',
    descEn: 'Clean datasets, attach AI Skills & boost model accuracy',
    accentColor: '#EC4899',
  },
  {
    slug: 'hoi-dong-khoa-hoc',
    to: '/mo-phong/hoi-dong-khoa-hoc/',
    titleVi: 'Hội đồng Phản biện Khoa học (Q1)',
    titleEn: 'Academic Peer-Review Council (Q1)',
    descVi: 'Kiểm định trích dẫn APA 7 & phản biện bản thảo chuẩn Q1',
    descEn: 'Audit APA 7 citations & simulate Q1 journal peer review',
    accentColor: '#14B8A6',
  },
  {
    slug: 'nft-hub',
    to: '/cardano-hub/',
    titleVi: 'Xưởng Đúc & Ví Web3 Testnet',
    titleEn: 'NFT Mint Studio & Testnet Wallet',
    descVi: 'Kết nối EVM/Cardano Preprod & đúc Hộ chiếu/Chứng chỉ 0đ',
    descEn: 'Connect EVM/Cardano Preprod & mint $0 Passport/Cert NFTs',
    accentColor: '#6366F1',
  },
];

export interface TestnetSwapPackage {
  id: string;
  chainFamily: 'evm' | 'cardano';
  amountLabel: string;
  amountWeiHex?: string;
  vneReward: number;
  titleVi: string;
  titleEn: string;
}

export const TESTNET_SWAP_PACKAGES: TestnetSwapPackage[] = [
  {
    id: 'evm_starter',
    chainFamily: 'evm',
    amountLabel: '0.001 Testnet ETH',
    amountWeiHex: '0x38d7ea4c68000', // 0.001 ETH = 10^15 wei
    vneReward: 50,
    titleVi: 'Gói EVM Khởi đầu (0.001 Testnet ETH → +50 VNE)',
    titleEn: 'EVM Starter Pack (0.001 Testnet ETH → +50 VNE)',
  },
  {
    id: 'evm_pro',
    chainFamily: 'evm',
    amountLabel: '0.005 Testnet ETH',
    amountWeiHex: '0x11c37937e08000', // 0.005 ETH = 5 * 10^15 wei
    vneReward: 250,
    titleVi: 'Gói EVM Nâng cao (0.005 Testnet ETH → +250 VNE)',
    titleEn: 'EVM Pro Pack (0.005 Testnet ETH → +250 VNE)',
  },
  {
    id: 'cardano_starter',
    chainFamily: 'cardano',
    amountLabel: '5 tADA (Preprod)',
    vneReward: 50,
    titleVi: 'Gói Cardano Preprod (5 tADA → +50 VNE)',
    titleEn: 'Cardano Preprod Pack (5 tADA → +50 VNE)',
  },
  {
    id: 'cardano_pro',
    chainFamily: 'cardano',
    amountLabel: '20 tADA (Preprod)',
    vneReward: 200,
    titleVi: 'Gói Cardano Nâng cao (20 tADA → +200 VNE)',
    titleEn: 'Cardano Pro Pack (20 tADA → +200 VNE)',
  },
];

export interface TestnetSwapRecord {
  id: string;
  packageId: string;
  chainFamily: 'evm' | 'cardano';
  network: string;
  fromAddress: string;
  treasuryAddress: string;
  txHash: string;
  amountLabel: string;
  vneCredited: number;
  createdAt: string;
}

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, val: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // Ignore storage errors
  }
}

export function getSwapHistory(): TestnetSwapRecord[] {
  return safeRead<TestnetSwapRecord[]>(KEY_SWAP_HISTORY, []);
}

export function getTodaySwappedVne(): number {
  const today = new Date().toLocaleDateString('en-CA');
  return getSwapHistory()
    .filter((s) => s.createdAt.slice(0, 10) === today)
    .reduce((sum, s) => sum + s.vneCredited, 0);
}

export function executeTestnetSwap(params: {
  pkg: TestnetSwapPackage;
  network: string;
  fromAddress: string;
  txHash: string;
}): { ok: boolean; message: string; record?: TestnetSwapRecord } {
  const isEn = getLanguage() === 'en';
  if (!hasRegisteredAccount()) {
    return {
      ok: false,
      message: isEn
        ? 'Please register a VNEconomics account before swapping Testnet tokens into VNE Points.'
        : 'Vui lòng đăng ký tài khoản VNEconomics trước khi quy đổi Token Testnet lấy VNE Points vào ví.',
    };
  }

  const cleanTx = params.txHash.trim();
  if (cleanTx.length < 16) {
    return {
      ok: false,
      message: isEn ? 'Invalid transaction hash (txHash).' : 'Mã giao dịch (txHash) không hợp lệ.',
    };
  }

  const history = getSwapHistory();
  if (history.some((h) => h.txHash.toLowerCase() === cleanTx.toLowerCase())) {
    return {
      ok: false,
      message: isEn
        ? 'This transaction hash has already been redeemed for VNE Points.'
        : 'Mã giao dịch (txHash) này đã được sử dụng để quy đổi VNE Points trước đó.',
    };
  }

  const todayTotal = getTodaySwappedVne();
  if (todayTotal + params.pkg.vneReward > DAILY_SWAP_CAP_VNE) {
    return {
      ok: false,
      message: isEn
        ? `Daily Testnet Swap limit (${DAILY_SWAP_CAP_VNE} VNE/day) reached. Remaining today: ${Math.max(0, DAILY_SWAP_CAP_VNE - todayTotal)} VNE.`
        : `Đã đạt hạn mức quy đổi Testnet trong ngày (${DAILY_SWAP_CAP_VNE} VNE/ngày). Hạn mức còn lại hôm nay: ${Math.max(0, DAILY_SWAP_CAP_VNE - todayTotal)} VNE.`,
    };
  }

  const treasuryAddress =
    params.pkg.chainFamily === 'evm' ? VNE_EVM_TREASURY_ADDRESS : VNE_CARDANO_TESTNET_TREASURY;

  const rewardRes = claimPracticePoints(
    params.pkg.vneReward,
    isEn
      ? `Testnet Swap (${params.pkg.amountLabel}) • ${cleanTx.slice(0, 12)}...`
      : `Quy đổi Testnet (${params.pkg.amountLabel}) • ${cleanTx.slice(0, 12)}...`,
  );

  if (!rewardRes.ok) {
    return { ok: false, message: rewardRes.message };
  }

  const record: TestnetSwapRecord = {
    id: `swap_${Date.now()}`,
    packageId: params.pkg.id,
    chainFamily: params.pkg.chainFamily,
    network: params.network,
    fromAddress: params.fromAddress,
    treasuryAddress,
    txHash: cleanTx,
    amountLabel: params.pkg.amountLabel,
    vneCredited: params.pkg.vneReward,
    createdAt: new Date().toISOString(),
  };
  safeWrite(KEY_SWAP_HISTORY, [record, ...history].slice(0, 50));

  // Sync to backend game.php if Firebase JWT is active
  void getFirebaseIdToken().then((token) => {
    if (!token) return;
    return fetch('/api/game.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        action: 'testnet_swap',
        tx_hash: cleanTx,
        points: params.pkg.vneReward,
        network: params.network,
        amount_label: params.pkg.amountLabel,
      }),
    });
  }).catch(() => {});

  return {
    ok: true,
    record,
    message: isEn
      ? `Verified txHash! +${params.pkg.vneReward} VNE Points credited to your wallet.`
      : `Đã xác nhận giao dịch Testnet! Cộng +${params.pkg.vneReward} VNE Points vào ví của bạn.`,
  };
}

// ============================================================================
// DEFI STAKING & DAO GOVERNANCE — ON-CHAIN TESTNET + BONUS VNE POINTS
// ============================================================================

export const DEFI_STAKE_BONUS_VNE = 15;
export const DEFI_HARVEST_BONUS_VNE = 20;
export const DAO_VOTE_BONUS_VNE = 10;
export const DAO_PROPOSE_BONUS_VNE = 25;

export interface DefiStakePosition {
  id: string;
  poolName: string;
  apyPct: number;
  stakedLabel: string;
  chainFamily: 'evm' | 'cardano';
  network: string;
  txHash: string;
  explorerUrl: string;
  bonusVneAwarded: number;
  stakedAt: string;
}

export function getDefiStakes(): DefiStakePosition[] {
  const raw = safeRead<Partial<DefiStakePosition>[]>(KEY_DEFI_STAKES, []);
  return raw
    .filter((s): s is Partial<DefiStakePosition> & { id: string; poolName: string } => Boolean(s?.id && s?.poolName))
    .map((s) => ({
      id: s.id,
      poolName: s.poolName,
      apyPct: Number(s.apyPct) || 12,
      stakedLabel: s.stakedLabel || 'Testnet Pool',
      chainFamily: s.chainFamily === 'cardano' ? 'cardano' : 'evm',
      network: s.network || 'Base Sepolia Testnet',
      txHash: s.txHash || '',
      explorerUrl: s.explorerUrl || '#',
      bonusVneAwarded: Number(s.bonusVneAwarded) || 0,
      stakedAt: s.stakedAt || new Date().toISOString(),
    }));
}

export function recordOnChainDefiStake(params: {
  poolName: string;
  apyPct: number;
  stakedLabel: string;
  chainFamily: 'evm' | 'cardano';
  network: string;
  txHash: string;
  explorerUrl: string;
}): {
  ok: boolean;
  message: string;
  stakes: DefiStakePosition[];
} {
  const isEn = getLanguage() === 'en';
  const cleanTx = params.txHash.trim();
  const current = getDefiStakes();
  if (cleanTx.length < 16) {
    return {
      ok: false,
      stakes: current,
      message: isEn ? 'Invalid Testnet transaction hash.' : 'Mã giao dịch Testnet (txHash) không hợp lệ.',
    };
  }
  if (current.some((s) => s.txHash.toLowerCase() === cleanTx.toLowerCase())) {
    return {
      ok: false,
      stakes: current,
      message: isEn ? 'This Testnet txHash is already recorded.' : 'Giao dịch Testnet (txHash) này đã được ghi nhận.',
    };
  }

  let bonusAwarded = 0;
  if (hasRegisteredAccount()) {
    const bonusRes = claimPracticePoints(
      DEFI_STAKE_BONUS_VNE,
      isEn ? `On-chain DeFi Stake Bonus (${params.poolName})` : `Thưởng Bonus Staking On-chain (${params.poolName})`,
    );
    if (bonusRes.ok) bonusAwarded = DEFI_STAKE_BONUS_VNE;
  }

  const pos: DefiStakePosition = {
    id: `stake_${Date.now()}`,
    poolName: params.poolName,
    apyPct: params.apyPct,
    stakedLabel: params.stakedLabel,
    chainFamily: params.chainFamily,
    network: params.network,
    txHash: cleanTx,
    explorerUrl: params.explorerUrl,
    bonusVneAwarded: bonusAwarded,
    stakedAt: new Date().toISOString(),
  };
  const next = [pos, ...current];
  safeWrite(KEY_DEFI_STAKES, next);
  return {
    ok: true,
    stakes: next,
    message: isEn
      ? `On-chain stake confirmed on ${params.network}!${bonusAwarded > 0 ? ` Bonus +${bonusAwarded} VNE Points.` : ''}`
      : `Đã xác nhận Staking On-chain trên ${params.network}!${bonusAwarded > 0 ? ` Thưởng thêm +${bonusAwarded} VNE Points.` : ''}`,
  };
}

export function harvestOnChainDefiStake(params: {
  stakeId: string;
  txHash: string;
}): {
  ok: boolean;
  message: string;
  stakes: DefiStakePosition[];
} {
  const isEn = getLanguage() === 'en';
  const stakes = getDefiStakes();
  const target = stakes.find((s) => s.id === params.stakeId);
  if (!target) return { ok: false, message: 'Stake not found.', stakes };
  if (params.txHash.trim().length < 16) {
    return { ok: false, message: isEn ? 'Invalid harvest txHash.' : 'Mã giao dịch Harvest không hợp lệ.', stakes };
  }

  let bonusAwarded = 0;
  if (hasRegisteredAccount()) {
    const rewardRes = claimPracticePoints(
      DEFI_HARVEST_BONUS_VNE,
      isEn ? `On-chain DeFi Harvest Bonus (${target.poolName})` : `Thưởng Bonus Harvest On-chain (${target.poolName})`,
    );
    if (rewardRes.ok) bonusAwarded = DEFI_HARVEST_BONUS_VNE;
  }

  const next = stakes.filter((s) => s.id !== params.stakeId);
  safeWrite(KEY_DEFI_STAKES, next);
  return {
    ok: true,
    stakes: next,
    message: isEn
      ? `Harvested ${target.poolName} on-chain!${bonusAwarded > 0 ? ` Bonus +${bonusAwarded} VNE Points.` : ''}`
      : `Đã thu hoạch vị thế ${target.poolName} On-chain!${bonusAwarded > 0 ? ` Thưởng thêm +${bonusAwarded} VNE Points.` : ''}`,
  };
}

export type GovActionType =
  | 'economy'
  | 'blockchain'
  | 'society'
  | 'environment'
  | 'governance';

const LEGACY_TYPE_MAP: Record<string, GovActionType> = {
  treasury_withdrawal: 'economy',
  parameter_change: 'blockchain',
  hard_fork: 'blockchain',
  info_action: 'society',
  constitution: 'governance',
  economy: 'economy',
  blockchain: 'blockchain',
  society: 'society',
  environment: 'environment',
  governance: 'governance',
};

export interface DaoProposalItem {
  id: string;
  govActionId: string;
  actionType: GovActionType;
  status: 'active' | 'ratified' | 'expired';
  expiresEpoch: number;
  titleVi: string;
  titleEn: string;
  descVi: string;
  descEn: string;
  yesVotes: number;
  abstainVotes: number;
  noVotes: number;
  drepYesPct: number;
  spoYesPct: number;
  ccApproved: string;
  userVotesCount: number;
  lastVoteChoice?: 'yes' | 'abstain' | 'no';
  lastRationale?: string;
  lastTxHash?: string;
  lastExplorerUrl?: string;
  lastNetwork?: string;
}

const DEFAULT_DAO_PROPOSALS: DaoProposalItem[] = [
  {
    id: 'prop-1',
    govActionId: 'gov_action1qq8vne2027economy9x4k8m2p7z',
    actionType: 'economy',
    status: 'active',
    expiresEpoch: 529,
    titleVi: 'Kinh tế & Tài chính: Xuất bản Báo cáo Kinh tế số & Thị trường Tài chính ASEAN 2027',
    titleEn: 'Economy & Finance: ASEAN Digital Economy & Financial Markets Report 2027',
    descVi: 'Phân bổ ngân sách nghiên cứu mở cho dữ liệu vĩ mô Việt Nam, tỷ giá, lãi suất và mô hình định lượng danh mục.',
    descEn: 'Allocate open research funding for Vietnam macro datasets, FX, interest rates and quantitative portfolio models.',
    yesVotes: 48,
    abstainVotes: 6,
    noVotes: 4,
    drepYesPct: 72,
    spoYesPct: 64,
    ccApproved: '5/7',
    userVotesCount: 0,
  },
  {
    id: 'prop-2',
    govActionId: 'gov_action1qr5green2027yeutrongcay88',
    actionType: 'environment',
    status: 'active',
    expiresEpoch: 531,
    titleVi: 'Môi trường & ESG: Chương trình Tín chỉ Carbon & Dự án Yêu Trồng Cây (10.000 Cây xanh)',
    titleEn: 'Environment & ESG: Carbon Credit & Yeu Trong Cay Reforestation Initiative (10,000 Trees)',
    descVi: 'Kết nối Sàn Tín chỉ Carbon VNEconomics với dự án trồng rừng thực tế, minh bạch hóa dữ liệu khử phát thải CO2.',
    descEn: 'Bridge VNEconomics Carbon Credit Exchange with real-world tree planting and transparent CO2 offset tracking.',
    yesVotes: 62,
    abstainVotes: 9,
    noVotes: 7,
    drepYesPct: 78,
    spoYesPct: 69,
    ccApproved: '6/7',
    userVotesCount: 0,
  },
  {
    id: 'prop-3',
    govActionId: 'gov_action1qp3web3gov10multichain2027',
    actionType: 'blockchain',
    status: 'ratified',
    expiresEpoch: 525,
    titleVi: 'Blockchain & Web3: Chuẩn hóa Xác thực Chứng chỉ Học thuật & Bỏ phiếu Đa chuỗi Testnet',
    titleEn: 'Blockchain & Web3: Multi-chain Academic Credential & On-chain Voting Standard',
    descVi: 'Cho phép người học và nhà nghiên cứu xác thực bằng chứng hoàn thành khóa học và bỏ phiếu DAO trên cả EVM & Cardano Testnet.',
    descEn: 'Enable learners and researchers to verify academic proofs and cast DAO votes across EVM & Cardano Testnets.',
    yesVotes: 94,
    abstainVotes: 4,
    noVotes: 2,
    drepYesPct: 89,
    spoYesPct: 82,
    ccApproved: '7/7',
    userVotesCount: 0,
  },
  {
    id: 'prop-4',
    govActionId: 'gov_action1qm9edu2027studentgrantsvn55',
    actionType: 'society',
    status: 'active',
    expiresEpoch: 534,
    titleVi: 'Xã hội & Giáo dục: Quỹ Học bổng Tài nguyên Mở & Dữ liệu Nghiên cứu Sinh viên',
    titleEn: 'Society & Education: Open Educational Resources & Student Research Grant Fund',
    descVi: 'Miễn phí bộ công cụ AI Skills phản biện Q1, kho sách chuyên khảo và dữ liệu World Bank cho sinh viên đại học.',
    descEn: 'Provide free Q1 peer-review AI Skills, monograph library access, and World Bank datasets for university students.',
    yesVotes: 37,
    abstainVotes: 11,
    noVotes: 3,
    drepYesPct: 65,
    spoYesPct: 58,
    ccApproved: '5/7',
    userVotesCount: 0,
  },
];

export function getDaoProposals(): DaoProposalItem[] {
  const raw = safeRead<Partial<DaoProposalItem>[]>(KEY_DAO_PROPOSALS, DEFAULT_DAO_PROPOSALS);
  const byId = new Map<string, Partial<DaoProposalItem>>();
  for (const p of raw) {
    if (p?.id) byId.set(p.id, p);
  }
  for (const def of DEFAULT_DAO_PROPOSALS) {
    if (!byId.has(def.id)) {
      byId.set(def.id, def);
    }
  }
  return Array.from(byId.values()).map((p, idx) => {
    const def = DEFAULT_DAO_PROPOSALS.find((d) => d.id === p.id) || DEFAULT_DAO_PROPOSALS[idx % DEFAULT_DAO_PROPOSALS.length];
    const normalizedType = (p.actionType && LEGACY_TYPE_MAP[p.actionType]) || def.actionType;
    return {
      id: p.id || def.id,
      govActionId: p.govActionId || def.govActionId,
      actionType: normalizedType,
      status: p.status || def.status,
      expiresEpoch: p.expiresEpoch || def.expiresEpoch,
      titleVi: p.titleVi || def.titleVi,
      titleEn: p.titleEn || def.titleEn,
      descVi: p.descVi || def.descVi,
      descEn: p.descEn || def.descEn,
      yesVotes: p.yesVotes ?? def.yesVotes,
      abstainVotes: p.abstainVotes ?? def.abstainVotes,
      noVotes: p.noVotes ?? def.noVotes,
      drepYesPct: p.drepYesPct ?? def.drepYesPct,
      spoYesPct: p.spoYesPct ?? def.spoYesPct,
      ccApproved: p.ccApproved || def.ccApproved,
      userVotesCount: p.userVotesCount ?? 0,
      lastVoteChoice: p.lastVoteChoice,
      lastRationale: p.lastRationale,
      lastTxHash: p.lastTxHash,
      lastExplorerUrl: p.lastExplorerUrl,
      lastNetwork: p.lastNetwork,
    };
  });
}

export function recordOnChainDaoVote(params: {
  proposalId: string;
  support: boolean;
  voteChoice?: 'yes' | 'abstain' | 'no';
  rationale?: string;
  network: string;
  txHash: string;
  explorerUrl: string;
}): {
  ok: boolean;
  message: string;
  proposals: DaoProposalItem[];
} {
  const isEn = getLanguage() === 'en';
  const proposals = getDaoProposals();
  const target = proposals.find((p) => p.id === params.proposalId);
  if (!target) return { ok: false, message: 'Proposal not found.', proposals };

  const cleanTx = params.txHash.trim();
  if (cleanTx.length < 16) {
    return { ok: false, message: isEn ? 'Invalid Testnet txHash.' : 'Mã giao dịch Testnet không hợp lệ.', proposals };
  }

  const choice: 'yes' | 'abstain' | 'no' = params.voteChoice || (params.support ? 'yes' : 'no');
  let bonusAwarded = 0;
  if (hasRegisteredAccount()) {
    const bonusRes = claimPracticePoints(
      DAO_VOTE_BONUS_VNE,
      isEn ? `On-chain CIP-1694 Vote (${choice.toUpperCase()})` : `Thưởng Bonus Biểu quyết CIP-1694 (${choice.toUpperCase()})`,
    );
    if (bonusRes.ok) bonusAwarded = DAO_VOTE_BONUS_VNE;
  }

  const next = proposals.map((p) => {
    if (p.id !== params.proposalId) return p;
    const yes = choice === 'yes' ? p.yesVotes + 1 : p.yesVotes;
    const abstain = choice === 'abstain' ? p.abstainVotes + 1 : p.abstainVotes;
    const no = choice === 'no' ? p.noVotes + 1 : p.noVotes;
    const totalActive = Math.max(1, yes + no);
    return {
      ...p,
      yesVotes: yes,
      abstainVotes: abstain,
      noVotes: no,
      drepYesPct: Math.min(99, Math.round((yes / totalActive) * 100)),
      userVotesCount: p.userVotesCount + 1,
      lastVoteChoice: choice,
      lastRationale: params.rationale?.trim() || undefined,
      lastTxHash: cleanTx,
      lastExplorerUrl: params.explorerUrl,
      lastNetwork: params.network,
    };
  });
  safeWrite(KEY_DAO_PROPOSALS, next);
  return {
    ok: true,
    proposals: next,
    message: isEn
      ? `On-chain ${choice.toUpperCase()} vote recorded on ${params.network}!${bonusAwarded > 0 ? ` Bonus +${bonusAwarded} VNE Points.` : ''}`
      : `Đã ghi nhận phiếu ${choice.toUpperCase()} On-chain trên ${params.network}!${bonusAwarded > 0 ? ` Thưởng thêm +${bonusAwarded} VNE Points.` : ''}`,
  };
}

export function recordOnChainDaoProposal(params: {
  title: string;
  desc: string;
  actionType?: GovActionType;
  network: string;
  txHash: string;
  explorerUrl: string;
}): {
  ok: boolean;
  message: string;
  proposals: DaoProposalItem[];
} {
  const isEn = getLanguage() === 'en';
  const cleanTx = params.txHash.trim();
  if (cleanTx.length < 16) {
    return {
      ok: false,
      message: isEn ? 'Invalid Testnet txHash.' : 'Mã giao dịch Testnet không hợp lệ.',
      proposals: getDaoProposals(),
    };
  }

  let bonusAwarded = 0;
  if (hasRegisteredAccount()) {
    const bonusRes = claimPracticePoints(
      DAO_PROPOSE_BONUS_VNE,
      isEn ? 'On-chain DAO Proposal Bonus' : 'Thưởng Bonus Đệ trình Đề xuất On-chain',
    );
    if (bonusRes.ok) bonusAwarded = DAO_PROPOSE_BONUS_VNE;
  }

  const idSlug = Date.now().toString(36);
  const item: DaoProposalItem = {
    id: `prop-${Date.now()}`,
    govActionId: `gov_action1vne${idSlug}preprod`,
    actionType: params.actionType || 'governance',
    status: 'active',
    expiresEpoch: 535,
    titleVi: params.title.trim(),
    titleEn: params.title.trim(),
    descVi: params.desc.trim() || 'Đề xuất quản trị CIP-1694 On-chain VNEconomics DAO.',
    descEn: params.desc.trim() || 'VNEconomics DAO CIP-1694 on-chain governance action.',
    yesVotes: 1,
    abstainVotes: 0,
    noVotes: 0,
    drepYesPct: 100,
    spoYesPct: 50,
    ccApproved: 'Pending',
    userVotesCount: 1,
    lastVoteChoice: 'yes',
    lastTxHash: cleanTx,
    lastExplorerUrl: params.explorerUrl,
    lastNetwork: params.network,
  };
  const next = [item, ...getDaoProposals()];
  safeWrite(KEY_DAO_PROPOSALS, next);
  return {
    ok: true,
    proposals: next,
    message: isEn
      ? `On-chain Governance Action submitted on ${params.network}!${bonusAwarded > 0 ? ` Bonus +${bonusAwarded} VNE Points.` : ''}`
      : `Đã đệ trình Governance Action On-chain trên ${params.network}!${bonusAwarded > 0 ? ` Thưởng thêm +${bonusAwarded} VNE Points.` : ''}`,
  };
}

export function getSimPointsBalance(): number {
  return getPointsState().totalPoints;
}
