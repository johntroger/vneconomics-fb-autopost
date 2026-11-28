import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  Coins,
  Download,
  ExternalLink,
  Filter,
  Lock,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Trash2,
  Unlock,
  UserCheck,
  X,
} from 'lucide-react';
import {
  getProductBySlug,
  getProducts,
  handleCoverImageError,
  resolveCoverOrLogo,
  resolveMediaUrl,
  type CatalogProduct,
} from '../../core/data/catalogService.ts';
import { useTranslation } from '../../core/i18n/index.ts';
import { sanitizeHtmlContent } from '../../core/utils/sanitize.ts';
import { useSEO } from '../../core/seo/useSEO.ts';
import { getPointsState, getResourcePointCost, isItemUnlocked, unlockItemWithPoints } from '../game/vneGameService.ts';
import { BookNftMintModal } from './BookNftMintModal.tsx';
import { addCatalogBookToShelf, isBookInShelf } from '../bookshelf/bookshelfService.ts';
import {
  BOOK_NFTS_UPDATED_EVENT,
  formatShortWallet,
  getAllBookNfts,
  getBookNftBySlug,
  syncBookNftsFromServer,
  type BookNftRecord,
} from './bookNftRegistryService.ts';
import {
  addToUnlockCart,
  clearUnlockCart,
  getUnlockCart,
  removeFromUnlockCart,
  type UnlockCartItem,
} from './unlockCartService.ts';

type UnlockFilter = 'all' | 'free' | 'points' | 'owned' | 'nft_available' | 'nft_owned';
type SortOption = 'popular' | 'free_first' | 'points_asc' | 'title_az';
type PdpTab = 'desc' | 'guide';

function getBookMeta(item: CatalogProduct) {
  const seed = item.wp_id % 10;
  const rating = (4.6 + (seed % 4) * 0.1).toFixed(1);
  const downloads = 120 + (item.wp_id % 380);
  return { rating, downloads };
}

