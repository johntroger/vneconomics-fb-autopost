import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Clock,
  Coins,
  Cpu,
  ExternalLink,
  FileText,
  Globe,
  GraduationCap,
  Info,
  KeyRound,
  Layers,
  PlayCircle,
  Search,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { getLocalizedPillar, TOPIC_PILLARS } from '../../core/config/pillars.ts';
import {
  getCatalogStats,
  getCourses,
  getGlossaryTerms,
  getPosts,
  getProducts,
  handleCoverImageError,
  resolveCoverOrLogo,
  resolveMediaUrl,
} from '../../core/data/catalogService.ts';
import { useTranslation } from '../../core/i18n/index.ts';
import { useSEO } from '../../core/seo/useSEO.ts';
import { getResourcePointCost } from '../game/vneGameService.ts';
import { PrNewswireWidget } from '../news/PrNewswireWidget.tsx';

const INVESTING_RATES_IFRAME_EN =
  'https://sslirates.investing.com/index.php?rows=4&bg1=FFFFFF&bg2=F1F5F8&text_color=333333&enable_border=show&border_color=0452A1&header_bg=0452A1&header_text=FFFFFF&force_lang=1';
const INVESTING_RATES_IFRAME_VI =
  'https://sslirates.investing.com/index.php?rows=4&bg1=FFFFFF&bg2=F1F5F8&text_color=333333&enable_border=show&border_color=0452A1&header_bg=0452A1&header_text=FFFFFF&force_lang=52';

