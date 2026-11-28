import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

test('SQL migrations 003 and 004 exist and contain core tables & indexes', () => {
  const m3 = fs.readFileSync(path.join(ROOT, 'migrations', '003_core_platform_schema.sql'), 'utf8');
  const m4 = fs.readFileSync(path.join(ROOT, 'migrations', '004_gamification_web3_nft.sql'), 'utf8');

  for (const tbl of ['users', 'pillars', 'posts', 'glossary_terms', 'products', 'courses', 'market_snapshots', 'redirects', 'not_found_logs']) {
    assert.ok(m3.includes(`CREATE TABLE IF NOT EXISTS ${tbl}`), `Missing table ${tbl} in 003`);
  }
  assert.ok(m3.includes('FULLTEXT KEY ft_posts_search'), 'Missing FULLTEXT index on posts');

  for (const tbl of ['user_points', 'user_point_events', 'sim_portfolios', 'sim_assets', 'nft_mint_vouchers', 'user_nfts', 'web3_auth_nonces']) {
    assert.ok(m4.includes(`CREATE TABLE IF NOT EXISTS ${tbl}`), `Missing table ${tbl} in 004`);
  }
});

test('PHP 8 modular core and existing Autopost files coexist cleanly', () => {
  const requiredPhp = [
    'api/db.php',
    'api/cron_fb_autopost.php',
    'api/telegram_poster.php',
    'api/health.php',
    'api/core/bootstrap.php',
    'api/core/response.php',
    'api/core/cache.php',
    'api/core/rate_limit.php',
    'api/core/sanitizer.php',
    'api/core/jwt_verify.php',
    'public/.htaccess',
  ];

  for (const rel of requiredPhp) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `Missing required file: ${rel}`);
  }

  const htaccess = fs.readFileSync(path.join(ROOT, 'public', '.htaccess'), 'utf8');
  assert.ok(htaccess.includes('Content-Security-Policy'), 'Missing CSP header in .htaccess');
  assert.ok(htaccess.includes('api/ssr_render.php'), 'Missing SSR rewrite in .htaccess');
  assert.ok(htaccess.includes('api/llms.php'), 'Missing llms.txt rewrite in .htaccess');
});

test('Pillar config maps legacy WP categories cleanly into 5 topic pillars', () => {
  const pillarsSrc = fs.readFileSync(path.join(ROOT, 'src', 'core', 'config', 'pillars.ts'), 'utf8');
  const expectedSlugs = [
    'kinh-te-so',
    'blockchain-tai-san-so',
    'ai-cong-nghe',
    'digital-marketing',
    'nghien-cuu-khoa-hoc',
  ];
  for (const slug of expectedSlugs) {
    assert.ok(pillarsSrc.includes(`slug: '${slug}'`), `Missing pillar ${slug}`);
  }
  assert.ok(pillarsSrc.includes('kien-thuc-blockchain'), 'Missing legacy WP category kien-thuc-blockchain');
  assert.ok(pillarsSrc.includes('phuong-phap-nghien-cuu'), 'Missing legacy WP category phuong-phap-nghien-cuu');
});
