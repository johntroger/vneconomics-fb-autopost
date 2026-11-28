#!/usr/bin/env node
/**
 * VNECONOMICS.COM WORDPRESS -> MYSQL & JSON ETL SCRIPT (PHASE 2)
 *
 * Thu thập & làm sạch toàn bộ tài nguyên từ https://vneconomics.com/:
 * - 216+ bài viết (gán về 5 Topic Pillars) + Tags + 51+ Bình luận
 * - 62+ trang tĩnh + tách Từ điển Cardano thành hàng trăm thuật ngữ AEO
 * - Trích xuất nguyên vẹn 3 Ngân hàng Đề thi ra exports/exam_banks/ cho staging-store.vneconomics.com
 * - 59+ Sách WooCommerce + 10 Khóa học LearnPress + 595+ Media Manifest
 * - Sinh bản đồ 301 Redirect cho toàn bộ chuyên mục & trang cũ
 * - Xuất exports/seed_vneconomics_data.sql, exports/etl_report.md và src/data/catalog.json
 */

import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'https://vneconomics.com';
const ROOT_DIR = path.resolve(import.meta.dirname, '..');
const EXPORTS_DIR = path.join(ROOT_DIR, 'exports');
const EXAM_DIR = path.join(EXPORTS_DIR, 'exam_banks');
const DATA_DIR = path.join(ROOT_DIR, 'src', 'data');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) VNEconomics-ETL/2.0',
  Accept: 'application/json',
};

const EXAM_SLUGS = new Set([
  'kiem-tra-kien-thuc-digital-marketing',
  'kiem-tra-kien-thuc-e-marcomme',
  'bai-thi-cuoi-ky-khoa-hoc-tai-chinh-phap-ly-blockchain',
]);

const LEGACY_CATEGORY_TO_PILLAR = {
  'chuyen-doi-so': 'kinh-te-so',
  'ung-dung-cong-nghe': 'kinh-te-so',
  'kinh-te-ky-thuat-so': 'kinh-te-so',
  'kien-thuc-blockchain': 'blockchain-tai-san-so',
  'tin-tuc-tien-ma-hoa': 'blockchain-tai-san-so',
  'cardano-ada': 'blockchain-tai-san-so',
  'drep': 'blockchain-tai-san-so',
  'khoa-hoc-blockchain': 'blockchain-tai-san-so',
  'tu-dien-blockchain': 'blockchain-tai-san-so',
  'ung-dung-ai': 'ai-cong-nghe',
  'digital-marketing': 'digital-marketing',
  'quang-cao': 'digital-marketing',
  'phuong-phap-nghien-cuu': 'nghien-cuu-khoa-hoc',
  'mo-hinh-nghien-cuu': 'nghien-cuu-khoa-hoc',
  'gs-nguyen-van-tuan': 'nghien-cuu-khoa-hoc',
};

