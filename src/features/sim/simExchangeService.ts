import { getLanguage } from '../../core/i18n/i18nService.ts';
import { getFirebaseIdToken } from '../account/accountService.ts';
import {
  claimPracticePoints,
  getPointsState,
  hasRegisteredAccount,
  spendVnePoints,
} from '../game/vneGameService.ts';

// Fixed Exchange Peg: 1 VNE Point = 1,000 VND (matches Vietnam Stock Board standard 1,000 VND unit)
export const VNE_PEG_VND = 1000;
export const DAILY_EXCHANGE_PROFIT_CAP_VNE = 500;
export const CRYPTO_FEE_RATE = 0.001; // 0.1% Taker fee
export const STOCK_FEE_RATE = 0.0015; // 0.15% Taker fee & tax
export const COMMODITY_FEE_RATE = 0.0012; // 0.12% Taker fee (MXV / Futures style)
export const FOREX_FEE_RATE = 0.0005; // 0.05% tight FX Taker fee
export const CARBON_FEE_RATE = 0.0005; // 0.05% Green Carbon Credit fee
export const MAKER_REBATE_RATE = 0.0002; // +0.02% Maker rebate for Limit orders

export interface MarketMakerBookLevel {
  priceVne: number;
  sizeVne: number;
}

export interface MarketMakerQuote {
  midPriceVne: number;
  bestBidVne: number;
  bestAskVne: number;
  spreadPct: number;
  skewBps: number;
  netInventoryVne: number;
  asks: MarketMakerBookLevel[];
  bids: MarketMakerBookLevel[];
}

export interface CryptoPairSpec {
  symbol: string; // e.g. 'BTCUSDT'
  base: string; // e.g. 'BTC'
  pairLabel: string; // e.g. 'BTC/VNE'
  nameVi: string;
  nameEn: string;
  tvSymbol: string;
  defaultUsd: number;
}

export const CRYPTO_EXCHANGE_PAIRS: CryptoPairSpec[] = [
  { symbol: 'ADAUSDT', base: 'ADA', pairLabel: 'ADA/VNE', nameVi: 'Cardano', nameEn: 'Cardano', tvSymbol: 'BINANCE:ADAUSDT', defaultUsd: 0.96 },
  { symbol: 'BTCUSDT', base: 'BTC', pairLabel: 'BTC/VNE', nameVi: 'Bitcoin', nameEn: 'Bitcoin', tvSymbol: 'BINANCE:BTCUSDT', defaultUsd: 94200 },
  { symbol: 'ETHUSDT', base: 'ETH', pairLabel: 'ETH/VNE', nameVi: 'Ethereum', nameEn: 'Ethereum', tvSymbol: 'BINANCE:ETHUSDT', defaultUsd: 3380 },
  { symbol: 'SOLUSDT', base: 'SOL', pairLabel: 'SOL/VNE', nameVi: 'Solana', nameEn: 'Solana', tvSymbol: 'BINANCE:SOLUSDT', defaultUsd: 235 },
  { symbol: 'BNBUSDT', base: 'BNB', pairLabel: 'BNB/VNE', nameVi: 'BNB Chain', nameEn: 'BNB Chain', tvSymbol: 'BINANCE:BNBUSDT', defaultUsd: 645 },
  { symbol: 'XRPUSDT', base: 'XRP', pairLabel: 'XRP/VNE', nameVi: 'Ripple XRP', nameEn: 'Ripple XRP', tvSymbol: 'BINANCE:XRPUSDT', defaultUsd: 1.42 },
  { symbol: 'DOGEUSDT', base: 'DOGE', pairLabel: 'DOGE/VNE', nameVi: 'Dogecoin', nameEn: 'Dogecoin', tvSymbol: 'BINANCE:DOGEUSDT', defaultUsd: 0.38 },
  { symbol: 'PAXGUSDT', base: 'PAXG', pairLabel: 'PAXG/VNE', nameVi: 'Vàng số PAXG', nameEn: 'PAX Gold (PAXG)', tvSymbol: 'OANDA:XAUUSD', defaultUsd: 2655 },
];

export interface StockTickerSpec {
  ticker: string;
  pairLabel: string;
  exchange: 'HOSE' | 'NASDAQ';
  nameVi: string;
  nameEn: string;
  sectorVi: string;
  sectorEn: string;
  tvSymbol: string;
  refPriceVne: number; // 1 VNE = 1,000 VND
  dividendYieldPct: number;
}

