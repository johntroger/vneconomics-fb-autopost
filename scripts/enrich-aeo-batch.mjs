#!/usr/bin/env node
/**
 * BATCH AI ENRICHMENT CHO 216 BÀI VIẾT CŨ (AEO TL;DR + FAQPage JSON-LD)
 * Đọc exports/posts_full.json và dùng GEMINI_API_KEY để xuất exports/aeo_enrichment.sql.
 *
 * Cách dùng:
 *   $env:GEMINI_API_KEY="AIza..."
 *   node scripts/enrich-aeo-batch.mjs --limit=20
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const POSTS_PATH = path.join(ROOT, 'exports', 'posts_full.json');
const OUT_SQL_PATH = path.join(ROOT, 'exports', 'aeo_enrichment.sql');

const apiKey = process.env.GEMINI_API_KEY || '';
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Math.max(1, Number(limitArg.split('=')[1])) : 10;

function sqlEscape(val) {
  return `'${String(val).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/'/g, "\\'")}'`;
}

async function generateAeoBlock(title, plainText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const prompt = `Tạo JSON chuẩn cho bài viết tiếng Việt "${title}":
1. "tldr": Tóm tắt Answer-First dài 40-60 từ nêu thẳng kết luận cốt lõi.
2. "faq": Mảng 3 câu hỏi thường gặp dạng [{"q": "...", "a": "..."}].
Trả về JSON hợp lệ theo schema {"tldr": string, "faq": [{"q": string, "a": string}]}.
Nội dung tham khảo:\n${plainText.slice(0, 4500)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return JSON.parse(raw);
}

async function main() {
  if (!fs.existsSync(POSTS_PATH)) {
    throw new Error('Missing exports/posts_full.json. Run npm run etl first.');
  }
  const all = JSON.parse(fs.readFileSync(POSTS_PATH, 'utf8')).filter((p) => p.post_type === 'post').slice(0, limit);

  if (!apiKey) {
    console.log('GEMINI_API_KEY is not set. Generating dry-run SQL template only.');
    fs.writeFileSync(
      OUT_SQL_PATH,
      `-- Set GEMINI_API_KEY and run: node scripts/enrich-aeo-batch.mjs --limit=216\n-- Ready to enrich ${all.length} posts.\n`,
      'utf8',
    );
    return;
  }

  const lines = ['-- AEO BATCH ENRICHMENT (TL;DR + FAQPage JSON-LD)', 'START TRANSACTION;'];
  for (const post of all) {
    const plain = String(post.content_html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const enriched = await generateAeoBlock(post.title, plain);
    if (enriched?.tldr && Array.isArray(enriched?.faq)) {
      lines.push(
        `UPDATE posts SET tldr_summary = ${sqlEscape(enriched.tldr)}, faq_json = ${sqlEscape(JSON.stringify(enriched.faq))} WHERE slug = ${sqlEscape(post.slug)};`,
      );
      console.log(`Enriched: ${post.slug}`);
    }
  }
  lines.push('COMMIT;');
  fs.writeFileSync(OUT_SQL_PATH, lines.join('\n'), 'utf8');
  console.log(`Saved AEO SQL to ${OUT_SQL_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