export const HomePage: React.FC = () => {
  const { lang, isEn, t } = useTranslation();
  const [globalQuery, setGlobalQuery] = useState('');

  const stats = getCatalogStats(lang);
  const allPosts = getPosts(undefined, lang);
  const allProducts = getProducts(lang);
  const allCourses = getCourses(lang);
  const allGlossary = getGlossaryTerms(lang);

  const marketLinks = useMemo(
    () =>
      isEn
        ? [
            { label: 'VN Gold Prices', path: '/gia-vang/', hint: 'SJC • 9999' },
            { label: 'Crypto Prices', path: '/gia-crypto/', hint: 'BTC • ADA' },
            { label: 'FX Exchange Rates', path: '/ty-gia-ngoai-te/', hint: 'USD/VND' },
            { label: 'Bank Interest Rates', path: '/lai-suat-ngan-hang/', hint: '30+ Banks' },
            { label: 'VN Equities', path: '/gia-chung-khoan/', hint: 'VN30' },
          ]
        : [
            { label: 'Giá vàng VN', path: '/gia-vang/', hint: 'SJC • 9999' },
            { label: 'Giá Crypto', path: '/gia-crypto/', hint: 'BTC • ADA' },
            { label: 'Tỷ giá Ngoại tệ', path: '/ty-gia-ngoai-te/', hint: 'USD/VND' },
            { label: 'Lãi suất Ngân hàng', path: '/lai-suat-ngan-hang/', hint: '30+ NH' },
            { label: 'Chứng khoán VN', path: '/gia-chung-khoan/', hint: 'VN30' },
          ],
    [isEn],
  );

  const usefulDataTables = useMemo(
    () =>
      isEn
        ? [
            {
              title: 'Gold Price Table',
              desc: 'Real-time SJC, 9999, DOJI, and PNJ gold bullion quotes.',
              path: '/gia-vang/',
              tag: 'Domestic & Global Gold',
            },
            {
              title: 'Vietnam Stock Market',
              desc: 'Track VN-Index, VN30, HNX, and leading equities.',
              path: '/gia-chung-khoan/',
              tag: 'HOSE • HNX • TradingView',
            },
            {
              title: 'Foreign Exchange Rates',
              desc: 'Live USD, EUR, JPY, GBP rates and interbank conversion.',
              path: '/ty-gia-ngoai-te/',
              tag: 'Wise • Vietcombank',
            },
            {
              title: 'Bank Deposit Rates',
              desc: 'Compare term deposit interest rates across 30+ commercial banks.',
              path: '/lai-suat-ngan-hang/',
              tag: 'Savings • Compound Calc',
            },
            {
              title: 'Bank Lending Rates',
              desc: 'Reference mortgage, business loan, and consumer credit rates.',
              path: '/lai-suat-vay-ngan-hang/',
              tag: 'Credit • Cost of Capital',
            },
            {
              title: 'Crypto & Cardano Markets',
              desc: 'Live BTC, ETH, ADA market data and global digital asset flows.',
              path: '/gia-crypto/',
              tag: 'BTC • ETH • ADA',
            },
          ]
        : [
            {
              title: 'Bảng Giá vàng',
              desc: 'Giá vàng SJC, 9999, DOJI, PNJ cập nhật theo thời gian thực.',
              path: '/gia-vang/',
              tag: 'Vàng trong nước & Thế giới',
            },
            {
              title: 'Bảng Giá chứng khoán',
              desc: 'Chỉ số VN-Index, VN30, HNX và biến động cổ phiếu nổi bật.',
              path: '/gia-chung-khoan/',
              tag: 'HOSE • HNX • TradingView',
            },
            {
              title: 'Tỷ giá ngoại tệ',
              desc: 'Tỷ giá USD, EUR, JPY, GBP và quy đổi liên ngân hàng.',
              path: '/ty-gia-ngoai-te/',
              tag: 'Wise • Vietcombank',
            },
            {
              title: 'Lãi suất tiền gửi ngân hàng',
              desc: 'So sánh lãi suất tiết kiệm các kỳ hạn tại 30+ ngân hàng VN.',
              path: '/lai-suat-ngan-hang/',
              tag: 'Tiết kiệm • Tính lãi kép',
            },
            {
              title: 'Lãi suất vay ngân hàng',
              desc: 'Tham khảo khung lãi suất vay mua nhà, vay kinh doanh & tín chấp.',
              path: '/lai-suat-vay-ngan-hang/',
              tag: 'Tín dụng • Chi phí vốn',
            },
            {
              title: 'Bảng giá Crypto & Cardano',
              desc: 'Theo dõi BTC, ETH, ADA cùng xu hướng tài sản số toàn cầu.',
              path: '/gia-crypto/',
              tag: 'BTC • ETH • ADA',
            },
          ],
    [isEn],
  );

  const youtubePlaylists = useMemo(
    () =>
      isEn
        ? [
            {
              videoId: 'r1zDigw12Pc',
              title: 'Blockchain & Digital Assets Discussions',
              url: 'https://www.youtube.com/watch?v=r1zDigw12Pc&list=PLKmW2URrf3HiMYN-14KxN2DD0kbZvHW8K',
              tag: 'Blockchain & Web3',
            },
            {
              videoId: '-FFQdJ3918M',
              title: 'Free Digital Marketing Course Series',
              url: 'https://www.youtube.com/watch?v=-FFQdJ3918M&list=PLKmW2URrf3HjXe1Xv5nUlyBtuPmyE8lSt',
              tag: 'Digital Marketing',
            },
            {
              videoId: 'RlKSfx5OcQ0',
              title: 'Artificial Intelligence (AI) Briefings',
              url: 'https://www.youtube.com/watch?v=RlKSfx5OcQ0&list=PLKmW2URrf3Hh4o8hGOb9Z9M04Vg7nov4T',
              tag: 'Artificial Intelligence',
            },
            {
              videoId: 'VwcCdML5-5w',
              title: 'Applied Big Data Analytics',
              url: 'https://www.youtube.com/watch?v=VwcCdML5-5w&list=PLKmW2URrf3HitmfhJco6YyVL9eesLBx51',
              tag: 'Big Data & Analytics',
            },
            {
              videoId: 'M5lbUYuPHJI',
              title: 'Enterprise Digital Transformation',
              url: 'https://www.youtube.com/watch?v=M5lbUYuPHJI&list=PLKmW2URrf3HgLlHjocd0vZCdCaXl9v_7B',
              tag: 'Digital Transformation',
            },
            {
              videoId: 'BTZ_ZRHwLI8',
              title: 'Economic Theory & Macro Discussions',
              url: 'https://www.youtube.com/watch?v=BTZ_ZRHwLI8&list=PLKmW2URrf3HidKwSgbUfdqp0mJkGN5SgG',
              tag: 'Digital Economics',
            },
          ]
        : [
            {
              videoId: 'r1zDigw12Pc',
              title: 'Thảo luận về Blockchain & Tài sản số',
              url: 'https://www.youtube.com/watch?v=r1zDigw12Pc&list=PLKmW2URrf3HiMYN-14KxN2DD0kbZvHW8K',
              tag: 'Blockchain & Web3',
            },
            {
              videoId: '-FFQdJ3918M',
              title: 'Khóa học Digital Marketing miễn phí',
              url: 'https://www.youtube.com/watch?v=-FFQdJ3918M&list=PLKmW2URrf3HjXe1Xv5nUlyBtuPmyE8lSt',
              tag: 'Digital Marketing',
            },
            {
              videoId: 'RlKSfx5OcQ0',
              title: 'Trí tuệ nhân tạo (AI)',
              url: 'https://www.youtube.com/watch?v=RlKSfx5OcQ0&list=PLKmW2URrf3Hh4o8hGOb9Z9M04Vg7nov4T',
              tag: 'Artificial Intelligence',
            },
            {
              videoId: 'VwcCdML5-5w',
              title: 'Ứng dụng Big Data',
              url: 'https://www.youtube.com/watch?v=VwcCdML5-5w&list=PLKmW2URrf3HitmfhJco6YyVL9eesLBx51',
              tag: 'Big Data & Analytics',
            },
            {
              videoId: 'M5lbUYuPHJI',
              title: 'Chuyển đổi số',
              url: 'https://www.youtube.com/watch?v=M5lbUYuPHJI&list=PLKmW2URrf3HgLlHjocd0vZCdCaXl9v_7B',
              tag: 'Digital Transformation',
            },
            {
              videoId: 'BTZ_ZRHwLI8',
              title: 'Thảo luận về Kinh tế',
              url: 'https://www.youtube.com/watch?v=BTZ_ZRHwLI8&list=PLKmW2URrf3HidKwSgbUfdqp0mJkGN5SgG',
              tag: 'Kinh tế số & Vĩ mô',
            },
          ],
    [isEn],
  );

  const vibecodeProjects = useMemo(
    () =>
      isEn
        ? [
            {
              title: 'Free AI-Powered IELTS Practice Platform',
              desc: 'Practice all 4 IELTS skills with instant AI scoring and personalized diagnostics.',
              url: 'https://ielts-practice-vietnamese.vercel.app/about',
              image: 'https://vneconomics.com/wp-content/uploads/2026/10/ielts-practice-vietnamese.vercel.app_-800x800.jpg',
              badge: 'EdTech AI',
            },
            {
              title: 'Learn AI Vibe Coding & GitHub Open Lab',
              desc: 'Hands-on AI software engineering community sharing production templates and open-source repos.',
              url: 'https://store.vneconomics.com/',
              image: 'https://vneconomics.com/wp-content/uploads/2026/10/vibelab-banner-square-qr-800x800.png',
              badge: 'VibeCode Lab',
            },
            {
              title: 'Scientific Research Lexicon & Journal Checker',
              desc: 'Look up quantitative methodology concepts and verify Q1/Scopus journal integrity.',
              url: 'https://vnresearch-dictionary.vercel.app/',
              image: 'https://vneconomics.com/wp-content/uploads/2026/10/academic-modern-1080x1080-1-800x800.png',
              badge: 'Academic Tool',
            },
            {
              title: 'Smart Agriculture with AI & Blockchain',
              desc: 'Digital farming platform integrating IoT telemetry, AI crop diagnostics, and traceability.',
              url: 'https://yeutrongcay.com/',
              image: 'https://vneconomics.com/wp-content/uploads/2026/11/yeutrongcay-nong-nghiep-so-1.jpg',
              badge: 'AgriTech & Web3',
            },
          ]
        : [
            {
              title: 'Học IELTS miễn phí, Hỗ trợ bởi AI',
              desc: 'Luyện 4 kỹ năng IELTS kèm AI chấm chữa chi tiết, lộ trình cá nhân hóa cho người Việt.',
              url: 'https://ielts-practice-vietnamese.vercel.app/about',
              image: 'https://vneconomics.com/wp-content/uploads/2026/10/ielts-practice-vietnamese.vercel.app_-800x800.jpg',
              badge: 'EdTech AI',
            },
            {
              title: 'Học Vibecode bằng AI. Kho Github đa dạng',
              desc: 'Cộng đồng thực hành lập trình cùng AI, chia sẻ template và mã nguồn mở thực chiến.',
              url: 'https://store.vneconomics.com/',
              image: 'https://vneconomics.com/wp-content/uploads/2026/10/vibelab-banner-square-qr-800x800.png',
              badge: 'VibeCode Lab',
            },
            {
              title: 'Từ điển Nghiên cứu Khoa học. Tra cứu tạp chí',
              desc: 'Công cụ tra cứu khái niệm nghiên cứu, phương pháp luận và danh mục tạp chí uy tín.',
              url: 'https://vnresearch-dictionary.vercel.app/',
              image: 'https://vneconomics.com/wp-content/uploads/2026/10/academic-modern-1080x1080-1-800x800.png',
              badge: 'Academic Tool',
            },
            {
              title: 'Nông nghiệp thông minh. Ứng dụng AI & Blockchain',
              desc: 'Nền tảng tri thức trồng trọt hiện đại kết hợp IoT, AI chẩn đoán và truy xuất nguồn gốc.',
              url: 'https://yeutrongcay.com/',
              image: 'https://vneconomics.com/wp-content/uploads/2026/11/yeutrongcay-nong-nghiep-so-1.jpg',
              badge: 'AgriTech & Web3',
            },
          ],
    [isEn],
  );

  const intlFeeds = useMemo(
    () =>
      isEn
        ? [
            {
              title: 'VNEconomics Market Data Hub',
              desc: 'Consolidated Gold, Equities, FX, Crypto charts & Compound Interest calculator.',
              href: '/thi-truong/',
              internal: true,
            },
            {
              title: 'Investing.com Global Finance & Macro Wire',
              desc: 'Economic calendars, sovereign bond yields, commodities, and central bank moves.',
              href: 'https://www.investing.com/',
              internal: false,
            },
            {
              title: 'AI & Global Tech Briefings on VNEconomics',
              desc: 'Coverage of enterprise AI, Big Data infrastructure, and global fintech.',
              href: '/ai-cong-nghe/',
              internal: true,
            },
          ]
        : [
            {
              title: 'Trung tâm Dữ liệu Thị trường VNEconomics',
              desc: 'Tổng hợp biểu đồ Vàng, Chứng khoán, Tỷ giá, Crypto & Công cụ tính lãi kép.',
              href: '/thi-truong/',
              internal: true,
            },
            {
              title: 'Investing.com Việt Nam — Tin Tài chính & Vĩ mô Toàn cầu',
              desc: 'Lịch kinh tế, trái phiếu, hàng hóa và biến động các ngân hàng trung ương.',
              href: 'https://vn.investing.com/',
              internal: false,
            },
            {
              title: 'Phân tích AI & Công nghệ Quốc tế trên VNEconomics',
              desc: 'Cập nhật xu hướng AI, Big Data, chuyển đổi số doanh nghiệp và tài chính toàn cầu.',
              href: '/ai-cong-nghe/',
              internal: true,
            },
          ],
    [isEn],
  );

  const featuredCourses = useMemo(() => allCourses.slice(0, 4), [allCourses]);
  const featuredBooks = useMemo(() => allProducts.slice(0, 4), [allProducts]);
  const latestPosts = useMemo(() => allPosts.slice(0, 8), [allPosts]);
  const blockchainPosts = useMemo(
    () => allPosts.filter((p) => p.pillar_slug === 'blockchain-tai-san-so').slice(0, 4),
    [allPosts],
  );

  const pillarCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of allPosts) {
      map[p.pillar_slug] = (map[p.pillar_slug] || 0) + 1;
    }
    return map;
  }, [allPosts]);

  const unifiedSearch = useMemo(() => {
    const q = globalQuery.trim().toLowerCase();
    if (q.length < 2) return null;

    const posts = allPosts
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.tldr_summary || p.excerpt).toLowerCase().includes(q),
      )
      .slice(0, 4);

    const courses = allCourses.filter((c) => c.title.toLowerCase().includes(q)).slice(0, 3);
    const products = allProducts
      .filter(
        (pr) =>
          pr.title.toLowerCase().includes(q) ||
          pr.short_description.toLowerCase().includes(q),
      )
      .slice(0, 3);
    const glossary = allGlossary
      .filter(
        (g) =>
          g.term.toLowerCase().includes(q) ||
          g.short_definition.toLowerCase().includes(q),
      )
      .slice(0, 3);

    const total = posts.length + courses.length + products.length + glossary.length;
    return { posts, courses, products, glossary, total };
  }, [globalQuery, allPosts, allCourses, allProducts, allGlossary]);

  const ratesIframeUrl = isEn ? INVESTING_RATES_IFRAME_EN : INVESTING_RATES_IFRAME_VI;

  useSEO({
    title: isEn
      ? 'VNEconomics — Blockchain, AI, Big Data – Foundations for the Digital Economy'
      : 'VNEconomics — Blockchain, AI, Big Data – Nền tảng cho Kinh tế số',
    description: isEn
      ? 'Digital Economy, Digital Assets, AI, Digital Marketing & Scientific Research knowledge platform. SEO, GEO & AEO optimized.'
      : 'Chuyên trang Kinh tế số, Tài sản số, Trí tuệ nhân tạo, Digital Marketing & Nghiên cứu khoa học tại Việt Nam. Chuẩn SEO, GEO, AEO.',
    canonicalPath: '/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'VNEconomics',
      url: 'https://vneconomics.com/',
      inLanguage: isEn ? 'en-US' : 'vi-VN',
    },
  });

  return (
    <div className="space-y-12 pb-12">
      {/* 1. Live Market Ticker Strip */}
      <section className="border-b border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900/70">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-2.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[auto_repeat(5,minmax(0,1fr))] items-center gap-2.5 text-xs">
          <span className="col-span-2 sm:col-span-3 lg:col-span-1 inline-flex items-center gap-1.5 font-semibold text-editorial-teal dark:text-emerald-400 shrink-0 pr-1">
            <TrendingUp className="w-3.5 h-3.5" />
            {t('home.marketTickerLabel')}
          </span>
          {marketLinks.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-paper-100 dark:bg-ink-800 border border-paper-300 dark:border-ink-700 hover:border-editorial-teal transition-colors min-w-0"
            >
              <span className="font-semibold text-ink-900 dark:text-paper-100 whitespace-nowrap">
                {item.label}
              </span>
              <span className="text-ink-500 dark:text-ink-400 tabular-nums whitespace-nowrap hidden 2xl:inline">
                {item.hint}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 2. Editorial Hero */}
      <section className="w-full px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-editorial-teal/10 text-editorial-teal dark:bg-emerald-500/15 dark:text-emerald-300">
              {isEn
                ? `${stats.posts} Articles • ${stats.products} Books • ${stats.courses} Courses • ${stats.glossary_terms} AEO Terms`
                : `${stats.posts} Bài phân tích • ${stats.products} Sách • ${stats.courses} Khóa học • ${stats.glossary_terms} Thuật ngữ AEO`}
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-ink-950 dark:text-paper-50 leading-[1.15]">
              {t('home.heroTitle')}
            </h1>
            <p className="text-base sm:text-lg text-ink-700 dark:text-ink-400 leading-relaxed">
              {t('home.heroDesc')}
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                to="/hoc-vien/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-sm font-semibold transition-colors shadow-xs"
              >
                <GraduationCap className="w-4 h-4" />
                {t('home.ctaAcademy', { count: stats.courses })}
              </Link>
              <Link
                to="/thu-vien-sach/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-paper-100 text-sm font-semibold hover:border-editorial-teal"
              >
                <BookOpen className="w-4 h-4 text-editorial-teal" />
                {t('home.ctaLibrary', { count: stats.products })}
              </Link>
              <Link
                to="/learn-and-earn/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-800 text-ink-900 dark:text-paper-100 text-sm font-semibold hover:border-editorial-teal"
              >
                <Coins className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                {t('home.ctaSim')}
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-1 gap-4">
            <Link
              to="/ai-lab/"
              className="p-5 rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-100 dark:bg-ink-950/60 hover:border-editorial-teal transition-colors space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-bold text-ink-950 dark:text-paper-50">
                  <KeyRound className="w-4 h-4 text-editorial-teal dark:text-emerald-400" />
                  {isEn ? 'BYOK AI Copilot & Thesis Assistant' : 'AI BYOK Copilot & Trợ lý Khóa luận'}
                </span>
                <ArrowRight className="w-4 h-4 text-ink-400" />
              </div>
              <p className="text-xs text-ink-600 dark:text-ink-400 leading-relaxed">
                {isEn
                  ? 'Bring your own Gemini, OpenAI, or OpenRouter API key in-browser to query the VNE knowledge base and critique academic theses.'
                  : 'Tự nhập key Gemini, OpenAI hoặc OpenRouter ngay trên trình duyệt để hỏi đáp kho tri thức VNE và phản biện khóa luận.'}
              </p>
            </Link>

            <Link
              to="/cardano-hub/"
              className="p-5 rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-100 dark:bg-ink-950/60 hover:border-editorial-navy transition-colors space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-bold text-ink-950 dark:text-paper-50">
                  <ShieldCheck className="w-4 h-4 text-editorial-navy dark:text-sky-400" />
                  {isEn ? 'Multi-chain Testnet & Cardano Hub' : 'Multi-chain Testnet & Cardano Hub'}
                </span>
                <ArrowRight className="w-4 h-4 text-ink-400" />
              </div>
              <p className="text-xs text-ink-600 dark:text-ink-400 leading-relaxed">
                {isEn
                  ? 'Connect EVM Testnet & Cardano CIP-30 wallets (Eternl, Lace, Vespr), explore dRep Governance, and mint $0 NFT certificates.'
                  : 'Kết nối ví EVM Testnet & Cardano CIP-30 (Eternl, Lace, Vespr), dRep Governance và đúc NFT chứng chỉ 0đ tiền thật.'}
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Unified Site Search */}
      <section className="w-full px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-gradient-to-r from-[#146EBE]/5 via-paper-50 to-emerald-500/5 dark:from-[#146EBE]/15 dark:via-ink-900 dark:to-emerald-500/10 p-5 sm:p-7 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-ink-950 dark:text-paper-50">
                {t('home.searchHeading')}
              </h2>
              <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-400">
                {t('home.searchSub', {
                  posts: stats.posts,
                  courses: stats.courses,
                  products: stats.products,
                  glossary: stats.glossary_terms,
                })}
              </p>
            </div>
            <div className="relative w-full lg:w-[32rem]">
              <Search className="w-4 h-4 text-[#146EBE] dark:text-sky-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={globalQuery}
                onChange={(e) => setGlobalQuery(e.target.value)}
                placeholder={
                  isEn
                    ? 'Search keywords: Blockchain, Cardano, AI, Digital Marketing...'
                    : 'Nhập từ khóa: Blockchain, Cardano, AI, Digital Marketing, Stata...'
                }
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-paper-300 dark:border-ink-700 bg-white dark:bg-ink-950 text-sm text-ink-950 dark:text-paper-50 focus:outline-none focus:border-[#146EBE]"
              />
            </div>
          </div>

          {unifiedSearch && (
            <div className="pt-3 border-t border-paper-300 dark:border-ink-800 space-y-3">
              {unifiedSearch.total === 0 ? (
                <p className="text-xs text-ink-600 dark:text-ink-400">
                  {isEn ? `No results found for "${globalQuery}". Try ` : `Không tìm thấy kết quả khớp với “${globalQuery}”. Thử hỏi trực tiếp tại `}
                  <Link to="/ai-lab/" className="text-editorial-teal font-semibold hover:underline">
                    {isEn ? 'BYOK AI Lab' : 'AI BYOK Lab'}
                  </Link>
                  .
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {unifiedSearch.posts.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-editorial-teal flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> {isEn ? 'Articles' : 'Bài viết'} ({unifiedSearch.posts.length})
                      </h3>
                      <div className="space-y-1.5">
                        {unifiedSearch.posts.map((p) => (
                          <Link
                            key={p.slug}
                            to={`/${p.slug}/`}
                            className="block p-2.5 rounded-lg bg-white dark:bg-ink-950 border border-paper-300 dark:border-ink-800 hover:border-editorial-teal text-xs font-semibold text-ink-900 dark:text-paper-100 line-clamp-2"
                          >
                            {p.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {unifiedSearch.courses.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#146EBE] dark:text-sky-400 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5" /> {isEn ? 'Courses' : 'Khóa học'} ({unifiedSearch.courses.length})
                      </h3>
                      <div className="space-y-1.5">
                        {unifiedSearch.courses.map((c) => (
                          <Link
                            key={c.slug}
                            to={`/course/${c.slug}/`}
                            className="block p-2.5 rounded-lg bg-white dark:bg-ink-950 border border-paper-300 dark:border-ink-800 hover:border-[#146EBE] text-xs font-semibold text-ink-900 dark:text-paper-100 line-clamp-2"
                          >
                            {c.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {unifiedSearch.products.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" /> {isEn ? 'Books & Skills' : 'Sách & AI Skills'} ({unifiedSearch.products.length})
                      </h3>
                      <div className="space-y-1.5">
                        {unifiedSearch.products.map((pr) => (
                          <Link
                            key={pr.slug}
                            to={`/product/${pr.slug}/`}
                            className="block p-2.5 rounded-lg bg-white dark:bg-ink-950 border border-paper-300 dark:border-ink-800 hover:border-amber-500 text-xs font-semibold text-ink-900 dark:text-paper-100 line-clamp-2"
                          >
                            {pr.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {unifiedSearch.glossary.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" /> {isEn ? 'AEO Lexicon' : 'Thuật ngữ AEO'} ({unifiedSearch.glossary.length})
                      </h3>
                      <div className="space-y-1.5">
                        {unifiedSearch.glossary.map((g) => (
                          <Link
                            key={g.slug}
                            to={`/tu-dien/${g.slug}/`}
                            className="block p-2.5 rounded-lg bg-white dark:bg-ink-950 border border-paper-300 dark:border-ink-800 hover:border-purple-500 text-xs font-semibold text-ink-900 dark:text-paper-100 line-clamp-2"
                          >
                            {g.term}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 4. Latest Research Articles */}
      <section className="w-full px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink-950 dark:text-paper-50">
              {t('home.latestPostsHeading')}
            </h2>
            <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-400 mt-1">
              {isEn
                ? `${stats.posts} permalink-preserved articles with BYOK AI reading copilot & +10 VNE Points reward.`
                : `${stats.posts} bài viết giữ nguyên đường dẫn gốc /<slug>/ kèm trợ lý đọc AI BYOK & thưởng +10 VNE Points.`}
            </p>
          </div>
          <Link to="/kinh-te-so/" className="text-xs sm:text-sm font-semibold text-editorial-teal hover:underline shrink-0">
            {isEn ? 'Explore all articles →' : 'Khám phá kho bài viết →'}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {latestPosts.map((post) => {
            const imgUrl = resolveMediaUrl(post.featured_image);
            return (
              <Link
                key={post.slug}
                to={`/${post.slug}/`}
                className="group rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 overflow-hidden hover:border-editorial-teal transition-all flex flex-col"
              >
                {imgUrl && (
                  <div className="h-44 bg-paper-200 dark:bg-ink-800 overflow-hidden">
                    <img
                      src={imgUrl}
                      alt={post.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-ink-500">
                      <span className="font-semibold uppercase text-editorial-teal">{post.pillar_slug}</span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Clock className="w-3 h-3" /> {post.reading_minutes} {isEn ? 'min' : 'phút'}
                      </span>
                    </div>
                    <h3 className="font-serif text-lg font-bold text-ink-950 dark:text-paper-50 group-hover:text-editorial-teal line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-xs text-ink-600 dark:text-ink-400 line-clamp-3 leading-relaxed">
                      {post.tldr_summary || post.excerpt}
                    </p>
                  </div>
                  <div className="text-xs font-semibold text-editorial-teal flex items-center gap-1 pt-1">
                    <span>{isEn ? 'Read (+10 VNE)' : 'Đọc bài (+10 VNE)'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 5. Blockchain & Cryptocurrency Spotlight */}
      <section className="w-full px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-editorial-navy dark:text-sky-400">
              {isEn
                ? `Core Research Focus • ${pillarCounts['blockchain-tai-san-so'] || 0} studies`
                : `Trọng tâm nghiên cứu • ${pillarCounts['blockchain-tai-san-so'] || 0} bài chuyên sâu`}
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink-950 dark:text-paper-50 mt-0.5">
              {t('home.blockchainHeading')}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <Link to="/cardano-hub/" className="text-editorial-navy dark:text-sky-400 hover:underline">
              Cardano Hub →
            </Link>
            <Link to="/tu-dien/" className="text-editorial-teal hover:underline">
              {isEn ? `${stats.glossary_terms} Lexicon Terms →` : `Từ điển ${stats.glossary_terms} thuật ngữ →`}
            </Link>
            <Link to="/blockchain-tai-san-so/" className="text-ink-800 dark:text-paper-200 hover:underline">
              {t('common.viewAll')} →
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {blockchainPosts.map((post) => {
            const imgUrl = resolveMediaUrl(post.featured_image);
            return (
              <Link
                key={post.slug}
                to={`/${post.slug}/`}
                className="group rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 overflow-hidden hover:border-editorial-navy transition-all flex flex-col"
              >
                {imgUrl && (
                  <div className="h-40 bg-paper-200 dark:bg-ink-800 overflow-hidden">
                    <img
                      src={imgUrl}
                      alt={post.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-4 flex-1 flex flex-col justify-between gap-2.5">
                  <div className="space-y-1.5">
                    <h3 className="font-serif text-base font-bold text-ink-950 dark:text-paper-50 group-hover:text-editorial-navy dark:group-hover:text-sky-400 line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-xs text-ink-600 dark:text-ink-400 line-clamp-2">
                      {post.tldr_summary || post.excerpt}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-editorial-navy dark:text-sky-400 flex items-center gap-1">
                    {isEn ? 'Read analysis' : 'Xem phân tích'} <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 6. Free Curated Courses */}
      <section className="w-full px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink-950 dark:text-paper-50">
              {t('home.coursesHeading')}
            </h2>
            <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-400 mt-1">
              {isEn
                ? 'Learn online with YouTube lectures, university-grade PPT/PDF slides & earn Testnet NFT Certificates.'
                : 'Học trực tuyến qua video YouTube, slide PPT/PDF tài liệu chuẩn đại học & làm bài thi lấy Chứng chỉ NFT Testnet.'}
            </p>
          </div>
          <Link to="/hoc-vien/" className="text-xs sm:text-sm font-semibold text-editorial-teal hover:underline shrink-0">
            {isEn ? `View all ${stats.courses} courses →` : `Xem tất cả ${stats.courses} khóa học →`}
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featuredCourses.map((course) => {
            const { src: coverSrc, isFallbackLogo } = resolveCoverOrLogo(course.cover_image);
            const lessonTotal =
              course.lessons_count ||
              (course.sections?.reduce((acc, s) => acc + s.items.length, 0) ?? 0);
            const hasVideo = (course.youtube_videos?.length ?? 0) > 0;
            const hasAttachments = (course.attachments?.length ?? 0) > 0;

            return (
              <Link
                key={course.slug}
                to={`/course/${course.slug}/`}
                className="group rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 overflow-hidden hover:border-editorial-teal transition-all flex flex-col"
              >
                <div className="relative h-44 bg-paper-200 dark:bg-ink-800 overflow-hidden flex items-center justify-center">
                  <img
                    src={coverSrc}
                    alt={course.title}
                    loading="lazy"
                    onError={handleCoverImageError}
                    className={
                      isFallbackLogo
                        ? 'w-full h-full object-contain p-6 bg-white/85 dark:bg-ink-900/70 group-hover:scale-[1.03] transition-transform duration-300'
                        : 'w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300'
                    }
                  />
                  <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-ink-950">
                    10 VNE
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-500 dark:text-ink-400">
                      <span className="px-2 py-0.5 rounded bg-paper-200 dark:bg-ink-800 font-medium">
                        {course.level_label}
                      </span>
                      {lessonTotal > 0 && (
                        <span>
                          • {lessonTotal} {isEn ? 'lessons' : 'bài học'}
                        </span>
                      )}
                      {hasVideo && <span>• YouTube</span>}
                      {hasAttachments && <span>• PDF/PPT</span>}
                    </div>
                    <h3 className="font-serif text-base font-bold text-ink-950 dark:text-paper-50 group-hover:text-editorial-teal line-clamp-2">
                      {course.title}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2.5 border-t border-paper-200 dark:border-ink-800">
                    <span className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                      +{course.reward_points} VNE • NFT Cert
                    </span>
                    <span className="font-semibold text-editorial-teal inline-flex items-center gap-1">
                      {isEn ? 'Start Learning' : 'Vào học ngay'} <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 7. Digital Economy Books & AI Skills */}
      <section className="w-full px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink-950 dark:text-paper-50">
              {t('home.booksHeading')}
            </h2>
            <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-400 mt-1">
              {isEn
                ? 'Zero-cost e-commerce library storefront — unlock resources with VNE Points or Testnet Wallet.'
                : 'Giao diện thư viện thương mại điện tử 0đ tiền thật — mở khóa bằng VNE Points hoặc Ví Testnet.'}
            </p>
          </div>
          <Link to="/thu-vien-sach/" className="text-xs sm:text-sm font-semibold text-editorial-teal hover:underline shrink-0">
            {isEn ? `View all ${allProducts.length} resources →` : `Xem tất cả ${allProducts.length} tài liệu →`}
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featuredBooks.map((book) => {
            const { src: coverSrc, isFallbackLogo } = resolveCoverOrLogo(book.cover_image);
            return (
              <Link
                key={book.slug}
                to={`/product/${book.slug}/`}
                className="group rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 overflow-hidden hover:border-editorial-teal transition-all flex flex-col"
              >
                <div className="h-48 bg-paper-200 dark:bg-ink-800 overflow-hidden flex items-center justify-center">
                  <img
                    src={coverSrc}
                    alt={book.title}
                    loading="lazy"
                    onError={handleCoverImageError}
                    className={
                      isFallbackLogo
                        ? 'w-full h-full object-contain p-6 bg-white/85 dark:bg-ink-900/70 group-hover:scale-[1.03] transition-transform duration-300'
                        : 'w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300'
                    }
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-editorial-teal">{book.category_name}</span>
                    <h3 className="font-semibold text-sm text-ink-950 dark:text-paper-50 group-hover:text-editorial-teal line-clamp-2">
                      {book.title}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-paper-200 dark:border-ink-800">
                    <span className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                      {`${getResourcePointCost(book.points_cost)} VNE Points`}
                    </span>
                    <span className="text-ink-500 group-hover:text-editorial-teal">
                      {isEn ? 'Details →' : 'Chi tiết →'}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 8. Useful Data Tables & International Finance News */}
      <section className="w-full px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink-950 dark:text-paper-50">
              {t('home.tablesHeading')}
            </h2>
            <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-400 mt-1">
              {isEn
                ? 'Vietnam market data, global central bank policy rates, and international financial feeds.'
                : 'Dữ liệu tài chính Việt Nam, lãi suất ngân hàng trung ương toàn cầu và dòng tin quốc tế.'}
            </p>
          </div>
          <Link to="/thi-truong/" className="text-xs sm:text-sm font-semibold text-editorial-teal hover:underline shrink-0">
            {isEn ? 'Open Market Data Hub →' : 'Mở Market Data Hub →'}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {usefulDataTables.map((tbl) => (
                <Link
                  key={tbl.path}
                  to={tbl.path}
                  className="group p-4 rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 hover:border-[#146EBE] transition-colors flex flex-col justify-between gap-2.5"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <BarChart3 className="w-4 h-4 text-[#146EBE] dark:text-sky-400 shrink-0" />
                      <span className="text-[10px] font-semibold text-ink-500 truncate">{tbl.tag}</span>
                    </div>
                    <h3 className="font-semibold text-sm text-ink-950 dark:text-paper-50 group-hover:text-[#146EBE] dark:group-hover:text-sky-400">
                      {tbl.title}
                    </h3>
                    <p className="text-xs text-ink-600 dark:text-ink-400 line-clamp-2">{tbl.desc}</p>
                  </div>
                  <span className="text-[11px] font-semibold text-editorial-teal inline-flex items-center gap-1">
                    {isEn ? 'Open data table' : 'Xem bảng số liệu'} <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              ))}
            </div>

            <div className="rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-serif text-lg font-bold text-ink-950 dark:text-paper-50 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#146EBE] dark:text-sky-400" />
                  {isEn ? 'Global Finance & International Wire' : 'Tin Quốc tế & Tài chính – Công nghệ Tự động'}
                </h3>
                <Link
                  to="/tin-quoc-te/"
                  className="text-xs font-semibold text-[#146EBE] dark:text-sky-400 hover:underline inline-flex items-center gap-1"
                >
                  {isEn ? 'View All International News' : 'Xem toàn bộ Tin Quốc tế'} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <PrNewswireWidget mode="widget" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {intlFeeds.map((item) =>
                  item.internal ? (
                    <Link
                      key={item.href}
                      to={item.href}
                      className="p-3.5 rounded-lg border border-paper-200 dark:border-ink-800 bg-paper-100/70 dark:bg-ink-950/60 hover:border-editorial-teal transition-colors space-y-1"
                    >
                      <div className="text-xs font-bold text-ink-900 dark:text-paper-100 line-clamp-2">
                        {item.title}
                      </div>
                      <p className="text-[11px] text-ink-600 dark:text-ink-400 line-clamp-2">{item.desc}</p>
                    </Link>
                  ) : (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3.5 rounded-lg border border-paper-200 dark:border-ink-800 bg-paper-100/70 dark:bg-ink-950/60 hover:border-[#146EBE] transition-colors space-y-1"
                    >
                      <div className="text-xs font-bold text-ink-900 dark:text-paper-100 flex items-start justify-between gap-1">
                        <span className="line-clamp-2">{item.title}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 text-ink-400" />
                      </div>
                      <p className="text-[11px] text-ink-600 dark:text-ink-400 line-clamp-2">{item.desc}</p>
                    </a>
                  ),
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-serif text-lg font-bold text-ink-950 dark:text-paper-50">
                {isEn ? 'Global Central Bank Interest Rates' : 'Bảng lãi suất quốc tế'}
              </h3>
              <a
                href={ratesIframeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-[#146EBE] dark:text-sky-400 hover:underline inline-flex items-center gap-1"
              >
                {isEn ? 'Full Table' : 'Mở toàn bảng'} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-xs text-ink-600 dark:text-ink-400">
              {isEn
                ? 'Track live policy benchmark rates across major central banks (Fed, ECB, BoJ, BoE) via Investing.com.'
                : 'Theo dõi lãi suất điều hành các ngân hàng trung ương lớn (Fed, ECB, BoJ, BoE...) từ Investing.com.'}
            </p>
            <div className="rounded-lg overflow-hidden border border-paper-200 dark:border-ink-800 bg-white">
              <iframe
                src={ratesIframeUrl}
                title={isEn ? 'Global Central Bank Rates - Investing.com' : 'Bảng lãi suất quốc tế - Investing.com'}
                loading="lazy"
                className="w-full h-72 border-0"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 9. YouTube Learning Playlists */}
      <section className="w-full px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink-950 dark:text-paper-50">
              {t('home.youtubeHeading')}
            </h2>
            <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-400 mt-1">
              {isEn
                ? '6 official VNEconomics YouTube playlists on Blockchain, AI, Big Data, Digital Transformation & Economics.'
                : '6 danh sách phát YouTube chính thức từ VNEconomics về Blockchain, AI, Big Data, Chuyển đổi số & Kinh tế.'}
            </p>
          </div>
          <a
            href="https://www.youtube.com/@vn-economics"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400 hover:underline shrink-0"
          >
            <PlayCircle className="w-4 h-4" />
            {isEn ? 'Channel @vn-economics' : 'Kênh @vn-economics'} <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {youtubePlaylists.map((pl) => (
            <a
              key={pl.videoId}
              href={pl.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 overflow-hidden hover:border-red-500 transition-all flex flex-col"
            >
              <div className="relative aspect-video bg-ink-900 overflow-hidden">
                <img
                  src={`https://i.ytimg.com/vi/${pl.videoId}/hqdefault.jpg`}
                  alt={pl.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <PlayCircle className="w-10 h-10 text-white drop-shadow" />
                </div>
              </div>
              <div className="p-3.5 flex-1 flex flex-col justify-between gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                    {pl.tag}
                  </span>
                  <h3 className="font-semibold text-xs sm:text-sm text-ink-950 dark:text-paper-50 group-hover:text-red-600 dark:group-hover:text-red-400 line-clamp-2">
                    {pl.title}
                  </h3>
                </div>
                <span className="text-[11px] text-ink-500 inline-flex items-center gap-1">
                  {isEn ? 'Watch Playlist' : 'Xem Playlist'} <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* 10. 5 Knowledge Pillars */}
      <section className="w-full px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink-950 dark:text-paper-50">
              {t('home.pillarsHeading')}
            </h2>
            <p className="text-sm text-ink-600 dark:text-ink-400 mt-1">
              {isEn
                ? 'Topical Authority Silo architecture engineered for Google Search & Generative AI Search (GEO/AEO).'
                : 'Cấu trúc Silo chuẩn Topical Authority cho Google Search & AI Search (GEO/AEO).'}
            </p>
          </div>
          <Link
            to="/tu-dien/"
            className="text-xs sm:text-sm font-semibold text-editorial-teal hover:underline shrink-0"
          >
            {isEn ? `${stats.glossary_terms} AEO Terms →` : `${stats.glossary_terms} Thuật ngữ AEO →`}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {TOPIC_PILLARS.map((rawPillar) => {
            const pillar = getLocalizedPillar(rawPillar, lang);
            return (
              <Link
                key={pillar.slug}
                to={`/${pillar.slug}/`}
                className="group p-6 rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 hover:border-editorial-teal transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: pillar.accentColor }}
                    />
                    <span className="text-xs font-mono tabular-nums text-ink-500">
                      {pillarCounts[pillar.slug] || 0} {isEn ? 'articles' : 'bài viết'}
                    </span>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-ink-950 dark:text-paper-50 group-hover:text-editorial-teal">
                    {pillar.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-400 leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
                <div className="text-xs font-semibold text-editorial-teal flex items-center gap-1">
                  <span>{isEn ? 'Explore Pillar' : 'Khám phá Pillar'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 11. Admin AI Vibe-Coded Websites Ecosystem */}
      <section className="w-full px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#146EBE] dark:text-sky-400 inline-flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" /> {isEn ? 'Open Project Ecosystem' : 'Hệ sinh thái Dự án Mở'}
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink-950 dark:text-paper-50 mt-0.5">
              {t('home.vibecodeHeading')}
            </h2>
          </div>
          <Link to="/ai-lab/" className="text-xs sm:text-sm font-semibold text-editorial-teal hover:underline shrink-0">
            {isEn ? 'Open BYOK AI Lab →' : 'Thử nghiệm AI BYOK Lab →'}
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {vibecodeProjects.map((proj) => (
            <a
              key={proj.url}
              href={proj.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 overflow-hidden hover:border-[#146EBE] transition-all flex flex-col"
            >
              <div className="relative h-56 bg-paper-200 dark:bg-ink-800 overflow-hidden">
                <img
                  src={proj.image}
                  alt={proj.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />
                <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-ink-950/80 text-white backdrop-blur-sm">
                  {proj.badge}
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between gap-2.5">
                <div className="space-y-1.5">
                  <h3 className="font-serif text-base font-bold text-ink-950 dark:text-paper-50 group-hover:text-[#146EBE] dark:group-hover:text-sky-400 line-clamp-2">
                    {proj.title}
                  </h3>
                  <p className="text-xs text-ink-600 dark:text-ink-400 line-clamp-2 leading-relaxed">
                    {proj.desc}
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#146EBE] dark:text-sky-400 inline-flex items-center gap-1 pt-1">
                  {t('common.readMore')} <ExternalLink className="w-3.5 h-3.5" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* 12. About VNECONOMICS & Mission */}
      <section className="w-full px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-[#CAE5EC]/40 dark:bg-ink-900 p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#146EBE] dark:text-sky-400">
              <Info className="w-4 h-4" /> {t('home.aboutBadge')}
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink-950 dark:text-paper-50">
              {t('home.aboutTitle')}
            </h2>
            <p className="text-sm sm:text-base text-ink-800 dark:text-ink-300 leading-relaxed">
              {t('home.aboutDesc')}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-semibold">
              <Link to="/ai-lab/" className="text-editorial-teal hover:underline">
                {isEn ? 'BYOK AI Assistant →' : 'Trợ lý AI BYOK →'}
              </Link>
              <Link to="/cardano-hub/" className="text-[#146EBE] dark:text-sky-400 hover:underline">
                {isEn ? 'Cardano Hub & NFT Certificates →' : 'Cardano Hub & Chứng chỉ NFT →'}
              </Link>
              <a
                href="https://marketing2student.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-700 dark:text-ink-300 hover:underline inline-flex items-center gap-1"
              >
                {isEn ? 'Partner: marketing2student.com' : 'Đối tác: marketing2student.com'} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-1 gap-3.5">
            <div className="p-4 rounded-xl bg-white/85 dark:bg-ink-950/80 border border-paper-300 dark:border-ink-800">
              <p className="text-sm font-serif font-semibold text-ink-950 dark:text-paper-50 leading-relaxed">
                {isEn
                  ? '“Technology will completely reshape how we live — start learning today so you are never left behind.”'
                  : '“Công nghệ sẽ thay đổi hoàn toàn cách chúng ta sống – hãy bắt đầu tìm hiểu để không bị bỏ lại phía sau.”'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/85 dark:bg-ink-950/80 border border-paper-300 dark:border-ink-800">
              <p className="text-sm font-serif font-semibold text-ink-950 dark:text-paper-50 leading-relaxed">
                {isEn
                  ? '“VNECONOMICS prioritizes applied research into Blockchain, AI & Big Data across Economics and Business.”'
                  : '“VNECONOMICS sẽ đặt trọng tâm nghiên cứu về ứng dụng của Blockchain trong Kinh tế & Kinh doanh.”'}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
