import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  BookMarked,
  BookOpen,
  Calendar,
  Coins,
  ExternalLink,
  Grid2X2,
  LayoutGrid,
  NotebookPen,
  Plus,
  Search,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import {
  getProductBySlug,
  getProducts,
  handleCoverImageError,
  resolveCoverOrLogo,
  type CatalogProduct,
} from '../../core/data/catalogService.ts';
import { useTranslation } from '../../core/i18n/index.ts';
import { useSEO } from '../../core/seo/useSEO.ts';
import { useDebouncedValue } from '../../core/utils/storageSchema.ts';
import { getPointsState, POINTS_UPDATED_EVENT } from '../game/vneGameService.ts';
import { getCurrentUserPublicHandle, getPublicProfileUrl } from '../account/publicProfileService.ts';
import { BookNftMintModal } from '../library/BookNftMintModal.tsx';
import {
  BOOK_NFTS_UPDATED_EVENT,
  getAllBookNfts,
  type BookNftRecord,
} from '../library/bookNftRegistryService.ts';
import { BookshelfNftGalleryTab } from './BookshelfNftGalleryTab.tsx';
import { DailyReadingQuestsHud } from './DailyReadingQuestsHud.tsx';
import {
  addBookshelfNote,
  addCatalogBookToShelf,
  addCustomBookToShelf,
  BOOKSHELF_UPDATED_EVENT,
  calculateReaderRank,
  claimDailyReadingBonus,
  claimDailyReadingCheckin,
  deleteBookshelfNote,
  getBookshelfNotes,
  getDailyReadingQuests,
  logReadingSession,
  removeBookFromShelf,
  syncBookshelfFromServer,
  syncBookshelfWithOwnedResources,
  updateBookStatus,
  type BookNoteTag,
  type BookReadingStatus,
  type BookshelfBook,
  type BookshelfNoteEntry,
} from './bookshelfService.ts';

type ShelfTab = 'books' | 'notes' | 'goals' | 'nft_gallery';
type ShelfFilter = 'all' | 'reading' | 'want_to_read' | 'completed' | 'nft_owned';

const NOTE_TAG_LABELS: Record<'vi' | 'en', Record<BookNoteTag, string>> = {
  vi: {
    quote: 'Trích dẫn hay',
    insight: 'Bài học cốt lõi',
    summary: 'Tóm tắt chương',
    question: 'Câu hỏi mở',
  },
  en: {
    quote: 'Key Quote',
    insight: 'Core Insight',
    summary: 'Chapter Summary',
    question: 'Open Question',
  },
};

const STATUS_LABELS: Record<'vi' | 'en', Record<BookReadingStatus, string>> = {
  vi: {
    want_to_read: 'Muốn đọc',
    reading: 'Đang đọc',
    completed: 'Đã đọc xong',
  },
  en: {
    want_to_read: 'Want to Read',
    reading: 'Reading',
    completed: 'Completed',
  },
};