export const STOCK_EXCHANGE_TICKERS: StockTickerSpec[] = [
  { ticker: 'FPT', pairLabel: 'FPT/VNE', exchange: 'HOSE', nameVi: 'Công nghệ FPT', nameEn: 'FPT Corp', sectorVi: 'Công nghệ', sectorEn: 'Technology', tvSymbol: 'HOSE:FPT', refPriceVne: 135.5, dividendYieldPct: 2.0 },
  { ticker: 'VCB', pairLabel: 'VCB/VNE', exchange: 'HOSE', nameVi: 'Vietcombank', nameEn: 'Vietcombank', sectorVi: 'Ngân hàng', sectorEn: 'Banking', tvSymbol: 'HOSE:VCB', refPriceVne: 92.4, dividendYieldPct: 1.2 },
  { ticker: 'HPG', pairLabel: 'HPG/VNE', exchange: 'HOSE', nameVi: 'Thép Hòa Phát', nameEn: 'Hoa Phat Group', sectorVi: 'Vật liệu', sectorEn: 'Materials', tvSymbol: 'HOSE:HPG', refPriceVne: 27.2, dividendYieldPct: 1.8 },
  { ticker: 'VNM', pairLabel: 'VNM/VNE', exchange: 'HOSE', nameVi: 'Vinamilk', nameEn: 'Vinamilk', sectorVi: 'Tiêu dùng', sectorEn: 'Consumer', tvSymbol: 'HOSE:VNM', refPriceVne: 65.8, dividendYieldPct: 4.5 },
  { ticker: 'MWG', pairLabel: 'MWG/VNE', exchange: 'HOSE', nameVi: 'Thế Giới Di Động', nameEn: 'Mobile World', sectorVi: 'Bán lẻ', sectorEn: 'Retail', tvSymbol: 'HOSE:MWG', refPriceVne: 61.0, dividendYieldPct: 1.0 },
  { ticker: 'SSI', pairLabel: 'SSI/VNE', exchange: 'HOSE', nameVi: 'Chứng khoán SSI', nameEn: 'SSI Securities', sectorVi: 'Chứng khoán', sectorEn: 'Brokerage', tvSymbol: 'HOSE:SSI', refPriceVne: 26.8, dividendYieldPct: 3.2 },
  { ticker: 'ACB', pairLabel: 'ACB/VNE', exchange: 'HOSE', nameVi: 'Ngân hàng ACB', nameEn: 'ACB Bank', sectorVi: 'Ngân hàng', sectorEn: 'Banking', tvSymbol: 'HOSE:ACB', refPriceVne: 25.5, dividendYieldPct: 3.8 },
  { ticker: 'E1VFVN30', pairLabel: 'VN30ETF/VNE', exchange: 'HOSE', nameVi: 'Quỹ ETF VN30', nameEn: 'VN30 ETF Fund', sectorVi: 'Chỉ số ETF', sectorEn: 'Index ETF', tvSymbol: 'HOSE:E1VFVN30', refPriceVne: 25.4, dividendYieldPct: 0 },
  { ticker: 'NVDA', pairLabel: 'NVDA/VNE', exchange: 'NASDAQ', nameVi: 'NVIDIA Corp', nameEn: 'NVIDIA Corp', sectorVi: 'AI & Bán dẫn', sectorEn: 'AI & Chips', tvSymbol: 'NASDAQ:NVDA', refPriceVne: 3450.0, dividendYieldPct: 0.1 },
  { ticker: 'AAPL', pairLabel: 'AAPL/VNE', exchange: 'NASDAQ', nameVi: 'Apple Inc', nameEn: 'Apple Inc', sectorVi: 'Công nghệ Mỹ', sectorEn: 'US Big Tech', tvSymbol: 'NASDAQ:AAPL', refPriceVne: 5820.0, dividendYieldPct: 0.5 },
];

export interface CommodityPairSpec {
  symbol: string;
  base: string;
  pairLabel: string;
  unitLabel: string;
  categoryVi: string;
  categoryEn: string;
  nameVi: string;
  nameEn: string;
  tvSymbol: string;
  defaultUsd: number;
}

export const COMMODITY_EXCHANGE_PAIRS: CommodityPairSpec[] = [
  { symbol: 'XAUUSD', base: 'XAU', pairLabel: 'XAU/VNE', unitLabel: 'oz', categoryVi: 'Kim loại quý', categoryEn: 'Precious Metal', nameVi: 'Vàng Quốc tế Spot', nameEn: 'Spot Gold (XAU/USD)', tvSymbol: 'OANDA:XAUUSD', defaultUsd: 2655 },
  { symbol: 'XAGUSD', base: 'XAG', pairLabel: 'XAG/VNE', unitLabel: 'oz', categoryVi: 'Kim loại quý', categoryEn: 'Precious Metal', nameVi: 'Bạc Quốc tế', nameEn: 'Silver Spot (XAG/USD)', tvSymbol: 'TVC:SILVER', defaultUsd: 31.2 },
  { symbol: 'UKOIL', base: 'BRENT', pairLabel: 'BRENT/VNE', unitLabel: 'bbl', categoryVi: 'Năng lượng', categoryEn: 'Energy', nameVi: 'Dầu thô Brent', nameEn: 'Brent Crude Oil', tvSymbol: 'TVC:UKOIL', defaultUsd: 73.5 },
  { symbol: 'USOIL', base: 'WTI', pairLabel: 'WTI/VNE', unitLabel: 'bbl', categoryVi: 'Năng lượng', categoryEn: 'Energy', nameVi: 'Dầu thô WTI', nameEn: 'WTI Crude Oil', tvSymbol: 'TVC:USOIL', defaultUsd: 69.8 },
  { symbol: 'NGAS', base: 'NGAS', pairLabel: 'NGAS/VNE', unitLabel: 'MMBtu', categoryVi: 'Năng lượng', categoryEn: 'Energy', nameVi: 'Khí tự nhiên', nameEn: 'Natural Gas', tvSymbol: 'TVC:NATURALGAS', defaultUsd: 3.15 },
  { symbol: 'HG1', base: 'COPPER', pairLabel: 'COPPER/VNE', unitLabel: 'lb', categoryVi: 'Kim loại CN', categoryEn: 'Industrial Metal', nameVi: 'Đồng Công nghiệp', nameEn: 'High Grade Copper', tvSymbol: 'COMEX:HG1!', defaultUsd: 4.18 },
  { symbol: 'KC1', base: 'COFFEE', pairLabel: 'COFFEE/VNE', unitLabel: 'lb', categoryVi: 'Nông sản VN', categoryEn: 'Agri Commodity', nameVi: 'Cà phê Quốc tế', nameEn: 'Coffee Futures', tvSymbol: 'ICEUS:KC1!', defaultUsd: 2.95 },
  { symbol: 'ZW1', base: 'WHEAT', pairLabel: 'WHEAT/VNE', unitLabel: 'bu', categoryVi: 'Nông sản', categoryEn: 'Agri Commodity', nameVi: 'Lúa mì CBOT', nameEn: 'CBOT Wheat', tvSymbol: 'CBOT:ZW1!', defaultUsd: 5.55 },
];

