import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

test('My Bookshelf service and page implement My Garden-inspired features for VNEconomics', () => {
  const svc = fs.readFileSync(path.join(ROOT, 'src/features/bookshelf/bookshelfService.ts'), 'utf8');
  assert.match(svc, /export function syncBookshelfWithOwnedResources/);
  assert.match(svc, /export function logReadingSession/);
  assert.match(svc, /export function addBookshelfNote/);
  assert.match(svc, /export function claimDailyReadingBonus/);
  assert.match(svc, /export function calculateReaderRank/);

  const page = fs.readFileSync(path.join(ROOT, 'src/features/bookshelf/MyBookshelfPage.tsx'), 'utf8');
  assert.match(page, /MyBookshelfPage/);
  assert.match(page, /Daily Reading Quests/);
  assert.match(page, /BookNftMintModal/);
  assert.match(page, /nft_gallery/);

  const app = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');
  assert.match(app, /path="\/tu-sach-cua-toi\/\*"/);
});
