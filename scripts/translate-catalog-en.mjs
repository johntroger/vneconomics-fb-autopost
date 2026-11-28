#!/usr/bin/env node
/**
 * Batch Full-Article Translator (Vietnamese -> Pure Academic English)
 * Usage:
 *   GEMINI_API_KEY=your_key node scripts/translate-catalog-en.mjs [--limit=20]
 *
 * Translates full HTML bodies from exports/posts_full.json into exports/posts_full.en.json
 * while preserving HTML tags and enforcing zero Vietnamese characters in the output.
 */
import fs from 'node:fs';
import path from 'node:path';

const API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split('=')[1]) : 20;

const INPUT_PATH = path.resolve('exports/posts_full.json');
const OUTPUT_PATH = path.resolve('exports/posts_full.en.json');

const VN_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;

if (!API_KEY) {
  console.error('Missing GEMINI_API_KEY. Set GEMINI_API_KEY and re-run.');
  process.exit(1);
}

if (!fs.existsSync(INPUT_PATH)) {
  console.error('Missing exports/posts_full.json. Run npm run etl first.');
  process.exit(1);
}

const sourcePosts = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
const existing = fs.existsSync(OUTPUT_PATH) ? JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8')) : {};

async function translateHtml(title, html) {
  const prompt = [
    'Translate the following Vietnamese economics/blockchain/AI article into publication-grade English.',
    'STRICT RULES:',
    '1. Preserve all HTML tags (<p>, <h2>, <h3>, <ul>, <li>, <table>, <a>, <img>, <strong>) cleanly.',
    '2. Output MUST contain ZERO Vietnamese words or Vietnamese diacritical characters.',
    '3. Return JSON only: {"title_en": "...", "tldr_en": "...", "content_html_en": "..."}',
    '',
    `TITLE: ${title}`,
    `HTML: ${html.slice(0, 18000)}`,
  ].join('\n');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(API_KEY)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return JSON.parse(rawText);
}

let processed = 0;
for (const post of sourcePosts) {
  if (processed >= LIMIT) break;
  if (existing[post.slug] && !VN_REGEX.test(existing[post.slug].content_html_en || '')) continue;
  try {
    const out = await translateHtml(post.title, post.content_html || '');
    if (out.content_html_en && !VN_REGEX.test(out.content_html_en)) {
      existing[post.slug] = out;
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(existing, null, 2), 'utf8');
      processed += 1;
      console.log(`[${processed}/${LIMIT}] Translated: ${post.slug}`);
    } else {
      console.warn(`Skipped (VN residue detected): ${post.slug}`);
    }
  } catch (err) {
    console.error(`Failed ${post.slug}:`, err.message);
  }
}

console.log(`Done. Total translated full articles saved: ${Object.keys(existing).length}`);