export interface ForexPairSpec {
  symbol: string; // e.g. 'USDVND'
  code: string; // e.g. 'USD'
  multiplier: number; // 1 for USD/EUR, 100 for JPY
  pairLabel: string; // e.g. 'USD/VNE'
  nameVi: string;
  nameEn: string;
  tvSymbol: string;
  defaultVne: number;
}

export const FOREX_EXCHANGE_PAIRS: ForexPairSpec[] = [
  { symbol: 'USDVND', code: 'USD', multiplier: 1, pairLabel: 'USD/VNE', nameVi: 'Đô la Mỹ', nameEn: 'US Dollar', tvSymbol: 'FX_IDC:USDVND', defaultVne: 25.45 },
  { symbol: 'EURVND', code: 'EUR', multiplier: 1, pairLabel: 'EUR/VNE', nameVi: 'Đồng Euro', nameEn: 'Euro', tvSymbol: 'FX_IDC:EURVND', defaultVne: 27.08 },
  { symbol: 'GBPVND', code: 'GBP', multiplier: 1, pairLabel: 'GBP/VNE', nameVi: 'Bảng Anh', nameEn: 'British Pound', tvSymbol: 'FX_IDC:GBPVND', defaultVne: 32.21 },
  { symbol: 'JPYVND', code: 'JPY', multiplier: 100, pairLabel: '100JPY/VNE', nameVi: '100 Yên Nhật', nameEn: '100 Japanese Yen', tvSymbol: 'FX_IDC:JPYVND', defaultVne: 16.61 },
  { symbol: 'SGDVND', code: 'SGD', multiplier: 1, pairLabel: 'SGD/VNE', nameVi: 'Đô la Singapore', nameEn: 'Singapore Dollar', tvSymbol: 'FX_IDC:SGDVND', defaultVne: 18.99 },
  { symbol: 'AUDVND', code: 'AUD', multiplier: 1, pairLabel: 'AUD/VNE', nameVi: 'Đô la Úc', nameEn: 'Australian Dollar', tvSymbol: 'FX_IDC:AUDVND', defaultVne: 16.63 },
  { symbol: 'CHFVND', code: 'CHF', multiplier: 1, pairLabel: 'CHF/VNE', nameVi: 'Franc Thụy Sĩ', nameEn: 'Swiss Franc', tvSymbol: 'FX_IDC:CHFVND', defaultVne: 28.85 },
  { symbol: 'CNYVND', code: 'CNY', multiplier: 1, pairLabel: 'CNY/VNE', nameVi: 'Nhân dân tệ', nameEn: 'Chinese Yuan', tvSymbol: 'FX_IDC:CNYVND', defaultVne: 3.51 },
];

export interface CarbonCreditPairSpec {
  symbol: string;
  code: string;
  pairLabel: string;
  standard: string;
  nameVi: string;
  nameEn: string;
  tvSymbol: string;
  defaultVne: number; // 1 VNE = 1,000 VND per tCO2e
  treesPerTon: number;
  isTreeProjectLinked?: boolean;
}

export const CARBON_EXCHANGE_PAIRS: CarbonCreditPairSpec[] = [
  { symbol: 'VNETREE', code: 'VNE-TREE', pairLabel: 'VNE-TREE/VNE', standard: 'Yêu Trồng Cây VN', nameVi: 'Tín chỉ Rừng Trồng Yêu Trồng Cây', nameEn: 'Yeu Trong Cay Reforestation Credit', tvSymbol: 'AMEX:KRBN', defaultVne: 380.0, treesPerTon: 45, isTreeProjectLinked: true },
  { symbol: 'MANGROVE', code: 'MANGROVE', pairLabel: 'MANGROVE-VN/VNE', standard: 'Blue Carbon VN', nameVi: 'Tín chỉ Rừng Ngập Mặn ĐBSCL', nameEn: 'Mekong Mangrove Blue Carbon', tvSymbol: 'AMEX:KRBN', defaultVne: 420.0, treesPerTon: 50, isTreeProjectLinked: true },
  { symbol: 'VCSARR', code: 'VCS-ARR', pairLabel: 'VCS-ARR/VNE', standard: 'Verra VCS', nameVi: 'Tín chỉ Verra Reforestation', nameEn: 'Verra VCS Afforestation Credit', tvSymbol: 'AMEX:KRBN', defaultVne: 450.0, treesPerTon: 45 },
  { symbol: 'GSBIO', code: 'GS-BIO', pairLabel: 'GS-BIO/VNE', standard: 'Gold Standard', nameVi: 'Tín chỉ Gold Standard Sinh khối', nameEn: 'Gold Standard Biomass Credit', tvSymbol: 'AMEX:KRBN', defaultVne: 510.0, treesPerTon: 40 },
  { symbol: 'EUETS', code: 'EU-ETS', pairLabel: 'EU-ETS/VNE', standard: 'EU Allowance', nameVi: 'Hạn ngạch Carbon Châu Âu (EUA)', nameEn: 'EU Emissions Allowance (EUA)', tvSymbol: 'AMEX:KRBN', defaultVne: 1780.0, treesPerTon: 45 },
  { symbol: 'CORSIA', code: 'CORSIA', pairLabel: 'CORSIA/VNE', standard: 'ICAO CORSIA', nameVi: 'Tín chỉ Hàng không CORSIA', nameEn: 'ICAO CORSIA Aviation Credit', tvSymbol: 'AMEX:KRBN', defaultVne: 310.0, treesPerTon: 42 },
];

