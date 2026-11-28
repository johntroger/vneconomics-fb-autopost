import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

test('Phase 5 robots.txt allows SEO & AI crawlers and declares sitemap_index.xml', () => {
  const robots = fs.readFileSync(path.join(ROOT, 'public', 'robots.txt'), 'utf8');
  for (const bot of ['Googlebot', 'Bingbot', 'GPTBot', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot']) {
    assert.ok(robots.includes(`User-agent: ${bot}`), `robots.txt missing ${bot}`);
  }
  assert.ok(robots.includes('Sitemap: https://vneconomics.com/sitemap_index.xml'), 'robots.txt missing sitemap_index.xml');
});

test('Phase 5 100% migrated URLs have valid slugs and non-empty targets', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'catalog.json'), 'utf8'));
  const appSrc = fs.readFileSync(path.join(ROOT, 'src', 'App.tsx'), 'utf8');

  assert.equal(catalog.posts.length, 216, 'Expected 216 migrated posts');
  assert.equal(catalog.products.length, 59, 'Expected 59 migrated products');
  assert.equal(catalog.courses.length, 10, 'Expected 10 migrated courses');
  assert.equal(catalog.glossary.length, 219, 'Expected 219 glossary terms');

  for (const p of catalog.posts) {
    assert.ok(/^[a-z0-9\-_%]+$/i.test(p.slug), `Invalid post slug: ${p.slug}`);
  }
  for (const pr of catalog.products) {
    assert.ok(/^[a-z0-9\-_%]+$/i.test(pr.slug), `Invalid product slug: ${pr.slug}`);
  }
  for (const g of catalog.glossary) {
    assert.ok(/^[a-z0-9\-_%]+$/i.test(g.slug), `Invalid glossary slug: ${g.slug}`);
  }

  for (const route of [
    '/kinh-te-so/*',
    '/blockchain-tai-san-so/*',
    '/ai-cong-nghe/*',
    '/digital-marketing/*',
    '/nghien-cuu-khoa-hoc/*',
    '/thu-vien-sach/*',
    '/product/:slug/*',
    '/hoc-vien/*',
    '/course/:slug/*',
    '/tu-dien/*',
    '/gia-vang/*',
    '/gia-crypto/*',
    '/ty-gia-ngoai-te/*',
    '/lai-suat-ngan-hang/*',
    '/gia-chung-khoan/*',
    '/learn-and-earn/*',
    '/cardano-hub/*',
    '/verify/:id',
    '/ai-lab/*',
    '/:slug/*',
  ]) {
    assert.ok(appSrc.includes(`path="${route}"`), `App.tsx missing route ${route}`);
  }
});

test('Phase 5 Plesk packager & Cutover guide enforce security and cleanup rules', () => {
  const ps1 = fs.readFileSync(path.join(ROOT, 'scripts', 'prepare-plesk-package.ps1'), 'utf8');
  assert.ok(ps1.includes("config.php"), 'Packager must explicitly exclude api/config.php');
  assert.ok(ps1.includes("Remove-Item $stageDir"), 'Packager must clean up _plesk_stage');
  assert.ok(ps1.includes("Remove-Item $distDir"), 'Packager must clean up dist');
  assert.ok(ps1.includes('vneconomics-production.zip'), 'Packager must create vneconomics-production.zip');
  assert.ok(fs.existsSync(path.join(ROOT, 'HUONG_DAN_CUTOVER_PLESK.md')), 'Missing HUONG_DAN_CUTOVER_PLESK.md');
});
