export type PillarSlug =
  | 'kinh-te-so'
  | 'blockchain-tai-san-so'
  | 'ai-cong-nghe'
  | 'digital-marketing'
  | 'nghien-cuu-khoa-hoc';

export interface Pillar {
  slug: PillarSlug;
  name: string;
  nameEn?: string;
  shortLabel: string;
  shortLabelEn?: string;
  description: string;
  descriptionEn?: string;
  accentColor: string;
  legacyCategories: string[];
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface Post {
  id: number;
  slug: string;
  title: string;
  tldrSummary?: string;
  excerpt?: string;
  contentHtml?: string;
  faq?: FaqItem[];
  pillarSlug: PillarSlug;
  authorName: string;
  featuredImage?: string;
  readingMinutes: number;
  views: number;
  publishedAt: string;
  updatedAt?: string;
}

export interface GlossaryTerm {
  id: number;
  slug: string;
  term: string;
  shortDefinition: string;
  fullExplanation?: string;
  relatedPillarSlug?: PillarSlug;
}

export type UnlockMethod = 'free' | 'points' | 'testnet_tx';

export interface Product {
  id: number;
  slug: string;
  title: string;
  categorySlug: string;
  categoryName: string;
  unlockType: UnlockMethod;
  pointsCost: number;
  coverImage?: string;
  shortDescription?: string;
  downloadCount: number;
}

export interface Course {
  id: number;
  slug: string;
  title: string;
  levelLabel: string;
  studentsCount: number;
  coverImage?: string;
  rewardPoints: number;
}

export interface UserProfile {
  id: number;
  firebaseUid?: string;
  email?: string;
  evmAddress?: string;
  cardanoAddress?: string;
  role: 'member' | 'editor' | 'admin';
  displayName: string;
  avatarUrl?: string;
}

export interface VnePointsState {
  totalPoints: number;
  tierLevel: 1 | 2 | 3 | 4;
  tierTitle: string;
  dailyStreak: number;
}

export type SimAssetKind =
  | 'validator_node'
  | 'ai_gpu_cluster'
  | 'digital_store'
  | 'green_bond'
  | 'paper_gold'
  | 'paper_crypto'
  | 'paper_stock';

export interface SimPortfolio {
  simCash: number;
  reputationExp: number;
  totalHarvests: number;
  lastEvaluatedAt: string;
}

export interface UserNft {
  verifyCode: string;
  nftType: 'passport' | 'certificate' | 'proof';
  title: string;
  chainFamily: 'evm' | 'cardano';
  network: string;
  tokenId: string;
  txHash: string;
  sha256Proof: string;
  mintedAt: string;
}

export type AIProvider = 'gemini' | 'openai' | 'openrouter';

export interface UserAIConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
  storageMode: 'local' | 'session';
}

export type MarketType =
  | 'overview'
  | 'gold'
  | 'crypto'
  | 'forex'
  | 'interest_rate'
  | 'stock'
  | 'macro'
  | 'defi';

export interface MarketSnapshot {
  marketType: MarketType;
  symbol: string;
  label: string;
  priceValue: number;
  currency: string;
  change24h: number;
  capturedAt: string;
}