export type ExchangeKind = 'crypto' | 'stock' | 'commodity' | 'forex' | 'carbon';
export type OrderSide = 'long' | 'short';
export type OrderType = 'market' | 'limit';

export interface SimExchangePosition {
  id: string;
  marketKind: ExchangeKind;
  symbol: string;
  pairLabel: string;
  side: OrderSide;
  leverage: 1 | 2 | 5;
  marginVne: number;
  units: number;
  entryPriceVne: number;
  takeProfitVne?: number;
  stopLossVne?: number;
  liquidationPriceVne?: number;
  openedAt: string;
}

export interface SimLimitOrder {
  id: string;
  marketKind: ExchangeKind;
  symbol: string;
  pairLabel: string;
  side: OrderSide;
  leverage: 1 | 2 | 5;
  marginVne: number;
  limitPriceVne: number;
  takeProfitVne?: number;
  stopLossVne?: number;
  createdAt: string;
}

export interface SimTradeSettlement {
  id: string;
  marketKind: ExchangeKind;
  symbol: string;
  pairLabel: string;
  side: OrderSide;
  leverage: 1 | 2 | 5;
  marginVne: number;
  entryPriceVne: number;
  exitPriceVne: number;
  pnlVne: number;
  feeVne: number;
  reason: 'manual' | 'take_profit' | 'stop_loss' | 'liquidated';
  settledAt: string;
}

const KEY_OPEN_POS = 'vne_sim_ex_positions_v1';
const KEY_LIMIT_ORDERS = 'vne_sim_ex_limits_v1';
const KEY_TRADE_HISTORY = 'vne_sim_ex_history_v1';
const KEY_DIVIDEND_CLAIM = 'vne_sim_stock_div_day_v1';
const KEY_MM_INVENTORY = 'vne_sim_mm_inventory_v1';

export function getMmInventoryMap(): Record<string, number> {
  return readJson<Record<string, number>>(KEY_MM_INVENTORY, {});
}

function updateMmInventory(symbol: string, deltaVne: number): void {
  const map = getMmInventoryMap();
  map[symbol] = Math.max(-5000, Math.min(5000, Number(((map[symbol] || 0) + deltaVne).toFixed(2))));
  writeJson(KEY_MM_INVENTORY, map);
}

/**
 * Avellaneda-Stoikov inspired Market Maker quoting engine:
 * - Dynamic Bid/Ask spread scales with volatility
 * - Inventory skew shifts quotes away from crowded side
 * - Generates 5-level Order Book depth for realistic slippage calculation
 */
export function computeMarketMakerQuote(params: {
  symbol: string;
  midPriceVne: number;
  volatilityPct?: number;
  marketKind: ExchangeKind;
}): MarketMakerQuote {
  const mid = Math.max(0.01, params.midPriceVne);
  const vol = Math.abs(params.volatilityPct ?? 1.2);
  const netInv = getMmInventoryMap()[params.symbol] || 0;

  const baseHalfSpread =
    params.marketKind === 'forex' ? 0.0003 : params.marketKind === 'crypto' ? 0.0005 : 0.0008;
  const volAdd = Math.min(0.0022, vol * 0.00012);
  const halfSpread = baseHalfSpread + volAdd;

  // When users buy (MM sells -> MM inventory becomes negative), MM raises quotes slightly
  const skew = Math.max(-0.0015, Math.min(0.0015, (-netInv / 2000) * 0.0008));
  const decimals = mid < 100 ? 3 : 2;
  const roundP = (v: number) => Number(Math.max(0.01, v).toFixed(decimals));

  const bestAskVne = roundP(mid * (1 + halfSpread + skew));
  const bestBidVne = roundP(mid * (1 - halfSpread + skew));
  const spreadPct = Number((((bestAskVne - bestBidVne) / mid) * 100).toFixed(3));
  const skewBps = Number((skew * 10000).toFixed(1));

  const step = Math.max(0.002, mid * 0.0007);
  const baseDepth = params.marketKind === 'crypto' ? 80 : 120;

  // Asks sorted highest -> lowest for visual order book display (index 4 is bestAsk)
  const asks: MarketMakerBookLevel[] = [4, 3, 2, 1, 0].map((lvl) => ({
    priceVne: lvl === 0 ? bestAskVne : roundP(bestAskVne + step * lvl),
    sizeVne: Math.round(baseDepth + lvl * 55 + ((mid * 13 + lvl * 7) % 35)),
  }));

  // Bids sorted highest -> lowest (index 0 is bestBid)
  const bids: MarketMakerBookLevel[] = [0, 1, 2, 3, 4].map((lvl) => ({
    priceVne: lvl === 0 ? bestBidVne : roundP(bestBidVne - step * lvl),
    sizeVne: Math.round(baseDepth + lvl * 50 + ((mid * 11 + lvl * 9) % 30)),
  }));

  return {
    midPriceVne: mid,
    bestBidVne,
    bestAskVne,
    spreadPct,
    skewBps,
    netInventoryVne: netInv,
    asks,
    bids,
  };
}

