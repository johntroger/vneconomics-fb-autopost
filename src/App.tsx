import { lazy, Suspense } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './core/context/ThemeContext.tsx';
import { LanguageProvider } from './core/i18n/index.ts';
import { Layout } from './core/ui/Layout.tsx';
import { PageSkeleton } from './core/ui/Skeleton.tsx';

// Code-splitting theo từng phân hệ để giữ First Load JS nhẹ (< 2s LCP)
const HomePage = lazy(() => import('./features/home/HomePage.tsx').then((m) => ({ default: m.HomePage })));
const PillarPage = lazy(() => import('./features/blog/PillarPage.tsx').then((m) => ({ default: m.PillarPage })));
const PostDetailPage = lazy(() => import('./features/blog/PostDetailPage.tsx').then((m) => ({ default: m.PostDetailPage })));
const LibraryPage = lazy(() => import('./features/library/LibraryPage.tsx').then((m) => ({ default: m.LibraryPage })));
const AcademyPage = lazy(() => import('./features/academy/AcademyPage.tsx').then((m) => ({ default: m.AcademyPage })));
const GlossaryPage = lazy(() => import('./features/glossary/GlossaryPage.tsx').then((m) => ({ default: m.GlossaryPage })));
const GameHubPage = lazy(() => import('./features/game/GameHubPage.tsx').then((m) => ({ default: m.GameHubPage })));
const TestnetSwapPage = lazy(() => import('./features/sim/TestnetSwapPage.tsx').then((m) => ({ default: m.TestnetSwapPage })));
const CryptoExchangePage = lazy(() => import('./features/sim/CryptoExchangePage.tsx').then((m) => ({ default: m.CryptoExchangePage })));
const StockExchangePage = lazy(() => import('./features/sim/StockExchangePage.tsx').then((m) => ({ default: m.StockExchangePage })));
const CommodityExchangePage = lazy(() => import('./features/sim/CommodityExchangePage.tsx').then((m) => ({ default: m.CommodityExchangePage })));
const ForexExchangePage = lazy(() => import('./features/sim/ForexExchangePage.tsx').then((m) => ({ default: m.ForexExchangePage })));
const CarbonExchangePage = lazy(() => import('./features/sim/CarbonExchangePage.tsx').then((m) => ({ default: m.CarbonExchangePage })));
const SimLabsPage = lazy(() => import('./features/sim/SimLabsPage.tsx').then((m) => ({ default: m.SimLabsPage })));
const SkillsMarketplacePage = lazy(() => import('./features/skills/SkillsMarketplacePage.tsx').then((m) => ({ default: m.SkillsMarketplacePage })));
const PracticeArenaPage = lazy(() => import('./features/practice/PracticeArenaPage.tsx').then((m) => ({ default: m.PracticeArenaPage })));
const AILabPage = lazy(() => import('./features/ai/AILabPage.tsx').then((m) => ({ default: m.AILabPage })));
const AdminPage = lazy(() => import('./features/admin/AdminPage.tsx').then((m) => ({ default: m.AdminPage })));
const MarketHubPage = lazy(() => import('./features/market/MarketHubPage.tsx').then((m) => ({ default: m.MarketHubPage })));
const PredictionMarketPage = lazy(() => import('./features/predictions/PredictionMarketPage.tsx').then((m) => ({ default: m.PredictionMarketPage })));
const InternationalNewsPage = lazy(() => import('./features/news/InternationalNewsPage.tsx').then((m) => ({ default: m.InternationalNewsPage })));
const StaticContentPage = lazy(() => import('./features/pages/StaticContentPage.tsx').then((m) => ({ default: m.StaticContentPage })));
const CardanoHubPage = lazy(() => import('./features/web3/CardanoHubPage.tsx').then((m) => ({ default: m.CardanoHubPage })));
const VerifyNftPage = lazy(() => import('./features/web3/VerifyNftPage.tsx').then((m) => ({ default: m.VerifyNftPage })));
const AccountPage = lazy(() => import('./features/account/AccountPage.tsx').then((m) => ({ default: m.AccountPage })));
const PublicProfilePage = lazy(() => import('./features/account/PublicProfilePage.tsx').then((m) => ({ default: m.PublicProfilePage })));
const MyBookshelfPage = lazy(() => import('./features/bookshelf/MyBookshelfPage.tsx').then((m) => ({ default: m.MyBookshelfPage })));

