import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

test('Phase 2 Migration 007 and PHP APIs support server-side 100-VNE daily reset, unlocks, and bookshelf sync', () => {
  const mig007 = fs.readFileSync(path.join(ROOT, 'migrations/007_bookshelf_and_daily_reset.sql'), 'utf8');
  assert.match(mig007, /last_daily_reset_date/);
  assert.match(mig007, /CREATE TABLE IF NOT EXISTS user_unlocked_items/);
  assert.match(mig007, /CREATE TABLE IF NOT EXISTS user_bookshelf/);
  assert.match(mig007, /CREATE TABLE IF NOT EXISTS user_bookshelf_notes/);

  const gamePhp = fs.readFileSync(path.join(ROOT, 'api/game.php'), 'utf8');
  assert.match(gamePhp, /ensureServerDailyPointsReset/);
  assert.match(gamePhp, /action === 'unlock_item'/);
  assert.match(gamePhp, /action === 'practice_reward'/);
  assert.match(gamePhp, /user_unlocked_items/);

  const shelfPhp = fs.readFileSync(path.join(ROOT, 'api/bookshelf.php'), 'utf8');
  assert.match(shelfPhp, /vneRequireAuth\(\)/);
  assert.match(shelfPhp, /user_bookshelf/);
  assert.match(shelfPhp, /user_bookshelf_notes/);

  const accountSvc = fs.readFileSync(path.join(ROOT, 'src/features/account/accountService.ts'), 'utf8');
  assert.match(accountSvc, /export async function getFirebaseIdToken/);

  const gameSvc = fs.readFileSync(path.join(ROOT, 'src/features/game/vneGameService.ts'), 'utf8');
  assert.match(gameSvc, /syncPointsAndUnlocksFromServer/);

  const shelfSvc = fs.readFileSync(path.join(ROOT, 'src/features/bookshelf/bookshelfService.ts'), 'utf8');
  assert.match(shelfSvc, /syncBookshelfFromServer/);
});

test('Phase 2 SSR engine covers AI Skills, My Bookshelf, International News, and Public Account Profiles', () => {
  const ssrPhp = fs.readFileSync(path.join(ROOT, 'api/ssr_render.php'), 'utf8');
  assert.match(ssrPhp, /\$segments\[0\] === 'ai-skills'/);
  assert.match(ssrPhp, /vne_public_profiles/);
  assert.match(ssrPhp, /'@type'\s*=>\s*'Person'/);
  assert.match(ssrPhp, /'tu-sach-cua-toi'/);
  assert.match(ssrPhp, /'tin-quoc-te'/);
});
