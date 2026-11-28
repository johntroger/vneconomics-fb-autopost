import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FALLBACK_MARKET_BUNDLE,
  MARKET_MENU_ITEMS,
  computeLivePaperPrices,
} from '../src/features/market/marketFeedService.ts';
import { REFERENCE_MARKET_PRICES, updateLiveMarketPrices } from '../src/features/game/vneGameService.ts';

test('MARKET_MENU_ITEMS defines 8 distinct market data pages with SEO paths', () => {
  assert.equal(MARKET_MENU_ITEMS.length, 8);
  const paths = new Set(MARKET_MENU_ITEMS.map((m) => m.path));
  assert.equal(paths.size, 8);
  assert.ok(paths.has('/thi-truong/'));
  assert.ok(paths.has('/gia-vang/'));
  assert.ok(paths.has('/gia-crypto/'));
  assert.ok(paths.has('/ty-gia-ngoai-te/'));
  assert.ok(paths.has('/gia-chung-khoan/'));
  assert.ok(paths.has('/lai-suat-ngan-hang/'));
  assert.ok(paths.has('/thi-truong/vi-mo-hang-hoa/'));
  assert.ok(paths.has('/thi-truong/defi-onchain/'));
});

test('computeLivePaperPrices derives valid VND prices and updates REFERENCE_MARKET_PRICES', () => {
  const prices = computeLivePaperPrices(FALLBACK_MARKET_BUNDLE);
  assert.ok(prices.BTC > 1_000_000_000);
  assert.ok(prices.ADA > 1_000);
  assert.ok(prices.SJC > 50_000_000);
  assert.ok(prices.VNINDEX > 1_000);

  updateLiveMarketPrices({ BTC: prices.BTC, ADA: prices.ADA });
  assert.equal(REFERENCE_MARKET_PRICES.BTC.priceVnd, prices.BTC);
  assert.equal(REFERENCE_MARKET_PRICES.ADA.priceVnd, prices.ADA);
});