export const MyBookshelfPage: React.FC = () => {
  const { lang, isEn } = useTranslation();
  const catalogProducts = useMemo(() => getProducts(lang), [lang]);

  const [books, setBooks] = useState<BookshelfBook[]>(() => syncBookshelfWithOwnedResources(lang));
  const [notes, setNotes] = useState<BookshelfNoteEntry[]>(() => getBookshelfNotes());
  const [quests, setQuests] = useState(() => getDailyReadingQuests());
  const [bookNfts, setBookNfts] = useState<BookNftRecord[]>(() => getAllBookNfts());
  const [points, setPoints] = useState(() => getPointsState().totalPoints);

  const [activeTab, setActiveTab] = useState<ShelfTab>('books');
  const [statusFilter, setStatusFilter] = useState<ShelfFilter>('all');
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('detailed');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNoteBookId, setSelectedNoteBookId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; msg: string; showAccountCta?: boolean } | null>(null);

  // Add Book Modal
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [addMode, setAddMode] = useState<'catalog' | 'custom'>('catalog');
  const [selectedCatalogSlug, setSelectedCatalogSlug] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');
  const [newStatus, setNewStatus] = useState<BookReadingStatus>('reading');
  const [newGoal, setNewGoal] = useState('');

  // Add Note Modal
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [noteBookId, setNoteBookId] = useState('');
  const [noteTag, setNoteTag] = useState<BookNoteTag>('insight');
  const [noteChapter, setNoteChapter] = useState('');
  const [noteBody, setNoteBody] = useState('');

  // Mint Book NFT Modal
  const [nftModalBook, setNftModalBook] = useState<CatalogProduct | null>(null);

  useSEO({
    title: isEn
      ? 'My Bookshelf & Reading Diary | VNEconomics'
      : 'Tủ Sách Của Tôi & Nhật Ký Đọc Sách | VNEconomics',
    description: isEn
      ? 'Personal digital bookshelf on VNEconomics: track reading progress, record quotes and insights, complete daily reading quests, and manage your 1-of-1 Book NFTs.'
      : 'Tủ sách cá nhân trên VNEconomics: theo dõi tiến độ đọc, lưu nhật ký trích dẫn, hoàn thành nhiệm vụ đọc sách mỗi ngày và quản lý bộ sưu tập NFT Sách 1/1.',
    canonicalPath: '/tu-sach-cua-toi/',
  });

  useEffect(() => {
    setBooks(syncBookshelfWithOwnedResources(lang));
    setToast(null);
    void syncBookshelfFromServer();
    const syncAll = () => {
      setBooks(syncBookshelfWithOwnedResources(lang));
      setNotes(getBookshelfNotes());
      setQuests(getDailyReadingQuests());
    };
    const syncPoints = () => setPoints(getPointsState().totalPoints);
    const syncNfts = () => setBookNfts(getAllBookNfts());

    window.addEventListener(BOOKSHELF_UPDATED_EVENT, syncAll);
    window.addEventListener(POINTS_UPDATED_EVENT, syncPoints);
    window.addEventListener(BOOK_NFTS_UPDATED_EVENT, syncNfts);
    return () => {
      window.removeEventListener(BOOKSHELF_UPDATED_EVENT, syncAll);
      window.removeEventListener(POINTS_UPDATED_EVENT, syncPoints);
      window.removeEventListener(BOOK_NFTS_UPDATED_EVENT, syncNfts);
    };
  }, [lang]);

  const bookNftMap = useMemo(() => {
    const map = new Map<string, BookNftRecord>();
    for (const r of bookNfts) map.set(r.book_slug, r);
    return map;
  }, [bookNfts]);

  const totalReadingExp = useMemo(
    () => books.reduce((sum, b) => sum + (b.readingExp || 0), 0),
    [books],
  );
  const completedCount = useMemo(
    () => books.filter((b) => b.status === 'completed').length,
    [books],
  );
  const rank = useMemo(() => calculateReaderRank(totalReadingExp, isEn), [totalReadingExp, isEn]);

  const debouncedSearch = useDebouncedValue(searchQuery, 150);
  const filteredBooks = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return books.filter((b) => {
      if (statusFilter === 'nft_owned' && (!b.bookSlug || !bookNftMap.has(b.bookSlug))) return false;
      if (statusFilter !== 'all' && statusFilter !== 'nft_owned' && b.status !== statusFilter) return false;
      if (!q) return true;
      const localized = b.bookSlug ? getProductBySlug(b.bookSlug, lang) : undefined;
      const displayTitle = localized?.title || b.title;
      return (
        displayTitle.toLowerCase().includes(q) ||
        b.authorOrCategory.toLowerCase().includes(q)
      );
    });
  }, [books, statusFilter, debouncedSearch, bookNftMap, lang]);

  const handleCheckin = () => {
    const next = claimDailyReadingCheckin();
    setQuests(next);
    setToast({
      ok: true,
      msg: isEn ? 'Daily reading check-in completed (1/3)!' : 'Đã điểm danh đọc sách hôm nay (1/3)!',
    });
  };

  const handleClaimQuestBonus = () => {
    const res = claimDailyReadingBonus();
    setQuests(res.quests);
    setPoints(getPointsState().totalPoints);
    setToast({ ok: res.ok, msg: res.message, showAccountCta: res.requiresAccount });
  };

  const handleLogRead = (bookId: string) => {
    const res = logReadingSession(bookId, 15);
    setBooks(res.books);
    setQuests(res.quests);
    setToast({
      ok: true,
      msg: isEn
        ? `+15% reading progress recorded (+${res.gainedExp} Reading EXP)!`
        : `Đã cập nhật +15% tiến độ đọc (+${res.gainedExp} Reading EXP)!`,
    });
  };

  const handleAddBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addMode === 'catalog') {
      const target = catalogProducts.find((p) => p.slug === selectedCatalogSlug);
      if (!target) return;
      addCatalogBookToShelf(target, newStatus, newGoal);
      setToast({
        ok: true,
        msg: isEn ? `Added "${target.title}" to My Bookshelf!` : `Đã thêm "${target.title}" vào Tủ sách của tôi!`,
      });
    } else {
      if (!customTitle.trim()) return;
      addCustomBookToShelf({
        title: customTitle,
        authorOrCategory: customAuthor || (isEn ? 'Personal Reading' : 'Sách cá nhân'),
        status: newStatus,
        personalGoal: newGoal,
      });
      setToast({
        ok: true,
        msg: isEn ? `Added "${customTitle.trim()}" to My Bookshelf!` : `Đã thêm "${customTitle.trim()}" vào Tủ sách của tôi!`,
      });
    }
    setBooks(syncBookshelfWithOwnedResources(lang));
    setCustomTitle('');
    setCustomAuthor('');
    setNewGoal('');
    setSelectedCatalogSlug('');
    setIsAddBookOpen(false);
  };

  const handleOpenNoteModal = (preselectBookId?: string) => {
    const targetId = preselectBookId || books[0]?.id || '';
    setNoteBookId(targetId);
    setIsAddNoteOpen(true);
  };

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteBody.trim()) return;
    const book = books.find((b) => b.id === noteBookId);
    const localizedTitle = book?.bookSlug ? getProductBySlug(book.bookSlug, lang)?.title : undefined;
    const res = addBookshelfNote({
      bookId: book?.id || 'general',
      bookTitle: localizedTitle || book?.title || (isEn ? 'General Reading Note' : 'Ghi chú đọc sách chung'),
      tag: noteTag,
      note: noteBody,
      pageOrChapter: noteChapter,
    });
    setNotes(res.notes);
    setQuests(res.quests);
    setBooks(syncBookshelfWithOwnedResources(lang));
    setNoteBody('');
    setNoteChapter('');
    setIsAddNoteOpen(false);
    setToast({
      ok: true,
      msg: isEn ? 'Saved note to your Reading Diary (+20 Reading EXP)!' : 'Đã lưu ghi chú vào Nhật ký đọc sách (+20 Reading EXP)!',
    });
  };

  const noteTags = NOTE_TAG_LABELS[lang];
  const statusLabels = STATUS_LABELS[lang];
  const publicHandle = getCurrentUserPublicHandle();
  const publicUrl = publicHandle ? getPublicProfileUrl(publicHandle) : '';

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-12">
      {/* Hero Header (Inspired by GardenPage in yeutrongcay) */}
      <section className="rounded-2xl bg-gradient-to-r from-[#0F172A] via-[#1E3A8A] to-[#146EBE] text-white p-6 sm:p-8 space-y-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-[10px] font-bold uppercase tracking-wider">
                <BookMarked className="w-3.5 h-3.5 text-amber-300" />
                {isEn ? 'Personal Digital Bookshelf' : 'Tủ Sách Số Cá Nhân • VNEconomics'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-[10px] font-bold text-amber-200">
                Lv.{rank.level} • {rank.title}
              </span>
              {publicHandle && (
                <Link
                  to={`/${publicHandle}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 text-[10px] font-mono font-bold text-sky-100"
                >
                  {publicUrl} <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl font-bold leading-tight">
              {isEn ? 'My Bookshelf & Reading Diary' : 'Tủ Sách Của Tôi & Nhật Ký Đọc Sách'}
            </h1>
            <p className="text-xs sm:text-sm text-sky-100 leading-relaxed">
              {isEn
                ? 'Track your unlocked VNEconomics books, record reading progress & key insights, complete daily reading quests, and showcase your 1-of-1 Book NFT collection.'
                : 'Quản lý toàn bộ sách đã mở khóa & sách yêu thích, theo dõi tiến độ đọc, lưu trích dẫn tâm đắc, hoàn thành nhiệm vụ đọc mỗi ngày và trưng bày bộ sưu tập NFT Sách 1/1.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsAddBookOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-ink-950 text-xs sm:text-sm font-bold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              {isEn ? 'Add Book to Shelf' : 'Thêm sách vào Tủ'}
            </button>
            <button
              type="button"
              onClick={() => handleOpenNoteModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs sm:text-sm font-bold transition-colors"
            >
              <NotebookPen className="w-4 h-4 text-amber-300" />
              {isEn ? 'Write Reading Note' : 'Ghi Nhật ký đọc'}
            </button>
            <Link
              to="/thu-vien-sach/"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs sm:text-sm font-semibold transition-colors"
            >
              {isEn ? 'Browse Library →' : 'Khám phá Thư viện →'}
            </Link>
          </div>
        </div>

        {/* 5 Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-white/10 border border-white/15">
            <div className="text-[11px] text-sky-100/80">{isEn ? 'Books in Shelf' : 'Sách trong Tủ'}</div>
            <div className="text-xl font-extrabold tabular-nums">{books.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-white/10 border border-white/15">
            <div className="text-[11px] text-sky-100/80">{isEn ? 'Completed' : 'Đã đọc xong'}</div>
            <div className="text-xl font-extrabold tabular-nums text-emerald-300">{completedCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-white/10 border border-white/15">
            <div className="text-[11px] text-sky-100/80">{isEn ? 'Reading EXP' : 'Điểm Đọc (EXP)'}</div>
            <div className="text-xl font-extrabold tabular-nums text-amber-300">{totalReadingExp}</div>
          </div>
          <div className="p-3 rounded-xl bg-white/10 border border-white/15">
            <div className="text-[11px] text-sky-100/80">{isEn ? '1/1 Book NFTs' : 'NFT Sách 1/1'}</div>
            <div className="text-xl font-extrabold tabular-nums text-sky-200">{bookNfts.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-white/10 border border-white/15 col-span-2 sm:col-span-1">
            <div className="text-[11px] text-sky-100/80">{isEn ? 'Wallet Balance' : 'Số dư Ví VNE'}</div>
            <div className="text-xl font-extrabold tabular-nums inline-flex items-center gap-1 text-amber-300">
              <Coins className="w-4 h-4" /> {points} VNE
            </div>
          </div>
        </div>
      </section>

      {/* Daily Reading Quests HUD (Modularized from yeutrongcay DailyGardenQuestsHud) */}
      <DailyReadingQuestsHud
        isEn={isEn}
        quests={quests}
        onCheckin={handleCheckin}
        onOpenNoteModal={() => handleOpenNoteModal()}
        onClaimBonus={handleClaimQuestBonus}
      />

      {toast && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex flex-wrap items-center justify-between gap-2 ${
            toast.ok
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span>{toast.msg}</span>
            {toast.showAccountCta && (
              <Link to="/tai-khoan/" className="underline font-bold text-[#146EBE]">
                {isEn ? 'Register Account →' : 'Đăng ký tài khoản →'}
              </Link>
            )}
          </div>
          <button type="button" onClick={() => setToast(null)} className="underline">
            {isEn ? 'Dismiss' : 'Ẩn'}
          </button>
        </div>
      )}

      {/* 4 Main Tabs (Mirroring GardenPage's 4 Tabs) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-paper-300 dark:border-ink-800 pb-3">
        {(
          [
            { id: 'books', icon: BookOpen, label: isEn ? `My Books (${books.length})` : `Kệ sách của tôi (${books.length})` },
            { id: 'notes', icon: NotebookPen, label: isEn ? `Reading Diary (${notes.length})` : `Nhật ký & Ghi chú (${notes.length})` },
            { id: 'goals', icon: Target, label: isEn ? 'Reading Goals' : 'Mục tiêu & Tiến độ' },
            { id: 'nft_gallery', icon: Award, label: isEn ? `1/1 Book NFTs (${bookNfts.length})` : `Bộ sưu tập NFT 1/1 (${bookNfts.length})` },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                active
                  ? 'bg-[#146EBE] text-white shadow-xs'
                  : 'bg-paper-100 dark:bg-ink-900 text-ink-700 dark:text-ink-300 border border-paper-300 dark:border-ink-800 hover:border-[#146EBE]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: MY BOOKS */}
      {activeTab === 'books' && (
        <div className="space-y-4">
          {/* Filters + View Mode */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: isEn ? 'All' : 'Tất cả' },
                  { id: 'reading', label: isEn ? 'Reading' : 'Đang đọc' },
                  { id: 'want_to_read', label: isEn ? 'Want to Read' : 'Muốn đọc' },
                  { id: 'completed', label: isEn ? 'Completed' : 'Đã đọc xong' },
                  { id: 'nft_owned', label: isEn ? '1/1 NFT Owned' : 'Sở hữu NFT 1/1' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    statusFilter === f.id
                      ? 'bg-[#146EBE] text-white'
                      : 'bg-paper-100 dark:bg-ink-900 text-ink-700 dark:text-ink-300 border border-paper-300 dark:border-ink-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:w-56">
                <Search className="w-3.5 h-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isEn ? 'Filter shelf...' : 'Tìm sách trong tủ...'}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 text-xs"
                />
              </div>
              <div className="inline-flex rounded-lg border border-paper-300 dark:border-ink-700 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setViewMode('detailed')}
                  className={`p-1.5 ${viewMode === 'detailed' ? 'bg-[#146EBE] text-white' : 'bg-paper-50 dark:bg-ink-900 text-ink-500'}`}
                  title={isEn ? 'Detailed view' : 'Xem chi tiết'}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('compact')}
                  className={`p-1.5 ${viewMode === 'compact' ? 'bg-[#146EBE] text-white' : 'bg-paper-50 dark:bg-ink-900 text-ink-500'}`}
                  title={isEn ? 'Compact view' : 'Xem thu gọn'}
                >
                  <Grid2X2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {filteredBooks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 p-10 text-center space-y-3">
              <BookMarked className="w-10 h-10 text-[#146EBE] mx-auto" />
              <h3 className="font-serif text-lg font-bold text-ink-950 dark:text-paper-50">
                {isEn ? 'Your Bookshelf is Ready' : 'Tủ sách cá nhân của bạn đang chờ những cuốn sách đầu tiên'}
              </h3>
              <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-400 max-w-lg mx-auto">
                {isEn
                  ? 'Any book you unlock with VNE Points or mint as a 1-of-1 NFT automatically appears here. You can also add books from the VNEconomics Library or your personal reading list!'
                  : 'Mọi cuốn sách bạn mở khóa bằng VNE Points hoặc đúc NFT 1/1 sẽ tự động xuất hiện tại đây. Bạn cũng có thể thêm ngay sách từ Thư viện VNEconomics hoặc sách ngoài đang đọc!'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddBookOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#146EBE] text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> {isEn ? 'Add First Book' : 'Thêm cuốn sách đầu tiên'}
                </button>
                <Link
                  to="/thu-vien-sach/"
                  className="px-4 py-2.5 rounded-xl border border-paper-300 dark:border-ink-700 text-xs font-semibold hover:border-[#146EBE]"
                >
                  {isEn ? 'Go to Library' : 'Đi tới Thư viện Sách'}
                </Link>
              </div>
            </div>
          ) : (
            <div
              className={
                viewMode === 'compact'
                  ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                  : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
              }
            >
              {filteredBooks.map((book) => {
                const catalogMatch = book.bookSlug ? getProductBySlug(book.bookSlug, lang) : undefined;
                const displayTitle = catalogMatch?.title || book.title;
                const { src: coverSrc, isFallbackLogo } = resolveCoverOrLogo(
                  catalogMatch?.cover_image ?? book.coverImage,
                );
                const claimedNft = book.bookSlug ? bookNftMap.get(book.bookSlug) : undefined;

                return (
                  <div
                    key={book.id}
                    className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 overflow-hidden hover:border-[#146EBE] transition-all flex flex-col justify-between"
                  >
                    <div className={viewMode === 'compact' ? 'p-3 space-y-2.5' : 'p-4 flex gap-4'}>
                      <div
                        className={
                          viewMode === 'compact'
                            ? 'relative aspect-[3/4] rounded-xl bg-paper-100 dark:bg-ink-950 overflow-hidden flex items-center justify-center p-2'
                            : 'relative w-24 h-32 rounded-xl bg-paper-100 dark:bg-ink-950 overflow-hidden flex items-center justify-center p-2 shrink-0'
                        }
                      >
                        <img
                          src={coverSrc}
                          alt={displayTitle}
                          loading="lazy"
                          onError={handleCoverImageError}
                          className={
                            isFallbackLogo
                              ? 'w-full h-full object-contain p-3'
                              : 'w-full h-full object-contain'
                          }
                        />
                        {claimedNft && (
                          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-slate-900/85 text-amber-300 text-[9px] font-bold">
                            NFT 1/1
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-editorial-teal truncate">
                            {catalogMatch?.category_name || book.authorOrCategory}
                          </span>
                          <button
                            type="button"
                            onClick={() => setBooks(removeBookFromShelf(book.id))}
                            title={isEn ? 'Remove from shelf' : 'Xóa khỏi tủ sách'}
                            className="p-1 rounded-lg text-ink-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <h3 className="font-serif text-sm font-bold text-ink-950 dark:text-paper-50 line-clamp-2">
                          {book.bookSlug ? (
                            <Link to={`/product/${book.bookSlug}/`} className="hover:text-[#146EBE]">
                              {displayTitle}
                            </Link>
                          ) : (
                            displayTitle
                          )}
                        </h3>

                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                          <select
                            value={book.status}
                            onChange={(e) => setBooks(updateBookStatus(book.id, e.target.value as BookReadingStatus))}
                            aria-label={isEn ? 'Reading status' : 'Trạng thái đọc'}
                            className="px-2 py-0.5 rounded-md border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 font-semibold text-ink-800 dark:text-paper-200"
                          >
                            <option value="want_to_read">{statusLabels.want_to_read}</option>
                            <option value="reading">{statusLabels.reading}</option>
                            <option value="completed">{statusLabels.completed}</option>
                          </select>
                          <span className="px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-700 dark:text-amber-300 font-bold tabular-nums">
                            {book.readingExp} EXP
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-ink-500 tabular-nums">
                            <span>{isEn ? 'Reading Progress' : 'Tiến độ đọc'}</span>
                            <strong className="text-ink-900 dark:text-paper-100">{book.progressPct}%</strong>
                          </div>
                          <div className="h-2 rounded-full bg-paper-200 dark:bg-ink-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                book.progressPct >= 100 ? 'bg-emerald-500' : 'bg-[#146EBE]'
                              }`}
                              style={{ width: `${book.progressPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="px-3.5 py-2.5 bg-paper-100/70 dark:bg-ink-950/60 border-t border-paper-200 dark:border-ink-800 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={book.progressPct >= 100}
                        onClick={() => handleLogRead(book.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#146EBE] hover:bg-[#0f5ba0] disabled:opacity-50 text-white text-[11px] font-bold"
                      >
                        {book.progressPct >= 100
                          ? isEn
                            ? 'Finished ✓'
                            : 'Đã xong ✓'
                          : isEn
                            ? '+15% Read'
                            : '+15% Đọc tiếp'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenNoteModal(book.id)}
                        className="px-2.5 py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 text-[11px] font-semibold hover:border-[#146EBE]"
                      >
                        {isEn ? 'Note' : 'Ghi chú'}
                      </button>
                      {catalogMatch && !claimedNft && (
                        <button
                          type="button"
                          onClick={() => setNftModalBook(catalogMatch)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-400/20 text-amber-800 dark:text-amber-300 text-[11px] font-bold hover:bg-amber-400/30"
                        >
                          {isEn ? 'Mint NFT 1/1' : 'Đúc NFT 1/1'}
                        </button>
                      )}
                      {claimedNft && (
                        <Link
                          to={`/verify/${claimedNft.verify_code}`}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1"
                        >
                          NFT 1/1 <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: READING DIARY & NOTES TIMELINE */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedNoteBookId || ''}
                onChange={(e) => setSelectedNoteBookId(e.target.value || null)}
                className="px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 text-xs font-semibold"
              >
                <option value="">{isEn ? 'All books in diary' : 'Tất cả sách trong nhật ký'}</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => handleOpenNoteModal()}
              className="px-4 py-2 rounded-xl bg-[#146EBE] text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> {isEn ? 'Add Note / Quote' : 'Thêm ghi chú / trích dẫn'}
            </button>
          </div>

          {notes.filter((n) => !selectedNoteBookId || n.bookId === selectedNoteBookId).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 p-10 text-center space-y-2">
              <NotebookPen className="w-10 h-10 text-ink-400 mx-auto" />
              <p className="text-sm font-semibold text-ink-700 dark:text-ink-300">
                {isEn
                  ? 'No reading notes yet. Save your favorite quotes and insights to earn +20 Reading EXP!'
                  : 'Chưa có ghi chú đọc sách nào. Lưu ngay trích dẫn và bài học tâm đắc để nhận +20 Reading EXP!'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes
                .filter((n) => !selectedNoteBookId || n.bookId === selectedNoteBookId)
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="p-5 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#146EBE]/10 text-[#146EBE] dark:text-sky-300 font-bold text-[11px]">
                          {noteTags[entry.tag]}
                        </span>
                        <strong className="text-ink-950 dark:text-paper-50">{entry.bookTitle}</strong>
                        {entry.pageOrChapter && (
                          <span className="text-ink-500">• {entry.pageOrChapter}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-ink-500">
                        <span className="inline-flex items-center gap-1 text-[11px] tabular-nums">
                          <Calendar className="w-3.5 h-3.5" /> {entry.createdAt.slice(0, 10)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setNotes(deleteBookshelfNote(entry.id))}
                          className="p-1 rounded-lg hover:text-rose-600"
                          title={isEn ? 'Delete note' : 'Xóa ghi chú'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-ink-800 dark:text-ink-200 leading-relaxed whitespace-pre-wrap">
                      {entry.note}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: READING GOALS */}
      {activeTab === 'goals' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-6 space-y-4">
            <h2 className="font-serif text-lg font-bold text-ink-950 dark:text-paper-50 flex items-center gap-2">
              <Target className="w-5 h-5 text-[#146EBE]" />
              {isEn ? 'Reader Level & Progress' : 'Cấp bậc Độc giả & Tiến độ'}
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>
                  Lv.{rank.level} — {rank.title}
                </span>
                <span className="tabular-nums text-[#146EBE]">
                  {totalReadingExp} / {rank.nextThreshold} EXP
                </span>
              </div>
              <div className="h-3 rounded-full bg-paper-200 dark:bg-ink-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#146EBE] to-emerald-500"
                  style={{ width: `${Math.min(100, Math.round((totalReadingExp / rank.nextThreshold) * 100))}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-ink-600 dark:text-ink-400 leading-relaxed">
              {isEn
                ? 'Every +15% reading session awards +15 Reading EXP (+35 EXP upon finishing a book), and every reading note adds +20 Reading EXP.'
                : 'Mỗi phiên đọc (+15% tiến độ) thưởng +15 Reading EXP (+35 EXP khi hoàn tất 100% cuốn sách), và mỗi ghi chú nhật ký cộng +20 Reading EXP.'}
            </p>
          </div>

          <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-6 space-y-3">
            <h2 className="font-serif text-lg font-bold text-ink-950 dark:text-paper-50">
              {isEn ? 'Suggested Books to Add Next' : 'Gợi ý sách nên thêm vào Tủ'}
            </h2>
            <div className="space-y-2.5">
              {catalogProducts.slice(0, 4).map((p) => {
                const alreadyAdded = books.some((b) => b.bookSlug === p.slug);
                return (
                  <div
                    key={p.slug}
                    className="p-3 rounded-xl border border-paper-200 dark:border-ink-800 bg-paper-100 dark:bg-ink-950 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <Link to={`/product/${p.slug}/`} className="text-xs font-bold line-clamp-1 hover:text-[#146EBE]">
                        {p.title}
                      </Link>
                      <div className="text-[11px] text-ink-500">{p.category_name}</div>
                    </div>
                    <button
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => {
                        addCatalogBookToShelf(p, 'want_to_read');
                        setBooks(syncBookshelfWithOwnedResources(lang));
                        setToast({
                          ok: true,
                          msg: isEn ? `Added "${p.title}" to My Bookshelf!` : `Đã thêm "${p.title}" vào Tủ sách!`,
                        });
                      }}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-[#146EBE] disabled:bg-emerald-600 text-white text-[11px] font-bold"
                    >
                      {alreadyAdded ? (isEn ? 'In Shelf ✓' : 'Trong tủ ✓') : isEn ? '+ Add' : '+ Thêm'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: 1-OF-1 BOOK NFT GALLERY */}
      {activeTab === 'nft_gallery' && (
        <BookshelfNftGalleryTab lang={lang} isEn={isEn} bookNfts={bookNfts} />
      )}

      {/* ADD BOOK MODAL */}
      {isAddBookOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-ink-900 rounded-2xl w-full max-w-lg border border-paper-300 dark:border-ink-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-[#146EBE] text-white flex items-center justify-between">
              <h2 className="font-serif font-bold text-base">
                {isEn ? 'Add Book to My Bookshelf' : 'Thêm sách vào Tủ sách của tôi'}
              </h2>
              <button type="button" onClick={() => setIsAddBookOpen(false)} className="p-1 rounded-lg hover:bg-white/15">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddBookSubmit} className="p-5 space-y-4 text-xs">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAddMode('catalog')}
                  className={`flex-1 py-2 rounded-xl font-bold border ${
                    addMode === 'catalog'
                      ? 'bg-[#146EBE] text-white border-[#146EBE]'
                      : 'border-paper-300 dark:border-ink-700'
                  }`}
                >
                  {isEn ? 'From VNEconomics Library' : 'Chọn từ Thư viện VNE'}
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode('custom')}
                  className={`flex-1 py-2 rounded-xl font-bold border ${
                    addMode === 'custom'
                      ? 'bg-[#146EBE] text-white border-[#146EBE]'
                      : 'border-paper-300 dark:border-ink-700'
                  }`}
                >
                  {isEn ? 'Custom Personal Book' : 'Nhập sách ngoài đang đọc'}
                </button>
              </div>

              {addMode === 'catalog' ? (
                <div className="space-y-1.5">
                  <label className="font-bold block">
                    {isEn ? 'Select a book from catalog' : 'Chọn sách từ danh mục'}
                  </label>
                  <select
                    required
                    value={selectedCatalogSlug}
                    onChange={(e) => setSelectedCatalogSlug(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
                  >
                    <option value="">{isEn ? '-- Choose a book --' : '-- Chọn đầu sách --'}</option>
                    {catalogProducts.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="font-bold block">{isEn ? 'Book Title' : 'Tên cuốn sách'}</label>
                    <input
                      required
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder={isEn ? 'e.g., The Bitcoin Standard' : 'VD: Tư duy Kinh tế số...'}
                      className="w-full px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold block">{isEn ? 'Author / Topic' : 'Tác giả / Chủ đề'}</label>
                    <input
                      type="text"
                      value={customAuthor}
                      onChange={(e) => setCustomAuthor(e.target.value)}
                      placeholder={isEn ? 'e.g., Saifedean Ammous' : 'VD: Blockchain / Kinh tế học'}
                      className="w-full px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold block">{isEn ? 'Status' : 'Trạng thái'}</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as BookReadingStatus)}
                    className="w-full px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
                  >
                    <option value="want_to_read">{statusLabels.want_to_read}</option>
                    <option value="reading">{statusLabels.reading}</option>
                    <option value="completed">{statusLabels.completed}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold block">{isEn ? 'Reading Goal (optional)' : 'Mục tiêu đọc (tùy chọn)'}</label>
                  <input
                    type="text"
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    placeholder={isEn ? 'e.g., Finish this month' : 'VD: Đọc xong trong tháng này'}
                    className="w-full px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddBookOpen(false)}
                  className="px-4 py-2 rounded-xl border border-paper-300 dark:border-ink-700 font-semibold"
                >
                  {isEn ? 'Cancel' : 'Hủy'}
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#146EBE] text-white font-bold">
                  {isEn ? 'Add to Shelf' : 'Thêm vào Tủ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD READING NOTE MODAL */}
      {isAddNoteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-ink-900 rounded-2xl w-full max-w-lg border border-paper-300 dark:border-ink-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-[#146EBE] text-white flex items-center justify-between">
              <h2 className="font-serif font-bold text-base">
                {isEn ? 'Write Reading Diary Entry' : 'Ghi Nhật ký & Trích dẫn Đọc sách'}
              </h2>
              <button type="button" onClick={() => setIsAddNoteOpen(false)} className="p-1 rounded-lg hover:bg-white/15">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddNoteSubmit} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold block">{isEn ? 'Book' : 'Sách'}</label>
                <select
                  value={noteBookId}
                  onChange={(e) => setNoteBookId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
                >
                  <option value="">{isEn ? 'General Reading Note' : 'Ghi chú đọc sách chung'}</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold block">{isEn ? 'Note Type' : 'Loại ghi chú'}</label>
                  <select
                    value={noteTag}
                    onChange={(e) => setNoteTag(e.target.value as BookNoteTag)}
                    className="w-full px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
                  >
                    <option value="insight">{noteTags.insight}</option>
                    <option value="quote">{noteTags.quote}</option>
                    <option value="summary">{noteTags.summary}</option>
                    <option value="question">{noteTags.question}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold block">{isEn ? 'Chapter / Page' : 'Chương / Trang'}</label>
                  <input
                    type="text"
                    value={noteChapter}
                    onChange={(e) => setNoteChapter(e.target.value)}
                    placeholder={isEn ? 'e.g., Chapter 2, p.45' : 'VD: Chương 2, trang 45'}
                    className="w-full px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-bold block">{isEn ? 'Your Note / Key Takeaway' : 'Nội dung ghi chú / Trích dẫn'}</label>
                <textarea
                  required
                  rows={4}
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder={isEn ? 'Write what you learned or want to remember...' : 'Ghi lại trích dẫn hay hoặc bài học bạn tâm đắc...'}
                  className="w-full px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddNoteOpen(false)}
                  className="px-4 py-2 rounded-xl border border-paper-300 dark:border-ink-700 font-semibold"
                >
                  {isEn ? 'Cancel' : 'Hủy'}
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#146EBE] text-white font-bold">
                  {isEn ? 'Save Note (+20 EXP)' : 'Lưu ghi chú (+20 EXP)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1-of-1 BOOK NFT MINT MODAL */}
      <BookNftMintModal
        book={nftModalBook}
        isOpen={Boolean(nftModalBook)}
        onClose={() => setNftModalBook(null)}
        onClaimed={() => setBookNfts(getAllBookNfts())}
      />
    </div>
  );
};
