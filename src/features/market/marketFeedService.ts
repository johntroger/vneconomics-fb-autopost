import type { MarketType } from '../../core/types/index.ts';

export interface MarketMenuItem {
  type: MarketType;
  path: string;
  titleVi: string;
  titleEn: string;
  descVi: string;
  descEn: string;
  sourceLabel: string;
  accentColor: string;
}

export const MARKET_MENU_ITEMS: MarketMenuItem[] = [
  {
    type: 'overview',
    path: '/thi-truong/',
    titleVi: 'Tổng quan Thị trường',
    titleEn: 'Market Overview',
    descVi: 'Bảng điều khiển đa tài sản realtime: Crypto, Vàng, Tỷ giá & Chứng khoán',
    descEn: 'Real-time cross-asset dashboard: Crypto, Gold, FX & Equities',
    sourceLabel: 'Binance WS • Vietcombank • DeFiLlama • World Bank',
    accentColor: '#146EBE',
  },
  {
    type: 'gold',
    path: '/gia-vang/',
    titleVi: 'Giá Vàng & Chênh lệch SJC',
    titleEn: 'Gold Prices & SJC Spread',
    descVi: 'Biểu đồ giá vàng SJC tuần qua, bảng giá SJC/PNJ/DOJI/BTMC từ giavangvietnam.com & XAU/USD realtime',
    descEn: '7-day SJC gold chart, SJC/PNJ/DOJI/BTMC boards via giavangvietnam.com & live XAU/USD spread',
    sourceLabel: 'giavangvietnam.com • Binance PAXG/XAU • Vietcombank FX',
    accentColor: '#D97706',
  },
  {
    type: 'crypto',
    path: '/gia-crypto/',
    titleVi: 'Giá Crypto & Tài sản số',
    titleEn: 'Crypto & Digital Assets',
    descVi: 'BTC, ETH, ADA, SOL realtime từng giây + Chỉ số Tham lam & Sợ hãi',
    descEn: 'Real-time BTC, ETH, ADA, SOL tickers + Fear & Greed Sentiment Index',
    sourceLabel: 'Binance WebSocket • Alternative.me • CoinGecko',
    accentColor: '#F59E0B',
  },
  {
    type: 'forex',
    path: '/ty-gia-ngoai-te/',
    titleVi: 'Tỷ giá Ngoại tệ & Quy đổi',
    titleEn: 'FX Rates & Converter',
    descVi: 'Tỷ giá Vietcombank mua/bán thực tế + Máy tính quy đổi 150+ ngoại tệ',
    descEn: 'Official Vietcombank FX table + instant 150+ currency converter',
    sourceLabel: 'Vietcombank XML • Open ExchangeRate API',
    accentColor: '#0D9488',
  },
  {
    type: 'stock',
    path: '/gia-chung-khoan/',
    titleVi: 'Chứng khoán VN & Quốc tế',
    titleEn: 'Vietnam & Global Equities',
    descVi: 'Biểu đồ VN-Index, VN30, S&P 500, DXY & Lịch sự kiện kinh tế',
    descEn: 'VN-Index, VN30, S&P 500, DXY live widgets & Economic Calendar',
    sourceLabel: 'TradingView Live Market & Economic Calendar',
    accentColor: '#2563EB',
  },
  {
    type: 'interest_rate',
    path: '/lai-suat-ngan-hang/',
    titleVi: 'Lãi suất Ngân hàng & Vay',
    titleEn: 'Bank Deposit & Loan Rates',
    descVi: 'So sánh lãi suất tiết kiệm & cho vay 12+ ngân hàng VN + Máy tính lãi',
    descEn: 'Compare Vietnam Big4 & commercial bank deposit/loan rates + calculator',
    sourceLabel: 'VNEconomics Banking Benchmark & Looker Studio',
    accentColor: '#059669',
  },
  {
    type: 'macro',
    path: '/thi-truong/vi-mo-hang-hoa/',
    titleVi: 'Hàng hóa & Vĩ mô Việt Nam',
    titleEn: 'Commodities & Vietnam Macro',
    descVi: 'Dầu Brent/WTI + Số liệu GDP, CPI, FDI Việt Nam chuẩn World Bank',
    descEn: 'Brent/WTI oil + World Bank official Vietnam GDP, CPI & FDI datasets',
    sourceLabel: 'World Bank Open Data API • TradingView',
    accentColor: '#7C3AED',
  },
  {
    type: 'defi',
    path: '/thi-truong/defi-onchain/',
    titleVi: 'On-chain DeFi Toàn cầu (TVL)',
    titleEn: 'Global On-chain DeFi (TVL)',
    descVi: 'Tổng giá trị khóa (TVL) toàn thị trường DeFi, xếp hạng Blockchain & giao thức hàng đầu',
    descEn: 'Global DeFi TVL rankings across Ethereum, Solana, Base, Arbitrum, Cardano & top protocols',
    sourceLabel: 'DeFiLlama Open API (v2)',
    accentColor: '#0284C7',
  },
];

