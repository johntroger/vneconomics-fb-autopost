import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeKellyCriterion,
  computeMarkowitzMPT,
  computeParametricVarCvar,
  computeRiskParityWeights,
  QUANT_MODELS,
  runMonteCarloGbm,
} from '../src/features/sim/quantModelsService.ts';

test('QUANT_MODELS defines all 6 international institutional models', () => {
  assert.equal(QUANT_MODELS.length, 6);
  const ids = QUANT_MODELS.map((m) => m.id);
  assert.deepEqual(ids, ['markowitz', 'var_cvar', 'monte_carlo', 'apt_factor', 'risk_parity', 'kelly']);
});

test('Markowitz MPT shows real diversification benefit (portfolioVol < linearVol)', () => {
  const res = computeMarkowitzMPT({ gold: 20, equities: 35, crypto: 15, bonds: 20, usd: 10 }, 11.2);
  assert.ok(res.portfolioVolPct > 0);
  assert.ok(res.portfolioVolPct < res.linearVolPct);
  assert.ok(res.diversificationSavedPct > 0);
});

test('Parametric VaR & CVaR satisfy CVaR99 >= VaR99 >= VaR95', () => {
  const res = computeParametricVarCvar(500_000_000, 8.5, 14.2);
  assert.ok(res.var99Pct >= res.var95Pct);
  assert.ok(res.cvar99Pct >= res.var99Pct);
  assert.ok(res.cvar95Pct >= res.var95Pct);
  assert.ok(res.var99Vnd >= res.var95Vnd);
});

test('Monte Carlo GBM produces ordered percentiles P10 <= P50 <= P90', () => {
  const mc = runMonteCarloGbm({
    capitalVnd: 500_000_000,
    expectedReturnPct: 10.5,
    portfolioVolPct: 14.0,
    years: 3,
    pathsCount: 500,
    seed: 12345,
  });
  assert.equal(mc.pathsCount, 500);
  assert.ok(mc.p10Vnd <= mc.p50Vnd);
  assert.ok(mc.p50Vnd <= mc.p90Vnd);
  assert.ok(mc.lossProbPct >= 0 && mc.lossProbPct <= 100);
});

test('Risk Parity weights sum to 100% and Kelly Criterion computes safe Half-Kelly', () => {
  const rp = computeRiskParityWeights();
  const total = rp.gold + rp.equities + rp.crypto + rp.bonds + rp.usd;
  assert.equal(total, 100);
  assert.ok(rp.bonds > rp.crypto);

  const kelly = computeKellyCriterion(12.0, 15.0, 50);
  assert.ok(kelly.fullKellyPct > 0);
  assert.ok(kelly.halfKellyPct > 0);
});
