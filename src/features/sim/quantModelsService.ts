export type AssetKey = 'gold' | 'equities' | 'crypto' | 'bonds' | 'usd';

export type QuantModelId =
  | 'markowitz'
  | 'var_cvar'
  | 'monte_carlo'
  | 'apt_factor'
  | 'risk_parity'
  | 'kelly';

export interface QuantModelMeta {
  id: QuantModelId;
  shortVi: string;
  shortEn: string;
  titleVi: string;
  titleEn: string;
  citation: string;
  formulaText: string;
  descVi: string;
  descEn: string;
}

export const QUANT_MODELS: QuantModelMeta[] = [
  {
    id: 'markowitz',
    shortVi: '1. Markowitz MPT',
    shortEn: '1. Markowitz MPT',
    titleVi: 'Lý thuyết Danh mục Hiện đại (Markowitz MPT)',
    titleEn: 'Modern Portfolio Theory (Markowitz MPT)',
    citation: 'Harry Markowitz (1952) • Nobel Prize in Economics 1990',
    formulaText: 'σ_p = √(wᵀ · Σ · w)   |   Sharpe = (E[R_p] − R_f) / σ_p',
    descVi: 'Tính phương sai danh mục dựa trên Ma trận Tương quan 5×5 giữa các lớp tài sản, định lượng lợi ích đa dạng hóa thực tế.',
    descEn: 'Computes exact portfolio variance using a 5×5 cross-asset correlation matrix to quantify true diversification benefit.',
  },
  {
    id: 'var_cvar',
    shortVi: '2. VaR & CVaR',
    shortEn: '2. VaR & CVaR',
    titleVi: 'Value at Risk (95% / 99%) & Expected Shortfall (CVaR)',
    titleEn: 'Parametric VaR (95% / 99%) & Expected Shortfall (CVaR)',
    citation: 'J.P. Morgan RiskMetrics (1994) • Basel III Regulatory Standard',
    formulaText: 'VaR_α = V₀ · (z_α·σ_p − μ_p)   |   CVaR_α = V₀ · ((φ(z_α)/(1−α))·σ_p − μ_p)',
    descVi: 'Ước lượng mức tổn thất tối đa ở độ tin cậy 95% (z=1.645) và 99% (z=2.326), kèm mức lỗ trung bình phần đuôi rủi ro (CVaR).',
    descEn: 'Estimates worst-case loss at 95% (z=1.645) and 99% (z=2.326) confidence levels plus tail Expected Shortfall (CVaR).',
  },
  {
    id: 'monte_carlo',
    shortVi: '3. Monte Carlo',
    shortEn: '3. Monte Carlo',
    titleVi: 'Mô phỏng Monte Carlo — Chuyển động Brown Hình học (GBM)',
    titleEn: 'Monte Carlo Simulation — Geometric Brownian Motion (GBM)',
    citation: 'Metropolis & Ulam (1949) • Black-Scholes-Merton Framework',
    formulaText: 'S_{t+Δt} = S_t · exp((μ − ½σ²)Δt + σ√Δt · Z),   Z ~ N(0, 1)',
    descVi: 'Chạy 500 đường đi ngẫu nhiên độc lập trong 1–5 năm để tính dải phân vị Bi quan (P10), Trung vị (P50), Lạc quan (P90) và xác suất lỗ vốn.',
    descEn: 'Runs 500 independent stochastic paths over 1–5 years to output P10, P50, P90 wealth percentiles and probability of loss.',
  },
  {
    id: 'apt_factor',
    shortVi: '4. APT Đa nhân tố',
    shortEn: '4. APT Multi-Factor',
    titleVi: 'Mô hình Định giá Kinh doanh Chênh lệch Đa nhân tố (APT)',
    titleEn: 'Arbitrage Pricing Theory (APT) Macro Factor Model',
    citation: 'Stephen Ross (1976) • Chen, Roll & Ross (1986)',
    formulaText: 'E[R_i] = R_f + β_r·ΔRate + β_π·ΔCPI + β_fx·ΔFX + α_regime',
    descVi: 'Phân rã minh bạch hệ số nhạy cảm Beta (β) của từng lớp tài sản với Lãi suất điều hành, Lạm phát CPI và Tỷ giá USD/VND.',
    descEn: 'Transparently decomposes each asset class Beta (β) sensitivity to Policy Rates, CPI Inflation, and USD/VND exchange rates.',
  },
  {
    id: 'risk_parity',
    shortVi: '5. Risk Parity',
    shortEn: '5. Risk Parity',
    titleVi: 'Ngang bằng Rủi ro — Risk Parity / All-Weather',
    titleEn: 'Risk Parity / All-Weather Allocation',
    citation: 'Ray Dalio (Bridgewater Associates) • Qian (2005)',
    formulaText: 'w_i* = (1 / σ_i) / Σ(1 / σ_j)',
    descVi: 'Phân bổ tỷ trọng tỷ lệ nghịch với độ biến động (σ) để mỗi lớp tài sản đóng góp mức rủi ro cân bằng trong mọi chu kỳ kinh tế.',
    descEn: 'Weights assets inversely to volatility (σ) so each asset class contributes balanced risk across macroeconomic regimes.',
  },
  {
    id: 'kelly',
    shortVi: '6. Kelly Criterion',
    shortEn: '6. Kelly Criterion',
    titleVi: 'Tiêu chuẩn Kelly & Half-Kelly (Tối ưu Quy mô Vốn)',
    titleEn: 'Kelly Criterion & Half-Kelly Optimal Sizing',
    citation: 'John L. Kelly Jr. (1956) • Edward O. Thorp (1962)',
    formulaText: 'f* = (μ_p − R_f) / σ_p²   |   f_safe = ½ · f*',
    descVi: 'Xác định tỷ lệ phân bổ vào tài sản rủi ro tối ưu về mặt toán học để tối đa hóa tăng trưởng kép dài hạn mà tránh nguy cơ cháy tài khoản.',
    descEn: 'Calculates the mathematically optimal risky capital fraction to maximize long-run compound growth while avoiding ruin.',
  },
];