export interface CryptoTicker {
  symbol: string;
  price: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  quoteVolume: number;
}

export interface VcbRateItem {
  code: string;
  name: string;
  buyCash: number;
  buyTransfer: number;
  sell: number;
}

export interface BankRateItem {
  bank: string;
  group: string;
  m1: number;
  m3: number;
  m6: number;
  m12: number;
  m24: number;
  loanAvg: number;
}

export interface DefiProtocolItem {
  name: string;
  category: string;
  chain: string;
  chains?: string[];
  tvl: number;
  change1d: number;
  change7d: number;
  symbol: string;
}

export interface MacroIndicatorSeries {
  unit: string;
  latest: { year: string; value: number } | null;
  series: { year: string; value: number }[];
}

export interface MarketBundle {
  crypto: {
    tickers: Record<string, CryptoTicker>;
    fearAndGreed: { value: number; classification: string; timestamp: number }[];
    global: {
      totalMarketCapUsd: number;
      totalVolume24hUsd: number;
      btcDominance: number;
      ethDominance: number;
      marketCapChange24h: number;
    } | null;
    updatedAt: string;
    source: string;
  };
  forex: {
    usdVnd: number;
    vcbDate: string;
    vcbRates: VcbRateItem[];
    crossUsd: Record<string, number>;
    updatedAt: string;
    source: string;
  };
  gold: {
    xauUsd: number;
    xauChange24h: number;
    usdVnd: number;
    globalVndPerTael: number;
    sjcReferenceSellVnd: number;
    spreadVnd: number;
    vnGoldItems: { name: string; karat: string; buyVnd: number; sellVnd: number; updatedAt: string }[];
    updatedAt: string;
    source: string;
  };
  defi: {
    totalDefiTvlUsd: number;
    topChains: { name: string; tokenSymbol: string; tvl: number }[];
    topProtocols: DefiProtocolItem[];
    updatedAt: string;
    source: string;
  };
  macro: {
    country: string;
    indicators: Record<string, MacroIndicatorSeries>;
    updatedAt: string;
    source: string;
  };
  rates: {
    updatedAt: string;
    source: string;
    banks: BankRateItem[];
  };
  updatedAt: string;
}

const DEFAULT_BANK_RATES: BankRateItem[] = [
  { bank: 'Vietcombank', group: 'Big4', m1: 1.6, m3: 1.9, m6: 2.9, m12: 4.6, m24: 4.7, loanAvg: 6.8 },
  { bank: 'BIDV', group: 'Big4', m1: 1.7, m3: 2.0, m6: 3.0, m12: 4.7, m24: 4.8, loanAvg: 6.9 },
  { bank: 'VietinBank', group: 'Big4', m1: 1.7, m3: 2.0, m6: 3.0, m12: 4.7, m24: 4.8, loanAvg: 6.9 },
  { bank: 'Agribank', group: 'Big4', m1: 1.7, m3: 2.1, m6: 3.1, m12: 4.7, m24: 4.8, loanAvg: 6.7 },
  { bank: 'Techcombank', group: 'TMCP', m1: 3.15, m3: 3.45, m6: 4.45, m12: 4.95, m24: 5.1, loanAvg: 7.4 },
  { bank: 'MB Bank', group: 'TMCP', m1: 3.2, m3: 3.6, m6: 4.5, m12: 5.0, m24: 5.5, loanAvg: 7.3 },
  { bank: 'ACB', group: 'TMCP', m1: 2.7, m3: 3.1, m6: 4.2, m12: 4.8, m24: 5.0, loanAvg: 7.5 },
  { bank: 'VPBank', group: 'TMCP', m1: 3.5, m3: 3.8, m6: 4.8, m12: 5.3, m24: 5.6, loanAvg: 8.1 },
  { bank: 'TPBank', group: 'TMCP', m1: 3.3, m3: 3.6, m6: 4.6, m12: 5.2, m24: 5.5, loanAvg: 7.8 },
  { bank: 'HDBank', group: 'TMCP', m1: 3.45, m3: 3.65, m6: 5.0, m12: 5.5, m24: 5.8, loanAvg: 7.9 },
  { bank: 'VIB', group: 'TMCP', m1: 3.2, m3: 3.5, m6: 4.5, m12: 5.1, m24: 5.3, loanAvg: 7.6 },
  { bank: 'Sacombank', group: 'TMCP', m1: 2.8, m3: 3.2, m6: 4.4, m12: 5.0, m24: 5.2, loanAvg: 7.7 },
];

