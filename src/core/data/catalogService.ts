import rawCatalog from '../../data/catalog.json';
import { getLanguage, type SupportedLanguage } from '../i18n/i18nService.ts';
import type { PillarSlug } from '../types/index.ts';

export const CATALOG_EN_LOADED_EVENT = 'vne:catalog-en-loaded';
let cachedCatalogEn: CatalogBundle | null = null;
let loadingCatalogEnPromise: Promise<void> | null = null;

export function ensureEnglishCatalogLoaded(): Promise<void> {
  if (cachedCatalogEn) return Promise.resolve();
  if (!loadingCatalogEnPromise) {
    loadingCatalogEnPromise = import('../../data/catalog.en.json')
      .then((mod) => {
        cachedCatalogEn = (mod.default || mod) as unknown as CatalogBundle;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(CATALOG_EN_LOADED_EVENT));
        }
      })
      .catch(() => {
        loadingCatalogEnPromise = null;
      });
  }
  return loadingCatalogEnPromise;
}

export interface CatalogPost {
  wp_id: number;
  post_type: string;
  slug: string;
  title: string;
  tldr_summary: string;
  excerpt: string;
  pillar_slug: PillarSlug;
  pillar_id: number;
  author_name: string;
  featured_image: string | null;
  seo_title: string;
  seo_desc: string;
  reading_minutes: number;
  published_at: string;
  legacy_categories?: string[];
}

export interface CatalogProduct {
  wp_id: number;
  slug: string;
  title: string;
  category_slug: string;
  category_name: string;
  unlock_type: 'free' | 'points' | 'testnet_tx';
  points_cost: number;
  cover_image: string | null;
  external_url: string | null;
  short_description: string;
  description_html: string;
}

export interface CourseLessonItem {
  id: number;
  type: string;
  title: string;
  duration: string;
  preview: boolean;
  content_html?: string;
  youtube_embed_url?: string;
  questions_count?: number;
}

export interface CourseSection {
  id: number;
  title: string;
  description: string;
  items: CourseLessonItem[];
}

export interface CourseVideo {
  id: string;
  title: string;
  embed_url: string;
}

export interface CourseAttachment {
  title: string;
  url: string;
  file_type: string;
}

export interface CourseCommentItem {
  id: number;
  author_name: string;
  date: string;
  content_html: string;
  lesson_id?: number;
  lesson_title?: string;
  rating?: number;
}

export interface CatalogCourse {
  wp_id: number;
  slug: string;
  original_link?: string;
  title: string;
  instructor_name?: string;
  level_label: string;
  duration_label?: string;
  students_count: number;
  lessons_count?: number;
  cover_image: string | null;
  description_html: string;
  sections?: CourseSection[];
  youtube_videos?: CourseVideo[];
  attachments?: CourseAttachment[];
  reward_points: number;
  rating_average?: number | null;
  rating_count?: number;
  reviews?: CourseCommentItem[];
  comments?: CourseCommentItem[];
}

export interface CatalogGlossaryTerm {
  slug: string;
  term: string;
  short_definition: string;
  full_explanation: string;
  related_pillar_slug: PillarSlug;
  source_label: string;
}

export interface CatalogBundle {
  generated_at: string;
  stats: {
    posts: number;
    pages: number;
    products: number;
    courses: number;
    glossary_terms: number;
    comments: number;
    media: number;
    exam_banks: number;
    redirects: number;
  };
  posts: CatalogPost[];
  products: CatalogProduct[];
  courses: CatalogCourse[];
  glossary: CatalogGlossaryTerm[];
}