export function estimateOrderBookExecution(params: {
  side: OrderSide;
  notionalVne: number;
  quote: MarketMakerQuote;
}): { execPriceVne: number; slippagePct: number; levelsSwept: number } {
  const levels =
    params.side === 'long'
      ? [...params.quote.asks].reverse() // lowest ask first
      : params.quote.bids; // highest bid first

  let remaining = Math.max(1, params.notionalVne);
  let totalCost = 0;
  let filled = 0;
  let levelsSwept = 0;

  for (const lvl of levels) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, lvl.sizeVne);
    totalCost += take * lvl.priceVne;
    filled += take;
    remaining -= take;
    levelsSwept++;
  }

  // If order exceeds 5-level depth, fill remainder at worst level + 0.15% impact
  if (remaining > 0 && levels.length > 0) {
    const tailPrice =
      params.side === 'long'
        ? levels[levels.length - 1].priceVne * 1.0015
        : levels[levels.length - 1].priceVne * 0.9985;
    totalCost += remaining * tailPrice;
    filled += remaining;
  }

  const execPriceVne = Number((totalCost / Math.max(1, filled)).toFixed(params.quote.midPriceVne < 100 ? 3 : 2));
  const slippagePct = Number(
    (Math.abs(execPriceVne - params.quote.midPriceVne) / Math.max(0.01, params.quote.midPriceVne) * 100).toFixed(3),
  );

  return { execPriceVne, slippagePct, levelsSwept };
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, val: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // Ignore quota errors
  }
}

export function usdToVnePrice(usdPrice: number, usdVndRate = 25450): number {
  if (!Number.isFinite(usdPrice) || usdPrice <= 0) return 0;
  return Number(((usdPrice * usdVndRate) / VNE_PEG_VND).toFixed(usdPrice < 5 ? 3 : 2));
}

export function getExchangePositions(marketKind?: ExchangeKind): SimExchangePosition[] {
  const all = readJson<SimExchangePosition[]>(KEY_OPEN_POS, []);
  return marketKind ? all.filter((p) => p.marketKind === marketKind) : all;
}

export function getExchangeLimitOrders(marketKind?: ExchangeKind): SimLimitOrder[] {
  const all = readJson<SimLimitOrder[]>(KEY_LIMIT_ORDERS, []);
  return marketKind ? all.filter((o) => o.marketKind === marketKind) : all;
}

export function getExchangeHistory(marketKind?: ExchangeKind): SimTradeSettlement[] {
  const all = readJson<SimTradeSettlement[]>(KEY_TRADE_HISTORY, []);
  return marketKind ? all.filter((h) => h.marketKind === marketKind) : all;
}

export function getTodayExchangeProfitVne(): number {
  const today = new Date().toLocaleDateString('en-CA');
  return getExchangeHistory()
    .filter((h) => h.settledAt.slice(0, 10) === today && h.pnlVne > 0)
    .reduce((sum, h) => sum + h.pnlVne, 0);
}

export function calculateUnrealizedPnlVne(pos: SimExchangePosition, markPriceVne: number): {
  pnlVne: number;
  roePct: number;
} {
  if (!markPriceVne || pos.entryPriceVne <= 0) return { pnlVne: 0, roePct: 0 };
  const rawMove =
    pos.side === 'long'
      ? (markPriceVne - pos.entryPriceVne) / pos.entryPriceVne
      : (pos.entryPriceVne - markPriceVne) / pos.entryPriceVne;
  const leveragedMove = rawMove * pos.leverage;
  const pnlVne = Number((pos.marginVne * leveragedMove).toFixed(2));
  const roePct = Number((leveragedMove * 100).toFixed(2));
  return { pnlVne, roePct };
}

export function computeLiquidationPrice(
  entryPriceVne: number,
  side: OrderSide,
  leverage: 1 | 2 | 5,
): number | undefined {
  if (leverage <= 1) return undefined;
  const threshold = 0.9 / leverage; // 90% margin loss triggers liquidation
  return side === 'long'
    ? Number((entryPriceVne * (1 - threshold)).toFixed(4))
    : Number((entryPriceVne * (1 + threshold)).toFixed(4));
}

