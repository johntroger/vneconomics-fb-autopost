import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CARBON_EXCHANGE_PAIRS,
  COMMODITY_EXCHANGE_PAIRS,
  CRYPTO_EXCHANGE_PAIRS,
  FOREX_EXCHANGE_PAIRS,
  MAKER_REBATE_RATE,
  STOCK_EXCHANGE_TICKERS,
  VNE_PEG_VND,
  calculateUnrealizedPnlVne,
  computeLiquidationPrice,
  computeMarketMakerQuote,
  estimateOrderBookExecution,
  usdToVnePrice,
} from '../src/features/sim/simExchangeService.ts';

test('VNE Exchange Peg is 1 VNE = 1,000 VND and converts USD pairs accurately', () => {
  assert.equal(VNE_PEG_VND, 1000);
  // $1.00 at 25,450 VND/USD = 25.45 VNE
  assert.equal(usdToVnePrice(1.0, 25450), 25.45);
  assert.ok(CRYPTO_EXCHANGE_PAIRS.some((p) => p.pairLabel === 'ADA/VNE'));
  assert.ok(CRYPTO_EXCHANGE_PAIRS.some((p) => p.pairLabel === 'BTC/VNE'));
  assert.ok(STOCK_EXCHANGE_TICKERS.some((s) => s.pairLabel === 'FPT/VNE' && s.refPriceVne === 135.5));
});

test('computeLiquidationPrice and calculateUnrealizedPnlVne handle leverage accurately', () => {
  assert.equal(computeLiquidationPrice(100, 'long', 1), undefined);
  const liqLong5x = computeLiquidationPrice(100, 'long', 5);
  assert.equal(liqLong5x, 82); // 0.9 / 5 = 18% drop

  const { pnlVne, roePct } = calculateUnrealizedPnlVne(
    {
      id: 'p1',
      marketKind: 'crypto',
      symbol: 'ADAUSDT',
      pairLabel: 'ADA/VNE',
      side: 'long',
      leverage: 2,
      marginVne: 50,
      units: 4,
      entryPriceVne: 25,
      openedAt: new Date().toISOString(),
    },
    27.5, // +10% spot move * 2x leverage = +20% ROE = +10 VNE
  );
  assert.equal(roePct, 20);
  assert.equal(pnlVne, 10);
});

test('Market Maker engine computes dynamic Bid-Ask spread and order-book slippage', () => {
  assert.equal(MAKER_REBATE_RATE, 0.0002);
  const quote = computeMarketMakerQuote({
    symbol: 'ADAUSDT',
    midPriceVne: 25.0,
    volatilityPct: 3.5,
    marketKind: 'crypto',
  });
  assert.ok(quote.bestAskVne > quote.bestBidVne);
  assert.ok(quote.spreadPct > 0);
  assert.equal(quote.asks.length, 5);
  assert.equal(quote.bids.length, 5);

  const smallExec = estimateOrderBookExecution({ side: 'long', notionalVne: 25, quote });
  const largeExec = estimateOrderBookExecution({ side: 'long', notionalVne: 500, quote });
  assert.ok(largeExec.execPriceVne >= smallExec.execPriceVne);
  assert.ok(largeExec.levelsSwept >= smallExec.levelsSwept);

  assert.ok(COMMODITY_EXCHANGE_PAIRS.some((c) => c.pairLabel === 'XAU/VNE'));
  assert.ok(COMMODITY_EXCHANGE_PAIRS.some((c) => c.pairLabel === 'BRENT/VNE'));
  assert.ok(COMMODITY_EXCHANGE_PAIRS.some((c) => c.pairLabel === 'COFFEE/VNE'));
  assert.ok(FOREX_EXCHANGE_PAIRS.some((f) => f.pairLabel === 'USD/VNE'));
  assert.ok(FOREX_EXCHANGE_PAIRS.some((f) => f.pairLabel === 'EUR/VNE'));
  assert.ok(FOREX_EXCHANGE_PAIRS.some((f) => f.pairLabel === '100JPY/VNE'));
  assert.ok(CARBON_EXCHANGE_PAIRS.some((c) => c.pairLabel === 'VNE-TREE/VNE' && c.isTreeProjectLinked));
  assert.ok(CARBON_EXCHANGE_PAIRS.some((c) => c.pairLabel === 'EU-ETS/VNE'));
});