const SPECIAL_AI_SKILLS: CatalogProduct[] = [
  {
    wp_id: 990001,
    slug: 'ai-skill-nhan-xet-khoa-luan-ung-dung',
    title: 'Gói AI Skill: Nhận xét Khóa luận & Báo cáo Thực tập Ứng dụng (Gemini)',
    category_slug: 'ai-skills-nghien-cuu',
    category_name: 'AI Skills & Nghiên cứu',
    unlock_type: 'points',
    points_cost: 10,
    cover_image: null,
    external_url: '/wp-content/uploads/2026/08/nhan-xet-khoa-luan-ung-dung-verGemini.zip',
    short_description:
      'Bộ quy tắc & prompt chấm nhận xét khóa luận hướng ứng dụng tại doanh nghiệp (Cơ sở lý luận - Thực trạng - Giải pháp).',
    description_html:
      '<p>Tài nguyên AI Skill đóng gói sẵn dành cho giảng viên, hội đồng và sinh viên muốn rà soát khóa luận hướng ứng dụng.</p>',
  },
  {
    wp_id: 990002,
    slug: 'ai-skill-nhan-xet-khoa-luan-nghien-cuu',
    title: 'Gói AI Skill: Nhận xét Khóa luận Nghiên cứu Định lượng',
    category_slug: 'ai-skills-nghien-cuu',
    category_name: 'AI Skills & Nghiên cứu',
    unlock_type: 'points',
    points_cost: 10,
    cover_image: null,
    external_url: '/wp-content/uploads/2026/08/nhan-xet-khoa-luan-nghien-cuu.zip',
    short_description:
      'Bộ prompt đánh giá mô hình, giả thuyết, thang đo và kiểm định thống kê cho khóa luận tốt nghiệp đại học.',
    description_html:
      '<p>Tài nguyên AI Skill hỗ trợ phản biện chặt chẽ khóa luận theo hướng nghiên cứu khoa học.</p>',
  },
];

const SPECIAL_AI_SKILLS_EN: CatalogProduct[] = [
  {
    wp_id: 990001,
    slug: 'ai-skill-nhan-xet-khoa-luan-ung-dung',
    title: 'AI Skill Pack: Applied Enterprise Thesis Reviewer (Gemini)',
    category_slug: 'ai-skills-nghien-cuu',
    category_name: 'AI Skills & Research',
    unlock_type: 'points',
    points_cost: 10,
    cover_image: null,
    external_url: '/wp-content/uploads/2026/08/nhan-xet-khoa-luan-ung-dung-verGemini.zip',
    short_description:
      'Structured prompt rules for reviewing applied undergraduate enterprise theses (Theory - Empirical Practice - Solutions).',
    description_html:
      '<p>Pre-packaged AI Skill for advisors, committees, and students reviewing applied graduation theses.</p>',
  },
  {
    wp_id: 990002,
    slug: 'ai-skill-nhan-xet-khoa-luan-nghien-cuu',
    title: 'AI Skill Pack: Quantitative Research Thesis Reviewer',
    category_slug: 'ai-skills-nghien-cuu',
    category_name: 'AI Skills & Research',
    unlock_type: 'points',
    points_cost: 10,
    cover_image: null,
    external_url: '/wp-content/uploads/2026/08/nhan-xet-khoa-luan-nghien-cuu.zip',
    short_description:
      'Prompt suite evaluating conceptual models, hypotheses, measurement scales, and statistical tests for research theses.',
    description_html:
      '<p>Pre-packaged AI Skill providing structured quantitative methodology feedback.</p>',
  },
];

function resolveCatalog(lang?: SupportedLanguage): CatalogBundle {
  const active = lang || getLanguage();
  if (active === 'en') {
    if (cachedCatalogEn) return cachedCatalogEn;
    void ensureEnglishCatalogLoaded();
  }
  return rawCatalog as unknown as CatalogBundle;
}

export function getCatalogStats(lang?: SupportedLanguage) {
  return resolveCatalog(lang).stats;
}

export function getPosts(pillarSlug?: PillarSlug, lang?: SupportedLanguage): CatalogPost[] {
  const catalog = resolveCatalog(lang);
  if (!pillarSlug) return catalog.posts;
  return catalog.posts.filter((p) => p.pillar_slug === pillarSlug);
}

export function getPostBySlug(slug: string, lang?: SupportedLanguage): CatalogPost | undefined {
  const catalog = resolveCatalog(lang);
  const lower = slug.toLowerCase();
  const encoded = encodeURIComponent(slug).toLowerCase();
  return catalog.posts.find((p) => {
    const s = p.slug.toLowerCase();
    if (s === lower || s === encoded) return true;
    try {
      return decodeURIComponent(s) === slug;
    } catch {
      return false;
    }
  });
}

