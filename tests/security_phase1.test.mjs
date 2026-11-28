import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

test('Phase 1 security hardening closes fail-open auth, proxy spoofing, fallback secrets, and JSON file races', () => {
  const adminPhp = fs.readFileSync(path.join(ROOT, 'api/admin.php'), 'utf8');
  assert.match(adminPhp, /ADMIN_TOKEN_NOT_CONFIGURED/);
  assert.match(adminPhp, /hash_equals\(/);
  assert.doesNotMatch(adminPhp, /\$_GET\['token'\]/);

  const profilesPhp = fs.readFileSync(path.join(ROOT, 'api/profiles.php'), 'utf8');
  assert.match(profilesPhp, /vneBootstrapApi\(\)/);
  assert.match(profilesPhp, /vneRequireAuth\(\)/);
  assert.match(profilesPhp, /flock\(\$fp,\s*LOCK_EX\)/);
  assert.match(profilesPhp, /saveAvatarFromDataUri/);
  assert.doesNotMatch(profilesPhp, /Access-Control-Allow-Origin:\s*\*/);

  const bookNftsPhp = fs.readFileSync(path.join(ROOT, 'api/book_nfts.php'), 'utf8');
  assert.match(bookNftsPhp, /vneRequireAuth\(\)/);
  assert.match(bookNftsPhp, /flock\(\$fp,\s*LOCK_EX\)/);
  assert.doesNotMatch(bookNftsPhp, /CREATE TABLE IF NOT EXISTS/);

  const bootstrapPhp = fs.readFileSync(path.join(ROOT, 'api/core/bootstrap.php'), 'utf8');
  assert.match(bootstrapPhp, /trust_proxy_headers/);

  const jwtPhp = fs.readFileSync(path.join(ROOT, 'api/core/jwt_verify.php'), 'utf8');
  assert.doesNotMatch(jwtPhp, /vne_fallback_secret/);

  const htaccess = fs.readFileSync(path.join(ROOT, 'public/.htaccess'), 'utf8');
  assert.match(htaccess, /RewriteRule \^data\(\/\|\$\) - \[F,L\]/);
  assert.ok(htaccess.includes('public_profiles\\.json'));

  const migration006 = fs.readFileSync(path.join(ROOT, 'migrations/006_book_nfts_and_profiles.sql'), 'utf8');
  assert.match(migration006, /CREATE TABLE IF NOT EXISTS vne_book_nfts/);
  assert.match(migration006, /CREATE TABLE IF NOT EXISTS vne_public_profiles/);
});

test('Phase 1 bundle splitting extracts lesson HTML and lazy-loads English catalog', () => {
  const catalogSvc = fs.readFileSync(path.join(ROOT, 'src/core/data/catalogService.ts'), 'utf8');
  assert.match(catalogSvc, /import\('\.\.\/\.\.\/data\/catalog\.en\.json'\)/);
  assert.doesNotMatch(catalogSvc, /^import rawCatalogEn from/m);

  const viSizeKb = fs.statSync(path.join(ROOT, 'src/data/catalog.json')).size / 1024;
  const enSizeKb = fs.statSync(path.join(ROOT, 'src/data/catalog.en.json')).size / 1024;
  assert.ok(viSizeKb < 2000, `Expected catalog.json < 2000 KB, got ${viSizeKb.toFixed(1)} KB`);
  assert.ok(enSizeKb < 1200, `Expected catalog.en.json < 1200 KB, got ${enSizeKb.toFixed(1)} KB`);
  assert.ok(fs.existsSync(path.join(ROOT, 'public/course-lessons/nhap-mon-kinh-te-so.vi.json')));
});
