import type { SimAssetKind, VnePointsState } from '../../core/types/index.ts';
import { getLanguage } from '../../core/i18n/i18nService.ts';
import { getFirebaseIdToken } from '../account/accountService.ts';

const isEnLang = () => getLanguage() === 'en';

export const POINTS_UPDATED_EVENT = 'vne:points-updated';
export const DEFAULT_INITIAL_POINTS = 10;
export const DAILY_RESET_POINTS = 100;
export const DEFAULT_RESOURCE_UNLOCK_COST = 10;

const KEY_POINTS = 'vne_points_total';
const KEY_EVENTS = 'vne_point_events';
const KEY_LAST_CHECKIN = 'vne_last_checkin';
const KEY_LAST_DAILY_RESET = 'vne_last_daily_reset';
const KEY_STREAK = 'vne_daily_streak';
const KEY_READ_POSTS = 'vne_read_post_slugs';
const KEY_UNLOCKED_ITEMS = 'vne_unlocked_items';
const KEY_SIM_STATE = 'vne_economy_sim_state';
const KEY_LOCAL_PROFILE = 'vne_local_user_profile_v1';

function getLocalDateKey(): string {
  try {
    return new Date().toLocaleDateString('en-CA');
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function hasRegisteredAccount(): boolean {
  try {
    const raw = localStorage.getItem(KEY_LOCAL_PROFILE);
    return Boolean(raw && raw.trim().length > 2);
  } catch {
    return false;
  }
}

export function getResourcePointCost(pointsCost?: number | null): number {
  return pointsCost && pointsCost > 0 ? pointsCost : DEFAULT_RESOURCE_UNLOCK_COST;
}

export interface PointEventLog {
  id: string;
  delta: number;
  reason: string;
  createdAt: string;
}

export interface SimAsset {
  id: string;
  kind: SimAssetKind;
  name: string;
  level: number;
  efficiency: number; // 0 - 100
  baseYieldPerHour: number;
  lastEvaluatedAt: string;
}

export interface PaperPosition {
  symbol: 'SJC' | 'BTC' | 'ADA' | 'VNINDEX';
  label: string;
  units: number;
  entryPriceVnd: number;
}

export interface EconomySimState {
  simCashVnd: number;
  reputationExp: number;
  totalHarvests: number;
  assets: SimAsset[];
  positions: PaperPosition[];
  lastEvaluatedAt: string;
}

export const SIM_ASSET_CATALOG: Record<
  'validator_node' | 'ai_gpu_cluster' | 'digital_store' | 'green_bond',
  { name: string; costPoints: number; baseYieldPerHour: number; desc: string }
> = {
  validator_node: {
    name: 'Cardano / EVM Validator Node',
    costPoints: 30,
    baseYieldPerHour: 12,
    desc: 'Vận hành node xác thực giao dịch Testnet, sinh VNE Points ổn định theo giờ.',
  },
  ai_gpu_cluster: {
    name: 'Cụm GPU AI Phân tích Dữ liệu',
    costPoints: 50,
    baseYieldPerHour: 22,
    desc: 'Xử lý mô hình dự báo kinh tế & dữ liệu thị trường, lợi suất cao nhưng hao mòn nhanh.',
  },
  digital_store: {
    name: 'Gian hàng Tri thức & E-Commerce',
    costPoints: 40,
    baseYieldPerHour: 16,
    desc: 'Phân phối tài liệu số và khóa học tự động.',
  },
  green_bond: {
    name: 'Trái phiếu Kinh tế Xanh',
    costPoints: 25,
    baseYieldPerHour: 9,
    desc: 'Tài sản bền vững ít hao mòn hiệu suất.',
  },
};

export const REFERENCE_MARKET_PRICES: Record<PaperPosition['symbol'], { label: string; priceVnd: number }> = {
  SJC: { label: 'Vàng SJC (lượng)', priceVnd: 84500000 },
  BTC: { label: 'Bitcoin (BTC)', priceVnd: 2350000000 },
  ADA: { label: 'Cardano (ADA)', priceVnd: 24500 },
  VNINDEX: { label: 'Quỹ chỉ số VN30 (chứng chỉ)', priceVnd: 25000 },
};

export function updateLiveMarketPrices(prices: Partial<Record<PaperPosition['symbol'], number>>): void {
  (Object.keys(prices) as PaperPosition['symbol'][]).forEach((sym) => {
    const next = prices[sym];
    if (typeof next === 'number' && Number.isFinite(next) && next > 0 && REFERENCE_MARKET_PRICES[sym]) {
      REFERENCE_MARKET_PRICES[sym].priceVnd = Math.round(next);
    }
  });
}

export function calculateTier(points: number): { tierLevel: 1 | 2 | 3 | 4; tierTitle: string } {
  const en = isEnLang();
  if (points >= 400) return { tierLevel: 4, tierTitle: en ? 'Digital Economy Architect' : 'Kiến trúc sư Kinh tế số' };
  if (points >= 200) return { tierLevel: 3, tierTitle: en ? 'Digital Asset Strategist' : 'Chuyên gia Tài sản số' };
  if (points >= 90) return { tierLevel: 2, tierTitle: en ? 'Junior Macro Analyst' : 'Nhà Phân tích Trẻ' };
  return { tierLevel: 1, tierTitle: en ? 'Digital Economy Learner' : 'Tân binh Kinh tế số' };
}

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWriteJson(key: string, val: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // Ignore storage quota errors
  }
}

function ensureDailyPointsReset(): number {
  let total = DEFAULT_INITIAL_POINTS;
  const today = getLocalDateKey();
  try {
    const saved = localStorage.getItem(KEY_POINTS);
    const lastReset = localStorage.getItem(KEY_LAST_DAILY_RESET);

    if (saved === null || Number.isNaN(Number(saved))) {
      total = DEFAULT_INITIAL_POINTS;
      localStorage.setItem(KEY_POINTS, String(total));
      localStorage.setItem(KEY_LAST_DAILY_RESET, today);
    } else {
      total = Math.max(0, Number(saved));
      if (lastReset !== today) {
        const nextTotal = Math.max(total, DAILY_RESET_POINTS);
        localStorage.setItem(KEY_LAST_DAILY_RESET, today);
        if (nextTotal !== total) {
          localStorage.setItem(KEY_POINTS, String(nextTotal));
          const events = getPointEvents();
          events.unshift({
            id: `pts_reset_${Date.now()}`,
            delta: nextTotal - total,
            reason: isEnLang()
              ? `Daily automatic reset (${DAILY_RESET_POINTS} VNE Points)`
              : `Tự động reset ${DAILY_RESET_POINTS} VNE Points mỗi ngày`,
            createdAt: new Date().toISOString(),
          });
          safeWriteJson(KEY_EVENTS, events.slice(0, 40));
          window.dispatchEvent(new CustomEvent(POINTS_UPDATED_EVENT));
          total = nextTotal;
        }
      }
    }
  } catch {
    // Fallback defaults in non-browser tests
  }
  return total;
}

export function getPointsState(): VnePointsState {
  const total = ensureDailyPointsReset();
  let streak = 0;
  try {
    const savedStreak = localStorage.getItem(KEY_STREAK);
    if (savedStreak !== null && !Number.isNaN(Number(savedStreak))) {
      streak = Math.max(0, Number(savedStreak));
    }
  } catch {
    // Fallback defaults
  }
  const { tierLevel, tierTitle } = calculateTier(total);
  return { totalPoints: total, tierLevel, tierTitle, dailyStreak: streak };
}

export function getPointEvents(): PointEventLog[] {
  return safeReadJson<PointEventLog[]>(KEY_EVENTS, []);
}

function mutatePoints(delta: number, reason: string): VnePointsState {
  const current = getPointsState();
  const nextTotal = Math.max(0, current.totalPoints + delta);
  try {
    localStorage.setItem(KEY_POINTS, String(nextTotal));
    const events = getPointEvents();
    events.unshift({
      id: `pts_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      delta,
      reason,
      createdAt: new Date().toISOString(),
    });
    safeWriteJson(KEY_EVENTS, events.slice(0, 40));
    window.dispatchEvent(new CustomEvent(POINTS_UPDATED_EVENT));
  } catch {
    // Ignore in non-browser tests
  }
  const { tierLevel, tierTitle } = calculateTier(nextTotal);
  return { totalPoints: nextTotal, tierLevel, tierTitle, dailyStreak: current.dailyStreak };
}

export function claimDailyCheckin(): { ok: boolean; message: string; state: VnePointsState } {
  const en = isEnLang();
  const today = new Date().toISOString().slice(0, 10);
  try {
    const last = localStorage.getItem(KEY_LAST_CHECKIN);
    if (last === today) {
      return {
        ok: false,
        message: en ? 'You have already checked in today. Come back tomorrow!' : 'Hôm nay bạn đã điểm danh rồi. Hãy quay lại vào ngày mai!',
        state: getPointsState(),
      };
    }
    const streak = Number(localStorage.getItem(KEY_STREAK) || '0') + 1;
    localStorage.setItem(KEY_LAST_CHECKIN, today);
    localStorage.setItem(KEY_STREAK, String(streak));
  } catch {
    // Ignore
  }
  const state = mutatePoints(20, en ? 'Daily learning check-in' : 'Điểm danh học tập hàng ngày');
  return {
    ok: true,
    message: en ? '+20 VNE Points daily check-in bonus!' : '+20 VNE Points điểm danh thành công!',
    state,
  };
}

export function claimArticleReadReward(slug: string, title: string): { ok: boolean; message: string; state: VnePointsState } {
  const en = isEnLang();
  const readList = safeReadJson<string[]>(KEY_READ_POSTS, []);
  if (readList.includes(slug)) {
    return {
      ok: false,
      message: en ? 'You have already claimed points for this entry.' : 'Bạn đã nhận điểm cho bài viết này rồi.',
      state: getPointsState(),
    };
  }
  readList.push(slug);
  safeWriteJson(KEY_READ_POSTS, readList.slice(-500));
  const state = mutatePoints(10, en ? `Completed reading: ${title.slice(0, 50)}` : `Hoàn thành đọc bài: ${title.slice(0, 50)}`);
  return {
    ok: true,
    message: en ? '+10 VNE Points credited to your balance!' : '+10 VNE Points đã được cộng vào tài khoản!',
    state,
  };
}

export function getUnlockedItemKeys(): string[] {
  return safeReadJson<string[]>(KEY_UNLOCKED_ITEMS, []);
}

export function isItemUnlocked(itemKey: string): boolean {
  return getUnlockedItemKeys().includes(itemKey);
}

export function unlockItemWithPoints(itemKey: string, cost: number, label: string): { ok: boolean; message: string; state: VnePointsState } {
  const en = isEnLang();
  if (isItemUnlocked(itemKey)) {
    return { ok: true, message: en ? 'Resource was already unlocked.' : 'Tài nguyên đã được mở khóa từ trước.', state: getPointsState() };
  }
  const state = getPointsState();
  if (state.totalPoints < cost) {
    return {
      ok: false,
      message: en
        ? `Requires ${cost} VNE Points (you currently have ${state.totalPoints} VNE). Read articles, check in, or play VNE Economy Sim to earn more.`
        : `Cần ${cost} VNE Points (bạn đang có ${state.totalPoints} VNE). Hãy đọc bài, điểm danh hoặc chơi VNE Mô phỏng để tích thêm điểm.`,
      state,
    };
  }
  const unlocked = getUnlockedItemKeys();
  unlocked.push(itemKey);
  safeWriteJson(KEY_UNLOCKED_ITEMS, unlocked);
  const next = mutatePoints(-cost, en ? `Unlocked resource: ${label.slice(0, 50)}` : `Mở khóa tài nguyên: ${label.slice(0, 50)}`);
  void getFirebaseIdToken().then((token) => {
    if (!token) return;
    return fetch('/api/game.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'unlock_item', item_key: itemKey, cost, label }),
    });
  }).catch(() => {});
  return {
    ok: true,
    message: en ? `Unlocked "${label}" using ${cost} VNE Points!` : `Đã mở khóa "${label}" bằng ${cost} VNE Points!`,
    state: next,
  };
}

export function awardPracticePoints(points: number, reason: string): VnePointsState {
  if (points <= 0) return getPointsState();
  return mutatePoints(points, reason);
}

export function spendVnePoints(cost: number, reason: string): { ok: boolean; message: string; state: VnePointsState } {
  const en = isEnLang();
  const state = getPointsState();
  if (cost <= 0) return { ok: true, message: '', state };
  if (state.totalPoints < cost) {
    return {
      ok: false,
      message: en
        ? `Requires ${cost} VNE Points (you currently have ${state.totalPoints} VNE). Swap Testnet tokens, practice, or wait for daily 100 VNE reset.`
        : `Cần ${cost} VNE Points (bạn đang có ${state.totalPoints} VNE). Hãy đổi Token Testnet, luyện tập hoặc chờ reset 100 VNE mỗi ngày.`,
      state,
    };
  }
  const next = mutatePoints(-cost, reason);
  return { ok: true, message: en ? `Spent ${cost} VNE Points.` : `Đã sử dụng ${cost} VNE Points.`, state: next };
}

export function claimPracticePoints(points: number, reason: string): {
  ok: boolean;
  requiresAccount: boolean;
  message: string;
  state: VnePointsState;
} {
  const en = isEnLang();
  if (!hasRegisteredAccount()) {
    return {
      ok: false,
      requiresAccount: true,
      message: en
        ? 'Register a free account to earn VNE Points from practice into your wallet.'
        : 'Hãy đăng ký tài khoản miễn phí để nhận VNE Points từ luyện tập vào ví của bạn.',
      state: getPointsState(),
    };
  }
  if (points <= 0) {
    return { ok: true, requiresAccount: false, message: '', state: getPointsState() };
  }
  const state = mutatePoints(points, reason);
  void getFirebaseIdToken().then((token) => {
    if (!token) return;
    return fetch('/api/game.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'practice_reward', points, reason }),
    });
  }).catch(() => {});
  return {
    ok: true,
    requiresAccount: false,
    message: en
      ? `+${points} VNE Points credited to your wallet!`
      : `+${points} VNE Points đã được cộng vào ví của bạn!`,
    state,
  };
}

export async function syncPointsAndUnlocksFromServer(): Promise<void> {
  try {
    const token = await getFirebaseIdToken();
    if (!token) return;
    const res = await fetch('/api/game.php', {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const json = await res.json();
    const data = json?.data;
    if (!data) return;
    if (typeof data.total_points === 'number') {
      localStorage.setItem(KEY_POINTS, String(Math.max(0, data.total_points)));
      localStorage.setItem(KEY_LAST_DAILY_RESET, getLocalDateKey());
    }
    if (Array.isArray(data.unlocked_items)) {
      const merged = Array.from(new Set([...getUnlockedItemKeys(), ...data.unlocked_items]));
      safeWriteJson(KEY_UNLOCKED_ITEMS, merged);
    }
    window.dispatchEvent(new CustomEvent(POINTS_UPDATED_EVENT));
  } catch {
    // Offline/localhost fallback
  }
}

/**
 * Lazy State Evaluation cho Game VNE Economy Sim (kế thừa logic từ yeutrongcay):
 * Tự tính độ suy giảm hiệu suất theo số giờ trôi qua kể từ lần truy cập gần nhất.
 */
export function evaluateSimState(state: EconomySimState, nowMs = Date.now()): EconomySimState {
  const updatedAssets = state.assets.map((asset) => {
    const prevMs = Date.parse(asset.lastEvaluatedAt) || nowMs;
    const elapsedHours = Math.max(0, (nowMs - prevMs) / 3600000);
    if (elapsedHours < 0.05) return asset;
    const decayRate = asset.kind === 'green_bond' ? 1.5 : 3.2;
    const nextEff = Math.max(15, Math.round(asset.efficiency - elapsedHours * decayRate));
    return {
      ...asset,
      efficiency: nextEff,
      lastEvaluatedAt: new Date(nowMs).toISOString(),
    };
  });

  return {
    ...state,
    assets: updatedAssets,
    lastEvaluatedAt: new Date(nowMs).toISOString(),
  };
}

export function getEconomySimState(): EconomySimState {
  const nowIso = new Date().toISOString();
  const defaultState: EconomySimState = {
    simCashVnd: 100000000,
    reputationExp: 20,
    totalHarvests: 0,
    assets: [
      {
        id: 'asset_starter_node',
        kind: 'validator_node',
        name: SIM_ASSET_CATALOG.validator_node.name,
        level: 1,
        efficiency: 92,
        baseYieldPerHour: SIM_ASSET_CATALOG.validator_node.baseYieldPerHour,
        lastEvaluatedAt: nowIso,
      },
    ],
    positions: [],
    lastEvaluatedAt: nowIso,
  };

  const saved = safeReadJson<EconomySimState | null>(KEY_SIM_STATE, null);
  const evaluated = evaluateSimState(saved || defaultState);
  safeWriteJson(KEY_SIM_STATE, evaluated);
  return evaluated;
}

export function buySimAsset(kind: keyof typeof SIM_ASSET_CATALOG): { ok: boolean; message: string; sim: EconomySimState } {
  const en = isEnLang();
  const spec = SIM_ASSET_CATALOG[kind];
  const pts = getPointsState();
  if (pts.totalPoints < spec.costPoints) {
    return {
      ok: false,
      message: en
        ? `Requires ${spec.costPoints} VNE Points to deploy ${spec.name}.`
        : `Cần ${spec.costPoints} VNE Points để triển khai ${spec.name}.`,
      sim: getEconomySimState(),
    };
  }
  const sim = getEconomySimState();
  mutatePoints(-spec.costPoints, en ? `Deployed Sim asset: ${spec.name}` : `Triển khai tài sản Sim: ${spec.name}`);
  sim.assets.push({
    id: `asset_${Date.now()}`,
    kind,
    name: spec.name,
    level: 1,
    efficiency: 100,
    baseYieldPerHour: spec.baseYieldPerHour,
    lastEvaluatedAt: new Date().toISOString(),
  });
  sim.reputationExp += 25;
  safeWriteJson(KEY_SIM_STATE, sim);
  return { ok: true, message: en ? `Deployed ${spec.name}!` : `Đã triển khai ${spec.name}!`, sim };
}

export function maintainAndHarvestAsset(assetId: string): { ok: boolean; message: string; sim: EconomySimState } {
  const en = isEnLang();
  const sim = getEconomySimState();
  const asset = sim.assets.find((a) => a.id === assetId);
  if (!asset) return { ok: false, message: en ? 'Asset not found.' : 'Không tìm thấy tài sản.', sim };

  const yieldPoints = Math.max(5, Math.round((asset.baseYieldPerHour * asset.level * asset.efficiency) / 100));
  asset.efficiency = 100;
  asset.lastEvaluatedAt = new Date().toISOString();
  sim.totalHarvests += 1;
  sim.reputationExp += 15;
  safeWriteJson(KEY_SIM_STATE, sim);
  mutatePoints(
    yieldPoints,
    en ? `Harvest & maintain ${asset.name} (Lv.${asset.level})` : `Thu hoạch & bảo trì ${asset.name} (Lv.${asset.level})`,
  );
  return {
    ok: true,
    message: en
      ? `+${yieldPoints} VNE Points & restored 100% efficiency!`
      : `+${yieldPoints} VNE Points & phục hồi 100% hiệu suất!`,
    sim,
  };
}

export function upgradeSimAsset(assetId: string): { ok: boolean; message: string; sim: EconomySimState } {
  const en = isEnLang();
  const sim = getEconomySimState();
  const asset = sim.assets.find((a) => a.id === assetId);
  if (!asset) return { ok: false, message: en ? 'Asset not found.' : 'Không tìm thấy tài sản.', sim };

  const upgradeCost = asset.level * 25;
  if (getPointsState().totalPoints < upgradeCost) {
    return {
      ok: false,
      message: en
        ? `Requires ${upgradeCost} VNE Points to upgrade to Lv.${asset.level + 1}.`
        : `Cần ${upgradeCost} VNE Points để nâng cấp lên Lv.${asset.level + 1}.`,
      sim,
    };
  }
  mutatePoints(
    -upgradeCost,
    en ? `Upgraded ${asset.name} to Lv.${asset.level + 1}` : `Nâng cấp ${asset.name} lên Lv.${asset.level + 1}`,
  );
  asset.level += 1;
  asset.efficiency = 100;
  sim.reputationExp += 30;
  safeWriteJson(KEY_SIM_STATE, sim);
  return {
    ok: true,
    message: en ? `Upgraded ${asset.name} to Level ${asset.level}!` : `Đã nâng cấp ${asset.name} lên Level ${asset.level}!`,
    sim,
  };
}

export function placePaperTrade(symbol: PaperPosition['symbol'], amountVnd: number): { ok: boolean; message: string; sim: EconomySimState } {
  const en = isEnLang();
  const sim = getEconomySimState();
  if (amountVnd <= 0 || amountVnd > sim.simCashVnd) {
    return {
      ok: false,
      message: en
        ? 'Invalid virtual trade amount or exceeds available cash balance.'
        : 'Số tiền đầu tư ảo không hợp lệ hoặc vượt quá số dư.',
      sim,
    };
  }
  const ref = REFERENCE_MARKET_PRICES[symbol];
  const units = Number((amountVnd / ref.priceVnd).toFixed(6));
  sim.simCashVnd -= amountVnd;
  const existing = sim.positions.find((p) => p.symbol === symbol);
  if (existing) {
    const totalCost = existing.units * existing.entryPriceVnd + amountVnd;
    existing.units = Number((existing.units + units).toFixed(6));
    existing.entryPriceVnd = Math.round(totalCost / existing.units);
  } else {
    sim.positions.push({ symbol, label: ref.label, units, entryPriceVnd: ref.priceVnd });
  }
  sim.reputationExp += 10;
  safeWriteJson(KEY_SIM_STATE, sim);
  mutatePoints(5, en ? `Paper Trading Order: ${ref.label}` : `Giao dịch Paper Trading: ${ref.label}`);
  return {
    ok: true,
    message: en
      ? `Filled simulated order for ${units} ${symbol} (+5 VNE Points)!`
      : `Đã khớp lệnh mô phỏng ${units} ${symbol} (+5 VNE Points)!`,
    sim,
  };
}
