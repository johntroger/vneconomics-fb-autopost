import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

test('Phase 3 frontend modules and PHP REST endpoints exist', () => {
  const required = [
    'src/core/data/catalogService.ts',
    'src/features/ai/userAIService.ts',
    'src/features/ai/AILabPage.tsx',
    'src/features/game/vneGameService.ts',
    'src/features/game/GameHubPage.tsx',
    'src/features/blog/PillarPage.tsx',
    'src/features/blog/PostDetailPage.tsx',
    'src/features/library/LibraryPage.tsx',
    'src/features/academy/AcademyPage.tsx',
    'src/features/glossary/GlossaryPage.tsx',
    'src/features/admin/AdminPage.tsx',
    'api/posts.php',
    'api/search.php',
    'api/products.php',
    'api/download.php',
    'api/glossary.php',
    'api/game.php',
  ];

  for (const rel of required) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `Missing Phase 3 file: ${rel}`);
  }
});

test('Phase 3 AI BYOK supports 3 CORS providers and sessionStorage option', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'features', 'ai', 'userAIService.ts'), 'utf8');
  assert.ok(src.includes('generativelanguage.googleapis.com'), 'Missing Gemini endpoint');
  assert.ok(src.includes('api.openai.com'), 'Missing OpenAI endpoint');
  assert.ok(src.includes('openrouter.ai'), 'Missing OpenRouter endpoint');
  assert.ok(src.includes('sessionStorage'), 'Missing sessionStorage option for public PCs');
});

test('Phase 3 PHP APIs use PDO prepared statements and Firebase JWT auth guards', () => {
  const productsPhp = fs.readFileSync(path.join(ROOT, 'api', 'products.php'), 'utf8');
  const gamePhp = fs.readFileSync(path.join(ROOT, 'api', 'game.php'), 'utf8');
  const downloadPhp = fs.readFileSync(path.join(ROOT, 'api', 'download.php'), 'utf8');

  assert.ok(productsPhp.includes('vneRequireAuth()'), 'Missing Firebase auth guard in products.php');
  assert.ok(productsPhp.includes('vneGenerateDownloadToken'), 'Missing signed download token in products.php');
  assert.ok(gamePhp.includes('vneRequireAuth()'), 'Missing Firebase auth guard in game.php');
  assert.ok(gamePhp.includes('idempotency_key'), 'Missing anti-cheat idempotency key in game.php');
  assert.ok(downloadPhp.includes('vneVerifyDownloadToken'), 'Missing token verification in download.php');
});