export const ASSET_ORDER: AssetKey[] = ['gold', 'equities', 'crypto', 'bonds', 'usd'];

// Annualized standard deviation (volatility in decimal, e.g., 0.12 = 12%)
export const ASSET_VOL_DEC: Record<AssetKey, number> = {
  gold: 0.12,
  equities: 0.19,
  crypto: 0.52,
  bonds: 0.03,
  usd: 0.04,
};

// Empirical 5x5 Cross-Asset Correlation Matrix (Gold, Equities, Crypto, Bonds, USD)
export const CORR_MATRIX: Record<AssetKey, Record<AssetKey, number>> = {
  gold: { gold: 1.0, equities: -0.05, crypto: 0.12, bonds: 0.22, usd: -0.35 },
  equities: { gold: -0.05, equities: 1.0, crypto: 0.48, bonds: -0.15, usd: -0.25 },
  crypto: { gold: 0.12, equities: 0.48, crypto: 1.0, bonds: -0.1, usd: -0.2 },
  bonds: { gold: 0.22, equities: -0.15, crypto: -0.1, bonds: 1.0, usd: 0.15 },
  usd: { gold: -0.35, equities: -0.25, crypto: -0.2, bonds: 0.15, usd: 1.0 },
};

// APT Macro Factor Betas (sensitivity per +1% shock in Rate, CPI, FX)
export const APT_BETAS: Record<AssetKey, { betaRate: number; betaCpi: number; betaFx: number }> = {
  gold: { betaRate: -1.2, betaCpi: 1.8, betaFx: 0.6 },
  equities: { betaRate: -4.5, betaCpi: -1.4, betaFx: -0.5 },
  crypto: { betaRate: -7.5, betaCpi: -1.2, betaFx: 0.4 },
  bonds: { betaRate: 0.8, betaCpi: -0.5, betaFx: 0.0 },
  usd: { betaRate: 0.5, betaCpi: 0.0, betaFx: 1.0 },
};

export interface MarkowitzResult {
  portfolioVolPct: number;
  linearVolPct: number;
  diversificationSavedPct: number;
  sharpeRatio: number;
}

export function computeMarkowitzMPT(
  normWeightsPct: Record<AssetKey, number>,
  expectedReturnPct: number,
  riskFreePct = 4.7,
): MarkowitzResult {
  const w: Record<AssetKey, number> = {
    gold: normWeightsPct.gold / 100,
    equities: normWeightsPct.equities / 100,
    crypto: normWeightsPct.crypto / 100,
    bonds: normWeightsPct.bonds / 100,
    usd: normWeightsPct.usd / 100,
  };

  let variance = 0;
  let linearVol = 0;
  for (const i of ASSET_ORDER) {
    linearVol += w[i] * ASSET_VOL_DEC[i];
    for (const j of ASSET_ORDER) {
      variance += w[i] * w[j] * ASSET_VOL_DEC[i] * ASSET_VOL_DEC[j] * CORR_MATRIX[i][j];
    }
  }

  const portfolioVol = Math.sqrt(Math.max(0, variance));
  const portfolioVolPct = Number((portfolioVol * 100).toFixed(2));
  const linearVolPct = Number((linearVol * 100).toFixed(2));
  const diversificationSavedPct = Number(Math.max(0, linearVolPct - portfolioVolPct).toFixed(2));
  const sharpeRatio = portfolioVolPct > 0 ? Number(((expectedReturnPct - riskFreePct) / portfolioVolPct).toFixed(2)) : 0;

  return { portfolioVolPct, linearVolPct, diversificationSavedPct, sharpeRatio };
}

export interface VarCvarResult {
  var95Pct: number;
  var95Vnd: number;
  cvar95Pct: number;
  cvar95Vnd: number;
  var99Pct: number;
  var99Vnd: number;
  cvar99Pct: number;
  cvar99Vnd: number;
}