const PILLAR_SQL_IDS = {
  'kinh-te-so': 1,
  'blockchain-tai-san-so': 2,
  'ai-cong-nghe': 3,
  'digital-marketing': 4,
  'nghien-cuu-khoa-hoc': 5,
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function fetchJsonWithRetry(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status} for ${url}`);
        err.status = res.status;
        throw err;
      }
      const total = Number(res.headers.get('x-wp-total') || '0');
      const totalPages = Number(res.headers.get('x-wp-totalpages') || '1');
      const data = await res.json();
      return { data, total, totalPages };
    } catch (err) {
      if (attempt === retries || err.status === 400 || err.status === 404) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
}

async function fetchAllPaginated(endpoint, perPage = 50) {
  const sep = endpoint.includes('?') ? '&' : '?';
  const first = await fetchJsonWithRetry(`${BASE_URL}${endpoint}${sep}per_page=${perPage}&page=1`);
  const items = Array.isArray(first.data) ? [...first.data] : [];
  const totalPages = Math.max(1, first.totalPages || 1);

  for (let page = 2; page <= totalPages; page++) {
    const next = await fetchJsonWithRetry(`${BASE_URL}${endpoint}${sep}per_page=${perPage}&page=${page}`);
    if (Array.isArray(next.data)) {
      items.push(...next.data);
    }
    process.stdout.write(`  Fetched ${endpoint} page ${page}/${totalPages}\r`);
  }
  if (totalPages > 1) console.log('');
  return items;
}

function decodeHtmlEntities(str = '') {
  return String(str)
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&hellip;/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(html = '') {
  return decodeHtmlEntities(String(html).replace(/<[^>]+>/g, ' '));
}

function sanitizeArticleHtml(html = '') {
  return String(html)
    .replace(/<(script|style|object|embed|applet|form)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\b(href|src)\s*=\s*(["'])\s*(?:javascript:|vbscript:|data:text\/html)[^"']*\2/gi, '$1="#"')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\[\/?[a-z0-9_-]+(?:\s+[^\]]*)?\]/gi, '') // Strip WP shortcodes
    .trim();
}

function toSlug(text = '') {
  return decodeHtmlEntities(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}

function computeReadingMinutes(html = '') {
  const words = stripTags(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.min(60, Math.round(words / 220)));
}

function toRelativeAssetPath(url = '') {
  if (!url) return null;
  if (url.startsWith(BASE_URL)) {
    return url.slice(BASE_URL.length);
  }
  return url;
}

function sqlEscape(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : 'NULL';
  if (typeof val === 'boolean') return val ? '1' : '0';
  const s = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/\u0000/g, '')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z')
    .replace(/'/g, "\\'");
  return `'${s}'`;
}

function toMysqlDatetime(iso) {
  if (!iso) return null;
  return String(iso).replace('T', ' ').slice(0, 19);
}

function parseCardanoGlossary(rawHtml) {
  const terms = [];
  const seenSlugs = new Set();
  const titleRegex = /<div[^>]*class="[^"]*elementor-tab-title[^"]*"[^>]*>[\s\S]*?<a[^>]*class="[^"]*elementor-toggle-title[^"]*"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/div>\s*<div[^>]*class="[^"]*elementor-tab-content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;

  let match;
  while ((match = titleRegex.exec(rawHtml)) !== null) {
    const term = stripTags(match[1]);
    const fullHtml = sanitizeArticleHtml(match[2]);
    const plain = stripTags(fullHtml);
    if (!term || plain.length < 10) continue;

    let slug = toSlug(term);
    if (!slug) continue;
    if (seenSlugs.has(slug)) {
      slug = `${slug}-${seenSlugs.size + 1}`;
    }
    seenSlugs.add(slug);

    const shortDef = plain.length > 260 ? `${plain.slice(0, 257).trim()}...` : plain;
    terms.push({
      slug,
      term,
      short_definition: shortDef,
      full_explanation: fullHtml,
      related_pillar_slug: 'blockchain-tai-san-so',
      source_label: 'Từ điển Cardano & Web3',
    });
  }
  return terms;
}

function extractExamQuestionsSummary(rawHtml) {
  const plain = stripTags(rawHtml);
  const questionMatches = plain.match(/(?:Câu|Question)\s*\d+[:.\s]/gi) || [];
  const scriptsCount = (rawHtml.match(/<script\b/gi) || []).length;
  return {
    detected_question_markers: questionMatches.length,
    embedded_scripts_count: scriptsCount,
    plain_text_length: plain.length,
    plain_preview: plain.slice(0, 600),
  };
}

async function main() {
  console.log('=== VNECONOMICS.COM PHASE 2 ETL STARTED ===');
  ensureDir(EXPORTS_DIR);
  ensureDir(EXAM_DIR);
  ensureDir(DATA_DIR);

  console.log('1. Fetching categories & tags...');
  const [wpCategories, wpTags] = await Promise.all([
    fetchAllPaginated('/wp-json/wp/v2/categories', 100),
    fetchAllPaginated('/wp-json/wp/v2/tags', 100),
  ]);
  const catById = new Map(wpCategories.map((c) => [c.id, c]));

  console.log('2. Fetching posts (with embedded media/authors)...');
  const wpPosts = await fetchAllPaginated('/wp-json/wp/v2/posts?_embed=1', 50);

  console.log('3. Fetching pages...');
  const wpPages = await fetchAllPaginated('/wp-json/wp/v2/pages?_embed=1', 50);

  console.log('4. Fetching comments...');
  const wpComments = await fetchAllPaginated('/wp-json/wp/v2/comments', 100);

  console.log('5. Fetching WooCommerce products & LearnPress courses...');
  const [wpProducts, wpCourses] = await Promise.all([
    fetchAllPaginated('/wp-json/wc/store/v1/products', 100),
    fetchAllPaginated('/wp-json/learnpress/v1/courses', 50),
  ]);

  console.log('6. Fetching media manifest...');
  const wpMedia = await fetchAllPaginated('/wp-json/wp/v2/media?_fields=id,slug,mime_type,source_url,alt_text,title,date', 100);

  // Transform posts
  const posts = wpPosts.map((p) => {
    const cleanHtml = sanitizeArticleHtml(p.content?.rendered || '');
    const title = stripTags(p.title?.rendered || '');
    const excerpt = stripTags(p.excerpt?.rendered || '').slice(0, 420);
    const catSlugs = (p.categories || []).map((cid) => catById.get(cid)?.slug).filter(Boolean);
    let pillarSlug = 'kinh-te-so';
    for (const cs of catSlugs) {
      if (LEGACY_CATEGORY_TO_PILLAR[cs]) {
        pillarSlug = LEGACY_CATEGORY_TO_PILLAR[cs];
        break;
      }
    }

    const featuredMedia = p._embedded?.['wp:featuredmedia']?.[0];
    const featuredImage = toRelativeAssetPath(featuredMedia?.source_url || '');
    const authorName = p._embedded?.author?.[0]?.name || 'Ban Biên Tập VNEconomics';

    return {
      wp_id: p.id,
      post_type: 'post',
      slug: p.slug,
      title,
      tldr_summary: excerpt,
      excerpt,
      content_html: cleanHtml,
      pillar_slug: pillarSlug,
      pillar_id: PILLAR_SQL_IDS[pillarSlug] || 1,
      author_name: authorName,
      featured_image: featuredImage,
      seo_title: `${title} | VNEconomics`.slice(0, 250),
      seo_desc: excerpt.slice(0, 300),
      reading_minutes: computeReadingMinutes(cleanHtml),
      published_at: toMysqlDatetime(p.date),
      tag_ids: p.tags || [],
      legacy_categories: catSlugs,
    };
  });

  // Transform pages, split out tu-dien-cardano and 3 exam banks
  let glossaryTerms = [];
  const examBanks = [];
  const pages = [];

  for (const pg of wpPages) {
    const rawHtml = pg.content?.rendered || '';
    const title = stripTags(pg.title?.rendered || '');

    if (pg.slug === 'tu-dien-cardano') {
      glossaryTerms = parseCardanoGlossary(rawHtml);
      continue;
    }

    if (EXAM_SLUGS.has(pg.slug)) {
      const summary = extractExamQuestionsSummary(rawHtml);
      const examPayload = {
        wp_id: pg.id,
        slug: pg.slug,
        title,
        original_url: pg.link,
        modified_at: pg.modified,
        target_platform: 'https://staging-store.vneconomics.com/',
        analysis: summary,
        raw_html: rawHtml,
      };
      examBanks.push(examPayload);
      fs.writeFileSync(path.join(EXAM_DIR, `${pg.slug}.json`), JSON.stringify(examPayload, null, 2), 'utf8');
      continue;
    }

    const cleanHtml = sanitizeArticleHtml(rawHtml);
    const excerpt = stripTags(pg.excerpt?.rendered || cleanHtml).slice(0, 320);
    pages.push({
      wp_id: pg.id,
      post_type: 'page',
      slug: pg.slug,
      title,
      tldr_summary: excerpt,
      excerpt,
      content_html: cleanHtml,
      pillar_slug: pg.slug.includes('cardano') || pg.slug.includes('drep') || pg.slug.includes('blockchain')
        ? 'blockchain-tai-san-so'
        : 'kinh-te-so',
      pillar_id: pg.slug.includes('cardano') || pg.slug.includes('drep') || pg.slug.includes('blockchain') ? 2 : 1,
      author_name: 'VNEconomics',
      featured_image: null,
      seo_title: `${title} | VNEconomics`.slice(0, 250),
      seo_desc: excerpt.slice(0, 300),
      reading_minutes: computeReadingMinutes(cleanHtml),
      published_at: toMysqlDatetime(pg.date),
      tag_ids: [],
    });
  }

  // Export exam_banks_export.sql for staging-store.vneconomics.com
  const examSqlLines = [
    '-- EXPORTED EXAM BANKS FROM VNECONOMICS.COM FOR STAGING-STORE.VNECONOMICS.COM',
    'CREATE TABLE IF NOT EXISTS exported_exam_banks (',
    '  id INT AUTO_INCREMENT PRIMARY KEY,',
    '  wp_id INT NOT NULL UNIQUE,',
    '  slug VARCHAR(220) NOT NULL UNIQUE,',
    '  title VARCHAR(500) NOT NULL,',
    '  original_url VARCHAR(500) NOT NULL,',
    '  detected_questions INT NOT NULL DEFAULT 0,',
    '  raw_html LONGTEXT NOT NULL,',
    '  exported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    '',
  ];
  for (const ex of examBanks) {
    examSqlLines.push(
      `INSERT INTO exported_exam_banks (wp_id, slug, title, original_url, detected_questions, raw_html) VALUES (${ex.wp_id}, ${sqlEscape(ex.slug)}, ${sqlEscape(ex.title)}, ${sqlEscape(ex.original_url)}, ${ex.analysis.detected_question_markers}, ${sqlEscape(ex.raw_html)}) ON DUPLICATE KEY UPDATE title = VALUES(title), raw_html = VALUES(raw_html);`,
    );
  }
  fs.writeFileSync(path.join(EXAM_DIR, 'exam_banks_export.sql'), examSqlLines.join('\n'), 'utf8');

  // Transform products (59 WooCommerce books/resources)
  const products = wpProducts.map((pr) => {
    const rawCombined = `${pr.short_description || ''}\n${pr.description || ''}`;
    const cleanDesc = sanitizeArticleHtml(pr.description || pr.short_description || '');
    const shortDesc = stripTags(pr.short_description || cleanDesc).slice(0, 360);
    const cat = pr.categories?.[0] || { slug: 'tai-lieu-kinh-te-so', name: 'Tài liệu Kinh tế số' };
    const linkMatch =
      rawCombined.match(/href=["'](https?:\/\/[^"']+(?:\.pdf|drive\.google\.com[^"']*|dropbox\.com[^"']*|mega\.nz[^"']*))["']/i) ||
      rawCombined.match(/(https?:\/\/[^\s"'<>]+(?:\.pdf|drive\.google\.com[^\s"'<>]*|dropbox\.com[^\s"'<>]*|mega\.nz[^\s"'<>]*))/i);
    const coverImg = toRelativeAssetPath(pr.images?.[0]?.src || '');
    const isAuthored = pr.slug.includes('thap-ky-tai-san-so') || pr.slug.includes('giao-trinh-kinh-te-so') || pr.slug.includes('ai-marketing');

    return {
      wp_id: pr.id,
      slug: pr.slug,
      title: stripTags(pr.name || ''),
      category_slug: cat.slug,
      category_name: stripTags(cat.name || 'Tài liệu'),
      unlock_type: isAuthored ? 'points' : 'free',
      points_cost: isAuthored ? 40 : 0,
      cover_image: coverImg,
      external_url: linkMatch ? linkMatch[1] : null,
      short_description: shortDesc,
      description_html: cleanDesc,
    };
  });

  // Transform 10 LearnPress courses (deep fetch per-course sections, lessons, YouTube, PDF/PPT, cover)
  console.log('5b. Deep-fetching 10 LearnPress courses (sections, lessons, videos, files)...');
  const courses = [];
  const mediaListRaw = wpMedia.map((m) => ({
    title: stripTags(m.title?.rendered || ''),
    mime_type: m.mime_type || '',
    url: toRelativeAssetPath(m.source_url || ''),
  }));

  for (const c of wpCourses) {
    let detail = c;
    try {
      const dRes = await fetchJsonWithRetry(`${BASE_URL}/wp-json/learnpress/v1/courses/${c.id}`);
      if (dRes?.data) detail = dRes.data;
    } catch {
      // Fallback to list item
    }

    let coverImg = toRelativeAssetPath(detail.image || c.image || '');
    if (!coverImg && (detail.permalink || c.permalink)) {
      try {
        const htmlRes = await fetch(detail.permalink || c.permalink, { headers: { 'User-Agent': HEADERS['User-Agent'] } });
        if (htmlRes.ok) {
          const pageHtml = await htmlRes.text();
          const ogMatch = pageHtml.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i);
          if (ogMatch?.[1]) coverImg = toRelativeAssetPath(ogMatch[1]);
        }
      } catch {
        // Ignore
      }
    }

    const rawContent = String(detail.content || detail.excerpt || '');
    const cleanContent = sanitizeArticleHtml(rawContent);

    // Extract YouTube videos inside course content
    const ytIds = [...new Set([...rawContent.matchAll(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g)].map((m) => m[1]))];
    const youtubeVideos = ytIds.map((vid, idx) => ({
      id: vid,
      title: `Video bài giảng #${idx + 1}`,
      embed_url: `https://www.youtube.com/embed/${vid}`,
    }));

    // Extract PDF / PPT / PPTX / DOCX attachments inside course content
    const rawFiles = [...new Set([...rawContent.matchAll(/https?:\/\/[^"'\s<>]+\.(?:pdf|ppt|pptx|docx|xlsx)/gi)].map((m) => m[0]))];
    const attachments = rawFiles.map((fileUrl) => {
      const cleanName = decodeURIComponent(fileUrl.split('/').pop() || 'Tài liệu khóa học').replace(/[-_]+/g, ' ');
      const ext = (fileUrl.split('.').pop() || 'pdf').toLowerCase();
      return {
        title: cleanName,
        url: toRelativeAssetPath(fileUrl) || fileUrl,
        file_type: ext,
      };
    });

    // Attach authored PDFs from media manifest for "Nhập môn Kinh tế số"
    if (detail.id === 48897) {
      for (const m of mediaListRaw) {
        if (m.mime_type === 'application/pdf' && (m.url?.includes('Kinh-te-so') || m.url?.includes('kinh-te-so'))) {
          if (!attachments.some((a) => a.url === m.url)) {
            attachments.push({ title: m.title || 'Tài liệu Kinh tế số (PDF)', url: m.url, file_type: 'pdf' });
          }
        }
      }
    }

    const sections = Array.isArray(detail.sections)
      ? detail.sections.map((sec) => ({
          id: sec.id,
          title: stripTags(sec.title || 'Chương học'),
          description: stripTags(sec.description || ''),
          items: Array.isArray(sec.items)
            ? sec.items.map((it) => ({
                id: it.id,
                type: it.type || 'lp_lesson',
                title: stripTags(it.title || 'Bài học'),
                duration: stripTags(it.duration || ''),
                preview: Boolean(it.preview),
              }))
            : [],
        }))
      : [];

    const lessonsCount = sections.reduce((sum, s) => sum + s.items.length, 0);
    const instructorName = stripTags(detail.instructor?.name || 'Ban Giảng viên VNEconomics');

    courses.push({
      wp_id: detail.id,
      slug: toSlug(detail.slug || detail.name || `course-${detail.id}`),
      original_link: detail.permalink || c.permalink || '',
      title: stripTags(detail.name || ''),
      instructor_name: instructorName || 'Ban Giảng viên VNEconomics',
      level_label: stripTags(detail.meta_data?._lp_level || 'Cơ bản → Thực hành') || 'Cơ bản → Thực hành',
      duration_label: stripTags(detail.duration || ''),
      students_count: Number(detail.count_students || 0),
      lessons_count: lessonsCount,
      cover_image: coverImg || '/logo-vneconomics.png',
      description_html: cleanContent,
      sections,
      youtube_videos: youtubeVideos,
      attachments,
      reward_points: 120,
    });
  }

  // Transform comments
  const postIdByWpId = new Map(posts.map((p, idx) => [p.wp_id, idx + 1]));
  const comments = wpComments
    .filter((cm) => postIdByWpId.has(cm.post))
    .map((cm) => ({
      wp_comment_id: cm.id,
      wp_post_id: cm.post,
      author_name: stripTags(cm.author_name || 'Độc giả'),
      content: stripTags(cm.content?.rendered || ''),
      created_at: toMysqlDatetime(cm.date),
    }));

  // Build 301 Redirects
  const redirects = [];
  for (const cat of wpCategories) {
    const targetPillar = LEGACY_CATEGORY_TO_PILLAR[cat.slug] || 'kinh-te-so';
    redirects.push({
      source_path: `/category/${cat.slug}/`,
      target_url: `/${targetPillar}/`,
    });
  }
  const staticRedirects = [
    ['/shop/', '/thu-vien-sach/'],
    ['/cua-hang/', '/thu-vien-sach/'],
    ['/e-learning/', '/hoc-vien/'],
    ['/khoa-hoc/', '/hoc-vien/'],
    ['/tu-dien-cardano/', '/tu-dien/'],
    ['/vne-blogs/', '/'],
    ['/blog/', '/'],
    ['/cardano-ada/', '/cardano-hub/'],
    ['/vietnam-cardano-blockchain-map/', '/cardano-hub/'],
  ];
  for (const [source_path, target_url] of staticRedirects) {
    redirects.push({ source_path, target_url });
  }

  // Media manifest
  const mediaList = wpMedia.map((m) => ({
    wp_id: m.id,
    slug: m.slug,
    mime_type: m.mime_type,
    title: stripTags(m.title?.rendered || ''),
    source_url: m.source_url,
    relative_path: toRelativeAssetPath(m.source_url),
  }));
  const nonImageMedia = mediaList.filter((m) => !m.mime_type?.startsWith('image/'));
  fs.writeFileSync(path.join(EXPORTS_DIR, 'media_manifest.json'), JSON.stringify(mediaList, null, 2), 'utf8');

  // Write MySQL seed file
  const sql = [
    '-- ============================================================================',
    '-- SEED DATA MIGRATED FROM HTTPS://VNECONOMICS.COM/ (PHASE 2 ETL)',
    `-- Generated at: ${new Date().toISOString()}`,
    '-- Run AFTER migrations/003_core_platform_schema.sql & 004_gamification_web3_nft.sql',
    '-- ============================================================================',
    'SET NAMES utf8mb4;',
    'START TRANSACTION;',
    '',
    "INSERT IGNORE INTO users (id, email, role, display_name, slug, bio) VALUES (1, 'admin@vneconomics.com', 'admin', 'ThS. Trần Thanh Tùng', 'tran-thanh-tung', 'Biên tập viên & Giảng viên Kinh tế số, Tài sản số, AI Marketing.');",
    '',
  ];

  for (const t of wpTags) {
    sql.push(
      `INSERT INTO tags (wp_term_id, slug, name) VALUES (${t.id}, ${sqlEscape(t.slug)}, ${sqlEscape(stripTags(t.name))}) ON DUPLICATE KEY UPDATE name = VALUES(name);`,
    );
  }
  sql.push('');

  for (const item of [...posts, ...pages]) {
    sql.push(
      `INSERT INTO posts (wp_id, post_type, slug, title, tldr_summary, excerpt, content_html, pillar_id, author_id, featured_image, seo_title, seo_desc, status, reading_minutes, published_at) VALUES (${item.wp_id}, ${sqlEscape(item.post_type)}, ${sqlEscape(item.slug)}, ${sqlEscape(item.title)}, ${sqlEscape(item.tldr_summary)}, ${sqlEscape(item.excerpt)}, ${sqlEscape(item.content_html)}, ${item.pillar_id}, 1, ${sqlEscape(item.featured_image)}, ${sqlEscape(item.seo_title)}, ${sqlEscape(item.seo_desc)}, 'published', ${item.reading_minutes}, ${sqlEscape(item.published_at)}) ON DUPLICATE KEY UPDATE title = VALUES(title), content_html = VALUES(content_html), pillar_id = VALUES(pillar_id), seo_title = VALUES(seo_title), seo_desc = VALUES(seo_desc);`,
    );
  }
  sql.push('');

  for (const g of glossaryTerms) {
    sql.push(
      `INSERT INTO glossary_terms (slug, term, short_definition, full_explanation, related_pillar_id, source_label) VALUES (${sqlEscape(g.slug)}, ${sqlEscape(g.term)}, ${sqlEscape(g.short_definition)}, ${sqlEscape(g.full_explanation)}, 2, ${sqlEscape(g.source_label)}) ON DUPLICATE KEY UPDATE short_definition = VALUES(short_definition), full_explanation = VALUES(full_explanation);`,
    );
  }
  sql.push('');

  for (const pr of products) {
    sql.push(
      `INSERT INTO products (wp_id, slug, title, category_slug, category_name, unlock_type, points_cost, cover_image, external_url, short_description, description_html, status) VALUES (${pr.wp_id}, ${sqlEscape(pr.slug)}, ${sqlEscape(pr.title)}, ${sqlEscape(pr.category_slug)}, ${sqlEscape(pr.category_name)}, ${sqlEscape(pr.unlock_type)}, ${pr.points_cost}, ${sqlEscape(pr.cover_image)}, ${sqlEscape(pr.external_url)}, ${sqlEscape(pr.short_description)}, ${sqlEscape(pr.description_html)}, 'published') ON DUPLICATE KEY UPDATE title = VALUES(title), description_html = VALUES(description_html), external_url = VALUES(external_url);`,
    );
  }
  sql.push('');

  for (const c of courses) {
    sql.push(
      `INSERT INTO courses (wp_id, slug, title, level_label, duration_label, students_count, cover_image, description_html, syllabus_json, reward_points, status) VALUES (${c.wp_id}, ${sqlEscape(c.slug)}, ${sqlEscape(c.title)}, ${sqlEscape(c.level_label)}, ${sqlEscape(c.duration_label)}, ${c.students_count}, ${sqlEscape(c.cover_image)}, ${sqlEscape(c.description_html)}, ${sqlEscape(JSON.stringify({ sections: c.sections, youtube_videos: c.youtube_videos, attachments: c.attachments }))}, ${c.reward_points}, 'published') ON DUPLICATE KEY UPDATE title = VALUES(title), students_count = VALUES(students_count), cover_image = VALUES(cover_image), description_html = VALUES(description_html), syllabus_json = VALUES(syllabus_json);`,
    );
    let sortIdx = 1;
    for (const sec of c.sections) {
      for (const item of sec.items) {
        sql.push(
          `INSERT IGNORE INTO course_lessons (course_id, section_title, title, slug, sort_order) SELECT id, ${sqlEscape(sec.title)}, ${sqlEscape(item.title)}, ${sqlEscape(toSlug(`${c.slug}-${item.title}-${item.id}`))}, ${sortIdx++} FROM courses WHERE wp_id = ${c.wp_id} LIMIT 1;`,
        );
      }
    }
  }
  sql.push('');

  for (const cm of comments) {
    sql.push(
      `INSERT IGNORE INTO comments (wp_comment_id, post_id, author_name, content, status, created_at) SELECT ${cm.wp_comment_id}, id, ${sqlEscape(cm.author_name)}, ${sqlEscape(cm.content)}, 'approved', ${sqlEscape(cm.created_at)} FROM posts WHERE wp_id = ${cm.wp_post_id} LIMIT 1;`,
    );
  }
  sql.push('');

  for (const r of redirects) {
    sql.push(
      `INSERT INTO redirects (source_path, target_url, http_code, is_active) VALUES (${sqlEscape(r.source_path)}, ${sqlEscape(r.target_url)}, 301, 1) ON DUPLICATE KEY UPDATE target_url = VALUES(target_url);`,
    );
  }

  sql.push('COMMIT;');
  fs.writeFileSync(path.join(EXPORTS_DIR, 'seed_vneconomics_data.sql'), sql.join('\n'), 'utf8');

  // Write frontend lightweight catalog.json (summary fields for Phase 3 SPA + full posts dump in exports/posts_full.json)
  fs.writeFileSync(path.join(EXPORTS_DIR, 'posts_full.json'), JSON.stringify([...posts, ...pages], null, 2), 'utf8');

  const catalog = {
    generated_at: new Date().toISOString(),
    stats: {
      posts: posts.length,
      pages: pages.length,
      products: products.length,
      courses: courses.length,
      glossary_terms: glossaryTerms.length,
      comments: comments.length,
      media: mediaList.length,
      exam_banks: examBanks.length,
      redirects: redirects.length,
    },
    posts: posts.map(({ content_html: _html, ...rest }) => rest),
    products,
    courses,
    glossary: glossaryTerms,
  };
  fs.writeFileSync(path.join(DATA_DIR, 'catalog.json'), JSON.stringify(catalog, null, 2), 'utf8');

  // Write ETL Markdown report
  const productsWithLinks = products.filter((p) => Boolean(p.external_url)).length;
  const report = [
    '# Báo cáo Di cư Dữ liệu WordPress (Giai đoạn 2 ETL)',
    '',
    `- **Thời gian trích xuất**: ${new Date().toISOString()}`,
    `- **Nguồn**: \`${BASE_URL}\``,
    '',
    '## 1. Thống kê Dữ liệu Đã Di cư',
    '| Loại tài nguyên | Số lượng trích xuất | Đích lưu trữ |',
    '|---|---|---|',
    `| Bài viết Blog | **${posts.length}** | \`exports/seed_vneconomics_data.sql\` + \`src/data/catalog.json\` |`,
    `| Trang tĩnh (đã lọc từ điển & đề thi) | **${pages.length}** | \`exports/seed_vneconomics_data.sql\` |`,
    `| Thuật ngữ Từ điển Cardano (AEO) | **${glossaryTerms.length}** | \`exports/seed_vneconomics_data.sql\` + \`src/data/catalog.json\` |`,
    `| Bình luận bài viết | **${comments.length}** | \`exports/seed_vneconomics_data.sql\` |`,
    `| Sách & Tài liệu WooCommerce | **${products.length}** (${productsWithLinks} có link tải phát hiện trong mô tả) | \`exports/seed_vneconomics_data.sql\` + \`src/data/catalog.json\` |`,
    `| Khóa học LearnPress | **${courses.length}** | \`exports/seed_vneconomics_data.sql\` + \`src/data/catalog.json\` |`,
    `| Media Manifest (Ảnh, PDF, ZIP AI Skills) | **${mediaList.length}** (${nonImageMedia.length} tài liệu không phải ảnh) | \`exports/media_manifest.json\` |`,
    `| Ngân hàng Đề thi (cho \`staging-store.vneconomics.com\`) | **${examBanks.length}** | \`exports/exam_banks/\` |`,
    `| Quy tắc 301 Redirect | **${redirects.length}** | \`exports/seed_vneconomics_data.sql\` |`,
    '',
    '## 2. Chi tiết 3 Ngân hàng Đề thi đã Bảo toàn',
    ...examBanks.map(
      (e) =>
        `- **${e.title}** (\`${e.slug}\`): ${e.analysis.detected_question_markers} câu hỏi nhận diện, ${e.analysis.embedded_scripts_count} script nhúng → \`exports/exam_banks/${e.slug}.json\``,
    ),
    '',
    '## 3. Tài liệu PDF & AI Skills ZIP nổi bật trong Media Manifest',
    ...nonImageMedia.slice(0, 20).map((m) => `- [${m.mime_type}] **${m.title}** → \`${m.relative_path}\``),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(EXPORTS_DIR, 'etl_report.md'), report, 'utf8');

  console.log('=== ETL COMPLETED SUCCESSFULLY ===');
  console.log(JSON.stringify(catalog.stats, null, 2));
}

main().catch((err) => {
  console.error('ETL FAILED:', err);
  process.exit(1);
});