const STATIC_PAGE_SLUGS = [
  've-chung-toi',
  'contact',
  'hop-tac-dang-bai',
  'bao-gia-quang-cao',
  'terms-of-use',
  'privacy-and-cookie-policy',
  'tai-nguyen-giao-duc-mo',
  'giao-duc-mo',
  'lamo-edusystem',
  'blocktree',
  'drep',
  'drep-la-gi',
  'huong-dan-uy-quyen-cho-drep',
  'vietnam-cardano-blockchain-map',
  'cardano-catalyst-viet-nam',
  'cardano-annual-market-report',
  'world-mobile-token-viet-nam',
  'kols-blockchain-crypto-vietnam',
  'san-giao-dich-tien-ma-hoa',
  'pi-network',
] as const;

const LEGACY_PAGE_REDIRECTS: ReadonlyArray<[string, string]> = [
  ['shop', '/thu-vien-sach/'],
  ['cua-hang', '/thu-vien-sach/'],
  ['tai-lieu', '/thu-vien-sach/'],
  ['sach-blockchain-cryptocurrency', '/thu-vien-sach/'],
  ['checkout', '/thu-vien-sach/'],
  ['purchase-history', '/thu-vien-sach/'],
  ['transaction-failed', '/thu-vien-sach/'],
  ['purchase-confirmation', '/thu-vien-sach/'],
  ['khoa-hoc', '/hoc-vien/'],
  ['hoc-vien-blockchain', '/hoc-vien/'],
  ['e-learning', '/hoc-vien/'],
  ['become_a_teacher', '/hoc-vien/'],
  ['instructor', '/hoc-vien/'],
  ['instructors', '/hoc-vien/'],
  ['blockchain', '/blockchain-tai-san-so/'],
  ['blockchain-2', '/blockchain-tai-san-so/'],
  ['kien-thuc-blockchain', '/blockchain-tai-san-so/'],
  ['tien-ma-hoa', '/blockchain-tai-san-so/'],
  ['cardano-ada', '/blockchain-tai-san-so/'],
  ['kinh-te-ky-thuat-so', '/kinh-te-so/'],
  ['nghien-cuu', '/nghien-cuu-khoa-hoc/'],
  ['phuong-phap-nghien-cuu', '/nghien-cuu-khoa-hoc/'],
  ['blog', '/'],
  ['vne-blogs', '/'],
  ['tin-tuc', '/tin-quoc-te/'],
  ['my-account', '/learn-and-earn/'],
  ['learn-profile', '/learn-and-earn/'],
  ['learn-log-out', '/learn-and-earn/'],
  ['learn-check-out', '/learn-and-earn/'],
];

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <Layout>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/" element={<HomePage />} />

            {/* 5 Topic Pillars */}
            <Route path="/kinh-te-so/*" element={<PillarPage pillarSlug="kinh-te-so" />} />
            <Route path="/blockchain-tai-san-so/*" element={<PillarPage pillarSlug="blockchain-tai-san-so" />} />
            <Route path="/ai-cong-nghe/*" element={<PillarPage pillarSlug="ai-cong-nghe" />} />
            <Route path="/digital-marketing/*" element={<PillarPage pillarSlug="digital-marketing" />} />
            <Route path="/nghien-cuu-khoa-hoc/*" element={<PillarPage pillarSlug="nghien-cuu-khoa-hoc" />} />

            {/* Library, Academy, Glossary */}
            <Route path="/thu-vien-sach/*" element={<LibraryPage />} />
            <Route path="/tu-sach-cua-toi/*" element={<MyBookshelfPage />} />
            <Route path="/product/:slug/*" element={<LibraryPage />} />
            <Route path="/hoc-vien/*" element={<AcademyPage />} />
            <Route path="/course/:slug/*" element={<AcademyPage />} />
            <Route path="/tu-dien/*" element={<GlossaryPage />} />
            <Route path="/tu-dien/:slug/*" element={<GlossaryPage />} />
            <Route path="/ai-skills" element={<SkillsMarketplacePage />} />
            <Route path="/ai-skills/*" element={<SkillsMarketplacePage />} />

            {/* Market Data Hub (Overview + 7 dedicated realtime data pages) & International News */}
            <Route path="/tin-quoc-te/*" element={<InternationalNewsPage />} />
            <Route path="/thi-truong/vi-mo-hang-hoa/*" element={<MarketHubPage marketType="macro" />} />
            <Route path="/thi-truong/defi-onchain/*" element={<MarketHubPage marketType="defi" />} />
            <Route path="/thi-truong/defi-cardano/*" element={<Navigate to="/thi-truong/defi-onchain/" replace />} />
            <Route path="/thi-truong/*" element={<MarketHubPage marketType="overview" />} />
            <Route path="/gia-vang/*" element={<MarketHubPage marketType="gold" />} />
            <Route path="/gia-crypto/*" element={<MarketHubPage marketType="crypto" />} />
            <Route path="/ty-gia-ngoai-te/*" element={<MarketHubPage marketType="forex" />} />
            <Route path="/lai-suat-ngan-hang/*" element={<MarketHubPage marketType="interest_rate" />} />
            <Route path="/lai-suat-vay-ngan-hang/*" element={<MarketHubPage marketType="interest_rate" />} />
            <Route path="/gia-chung-khoan/*" element={<MarketHubPage marketType="stock" />} />
            <Route path="/du-bao/*" element={<PredictionMarketPage />} />

            {/* Game, Sim Labs, Testnet Swap, Web3 Multi-chain, AI BYOK & Verify */}
            <Route path="/learn-and-earn/*" element={<GameHubPage />} />
            <Route path="/mo-phong/testnet-swap/*" element={<TestnetSwapPage />} />
            <Route path="/mo-phong/san-crypto/*" element={<CryptoExchangePage />} />
            <Route path="/mo-phong/san-chung-khoan/*" element={<StockExchangePage />} />
            <Route path="/mo-phong/san-hang-hoa/*" element={<CommodityExchangePage />} />
            <Route path="/mo-phong/san-ngoai-hoi/*" element={<ForexExchangePage />} />
            <Route path="/mo-phong/san-tin-chi-carbon/*" element={<CarbonExchangePage />} />
            <Route path="/mo-phong/:labSlug/*" element={<SimLabsPage />} />
            <Route path="/luyen-tap/*" element={<PracticeArenaPage />} />
            <Route path="/tai-khoan/*" element={<AccountPage />} />
            <Route path="/u/:username/*" element={<PublicProfilePage />} />
            <Route path="/cardano-hub/*" element={<CardanoHubPage />} />
            <Route path="/verify/:id" element={<VerifyNftPage />} />
            <Route path="/ai-lab/*" element={<AILabPage />} />
            <Route path="/admin/*" element={<AdminPage />} />

            {/* 20 Redesigned Standalone Content Pages */}
            {STATIC_PAGE_SLUGS.map((slug) => (
              <Route
                key={slug}
                path={`/${slug}/*`}
                element={<StaticContentPage forcedSlug={slug} />}
              />
            ))}

            {/* 29 Legacy WP/WooCommerce/LearnPress Utility Redirects */}
            {LEGACY_PAGE_REDIRECTS.map(([fromSlug, toTarget]) => (
              <Route
                key={fromSlug}
                path={`/${fromSlug}/*`}
                element={<Navigate to={toTarget} replace />}
              />
            ))}

            {/* Catch-all cho 216 bài viết giữ nguyên slug gốc /<slug>/ */}
            <Route path="/:slug/*" element={<PostDetailPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </ThemeProvider>
    </LanguageProvider>
  );
}