export function computeParametricVarCvar(
  capitalVnd: number,
  expectedReturnPct: number,
  portfolioVolPct: number,
): VarCvarResult {
  const mu = expectedReturnPct / 100;
  const sigma = portfolioVolPct / 100;

  const z95 = 1.64485;
  const z99 = 2.32635;
  const phi = (z: number) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);

  const var95 = Math.max(0, z95 * sigma - mu);
  const cvar95 = Math.max(var95, (phi(z95) / 0.05) * sigma - mu);

  const var99 = Math.max(0, z99 * sigma - mu);
  const cvar99 = Math.max(var99, (phi(z99) / 0.01) * sigma - mu);

  return {
    var95Pct: Number((var95 * 100).toFixed(2)),
    var95Vnd: Math.round(capitalVnd * var95),
    cvar95Pct: Number((cvar95 * 100).toFixed(2)),
    cvar95Vnd: Math.round(capitalVnd * cvar95),
    var99Pct: Number((var99 * 100).toFixed(2)),
    var99Vnd: Math.round(capitalVnd * var99),
    cvar99Pct: Number((cvar99 * 100).toFixed(2)),
    cvar99Vnd: Math.round(capitalVnd * cvar99),
  };
}

export interface MonteCarloResult {
  pathsCount: number;
  years: number;
  p10Vnd: number;
  p50Vnd: number;
  p90Vnd: number;
  lossProbPct: number;
  doubleProbPct: number;
}

// Fast Mulberry32 PRNG so Monte Carlo is reproducible per seed and ultra-fast on browser
function createPrng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function runMonteCarloGbm(params: {
  capitalVnd: number;
  expectedReturnPct: number;
  portfolioVolPct: number;
  years: number;
  pathsCount?: number;
  seed?: number;
}): MonteCarloResult {
  const pathsCount = params.pathsCount ?? 500;
  const years = Math.max(1, Math.min(10, params.years));
  const mu = params.expectedReturnPct / 100;
  const sigma = Math.max(0.01, params.portfolioVolPct / 100);
  const rand = createPrng(params.seed ?? 20261127);

  const drift = (mu - 0.5 * sigma * sigma) * years;
  const diffusion = sigma * Math.sqrt(years);

  const finals: number[] = [];
  let losses = 0;
  let doubles = 0;

  for (let i = 0; i < pathsCount; i++) {
    const u1 = Math.max(1e-7, rand());
    const u2 = rand();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const terminal = params.capitalVnd * Math.exp(drift + diffusion * z);
    finals.push(terminal);
    if (terminal < params.capitalVnd) losses++;
    if (terminal >= params.capitalVnd * 2) doubles++;
  }

  finals.sort((a, b) => a - b);
  const pick = (q: number) => Math.round(finals[Math.min(finals.length - 1, Math.floor(q * finals.length))]);

  return {
    pathsCount,
    years,
    p10Vnd: pick(0.1),
    p50Vnd: pick(0.5),
    p90Vnd: pick(0.9),
    lossProbPct: Number(((losses / pathsCount) * 100).toFixed(1)),
    doubleProbPct: Number(((doubles / pathsCount) * 100).toFixed(1)),
  };
}

export function computeRiskParityWeights(): Record<AssetKey, number> {
  const invVols = ASSET_ORDER.map((k) => 1 / ASSET_VOL_DEC[k]);
  const sumInv = invVols.reduce((a, b) => a + b, 0);
  const raw = ASSET_ORDER.map((k, idx) => ({ key: k, pct: Math.round((invVols[idx] / sumInv) * 100) }));

  // Ensure exact sum === 100
  const diff = 100 - raw.reduce((s, r) => s + r.pct, 0);
  raw[3].pct += diff; // adjust bonds

  return {
    gold: raw[0].pct,
    equities: raw[1].pct,
    crypto: raw[2].pct,
    bonds: raw[3].pct,
    usd: raw[4].pct,
  };
}

export interface KellyResult {
  fullKellyPct: number;
  halfKellyPct: number;
  currentRiskyPct: number;
  status: 'optimal' | 'under_allocated' | 'over_leveraged' | 'negative_edge';
}

export function computeKellyCriterion(
  expectedReturnPct: number,
  portfolioVolPct: number,
  currentRiskyPct: number,
  riskFreePct = 4.7,
): KellyResult {
  const excess = (expectedReturnPct - riskFreePct) / 100;
  const variance = Math.pow(Math.max(0.02, portfolioVolPct / 100), 2);
  if (excess <= 0) {
    return {
      fullKellyPct: 0,
      halfKellyPct: 0,
      currentRiskyPct: Number(currentRiskyPct.toFixed(1)),
      status: 'negative_edge',
    };
  }
  const fullKelly = Math.min(1.5, excess / variance);
  const fullKellyPct = Number((fullKelly * 100).toFixed(1));
  const halfKellyPct = Number(Math.min(100, (fullKelly * 50)).toFixed(1));

  let status: KellyResult['status'] = 'optimal';
  if (currentRiskyPct > halfKellyPct + 12) status = 'over_leveraged';
  else if (currentRiskyPct < halfKellyPct - 15) status = 'under_allocated';

  return {
    fullKellyPct,
    halfKellyPct,
    currentRiskyPct: Number(currentRiskyPct.toFixed(1)),
    status,
  };
}