export const FALLBACK_MARKET_BUNDLE: MarketBundle = {
  crypto: {
    tickers: {
      BTCUSDT: { symbol: 'BTCUSDT', price: 94200, changePercent24h: 1.85, high24h: 95100, low24h: 92400, quoteVolume: 2150000000 },
      ETHUSDT: { symbol: 'ETHUSDT', price: 3380, changePercent24h: 2.15, high24h: 3440, low24h: 3290, quoteVolume: 1120000000 },
      ADAUSDT: { symbol: 'ADAUSDT', price: 0.96, changePercent24h: 3.4, high24h: 0.99, low24h: 0.91, quoteVolume: 380000000 },
      SOLUSDT: { symbol: 'SOLUSDT', price: 235, changePercent24h: 1.2, high24h: 242, low24h: 229, quoteVolume: 740000000 },
      BNBUSDT: { symbol: 'BNBUSDT', price: 645, changePercent24h: 0.85, high24h: 655, low24h: 634, quoteVolume: 290000000 },
      XRPUSDT: { symbol: 'XRPUSDT', price: 1.42, changePercent24h: 4.1, high24h: 1.48, low24h: 1.33, quoteVolume: 510000000 },
      PAXGUSDT: { symbol: 'PAXGUSDT', price: 2655, changePercent24h: 0.45, high24h: 2670, low24h: 2635, quoteVolume: 48000000 },
    },
    fearAndGreed: [{ value: 72, classification: 'Greed', timestamp: Math.floor(Date.now() / 1000) }],
    global: {
      totalMarketCapUsd: 3240000000000,
      totalVolume24hUsd: 145000000000,
      btcDominance: 57.4,
      ethDominance: 12.6,
      marketCapChange24h: 1.9,
    },
    updatedAt: new Date().toISOString(),
    source: 'Binance Public API • Alternative.me • CoinGecko',
  },
  forex: {
    usdVnd: 25450,
    vcbDate: 'Live Reference',
    vcbRates: [
      { code: 'USD', name: 'US DOLLAR', buyCash: 25150, buyTransfer: 25180, sell: 25450 },
      { code: 'EUR', name: 'EURO', buyCash: 26350, buyTransfer: 26610, sell: 27780 },
      { code: 'GBP', name: 'BRITISH POUND', buyCash: 31580, buyTransfer: 31900, sell: 32920 },
      { code: 'JPY', name: 'JAPANESE YEN', buyCash: 161.2, buyTransfer: 162.8, sell: 170.5 },
      { code: 'SGD', name: 'SINGAPORE DOLLAR', buyCash: 18540, buyTransfer: 18725, sell: 19330 },
      { code: 'AUD', name: 'AUSTRALIAN DOLLAR', buyCash: 16120, buyTransfer: 16280, sell: 16810 },
      { code: 'CNY', name: 'CHINESE YUAN', buyCash: 3440, buyTransfer: 3475, sell: 3585 },
      { code: 'KRW', name: 'SOUTH KOREAN WON', buyCash: 15.8, buyTransfer: 17.5, sell: 19.1 },
    ],
    crossUsd: { USD: 1, VND: 25450, EUR: 0.94, JPY: 153.2, GBP: 0.79, SGD: 1.34, AUD: 1.53, CNY: 7.24 },
    updatedAt: new Date().toISOString(),
    source: 'Vietcombank Official XML • Open ExchangeRate API',
  },
  gold: {
    xauUsd: 2655,
    xauChange24h: 0.45,
    usdVnd: 25450,
    globalVndPerTael: 81470000,
    sjcReferenceSellVnd: 85200000,
    spreadVnd: 3730000,
    vnGoldItems: [],
    updatedAt: new Date().toISOString(),
    source: 'Binance PAXG/XAU • Vietcombank FX',
  },
  defi: {
    totalDefiTvlUsd: 118500000000,
    topChains: [
      { name: 'Ethereum', tokenSymbol: 'ETH', tvl: 62500000000 },
      { name: 'Solana', tokenSymbol: 'SOL', tvl: 8400000000 },
      { name: 'BSC', tokenSymbol: 'BNB', tvl: 5300000000 },
      { name: 'Bitcoin', tokenSymbol: 'BTC', tvl: 4900000000 },
      { name: 'Base', tokenSymbol: 'ETH', tvl: 3400000000 },
      { name: 'Arbitrum', tokenSymbol: 'ARB', tvl: 3100000000 },
      { name: 'Tron', tokenSymbol: 'TRX', tvl: 7200000000 },
      { name: 'Avalanche', tokenSymbol: 'AVAX', tvl: 1450000000 },
      { name: 'Sui', tokenSymbol: 'SUI', tvl: 1320000000 },
      { name: 'Cardano', tokenSymbol: 'ADA', tvl: 485000000 },
    ],
    topProtocols: [
      { name: 'Lido', category: 'Liquid Staking', chain: 'Ethereum', chains: ['Ethereum'], tvl: 28500000000, change1d: 1.2, change7d: 4.1, symbol: 'LDO' },
      { name: 'Aave V3', category: 'Lending', chain: 'Ethereum', chains: ['Ethereum', 'Arbitrum', 'Base'], tvl: 19200000000, change1d: 0.9, change7d: 3.4, symbol: 'AAVE' },
      { name: 'EigenLayer', category: 'Restaking', chain: 'Ethereum', chains: ['Ethereum'], tvl: 14800000000, change1d: 1.5, change7d: 5.0, symbol: 'EIGEN' },
      { name: 'Sky (MakerDAO)', category: 'CDP', chain: 'Ethereum', chains: ['Ethereum'], tvl: 6400000000, change1d: 0.4, change7d: 1.8, symbol: 'SKY' },
      { name: 'Uniswap V3', category: 'Dexes', chain: 'Ethereum', chains: ['Ethereum', 'Arbitrum', 'Base'], tvl: 5200000000, change1d: 1.8, change7d: 6.2, symbol: 'UNI' },
      { name: 'Jito', category: 'Liquid Staking', chain: 'Solana', chains: ['Solana'], tvl: 3100000000, change1d: 2.3, change7d: 7.4, symbol: 'JTO' },
      { name: 'Aerodrome', category: 'Dexes', chain: 'Base', chains: ['Base'], tvl: 1450000000, change1d: 3.1, change7d: 9.2, symbol: 'AERO' },
      { name: 'GMX', category: 'Derivatives', chain: 'Arbitrum', chains: ['Arbitrum', 'Avalanche'], tvl: 680000000, change1d: 0.7, change7d: 2.5, symbol: 'GMX' },
      { name: 'Minswap', category: 'Dexes', chain: 'Cardano', chains: ['Cardano'], tvl: 135000000, change1d: 1.4, change7d: 5.2, symbol: 'MIN' },
    ],
    updatedAt: new Date().toISOString(),
    source: 'DeFiLlama Open API (v2)',
  },
  macro: {
    country: 'VNM',
    indicators: {
      gdpGrowth: { unit: '%', latest: { year: '2024', value: 7.09 }, series: [{ year: '2024', value: 7.09 }, { year: '2023', value: 5.05 }, { year: '2022', value: 8.12 }] },
      cpiInflation: { unit: '%', latest: { year: '2024', value: 3.63 }, series: [{ year: '2024', value: 3.63 }, { year: '2023', value: 3.25 }, { year: '2022', value: 3.16 }] },
      gdpPerCapita: { unit: 'USD', latest: { year: '2024', value: 4700 }, series: [{ year: '2024', value: 4700 }, { year: '2023', value: 4282 }, { year: '2022', value: 4110 }] },
      fdiInflowPctGdp: { unit: '% GDP', latest: { year: '2023', value: 4.3 }, series: [{ year: '2023', value: 4.3 }, { year: '2022', value: 4.36 }] },
      exportsPctGdp: { unit: '% GDP', latest: { year: '2023', value: 87.2 }, series: [{ year: '2023', value: 87.2 }, { year: '2022', value: 93.8 }] },
    },
    updatedAt: new Date().toISOString(),
    source: 'World Bank Open Data API (v2)',
  },
  rates: {
    updatedAt: new Date().toISOString(),
    source: 'VNEconomics Vietnam Banking Rate Benchmark',
    banks: DEFAULT_BANK_RATES,
  },
  updatedAt: new Date().toISOString(),
};

