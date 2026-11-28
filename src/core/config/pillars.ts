import type { SupportedLanguage } from '../i18n/i18nService.ts';
import type { Pillar, PillarSlug } from '../types/index.ts';

export const TOPIC_PILLARS: Pillar[] = [
  {
    slug: 'kinh-te-so',
    name: 'Kinh tế số & Chuyển đổi số',
    nameEn: 'Digital Economy & Transformation',
    shortLabel: 'Kinh tế số',
    shortLabelEn: 'Digital Economy',
    description: 'Phân tích kinh tế số, chuyển đổi số doanh nghiệp và công nghệ ứng dụng tại Việt Nam.',
    descriptionEn: 'Research on digital economy models, enterprise digital transformation, and applied macroeconomics.',
    accentColor: '#0F766E',
    legacyCategories: ['chuyen-doi-so', 'ung-dung-cong-nghe', 'kinh-te-ky-thuat-so'],
  },
  {
    slug: 'blockchain-tai-san-so',
    name: 'Blockchain & Tài sản số',
    nameEn: 'Blockchain & Digital Assets',
    shortLabel: 'Blockchain',
    shortLabelEn: 'Blockchain',
    description: 'Kiến thức Blockchain, tài sản số, pháp lý và hệ sinh thái Cardano Việt Nam.',
    descriptionEn: 'Blockchain architecture, digital asset regulation, Web3 governance, and the Cardano ecosystem.',
    accentColor: '#1D4ED8',
    legacyCategories: [
      'kien-thuc-blockchain',
      'tin-tuc-tien-ma-hoa',
      'cardano-ada',
      'drep',
      'khoa-hoc-blockchain',
      'tu-dien-blockchain',
    ],
  },
  {
    slug: 'ai-cong-nghe',
    name: 'AI & Công nghệ mới',
    nameEn: 'AI & Emerging Tech',
    shortLabel: 'AI & Tech',
    shortLabelEn: 'AI & Tech',
    description: 'Trí tuệ nhân tạo ứng dụng, tự động hóa, phân tích dữ liệu và công nghệ mới nổi.',
    descriptionEn: 'Applied artificial intelligence, autonomous agents, big data analytics, and emerging technologies.',
    accentColor: '#7C3AED',
    legacyCategories: ['ung-dung-ai'],
  },
  {
    slug: 'digital-marketing',
    name: 'Digital Marketing & Tăng trưởng',
    nameEn: 'Digital Marketing & Growth',
    shortLabel: 'Marketing',
    shortLabelEn: 'Marketing',
    description: 'Chiến lược Digital Marketing, AI Marketing, truyền thông số và tăng trưởng bền vững.',
    descriptionEn: 'Digital marketing strategy, AI marketing funnels, SEO/GEO/AEO, and sustainable growth.',
    accentColor: '#B45309',
    legacyCategories: ['digital-marketing', 'quang-cao'],
  },
  {
    slug: 'nghien-cuu-khoa-hoc',
    name: 'Nghiên cứu Khoa học & Học thuật',
    nameEn: 'Scientific Research & Methodology',
    shortLabel: 'Nghiên cứu',
    shortLabelEn: 'Research',
    description: 'Phương pháp nghiên cứu khoa học, mô hình định lượng và tài nguyên học thuật mở.',
    descriptionEn: 'Quantitative research methodology, scholarly publishing standards, and open academic resources.',
    accentColor: '#047857',
    legacyCategories: ['phuong-phap-nghien-cuu', 'mo-hinh-nghien-cuu', 'gs-nguyen-van-tuan'],
  },
];

export function getLocalizedPillar(pillar: Pillar, lang: SupportedLanguage) {
  if (lang === 'en') {
    return {
      ...pillar,
      name: pillar.nameEn || pillar.name,
      shortLabel: pillar.shortLabelEn || pillar.shortLabel,
      description: pillar.descriptionEn || pillar.description,
    };
  }
  return pillar;
}

export const LEGACY_CATEGORY_TO_PILLAR: Record<string, PillarSlug> = TOPIC_PILLARS.reduce(
  (acc, pillar) => {
    acc[pillar.slug] = pillar.slug;
    for (const oldSlug of pillar.legacyCategories) {
      acc[oldSlug] = pillar.slug;
    }
    return acc;
  },
  {} as Record<string, PillarSlug>,
);

export function resolvePillarBySlug(slug?: string): Pillar | undefined {
  if (!slug) return undefined;
  const normalized = slug.toLowerCase().trim();
  const mapped = LEGACY_CATEGORY_TO_PILLAR[normalized];
  return TOPIC_PILLARS.find((p) => p.slug === (mapped ?? normalized));
}