export function placeExchangeOrder(params: {
  marketKind: ExchangeKind;
  symbol: string;
  pairLabel: string;
  side: OrderSide;
  orderType: OrderType;
  leverage: 1 | 2 | 5;
  marginVne: number;
  currentPriceVne: number;
  limitPriceVne?: number;
  takeProfitVne?: number;
  stopLossVne?: number;
}): { ok: boolean; message: string } {
  const isEn = getLanguage() === 'en';
  if (!hasRegisteredAccount()) {
    return {
      ok: false,
      message: isEn
        ? 'Please sign in or register an account to trade with VNE Points.'
        : 'Vui lòng đăng ký hoặc đăng nhập tài khoản để giao dịch bằng VNE Points.',
    };
  }

  const margin = Math.round(params.marginVne);
  if (margin < 10) {
    return {
      ok: false,
      message: isEn ? 'Minimum order size is 10 VNE.' : 'Quy mô lệnh tối thiểu là 10 VNE.',
    };
  }

  const balance = getPointsState().totalPoints;
  if (margin > balance) {
    return {
      ok: false,
      message: isEn
        ? `Insufficient VNE Points (need ${margin} VNE, have ${balance} VNE).`
        : `Số dư không đủ (cần ${margin} VNE, hiện có ${balance} VNE).`,
    };
  }

  const feeRate =
    params.marketKind === 'crypto'
      ? CRYPTO_FEE_RATE
      : params.marketKind === 'commodity'
        ? COMMODITY_FEE_RATE
        : params.marketKind === 'forex'
          ? FOREX_FEE_RATE
          : params.marketKind === 'carbon'
            ? CARBON_FEE_RATE
            : STOCK_FEE_RATE;
  const spend = spendVnePoints(
    margin,
    isEn
      ? `${params.marketKind === 'crypto' ? 'Crypto' : params.marketKind === 'commodity' ? 'Commodity' : params.marketKind === 'forex' ? 'Forex' : params.marketKind === 'carbon' ? 'Carbon' : 'Stock'} Order: ${params.pairLabel} (${margin} VNE)`
      : `Mở lệnh ${params.marketKind === 'crypto' ? 'Crypto' : params.marketKind === 'commodity' ? 'Hàng hóa' : params.marketKind === 'forex' ? 'Ngoại hối' : params.marketKind === 'carbon' ? 'Tín chỉ Carbon' : 'Cổ phiếu'}: ${params.pairLabel} (-${margin} VNE)`,
  );
  if (!spend.ok) return { ok: false, message: spend.message };

  if (params.orderType === 'limit' && params.limitPriceVne && params.limitPriceVne > 0) {
    const order: SimLimitOrder = {
      id: `lim_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      marketKind: params.marketKind,
      symbol: params.symbol,
      pairLabel: params.pairLabel,
      side: params.side,
      leverage: params.leverage,
      marginVne: margin,
      limitPriceVne: params.limitPriceVne,
      takeProfitVne: params.takeProfitVne,
      stopLossVne: params.stopLossVne,
      createdAt: new Date().toISOString(),
    };
    const limits = readJson<SimLimitOrder[]>(KEY_LIMIT_ORDERS, []);
    writeJson(KEY_LIMIT_ORDERS, [order, ...limits]);
    return {
      ok: true,
      message: isEn
        ? `Limit order placed for ${params.pairLabel} @ ${params.limitPriceVne} VNE (${margin} VNE locked).`
        : `Đã đặt lệnh chờ Limit ${params.pairLabel} tại giá ${params.limitPriceVne} VNE (khóa ${margin} VNE).`,
    };
  }

  const effectiveMargin = Number((margin * (1 - feeRate)).toFixed(2));
  const units = Number(((effectiveMargin * params.leverage) / params.currentPriceVne).toFixed(6));
  const pos: SimExchangePosition = {
    id: `pos_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    marketKind: params.marketKind,
    symbol: params.symbol,
    pairLabel: params.pairLabel,
    side: params.side,
    leverage: params.leverage,
    marginVne: effectiveMargin,
    units,
    entryPriceVne: params.currentPriceVne,
    takeProfitVne: params.takeProfitVne,
    stopLossVne: params.stopLossVne,
    liquidationPriceVne: computeLiquidationPrice(params.currentPriceVne, params.side, params.leverage),
    openedAt: new Date().toISOString(),
  };
  const allPos = readJson<SimExchangePosition[]>(KEY_OPEN_POS, []);
  writeJson(KEY_OPEN_POS, [pos, ...allPos]);

  // Update Market Maker inventory (user Long = MM sells -> negative delta)
  updateMmInventory(params.symbol, params.side === 'long' ? -(margin * params.leverage) : margin * params.leverage);

  return {
    ok: true,
    message: isEn
      ? `Filled ${params.side.toUpperCase()} ${params.pairLabel} @ ${params.currentPriceVne} VNE (${margin} VNE)!`
      : `Khớp lệnh ${params.side === 'long' ? 'MUA' : 'BÁN KHỐNG'} ${params.pairLabel} giá ${params.currentPriceVne} VNE (-${margin} VNE)!`,
  };
}

export function closeExchangePosition(params: {
  positionId: string;
  exitPriceVne: number;
  reason?: SimTradeSettlement['reason'];
}): { ok: boolean; message: string } {
  const isEn = getLanguage() === 'en';
  const allPos = readJson<SimExchangePosition[]>(KEY_OPEN_POS, []);
  const target = allPos.find((p) => p.id === params.positionId);
  if (!target) {
    return { ok: false, message: isEn ? 'Position not found.' : 'Không tìm thấy vị thế.' };
  }

  const feeRate =
    target.marketKind === 'crypto'
      ? CRYPTO_FEE_RATE
      : target.marketKind === 'commodity'
        ? COMMODITY_FEE_RATE
        : target.marketKind === 'forex'
          ? FOREX_FEE_RATE
          : target.marketKind === 'carbon'
            ? CARBON_FEE_RATE
            : STOCK_FEE_RATE;
  const { pnlVne } = calculateUnrealizedPnlVne(target, params.exitPriceVne);
  const feeVne = Number((target.marginVne * feeRate).toFixed(2));

  let netPnl = Number((pnlVne - feeVne).toFixed(2));
  if (params.reason === 'liquidated') {
    netPnl = -target.marginVne;
  }

  // Enforce daily net profit cap (+500 VNE/day) to prevent points inflation
  const todayProfit = getTodayExchangeProfitVne();
  let cappedProfit = netPnl;
  if (netPnl > 0 && todayProfit + netPnl > DAILY_EXCHANGE_PROFIT_CAP_VNE) {
    cappedProfit = Math.max(0, Number((DAILY_EXCHANGE_PROFIT_CAP_VNE - todayProfit).toFixed(2)));
  }

  const returnVne = Math.max(0, Math.round(target.marginVne + cappedProfit));
  if (returnVne > 0 && hasRegisteredAccount()) {
    claimPracticePoints(
      returnVne,
      isEn
        ? `Settle ${target.pairLabel} (${netPnl >= 0 ? '+' : ''}${Math.round(cappedProfit)} VNE)`
        : `Chốt lệnh ${target.pairLabel} (${netPnl >= 0 ? '+' : ''}${Math.round(cappedProfit)} VNE)`,
    );
  }

  writeJson(
    KEY_OPEN_POS,
    allPos.filter((p) => p.id !== params.positionId),
  );

  const settlement: SimTradeSettlement = {
    id: `settle_${Date.now()}`,
    marketKind: target.marketKind,
    symbol: target.symbol,
    pairLabel: target.pairLabel,
    side: target.side,
    leverage: target.leverage,
    marginVne: target.marginVne,
    entryPriceVne: target.entryPriceVne,
    exitPriceVne: params.exitPriceVne,
    pnlVne: Math.round(cappedProfit),
    feeVne,
    reason: params.reason || 'manual',
    settledAt: new Date().toISOString(),
  };
  const hist = readJson<SimTradeSettlement[]>(KEY_TRADE_HISTORY, []);
  writeJson(KEY_TRADE_HISTORY, [settlement, ...hist].slice(0, 60));

  // Event-Driven Server Sync (only fires on actual trade settlement, not on price ticks -> 10,000+ CCU safe)
  void getFirebaseIdToken().then((token) => {
    if (!token) return;
    return fetch('/api/game.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        action: 'sim_exchange_settle',
        market_kind: target.marketKind,
        symbol: target.symbol,
        side: target.side,
        margin_vne: target.marginVne,
        entry_price_vne: target.entryPriceVne,
        exit_price_vne: params.exitPriceVne,
        pnl_vne: Math.round(cappedProfit),
        fee_vne: feeVne,
      }),
    });
  }).catch(() => {});

  return {
    ok: true,
    message: isEn
      ? `Closed ${target.pairLabel} @ ${params.exitPriceVne} VNE • Returned ${returnVne} VNE (PnL: ${cappedProfit >= 0 ? '+' : ''}${Math.round(cappedProfit)} VNE).`
      : `Đã chốt lệnh ${target.pairLabel} tại ${params.exitPriceVne} VNE • Thu về ${returnVne} VNE (Lời/Lỗ: ${cappedProfit >= 0 ? '+' : ''}${Math.round(cappedProfit)} VNE).`,
  };
}