const MARKET_CACHE_KEY = 'vne_market_bundle_v1';
const MARKET_CACHE_TTL_MS = 60_000;

export function getCachedMarketBundle(): MarketBundle {
  try {
    const raw = localStorage.getItem(MARKET_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { data: MarketBundle };
      if (
        parsed?.data?.crypto?.tickers &&
        Array.isArray(parsed?.data?.defi?.topProtocols) &&
        parsed.data.defi.topProtocols.length > 0
      ) {
        return parsed.data;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return FALLBACK_MARKET_BUNDLE;
}

function saveCachedMarketBundle(bundle: MarketBundle): void {
  try {
    localStorage.setItem(MARKET_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data: bundle }));
  } catch {
    // Ignore storage errors
  }
}

async function fetchDirectPublicFallback(): Promise<MarketBundle> {
  const next: MarketBundle = JSON.parse(JSON.stringify(getCachedMarketBundle())) as MarketBundle;
  const symbols = encodeURIComponent(
    JSON.stringify(['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'PAXGUSDT']),
  );

  const [binanceRes, erRes, fngRes, llamaRes] = await Promise.allSettled([
    fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${symbols}`),
    fetch('https://open.er-api.com/v6/latest/USD'),
    fetch('https://api.alternative.me/fng/?limit=7'),
    fetch('https://api.llama.fi/v2/chains'),
  ]);

  if (binanceRes.status === 'fulfilled' && binanceRes.value.ok) {
    const rows = (await binanceRes.value.json()) as Array<{
      symbol: string;
      lastPrice: string;
      priceChangePercent: string;
      highPrice: string;
      lowPrice: string;
      quoteVolume: string;
    }>;
    if (Array.isArray(rows)) {
      for (const r of rows) {
        next.crypto.tickers[r.symbol] = {
          symbol: r.symbol,
          price: Number(r.lastPrice) || 0,
          changePercent24h: Number(r.priceChangePercent) || 0,
          high24h: Number(r.highPrice) || 0,
          low24h: Number(r.lowPrice) || 0,
          quoteVolume: Number(r.quoteVolume) || 0,
        };
      }
      next.crypto.updatedAt = new Date().toISOString();
    }
  }

  if (erRes.status === 'fulfilled' && erRes.value.ok) {
    const er = (await erRes.value.json()) as { rates?: Record<string, number> };
    if (er?.rates?.VND) {
      next.forex.usdVnd = er.rates.VND;
      next.forex.crossUsd = er.rates;
      next.forex.updatedAt = new Date().toISOString();
    }
  }

  if (fngRes.status === 'fulfilled' && fngRes.value.ok) {
    const fng = (await fngRes.value.json()) as {
      data?: Array<{ value: string; value_classification: string; timestamp: string }>;
    };
    if (Array.isArray(fng?.data)) {
      next.crypto.fearAndGreed = fng.data.map((item) => ({
        value: Number(item.value) || 50,
        classification: item.value_classification || 'Neutral',
        timestamp: Number(item.timestamp) || Math.floor(Date.now() / 1000),
      }));
    }
  }

  if (llamaRes.status === 'fulfilled' && llamaRes.value.ok) {
    const chains = (await llamaRes.value.json()) as Array<{ name: string; tokenSymbol?: string; tvl?: number }>;
    if (Array.isArray(chains)) {
      const sorted = [...chains].sort((a, b) => (b.tvl || 0) - (a.tvl || 0));
      next.defi.totalDefiTvlUsd = sorted.reduce((sum, c) => sum + (c.tvl || 0), 0);
      next.defi.topChains = sorted.slice(0, 12).map((c) => ({
        name: c.name,
        tokenSymbol: c.tokenSymbol || '',
        tvl: c.tvl || 0,
      }));
      if (!Array.isArray(next.defi.topProtocols) || next.defi.topProtocols.length === 0) {
        next.defi.topProtocols = FALLBACK_MARKET_BUNDLE.defi.topProtocols;
      }
      next.defi.updatedAt = new Date().toISOString();
    }
  }

  // Recompute gold conversion from live PAXG + USD/VND
  const paxg = next.crypto.tickers.PAXGUSDT;
  if (paxg && paxg.price > 0) {
    next.gold.xauUsd = paxg.price;
    next.gold.xauChange24h = paxg.changePercent24h;
    next.gold.usdVnd = next.forex.usdVnd;
    next.gold.globalVndPerTael = Math.round(paxg.price * 1.20565303 * next.forex.usdVnd);
    next.gold.sjcReferenceSellVnd = Math.round(next.gold.globalVndPerTael * 1.042);
    next.gold.spreadVnd = next.gold.sjcReferenceSellVnd - next.gold.globalVndPerTael;
    next.gold.updatedAt = new Date().toISOString();
  }

  next.updatedAt = new Date().toISOString();
  saveCachedMarketBundle(next);
  return next;
}

export async function fetchMarketBundle(force = false): Promise<MarketBundle> {
  if (!force) {
    try {
      const raw = localStorage.getItem(MARKET_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { savedAt: number; data: MarketBundle };
        if (parsed?.savedAt && Date.now() - parsed.savedAt < MARKET_CACHE_TTL_MS && parsed.data?.crypto) {
          return parsed.data;
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  try {
    const res = await fetch('/api/market_feed.php?feed=all');
    if (res.ok) {
      const json = (await res.json()) as { ok?: boolean; data?: MarketBundle };
      if (json?.ok && json.data?.crypto?.tickers) {
        saveCachedMarketBundle(json.data);
        return json.data;
      }
    }
  } catch {
    // Fallback to direct public endpoints (e.g., during Vite local dev without PHP)
  }

  return fetchDirectPublicFallback();
}

export function subscribeBinanceRealtime(
  symbols: string[],
  onTick: (symbol: string, price: number, changePercent24h: number) => void,
): () => void {
  if (typeof WebSocket === 'undefined' || symbols.length === 0) {
    return () => {};
  }

  const streams = symbols.map((s) => `${s.toLowerCase()}@ticker`).join('/');
  let ws: WebSocket | null = null;
  let closed = false;
  const pendingTicks = new Map<string, { price: number; pct: number }>();

  const flushTicks = () => {
    if (closed || pendingTicks.size === 0) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    pendingTicks.forEach((val, sym) => {
      onTick(sym, val.price, val.pct);
    });
    pendingTicks.clear();
  };

  // Throttle UI updates to 300ms batches (~3 fps) to avoid 30Hz React re-render storms
  const flushTimer = setInterval(flushTicks, 300);
  const handleVisibility = () => {
    if (typeof document !== 'undefined' && !document.hidden) {
      flushTicks();
    }
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibility);
  }

  try {
    ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
    ws.onmessage = (event) => {
      if (closed) return;
      try {
        const msg = JSON.parse(String(event.data)) as {
          data?: { s?: string; c?: string; P?: string };
        };
        const d = msg?.data;
        if (d?.s && d.c) {
          const price = Number(d.c);
          const pct = Number(d.P ?? 0);
          if (Number.isFinite(price) && price > 0) {
            pendingTicks.set(d.s, { price, pct: Number.isFinite(pct) ? pct : 0 });
          }
        }
      } catch {
        // Ignore malformed tick
      }
    };
  } catch {
    // Ignore WS connection errors
  }

  return () => {
    closed = true;
    clearInterval(flushTimer);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibility);
    }
    pendingTicks.clear();
    try {
      ws?.close();
    } catch {
      // Ignore
    }
  };
}

export function computeLivePaperPrices(bundle: MarketBundle): Record<'SJC' | 'BTC' | 'ADA' | 'VNINDEX', number> {
  const usdVnd = bundle.forex.usdVnd > 10000 ? bundle.forex.usdVnd : 25450;
  const btcUsd = bundle.crypto.tickers.BTCUSDT?.price || 94200;
  const adaUsd = bundle.crypto.tickers.ADAUSDT?.price || 0.96;
  const sjcVnd = bundle.gold.sjcReferenceSellVnd > 1000000 ? bundle.gold.sjcReferenceSellVnd : 85200000;

  return {
    SJC: Math.round(sjcVnd),
    BTC: Math.round(btcUsd * usdVnd),
    ADA: Math.round(adaUsd * usdVnd),
    VNINDEX: 25400, // Reference ETF VN30 certificate unit in VND
  };
}
