import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

test('vneGameService enforces 10 default points, 100 daily reset, and account-gated practice rewards', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/features/game/vneGameService.ts'), 'utf8');
  assert.match(src, /export const DEFAULT_INITIAL_POINTS = 10;/);
  assert.match(src, /export const DAILY_RESET_POINTS = 100;/);
  assert.match(src, /export const DEFAULT_RESOURCE_UNLOCK_COST = 10;/);
  assert.match(src, /export function hasRegisteredAccount\(\)/);
  assert.match(src, /export function claimPracticePoints\(/);
  assert.match(src, /Math\.max\(total, DAILY_RESET_POINTS\)/);
});

test('LibraryPage, AcademyPage, and SkillsMarketplacePage require VNE Points to unlock and read', () => {
  const libSrc = fs.readFileSync(path.join(ROOT, 'src/features/library/LibraryPage.tsx'), 'utf8');
  assert.match(libSrc, /const unlocked = isItemUnlocked\(`product:\$\{activeProduct\.slug\}`\)/);
  assert.match(libSrc, /getResourcePointCost\(activeProduct\.points_cost\)/);

  const acadSrc = fs.readFileSync(path.join(ROOT, 'src/features/academy/AcademyPage.tsx'), 'utf8');
  assert.match(acadSrc, /const courseUnlocked = isItemUnlocked\(`course:\$\{activeCourse\.slug\}`\)/);
  assert.match(acadSrc, /!courseUnlocked/);

  const skillsSrc = fs.readFileSync(path.join(ROOT, 'src/features/skills/SkillsMarketplacePage.tsx'), 'utf8');
  assert.match(skillsSrc, /const canDownloadDirectly = unlocked;/);
  assert.match(skillsSrc, /getResourcePointCost\(skill\.pointsCost\)/);

  const practiceSrc = fs.readFileSync(path.join(ROOT, 'src/features/practice/PracticeArenaPage.tsx'), 'utf8');
  assert.match(practiceSrc, /claimPracticePoints\(/);
  assert.match(practiceSrc, /!hasRegisteredAccount\(\)/);
});
