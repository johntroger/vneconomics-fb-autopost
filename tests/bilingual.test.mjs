import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const VN_DIACRITIC_RE =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/g;

test('Permanent bilingual policy rule, DB migration 005, and batch translator script exist', () => {
  const policyPath = path.join(ROOT, '.gemini', 'rules', 'bilingual-content-policy.md');
  const migrationPath = path.join(ROOT, 'migrations', '005_bilingual_en_columns.sql');
  const scriptPath = path.join(ROOT, 'scripts', 'translate-catalog-en.mjs');

  assert.ok(fs.existsSync(policyPath), 'Missing .gemini/rules/bilingual-content-policy.md');
  assert.ok(fs.existsSync(migrationPath), 'Missing migrations/005_bilingual_en_columns.sql');
  assert.ok(fs.existsSync(scriptPath), 'Missing scripts/translate-catalog-en.mjs');

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  for (const col of ['title_en', 'tldr_summary_en', 'content_html_en']) {
    assert.ok(migrationSql.includes(col), `Missing column ${col} in 005_bilingual_en_columns.sql`);
  }
});

test('English locale dictionary (en.ts) contains ZERO Vietnamese characters and matches vi.ts section structure', () => {
  const viRaw = fs.readFileSync(path.join(ROOT, 'src', 'core', 'i18n', 'locales', 'vi.ts'), 'utf8');
  const enRaw = fs.readFileSync(path.join(ROOT, 'src', 'core', 'i18n', 'locales', 'en.ts'), 'utf8');

  const codeOnlyEn = enRaw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const vnMatches = codeOnlyEn.match(VN_DIACRITIC_RE) || [];
  assert.equal(
    vnMatches.length,
    0,
    `Found forbidden Vietnamese characters in en.ts: ${vnMatches.slice(0, 10).join(', ')}`,
  );

  for (const section of ['common:', 'topBar:', 'nav:', 'footer:', 'mobile:', 'home:', 'practice:']) {
    assert.ok(viRaw.includes(section), `Missing section ${section} in vi.ts`);
    assert.ok(enRaw.includes(section), `Missing section ${section} in en.ts`);
  }
});

test('English catalog (catalog.en.json) contains ZERO Vietnamese characters and preserves full item parity', () => {
  const viCatalogPath = path.join(ROOT, 'src', 'data', 'catalog.json');
  const enCatalogPath = path.join(ROOT, 'src', 'data', 'catalog.en.json');

  assert.ok(fs.existsSync(viCatalogPath), 'Missing src/data/catalog.json');
  assert.ok(fs.existsSync(enCatalogPath), 'Missing src/data/catalog.en.json');

  const enText = fs.readFileSync(enCatalogPath, 'utf8');
  const vnMatches = enText.match(VN_DIACRITIC_RE) || [];
  assert.equal(
    vnMatches.length,
    0,
    `Found forbidden Vietnamese characters in catalog.en.json: ${vnMatches.slice(0, 20).join(', ')}`,
  );

  const viCatalog = JSON.parse(fs.readFileSync(viCatalogPath, 'utf8'));
  const enCatalog = JSON.parse(enText);

  assert.equal(enCatalog.posts.length, viCatalog.posts.length, 'Post count mismatch in catalog.en.json');
  assert.equal(enCatalog.products.length, viCatalog.products.length, 'Product count mismatch in catalog.en.json');
  assert.equal(enCatalog.courses.length, viCatalog.courses.length, 'Course count mismatch in catalog.en.json');
  assert.equal(
    enCatalog.glossary.length,
    viCatalog.glossary.length,
    'Glossary count mismatch in catalog.en.json',
  );
});

test('Localized data providers exist across Pillars, Glossary, Practice Arena, and AI Skills', () => {
  const pillarsSrc = fs.readFileSync(path.join(ROOT, 'src', 'core', 'config', 'pillars.ts'), 'utf8');
  const glossarySrc = fs.readFileSync(path.join(ROOT, 'src', 'features', 'glossary', 'glossaryEnrichment.ts'), 'utf8');
  const practiceSrc = fs.readFileSync(path.join(ROOT, 'src', 'features', 'practice', 'practiceEngine.ts'), 'utf8');
  const skillsSrc = fs.readFileSync(path.join(ROOT, 'src', 'features', 'skills', 'aiSkillsData.ts'), 'utf8');

  assert.ok(pillarsSrc.includes('getLocalizedPillar'), 'Missing getLocalizedPillar in pillars.ts');
  assert.ok(glossarySrc.includes('labelEn'), 'Missing labelEn in glossaryEnrichment.ts');
  assert.ok(practiceSrc.includes('getLocalizedPracticeQuestions'), 'Missing getLocalizedPracticeQuestions in practiceEngine.ts');
  assert.ok(skillsSrc.includes('getLocalizedSkills'), 'Missing getLocalizedSkills in aiSkillsData.ts');
});

test('Recovered staticPages.json contains all 20 standalone pages with ZERO Vietnamese in EN fields', () => {
  const staticPath = path.join(ROOT, 'src', 'data', 'staticPages.json');
  assert.ok(fs.existsSync(staticPath), 'Missing src/data/staticPages.json');
  const pages = JSON.parse(fs.readFileSync(staticPath, 'utf8'));
  assert.equal(pages.length, 20, 'Expected 20 standalone recovered pages');

  for (const p of pages) {
    const enText = [p.categoryLabelEn, p.titleEn, p.subtitleEn, p.summaryEn, ...(p.keyHighlightsEn || [])].join(' ');
    const vnMatches = enText.match(VN_DIACRITIC_RE) || [];
    assert.equal(
      vnMatches.length,
      0,
      `Found Vietnamese chars in EN fields of /${p.slug}/: ${vnMatches.join(', ')}`,
    );
  }
});
