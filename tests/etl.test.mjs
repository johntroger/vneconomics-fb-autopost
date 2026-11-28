import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

test('Phase 2 ETL catalog.json contains complete migrated VNEconomics datasets', () => {
  const catalogPath = path.join(ROOT, 'src', 'data', 'catalog.json');
  assert.ok(fs.existsSync(catalogPath), 'Missing src/data/catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  assert.ok(catalog.posts.length >= 200, `Expected >= 200 posts, got ${catalog.posts.length}`);
  assert.ok(catalog.products.length >= 50, `Expected >= 50 products, got ${catalog.products.length}`);
  assert.equal(catalog.courses.length, 10, `Expected 10 courses, got ${catalog.courses.length}`);
  assert.ok(catalog.glossary.length >= 30, `Expected >= 30 glossary terms, got ${catalog.glossary.length}`);

  for (const post of catalog.posts.slice(0, 50)) {
    assert.ok(post.slug && post.title, 'Post missing slug or title');
    assert.ok(!/<script/i.test(post.excerpt || ''), 'Unsafe script found in post excerpt');
  }
});

test('Phase 2 ETL generated idempotent SQL seed and full posts dump', () => {
  const sqlPath = path.join(ROOT, 'exports', 'seed_vneconomics_data.sql');
  assert.ok(fs.existsSync(sqlPath), 'Missing exports/seed_vneconomics_data.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  for (const marker of [
    'INSERT INTO posts',
    'INSERT INTO glossary_terms',
    'INSERT INTO products',
    'INSERT INTO courses',
    'INSERT INTO redirects',
  ]) {
    assert.ok(sql.includes(marker), `SQL seed missing ${marker}`);
  }

  assert.ok(fs.existsSync(path.join(ROOT, 'exports', 'posts_full.json')), 'Missing exports/posts_full.json');
  assert.ok(fs.existsSync(path.join(ROOT, 'exports', 'media_manifest.json')), 'Missing exports/media_manifest.json');
  assert.ok(fs.existsSync(path.join(ROOT, 'exports', 'etl_report.md')), 'Missing exports/etl_report.md');
});

test('Phase 2 ETL preserved all 3 Exam Banks for staging-store.vneconomics.com', () => {
  const examDir = path.join(ROOT, 'exports', 'exam_banks');
  const expectedExams = [
    'kiem-tra-kien-thuc-digital-marketing.json',
    'kiem-tra-kien-thuc-e-marcomme.json',
    'bai-thi-cuoi-ky-khoa-hoc-tai-chinh-phap-ly-blockchain.json',
  ];
  for (const file of expectedExams) {
    const p = path.join(examDir, file);
    assert.ok(fs.existsSync(p), `Missing exam bank export: ${file}`);
    const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.ok(parsed.raw_html && parsed.raw_html.length > 10000, `Exam ${file} raw_html unexpectedly small`);
  }
  assert.ok(fs.existsSync(path.join(examDir, 'exam_banks_export.sql')), 'Missing exam_banks_export.sql');
});