export const LibraryPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const { lang, isEn } = useTranslation();
  const products = getProducts(lang);
  const activeProduct = slug ? getProductBySlug(slug, lang) : undefined;

  const [category, setCategory] = useState('all');
  const [unlockFilter, setUnlockFilter] = useState<UnlockFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [query, setQuery] = useState('');
  const [pdpTab, setPdpTab] = useState<PdpTab>('desc');
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<UnlockCartItem[]>(() => getUnlockCart());
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null);
  const [, setVersion] = useState(0);
  const [bookNfts, setBookNfts] = useState<BookNftRecord[]>(() => getAllBookNfts());
  const [nftModalBook, setNftModalBook] = useState<CatalogProduct | null>(null);

  useEffect(() => {
    syncBookNftsFromServer().then(setBookNfts);
    const onUpdated = () => setBookNfts(getAllBookNfts());
    window.addEventListener(BOOK_NFTS_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(BOOK_NFTS_UPDATED_EVENT, onUpdated);
  }, []);

  const bookNftMap = useMemo(() => new Map(bookNfts.map((n) => [n.book_slug, n])), [bookNfts]);

  const userPoints = getPointsState().totalPoints;

  const categories = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const p of products) {
      const prev = map.get(p.category_slug);
      map.set(p.category_slug, {
        name: p.category_name,
        count: (prev?.count || 0) + 1,
      });
    }
    return Array.from(map.entries());
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.filter((p) => {
      if (category !== 'all' && p.category_slug !== category) return false;
      const owned = isItemUnlocked(`product:${p.slug}`);
      const hasNftOwner = bookNftMap.has(p.slug);
      const cost = getResourcePointCost(p.points_cost);
      if (unlockFilter === 'free' && cost > 10) return false;
      if (unlockFilter === 'points' && cost <= 10) return false;
      if (unlockFilter === 'owned' && !owned) return false;
      if (unlockFilter === 'nft_available' && hasNftOwner) return false;
      if (unlockFilter === 'nft_owned' && !hasNftOwner) return false;
      if (!q) return true;
      return p.title.toLowerCase().includes(q) || p.short_description.toLowerCase().includes(q);
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'free_first') return a.points_cost - b.points_cost;
      if (sortBy === 'points_asc') return a.points_cost - b.points_cost || b.wp_id - a.wp_id;
      if (sortBy === 'title_az') return a.title.localeCompare(b.title, lang);
      return b.wp_id - a.wp_id;
    });
  }, [products, category, unlockFilter, sortBy, query, lang, bookNftMap]);

  const handleAddCart = (item: CatalogProduct, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const next = addToUnlockCart({
      key: `product:${item.slug}`,
      slug: item.slug,
      title: item.title,
      categoryName: item.category_name,
      pointsCost: getResourcePointCost(item.points_cost),
      coverImage: item.cover_image,
    });
    setCart(next);
    setCartOpen(true);
  };

  const handleCheckoutCart = () => {
    let unlockedCount = 0;
    for (const item of cart) {
      if (item.pointsCost === 0 || isItemUnlocked(item.key)) {
        unlockedCount++;
        continue;
      }
      const res = unlockItemWithPoints(item.key, item.pointsCost, item.title);
      if (!res.ok) {
        setNotice({ ok: false, msg: res.message });
        return;
      }
      unlockedCount++;
    }
    clearUnlockCart();
    setCart([]);
    setVersion((v) => v + 1);
    setNotice({
      ok: true,
      msg: isEn
        ? `Successfully unlocked ${unlockedCount} item(s) in your cart!`
        : `Đã mở khóa thành công ${unlockedCount} tài liệu trong giỏ!`,
    });
  };

  useSEO({
    title: activeProduct
      ? isEn
        ? `${activeProduct.title} | VNEconomics Knowledge Mall`
        : `${activeProduct.title} | Sàn Tri thức VNEconomics`
      : isEn
        ? `Books, Curricula & AI Skills Marketplace (${products.length} Free Items) | VNEconomics`
        : `Sàn Sách, Giáo trình & AI Skills (${products.length} tài liệu 0đ) | VNEconomics`,
    description:
      activeProduct?.short_description ||
      (isEn
        ? 'Zero-cost Knowledge Marketplace: 59+ Digital Economy, Blockchain, AI Marketing books and AI Skills unlocked via VNE Points.'
        : 'Sàn thương mại tri thức 0đ tiền thật: 59+ đầu sách Kinh tế số, Blockchain, AI Marketing và bộ AI Skills mở khóa bằng VNE Points.'),
    canonicalPath: activeProduct ? `/product/${activeProduct.slug}/` : '/thu-vien-sach/',
  });

  // ============================================================================
  // E-COMMERCE PRODUCT DETAIL PAGE (PDP)
  // ============================================================================
  if (slug && activeProduct) {
    const bookCost = getResourcePointCost(activeProduct.points_cost);
    const unlocked = isItemUnlocked(`product:${activeProduct.slug}`);
    const { src: coverSrc, isFallbackLogo } = resolveCoverOrLogo(activeProduct.cover_image);
    const downloadHref = resolveMediaUrl(activeProduct.external_url);
    const meta = getBookMeta(activeProduct);
    const relatedBooks = products
      .filter((p) => p.category_slug === activeProduct.category_slug && p.slug !== activeProduct.slug)
      .slice(0, 5);

    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex items-center gap-2 text-xs text-ink-500">
            <Link to="/" className="hover:text-editorial-teal">{isEn ? 'Home' : 'Trang chủ'}</Link>
            <span>/</span>
            <Link to="/thu-vien-sach/" className="hover:text-editorial-teal">
              {isEn ? 'Books & Resources' : 'Sàn Sách & Tài liệu'}
            </Link>
            <span>/</span>
            <span className="text-ink-900 dark:text-paper-100 font-medium line-clamp-1">{activeProduct.title}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                addCatalogBookToShelf(activeProduct, 'reading');
                setNotice({
                  ok: true,
                  msg: isEn
                    ? `Saved "${activeProduct.title}" to My Bookshelf!`
                    : `Đã lưu "${activeProduct.title}" vào Tủ sách của tôi!`,
                });
                setVersion((v) => v + 1);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 text-xs font-semibold hover:border-[#146EBE]"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              {isBookInShelf(activeProduct.slug)
                ? isEn
                  ? 'Saved in My Shelf ✓'
                  : 'Đã lưu trong Tủ sách ✓'
                : isEn
                  ? 'Save to My Shelf'
                  : 'Lưu vào Tủ sách'}
            </button>
            <Link
              to="/tu-sach-cua-toi/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 text-xs font-semibold hover:border-[#146EBE]"
            >
              {isEn ? 'My Bookshelf →' : 'Tủ sách của tôi →'}
            </Link>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 text-xs font-semibold hover:border-editorial-teal"
            >
              <ShoppingCart className="w-4 h-4 text-editorial-teal" />
              {isEn ? `Unlock Cart (${cart.length})` : `Giỏ mở khóa (${cart.length})`}
            </button>
          </div>
        </div>

        {/* Main 12-Col E-Commerce Product Box */}
        <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Product Cover & Guarantees */}
          <div className="lg:col-span-4 space-y-4">
            <div className="aspect-[3/4] rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-100 dark:bg-ink-950 overflow-hidden flex items-center justify-center p-4">
              <img
                src={coverSrc}
                alt={activeProduct.title}
                onError={handleCoverImageError}
                className={isFallbackLogo ? 'w-full h-full object-contain p-6' : 'w-full h-full object-contain'}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-lg bg-paper-100 dark:bg-ink-950 border border-paper-200 dark:border-ink-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{isEn ? '$0 Real Money' : '0đ tiền thật'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-paper-100 dark:bg-ink-950 border border-paper-200 dark:border-ink-800 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-[#146EBE] shrink-0" />
                <span>{isEn ? 'Instant Download' : 'Tải tức thì'}</span>
              </div>
            </div>
          </div>

          {/* Right: Purchase / Unlock Decision Panel */}
          <div className="lg:col-span-8 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase px-2.5 py-1 rounded bg-[#146EBE]/10 text-[#146EBE] dark:bg-sky-500/15 dark:text-sky-300">
                VNE Mall Official
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-paper-200 dark:bg-ink-800 text-ink-700 dark:text-ink-300">
                {activeProduct.category_name}
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink-950 dark:text-paper-50 leading-snug">
              {activeProduct.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-ink-600 dark:text-ink-400">
              <span className="inline-flex items-center gap-1 font-semibold text-amber-500">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {meta.rating} {isEn ? '(Verified Rating)' : '(Đánh giá xác thực)'}
              </span>
              <span>•</span>
              <span className="tabular-nums">
                {meta.downloads} {isEn ? 'downloads & unlocks' : 'lượt tải & mở khóa'}
              </span>
              <span>•</span>
              <span>{isEn ? 'Format: PDF / E-Book / AI Skill' : 'Định dạng: PDF / E-Book / AI Skill'}</span>
            </div>

            {/* Price / VNE Points Banner */}
            <div className="p-5 rounded-xl bg-paper-100 dark:bg-ink-950 border border-paper-300 dark:border-ink-800 space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold tabular-nums text-[#146EBE] dark:text-emerald-400">
                    {`${bookCost} VNE Points`}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 tabular-nums">
                    {isEn ? '$0 real money' : '0đ tiền thật'}
                  </span>
                </div>
                <span className="text-xs text-ink-500 tabular-nums">
                  {isEn ? 'Your balance: ' : 'Số dư của bạn: '}
                  <strong>{userPoints} VNE</strong>
                </span>
              </div>

              {unlocked ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                    <Unlock className="w-4 h-4" /> {isEn ? 'Owned in Library' : 'Đã sở hữu trong Tủ sách'}
                  </span>
                  {downloadHref ? (
                    <a
                      href={downloadHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 rounded-xl bg-[#146EBE] text-white text-sm font-bold inline-flex items-center gap-2 hover:opacity-90 shadow-sm"
                    >
                      <Download className="w-4 h-4" /> {isEn ? 'Download Resource Now' : 'Tải tài liệu ngay'}
                    </a>
                  ) : (
                    <span className="text-xs text-ink-500">
                      {isEn
                        ? 'Original file link is synced from the central archive repository.'
                        : 'Link file gốc sẽ được đồng bộ từ WooCommerce postmeta khi Cutover.'}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const r = unlockItemWithPoints(
                        `product:${activeProduct.slug}`,
                        bookCost,
                        activeProduct.title,
                      );
                      setNotice({ ok: r.ok, msg: r.message });
                      setVersion((v) => v + 1);
                    }}
                    className="px-6 py-3 rounded-xl bg-[#146EBE] text-white text-sm font-bold inline-flex items-center gap-2 hover:opacity-90 shadow-sm"
                  >
                    <Coins className="w-4 h-4 text-amber-300" />
                    {isEn ? `Unlock Now (${bookCost} VNE)` : `Mở khóa ngay (${bookCost} VNE)`}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddCart(activeProduct)}
                    className="px-5 py-3 rounded-xl border-2 border-[#146EBE] text-[#146EBE] dark:text-sky-300 dark:border-sky-400 text-sm font-bold inline-flex items-center gap-2 hover:bg-[#146EBE]/5"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {isEn ? 'Add to Unlock Cart' : 'Thêm vào Giỏ mở khóa'}
                  </button>
                </div>
              )}

              {notice && (
                <div className={`text-xs font-medium flex flex-wrap items-center gap-2 ${notice.ok ? 'text-emerald-600' : 'text-amber-600'}`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{notice.msg}</span>
                  {!notice.ok && (
                    <span className="inline-flex items-center gap-2">
                      <Link to="/luyen-tap/" className="underline font-bold text-[#146EBE]">
                        {isEn ? 'Practice to earn VNE' : 'Luyện tập kiếm VNE'}
                      </Link>
                      <Link to="/tai-khoan/" className="underline font-bold text-[#146EBE]">
                        {isEn ? 'Register account' : 'Đăng ký tài khoản'}
                      </Link>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 1-of-1 Exclusive Book NFT Panel (First-to-Mint Owns the Book) */}
            {(() => {
              const claimedNft = bookNftMap.get(activeProduct.slug) || getBookNftBySlug(activeProduct.slug);
              return (
                <div className="p-4 sm:p-5 rounded-xl border border-[#146EBE]/30 bg-sky-50/70 dark:bg-sky-950/25 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#146EBE] dark:text-sky-400">
                      <Award className="w-4 h-4 text-amber-500" />
                      {isEn ? '1-of-1 Exclusive Book NFT Ownership' : 'Quyền sở hữu NFT Sách Độc bản (1-of-1)'}
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        claimedNft
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-400/20 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {claimedNft
                        ? isEn
                          ? 'Claimed (1/1)'
                          : 'Đã có chủ (1/1)'
                        : isEn
                          ? 'Available to Claim (0/1)'
                          : 'Chưa ai NFT (0/1)'}
                    </span>
                  </div>

                  {claimedNft ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="font-bold text-ink-950 dark:text-paper-50 flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          {isEn ? 'First & Exclusive Owner: ' : 'Chủ sở hữu đầu tiên: '}
                          <span className="text-[#146EBE] dark:text-sky-400">{claimedNft.owner_name}</span>
                        </div>
                        <div className="text-ink-600 dark:text-ink-400 font-mono">
                          {formatShortWallet(claimedNft.owner_address)} • {claimedNft.verify_code}
                        </div>
                      </div>
                      <Link
                        to={`/verify/${claimedNft.verify_code}`}
                        className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors"
                      >
                        {isEn ? 'Verify 1/1 Certificate' : 'Xem Chứng nhận 1/1'} <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <p className="text-ink-700 dark:text-ink-300 leading-relaxed">
                        {isEn
                          ? 'First to mint owns this book in the VNEconomics universe! Mint its 1-of-1 Testnet NFT for $0 and earn +15 VNE Points.'
                          : 'Nguyên tắc VNEconomics: Ai đúc NFT trước sẽ sở hữu cuốn sách này trước! Đúc ngay 0đ để ghi danh chủ sở hữu đầu tiên (+15 VNE).'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setNftModalBook(activeProduct)}
                        className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white font-bold transition-colors shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        {isEn ? 'Mint Book NFT (Be First)' : 'Đúc NFT Sách (Đầu tiên)'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            <p className="text-sm text-ink-700 dark:text-ink-300 leading-relaxed">{activeProduct.short_description}</p>

            {/* Tabs */}
            <div className="pt-2 space-y-4">
              <div className="flex gap-4 border-b border-paper-300 dark:border-ink-800">
                <button
                  type="button"
                  onClick={() => setPdpTab('desc')}
                  className={`pb-2.5 text-sm font-bold border-b-2 transition-colors ${
                    pdpTab === 'desc' ? 'border-[#146EBE] text-[#146EBE]' : 'border-transparent text-ink-500'
                  }`}
                >
                  {isEn ? 'Product Details' : 'Mô tả chi tiết sản phẩm'}
                </button>
                <button
                  type="button"
                  onClick={() => setPdpTab('guide')}
                  className={`pb-2.5 text-sm font-bold border-b-2 transition-colors ${
                    pdpTab === 'guide' ? 'border-[#146EBE] text-[#146EBE]' : 'border-transparent text-ink-500'
                  }`}
                >
                  {isEn ? 'How to Earn Free VNE Points' : 'Cách kiếm VNE Points miễn phí'}
                </button>
              </div>

              {pdpTab === 'desc' ? (
                !unlocked ? (
                  <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 space-y-2 text-xs sm:text-sm text-ink-800 dark:text-ink-200">
                    <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                      <Lock className="w-4 h-4" />
                      {isEn
                        ? `Unlock with ${bookCost} VNE Points to read full content & download`
                        : `Mở khóa bằng ${bookCost} VNE Points để đọc toàn bộ nội dung & tải tài liệu`}
                    </div>
                    <p className="text-xs text-ink-600 dark:text-ink-400">
                      {isEn
                        ? 'Default balance is 10 VNE Points (resets to 100 VNE daily). Register an account and practice in the Arena to earn more VNE Points into your wallet.'
                        : 'Mặc định bạn có 10 VNE Points (tự động reset 100 VNE mỗi ngày). Đăng ký tài khoản và tham gia luyện tập để kiếm thêm VNE Points vào ví.'}
                    </p>
                  </div>
                ) : isEn ? (
                  <p className="text-sm text-ink-700 dark:text-ink-300 leading-relaxed">
                    {activeProduct.short_description ||
                      'Digital Economy, Digital Assets & Marketing publication curated by VNEconomics.'}
                  </p>
                ) : (
                  <div
                    className="text-sm text-ink-700 dark:text-ink-300 leading-relaxed space-y-3"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtmlContent(
                        activeProduct.description_html || '<p>Tài liệu chuyên ngành Kinh tế số, Tài sản số &amp; Marketing tại VNEconomics.</p>',
                      ),
                    }}
                  />
                )
              ) : isEn ? (
                <div className="text-xs sm:text-sm text-ink-700 dark:text-ink-300 space-y-2">
                  <p>1. Daily check-in at <Link to="/learn-and-earn/" className="text-[#146EBE] font-semibold underline">VNE Economy Sim</Link> to earn <strong>+20 VNE Points</strong>.</p>
                  <p>2. Read analysis articles and claim <strong>+10 VNE Points/article</strong>.</p>
                  <p>3. Run simulated AI GPU clusters / Nodes in the game to harvest passive points and unlock the full catalog.</p>
                </div>
              ) : (
                <div className="text-xs sm:text-sm text-ink-700 dark:text-ink-300 space-y-2">
                  <p>1. Điểm danh hàng ngày tại <Link to="/learn-and-earn/" className="text-[#146EBE] font-semibold underline">VNE Mô phỏng</Link> nhận <strong>+20 VNE Points</strong>.</p>
                  <p>2. Đọc bài phân tích và bấm xác nhận đọc xong nhận <strong>+10 VNE Points/bài</strong>.</p>
                  <p>3. Vận hành Node / Cụm GPU AI mô phỏng trong game để thu hoạch điểm thụ động mở khóa toàn bộ kho tài liệu.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Products Carousel Grid */}
        {relatedBooks.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold">{isEn ? 'Related Books & Resources' : 'Sản phẩm tương tự'}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {relatedBooks.map((item) => {
                const { src: relatedSrc, isFallbackLogo: relatedFallback } = resolveCoverOrLogo(item.cover_image);
                return (
                  <Link
                    key={item.slug}
                    to={`/product/${item.slug}/`}
                    className="rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 overflow-hidden hover:shadow-md hover:border-[#146EBE] transition-all flex flex-col justify-between"
                  >
                    <div className="aspect-[3/4] bg-paper-100 dark:bg-ink-950 p-2 flex items-center justify-center">
                      <img
                        src={relatedSrc}
                        alt={item.title}
                        loading="lazy"
                        onError={handleCoverImageError}
                        className={relatedFallback ? 'w-full h-full object-contain p-4' : 'w-full h-full object-contain'}
                      />
                    </div>
                    <div className="p-3 space-y-1.5">
                      <div className="text-xs font-semibold line-clamp-2">{item.title}</div>
                      <div className="text-xs font-bold text-[#146EBE] tabular-nums">
                        {`${getResourcePointCost(item.points_cost)} VNE`}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
        <BookNftMintModal
          book={nftModalBook}
          isOpen={Boolean(nftModalBook)}
          onClose={() => setNftModalBook(null)}
          onClaimed={() => setBookNfts(getAllBookNfts())}
        />
      </div>
    );
  }

  // ============================================================================
  // E-COMMERCE MARKETPLACE LISTING VIEW
  // ============================================================================
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Marketplace Banner + Search + Cart Button */}
      <div className="rounded-2xl bg-gradient-to-r from-[#146EBE] to-[#0F766E] text-white p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-sm">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-white/15 px-3 py-1 rounded-full">
            <ShoppingBag className="w-3.5 h-3.5" />
            {isEn ? 'VNE Knowledge Mall • $0 Real Money' : 'VNE Knowledge Mall • 0đ Tiền Thật'}
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">
            {isEn
              ? `Digital Economy Books, Guides & AI Skills (${products.length} items)`
              : `Sàn Sách Kinh tế số, Tài liệu & Bộ AI Skills (${products.length} sản phẩm)`}
          </h1>
          <p className="text-xs sm:text-sm text-white/85 max-w-2xl">
            {isEn ? (
              <>Pick free ($0) books or redeem using <strong>VNE Points</strong> earned from reading and simulations. Zero real money charged.</>
            ) : (
              <>Chọn sách miễn phí 0đ hoặc đổi bằng <strong>VNE Points</strong> kiếm từ đọc bài &amp; chơi game. Không thu tiền thật.</>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-72">
            <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isEn ? 'Search books, guides, AI Skills...' : 'Tìm sách, giáo trình, AI Skill...'}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white text-ink-900 text-xs sm:text-sm focus:outline-none"
            />
          </div>

          <Link
            to="/tu-sach-cua-toi/"
            className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 shrink-0"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{isEn ? 'My Bookshelf' : 'Tủ sách của tôi'}</span>
          </Link>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-400 text-ink-950 font-bold text-xs sm:text-sm inline-flex items-center gap-2 hover:bg-amber-300 shrink-0 shadow-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{isEn ? `Unlock Cart (${cart.length})` : `Giỏ mở khóa (${cart.length})`}</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className={`p-3.5 rounded-xl text-xs font-medium border flex items-center gap-2 ${notice.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'}`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice.msg}</span>
        </div>
      )}

      {/* Main 12-Col Marketplace Grid: Sidebar Filter (3 cols) + Product Shelf (9 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Filter Sidebar */}
        <aside className="lg:col-span-3 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-5 space-y-6 lg:sticky lg:top-20">
          <div className="flex items-center justify-between border-b border-paper-200 dark:border-ink-800 pb-3">
            <span className="font-bold text-sm flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#146EBE]" />
              {isEn ? 'Knowledge Mall Filters' : 'Bộ lọc Sàn Tri thức'}
            </span>
            <span className="text-xs font-mono tabular-nums text-amber-600 font-bold">{userPoints} VNE</span>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-ink-500">
              {isEn ? 'Unlock Method' : 'Hình thức mở khóa'}
            </div>
            <div className="space-y-1">
              {[
                { id: 'all', label: isEn ? 'All items' : 'Tất cả sản phẩm' },
                { id: 'free', label: isEn ? '100% Free ($0)' : 'Miễn phí 0đ hoàn toàn' },
                { id: 'points', label: isEn ? 'Redeem with VNE Points' : 'Đổi bằng VNE Points' },
                { id: 'owned', label: isEn ? 'Owned / Unlocked' : 'Đã sở hữu / Đã mở khóa' },
                { id: 'nft_available', label: isEn ? '1/1 Book NFT Available' : 'Chưa có chủ NFT (0/1)' },
                { id: 'nft_owned', label: isEn ? '1/1 Book NFT Claimed' : 'Đã có chủ NFT (1/1)' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setUnlockFilter(opt.id as UnlockFilter)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    unlockFilter === opt.id
                      ? 'bg-[#146EBE]/10 text-[#146EBE] dark:bg-sky-500/15 dark:text-sky-300 font-bold'
                      : 'hover:bg-paper-100 dark:hover:bg-ink-800 text-ink-700 dark:text-ink-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-paper-200 dark:border-ink-800">
            <div className="text-xs font-bold uppercase tracking-wider text-ink-500">
              {isEn ? 'Books & AI Skills Categories' : 'Danh mục Sách & AI Skills'}
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setCategory('all')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                  category === 'all'
                    ? 'bg-[#146EBE] text-white font-bold'
                    : 'hover:bg-paper-100 dark:hover:bg-ink-800'
                }`}
              >
                <span>{isEn ? 'All Categories' : 'Tất cả danh mục'}</span>
                <span className="tabular-nums opacity-75">{products.length}</span>
              </button>
              {categories.map(([cSlug, info]) => (
                <button
                  key={cSlug}
                  type="button"
                  onClick={() => setCategory(cSlug)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left gap-2 ${
                    category === cSlug
                      ? 'bg-[#146EBE] text-white font-bold'
                      : 'hover:bg-paper-100 dark:hover:bg-ink-800'
                  }`}
                >
                  <span className="truncate">{info.name}</span>
                  <span className="tabular-nums opacity-75 shrink-0">{info.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
            <div className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> {isEn ? 'Need more VNE Points?' : 'Cần thêm VNE Points?'}
            </div>
            <p className="text-ink-600 dark:text-ink-400">
              {isEn
                ? 'Play VNE Economy Sim or check in daily for +20 VNE.'
                : 'Chơi VNE Mô phỏng hoặc điểm danh mỗi ngày nhận +20 VNE.'}
            </p>
            <Link to="/learn-and-earn/" className="inline-block font-bold text-[#146EBE] hover:underline">
              {isEn ? 'Earn points now →' : 'Tích điểm ngay →'}
            </Link>
          </div>
        </aside>

        {/* Right Product Shelf */}
        <div className="lg:col-span-9 space-y-4">
          {/* Sort Toolbar */}
          <div className="rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="font-semibold text-ink-700 dark:text-ink-300 tabular-nums">
              {isEn ? (
                <>
                  Showing <strong>{filtered.length}</strong> items
                </>
              ) : (
                <>
                  Hiển thị <strong>{filtered.length}</strong> sản phẩm
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-ink-500 mr-1">{isEn ? 'Sort:' : 'Sắp xếp:'}</span>
              {[
                { id: 'popular', label: isEn ? 'Most Popular' : 'Phổ biến nhất' },
                { id: 'free_first', label: isEn ? 'Free ($0) First' : 'Miễn phí 0đ trước' },
                { id: 'points_asc', label: isEn ? 'Points: Low → High' : 'VNE thấp → cao' },
                { id: 'title_az', label: isEn ? 'Title A–Z' : 'Tên A–Z' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSortBy(s.id as SortOption)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    sortBy === s.id
                      ? 'bg-[#146EBE] text-white'
                      : 'bg-paper-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 hover:bg-paper-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dense Marketplace Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filtered.map((item) => {
              const { src: coverSrc, isFallbackLogo } = resolveCoverOrLogo(item.cover_image);
              const itemCost = getResourcePointCost(item.points_cost);
              const unlocked = isItemUnlocked(`product:${item.slug}`);
              const meta = getBookMeta(item);
              const inCart = cart.some((c) => c.key === `product:${item.slug}`);

              return (
                <div
                  key={item.slug}
                  className="group rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 overflow-hidden hover:shadow-lg hover:border-[#146EBE] transition-all flex flex-col justify-between"
                >
                  <Link to={`/product/${item.slug}/`} className="block">
                    {/* Book Cover Aspect 3:4 + Badges */}
                    <div className="relative aspect-[3/4] bg-paper-100 dark:bg-ink-950 p-3 flex items-center justify-center overflow-hidden">
                      <img
                        src={coverSrc}
                        alt={item.title}
                        loading="lazy"
                        onError={handleCoverImageError}
                        className={
                          isFallbackLogo
                            ? 'w-full h-full object-contain p-5 group-hover:scale-105 transition-transform duration-300'
                            : 'w-full h-full object-contain group-hover:scale-105 transition-transform duration-300'
                        }
                      />

                      <span
                        className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow-sm ${
                          unlocked
                            ? 'bg-[#146EBE] text-white'
                            : 'bg-amber-400 text-ink-950'
                        }`}
                      >
                        {unlocked
                          ? isEn
                            ? 'Owned'
                            : 'Đã mở khóa'
                          : `${itemCost} VNE`}
                      </span>

                      {(() => {
                        const nftOwner = bookNftMap.get(item.slug);
                        return (
                          <span
                            className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold shadow-sm ${
                              nftOwner
                                ? 'bg-slate-900/85 text-amber-300 border border-amber-400/40'
                                : 'bg-white/90 text-[#146EBE] border border-[#146EBE]/30'
                            }`}
                          >
                            {nftOwner
                              ? `NFT: ${nftOwner.owner_name.split(' ').slice(-1)[0]}`
                              : isEn
                                ? '1/1 NFT Open'
                                : 'Độc bản 0/1'}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="p-3.5 space-y-1.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-editorial-teal truncate">
                        {item.category_name}
                      </div>
                      <h2 className="text-xs sm:text-sm font-bold text-ink-950 dark:text-paper-50 group-hover:text-[#146EBE] line-clamp-2 min-h-[2.5rem]">
                        {item.title}
                      </h2>
                      <div className="flex items-center justify-between text-[11px] text-ink-500 tabular-nums pt-0.5">
                        <span className="inline-flex items-center gap-0.5 text-amber-500 font-semibold">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {meta.rating}
                        </span>
                        <span>{isEn ? `${meta.downloads} dl` : `Đã tải ${meta.downloads}`}</span>
                      </div>
                    </div>
                  </Link>

                  <div className="px-3.5 pb-3.5 pt-2 border-t border-paper-200 dark:border-ink-800 flex items-center justify-between gap-2">
                    <span className="text-sm font-extrabold tabular-nums text-[#146EBE] dark:text-emerald-400">
                      {`${itemCost} VNE`}
                    </span>

                    {unlocked ? (
                      <Link
                        to={`/product/${item.slug}/`}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1"
                      >
                        <Unlock className="w-3 h-3" /> {isEn ? 'Open' : 'Mở ngay'}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleAddCart(item, e)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                      >
                        {inCart ? <CheckCircle2 className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {inCart ? (isEn ? 'In Cart' : 'Trong giỏ') : isEn ? '+ Cart' : '+ Giỏ'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Slide-Over Unlock Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-paper-50 dark:bg-ink-900 h-full shadow-2xl border-l border-paper-300 dark:border-ink-800 flex flex-col">
            <div className="p-5 border-b border-paper-200 dark:border-ink-800 flex items-center justify-between">
              <div className="font-serif text-lg font-bold flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#146EBE]" />
                {isEn ? `$0 Unlock Cart (${cart.length})` : `Giỏ mở khóa 0đ (${cart.length})`}
              </div>
              <button type="button" onClick={() => setCartOpen(false)} className="p-1.5 rounded-lg hover:bg-paper-200 dark:hover:bg-ink-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-xs text-ink-500 space-y-2">
                  <ShoppingBag className="w-10 h-10 mx-auto text-ink-400" />
                  <p>
                    {isEn
                      ? 'Your unlock cart is empty. Pick books or AI Skills you want to download!'
                      : 'Giỏ mở khóa đang trống. Hãy chọn sách hoặc bộ AI Skills bạn muốn tải!'}
                  </p>
                </div>
              ) : (
                cart.map((c) => (
                  <div key={c.key} className="p-3 rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-100 dark:bg-ink-950 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-bold line-clamp-1">{c.title}</div>
                      <div className="text-[11px] text-[#146EBE] font-bold tabular-nums mt-0.5">
                        {c.pointsCost === 0 ? (isEn ? 'Free ($0)' : 'Miễn phí 0đ') : `${c.pointsCost} VNE Points`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCart(removeFromUnlockCart(c.key))}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg shrink-0"
                      title={isEn ? 'Remove from cart' : 'Xóa khỏi giỏ'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-5 border-t border-paper-200 dark:border-ink-800 space-y-3 bg-paper-100 dark:bg-ink-950">
                <div className="flex items-center justify-between text-xs">
                  <span>{isEn ? 'Total VNE Points Cost:' : 'Tổng chi phí VNE Points:'}</span>
                  <strong className="text-base tabular-nums text-[#146EBE]">
                    {cart.reduce((s, x) => s + x.pointsCost, 0)} VNE
                  </strong>
                </div>
                <div className="flex items-center justify-between text-[11px] text-ink-500 tabular-nums">
                  <span>{isEn ? 'Current balance:' : 'Số dư hiện tại:'}</span>
                  <span>{userPoints} VNE</span>
                </div>
                <button
                  type="button"
                  onClick={handleCheckoutCart}
                  className="w-full py-3 rounded-xl bg-[#146EBE] text-white text-sm font-bold hover:opacity-90"
                >
                  {isEn ? 'Confirm Unlock All ($0 Real Money)' : 'Xác nhận Mở khóa Tất cả (0đ tiền thật)'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <BookNftMintModal
        book={nftModalBook}
        isOpen={Boolean(nftModalBook)}
        onClose={() => setNftModalBook(null)}
        onClaimed={() => setBookNfts(getAllBookNfts())}
      />
    </div>
  );
};