export function getProducts(lang?: SupportedLanguage): CatalogProduct[] {
  const active = lang || getLanguage();
  const skills = active === 'en' ? SPECIAL_AI_SKILLS_EN : SPECIAL_AI_SKILLS;
  return [...skills, ...resolveCatalog(active).products];
}

export function getProductBySlug(slug: string, lang?: SupportedLanguage): CatalogProduct | undefined {
  return getProducts(lang).find((p) => p.slug === slug);
}

export function getCourses(lang?: SupportedLanguage): CatalogCourse[] {
  return resolveCatalog(lang).courses;
}

export function getGlossaryTerms(lang?: SupportedLanguage): CatalogGlossaryTerm[] {
  return resolveCatalog(lang).glossary;
}

export function getGlossaryTermBySlug(slug: string, lang?: SupportedLanguage): CatalogGlossaryTerm | undefined {
  return resolveCatalog(lang).glossary.find((g) => g.slug === slug);
}

export const VNECONOMICS_LOGO_FALLBACK = '/logo-vneconomics.png';

export function resolveMediaUrl(urlOrPath?: string | null): string | undefined {
  if (!urlOrPath) return undefined;
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
    return urlOrPath;
  }
  const normalized = urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return `https://vneconomics.com${normalized}`;
    }
  }
  return normalized;
}

export function resolveCoverOrLogo(coverImage?: string | null): {
  src: string;
  isFallbackLogo: boolean;
} {
  const resolved = resolveMediaUrl(coverImage);
  if (resolved) {
    return { src: resolved, isFallbackLogo: false };
  }
  return { src: VNECONOMICS_LOGO_FALLBACK, isFallbackLogo: true };
}

export function handleCoverImageError(e: { currentTarget: HTMLImageElement }) {
  if (e.currentTarget.dataset.fallbackApplied === '1') return;
  e.currentTarget.dataset.fallbackApplied = '1';
  e.currentTarget.src = VNECONOMICS_LOGO_FALLBACK;
  e.currentTarget.className = 'w-full h-full object-contain p-5';
}

export interface RagContextItem {
  kind: 'post' | 'product' | 'course' | 'glossary';
  title: string;
  url: string;
  snippet: string;
  score: number;
}

export function searchCatalogContext(query: string, limit = 5, lang?: SupportedLanguage): RagContextItem[] {
  const active = lang || getLanguage();
  const catalog = resolveCatalog(active);
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  if (tokens.length === 0) return [];

  const scoreText = (haystack: string, weight = 1): number => {
    const lower = haystack.toLowerCase();
    let score = 0;
    for (const tk of tokens) {
      if (lower.includes(tk)) score += weight;
    }
    return score;
  };

  const results: RagContextItem[] = [];

  for (const p of catalog.posts) {
    const score = scoreText(p.title, 3) + scoreText(p.tldr_summary || p.excerpt, 1);
    if (score > 0) {
      results.push({
        kind: 'post',
        title: p.title,
        url: `/${p.slug}/`,
        snippet: p.tldr_summary || p.excerpt,
        score,
      });
    }
  }

  for (const pr of getProducts(active)) {
    const score = scoreText(pr.title, 2.5) + scoreText(pr.short_description, 1);
    if (score > 0) {
      results.push({
        kind: 'product',
        title: pr.title,
        url: `/product/${pr.slug}/`,
        snippet: pr.short_description,
        score,
      });
    }
  }

  for (const c of catalog.courses) {
    const score = scoreText(c.title, 2.5);
    if (score > 0) {
      results.push({
        kind: 'course',
        title: c.title,
        url: `/course/${c.slug}/`,
        snippet:
          active === 'en'
            ? `Course (${c.students_count} learners) - ${c.level_label}`
            : `Khóa học (${c.students_count} học viên) - ${c.level_label}`,
        score,
      });
    }
  }

  for (const g of catalog.glossary) {
    const score = scoreText(g.term, 3) + scoreText(g.short_definition, 1);
    if (score > 0) {
      results.push({
        kind: 'glossary',
        title: active === 'en' ? `${g.term} (Lexicon)` : `${g.term} (Từ điển)`,
        url: `/tu-dien/${g.slug}/`,
        snippet: g.short_definition,
        score,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