export function cancelLimitOrder(orderId: string): { ok: boolean; message: string } {
  const isEn = getLanguage() === 'en';
  const limits = readJson<SimLimitOrder[]>(KEY_LIMIT_ORDERS, []);
  const target = limits.find((o) => o.id === orderId);
  if (!target) return { ok: false, message: 'Order not found.' };

  if (hasRegisteredAccount()) {
    claimPracticePoints(
      target.marginVne,
      isEn ? `Refund Limit Order ${target.pairLabel}` : `Hoàn VNE hủy lệnh chờ ${target.pairLabel}`,
    );
  }
  writeJson(
    KEY_LIMIT_ORDERS,
    limits.filter((o) => o.id !== orderId),
  );
  return {
    ok: true,
    message: isEn
      ? `Cancelled limit order ${target.pairLabel} (+${target.marginVne} VNE refunded).`
      : `Đã hủy lệnh chờ ${target.pairLabel} (hoàn lại ${target.marginVne} VNE).`,
  };
}

export function processAutomatedTriggers(
  marketKind: ExchangeKind,
  livePriceMap: Record<string, number>,
): string | null {
  const isEn = getLanguage() === 'en';
  let notice: string | null = null;

  // 1. Check Limit Orders
  const limits = readJson<SimLimitOrder[]>(KEY_LIMIT_ORDERS, []);
  const remainingLimits: SimLimitOrder[] = [];
  const newlyOpened: SimExchangePosition[] = [];

  for (const ord of limits) {
    if (ord.marketKind !== marketKind) {
      remainingLimits.push(ord);
      continue;
    }
    const price = livePriceMap[ord.symbol];
    const hit =
      price &&
      ((ord.side === 'long' && price <= ord.limitPriceVne) ||
        (ord.side === 'short' && price >= ord.limitPriceVne));
    if (hit) {
      // Limit orders provide liquidity as Maker -> receive +0.02% Maker Rebate!
      const effMargin = Number((ord.marginVne * (1 + MAKER_REBATE_RATE)).toFixed(2));
      newlyOpened.push({
        id: `pos_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        marketKind,
        symbol: ord.symbol,
        pairLabel: ord.pairLabel,
        side: ord.side,
        leverage: ord.leverage,
        marginVne: effMargin,
        units: Number(((effMargin * ord.leverage) / price).toFixed(6)),
        entryPriceVne: price,
        takeProfitVne: ord.takeProfitVne,
        stopLossVne: ord.stopLossVne,
        liquidationPriceVne: computeLiquidationPrice(price, ord.side, ord.leverage),
        openedAt: new Date().toISOString(),
      });
      updateMmInventory(ord.symbol, ord.side === 'long' ? -(ord.marginVne * ord.leverage) : ord.marginVne * ord.leverage);
      notice = isEn
        ? `Maker Limit filled (+0.02% Rebate): ${ord.pairLabel} @ ${price} VNE!`
        : `Khớp lệnh Maker Limit (+0.02% Hoàn phí): ${ord.pairLabel} tại ${price} VNE!`;
    } else {
      remainingLimits.push(ord);
    }
  }

  if (newlyOpened.length > 0) {
    writeJson(KEY_LIMIT_ORDERS, remainingLimits);
    const allPos = readJson<SimExchangePosition[]>(KEY_OPEN_POS, []);
    writeJson(KEY_OPEN_POS, [...newlyOpened, ...allPos]);
  }

  // 2. Check TP / SL / Liquidation on Open Positions
  const openPos = getExchangePositions(marketKind);
  for (const pos of openPos) {
    const price = livePriceMap[pos.symbol];
    if (!price) continue;
    if (
      pos.liquidationPriceVne &&
      ((pos.side === 'long' && price <= pos.liquidationPriceVne) ||
        (pos.side === 'short' && price >= pos.liquidationPriceVne))
    ) {
      closeExchangePosition({ positionId: pos.id, exitPriceVne: price, reason: 'liquidated' });
      notice = isEn
        ? `Position LIQUIDATED: ${pos.pairLabel} @ ${price} VNE.`
        : `Cháy vị thế (Thanh lý): ${pos.pairLabel} tại ${price} VNE.`;
      continue;
    }
    if (
      pos.takeProfitVne &&
      ((pos.side === 'long' && price >= pos.takeProfitVne) ||
        (pos.side === 'short' && price <= pos.takeProfitVne))
    ) {
      const r = closeExchangePosition({ positionId: pos.id, exitPriceVne: price, reason: 'take_profit' });
      notice = r.message;
      continue;
    }
    if (
      pos.stopLossVne &&
      ((pos.side === 'long' && price <= pos.stopLossVne) ||
        (pos.side === 'short' && price >= pos.stopLossVne))
    ) {
      const r = closeExchangePosition({ positionId: pos.id, exitPriceVne: price, reason: 'stop_loss' });
      notice = r.message;
    }
  }

  return notice;
}

export function claimStockDividends(): { ok: boolean; message: string } {
  const isEn = getLanguage() === 'en';
  if (!hasRegisteredAccount()) {
    return {
      ok: false,
      message: isEn ? 'Sign in to claim stock dividends.' : 'Vui lòng đăng nhập để nhận cổ tức.',
    };
  }
  const today = new Date().toLocaleDateString('en-CA');
  try {
    if (localStorage.getItem(KEY_DIVIDEND_CLAIM) === today) {
      return {
        ok: false,
        message: isEn ? 'Today’s stock dividends already claimed.' : 'Bạn đã nhận cổ tức hôm nay rồi.',
      };
    }
  } catch {
    // Ignore
  }

  const stockPos = getExchangePositions('stock');
  if (stockPos.length === 0) {
    return {
      ok: false,
      message: isEn
        ? 'Hold at least 1 stock position to earn daily dividends.'
        : 'Hãy nắm giữ ít nhất 1 mã cổ phiếu để nhận cổ tức hàng ngày.',
    };
  }

  const totalMargin = stockPos.reduce((s, p) => s + p.marginVne, 0);
  const divVne = Math.max(3, Math.min(25, Math.round(totalMargin * 0.03)));
  const res = claimPracticePoints(
    divVne,
    isEn ? `Stock Dividend Yield (+${divVne} VNE)` : `Nhận Cổ tức Cổ phiếu (+${divVne} VNE)`,
  );
  if (res.ok) {
    try {
      localStorage.setItem(KEY_DIVIDEND_CLAIM, today);
    } catch {
      // Ignore
    }
  }
  return {
    ok: res.ok,
    message: res.ok
      ? isEn
        ? `Claimed +${divVne} VNE daily stock dividends!`
        : `Đã nhận +${divVne} VNE cổ tức danh mục cổ phiếu!`
      : res.message,
  };
}

export interface CarbonRetirementStats {
  totalTonsRetired: number;
  totalTreesEquivalent: number;
  retirementsCount: number;
}

const KEY_CARBON_RETIRED = 'vne_sim_carbon_retired_v1';

export function getCarbonRetirementStats(): CarbonRetirementStats {
  return readJson<CarbonRetirementStats>(KEY_CARBON_RETIRED, {
    totalTonsRetired: 0,
    totalTreesEquivalent: 0,
    retirementsCount: 0,
  });
}

export function retireCarbonPosition(positionId: string): {
  ok: boolean;
  message: string;
  stats: CarbonRetirementStats;
} {
  const isEn = getLanguage() === 'en';
  const allPos = readJson<SimExchangePosition[]>(KEY_OPEN_POS, []);
  const target = allPos.find((p) => p.id === positionId && p.marketKind === 'carbon');
  const currentStats = getCarbonRetirementStats();
  if (!target) {
    return {
      ok: false,
      stats: currentStats,
      message: isEn ? 'Carbon credit position not found.' : 'Không tìm thấy vị thế tín chỉ Carbon.',
    };
  }

  const pairSpec = CARBON_EXCHANGE_PAIRS.find((c) => c.symbol === target.symbol);
  const treesPerTon = pairSpec?.treesPerTon ?? 45;
  const tons = Number(target.units.toFixed(4));
  const treesEq = Math.max(1, Math.round(tons * treesPerTon));

  writeJson(
    KEY_OPEN_POS,
    allPos.filter((p) => p.id !== positionId),
  );

  const nextStats: CarbonRetirementStats = {
    totalTonsRetired: Number((currentStats.totalTonsRetired + tons).toFixed(4)),
    totalTreesEquivalent: currentStats.totalTreesEquivalent + treesEq,
    retirementsCount: currentStats.retirementsCount + 1,
  };
  writeJson(KEY_CARBON_RETIRED, nextStats);

  if (hasRegisteredAccount()) {
    claimPracticePoints(
      15,
      isEn
        ? `Carbon Offset ESG Bonus (${tons} tCO2e ≈ ${treesEq} trees)`
        : `Thưởng ESG Khử Carbon (${tons} tCO2e ≈ ${treesEq} cây xanh)`,
    );
  }

  return {
    ok: true,
    stats: nextStats,
    message: isEn
      ? `Retired ${tons} tCO2e (≈ ${treesEq} trees for Yêu Trồng Cây)! Earned +15 VNE ESG Bonus.`
      : `Đã khử ${tons} tCO2e (tương đương ${treesEq} cây xanh dự án Yêu Trồng Cây)! Thưởng +15 VNE ESG.`,
  };
}
