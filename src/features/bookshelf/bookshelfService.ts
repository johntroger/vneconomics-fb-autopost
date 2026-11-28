import { getProducts, type CatalogProduct } from '../../core/data/catalogService.ts';
import { getLanguage, type SupportedLanguage } from '../../core/i18n/i18nService.ts';
import { getFirebaseIdToken } from '../account/accountService.ts';
import { claimPracticePoints, isItemUnlocked } from '../game/vneGameService.ts';
import { getAllBookNfts } from '../library/bookNftRegistryService.ts';

function pushBookshelfAction(payload: Record<string, unknown>): void {
  void getFirebaseIdToken().then((token) => {
    if (!token) return;
    return fetch('/api/bookshelf.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  }).catch(() => {});
}

export async function syncBookshelfFromServer(): Promise<void> {
  try {
    const token = await getFirebaseIdToken();
    if (!token) return;
    const res = await fetch('/api/bookshelf.php', {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const json = await res.json();
    const data = json?.data;
    if (!data) return;
    if (Array.isArray(data.books) && data.books.length > 0) {
      const localMap = new Map(getBookshelfBooks().map((b) => [b.id, b]));
      for (const sb of data.books as BookshelfBook[]) {
        const existing = localMap.get(sb.id);
        if (!existing || sb.readingExp >= existing.readingExp) {
          localMap.set(sb.id, sb);
        }
      }
      safeWrite(KEY_SHELF_BOOKS, Array.from(localMap.values()));
    }
    if (Array.isArray(data.notes) && data.notes.length > 0) {
      const localNotes = new Map(getBookshelfNotes().map((n) => [n.id, n]));
      for (const sn of data.notes as BookshelfNoteEntry[]) {
        localNotes.set(sn.id, sn);
      }
      safeWrite(KEY_SHELF_NOTES, Array.from(localNotes.values()));
    }
  } catch {
    // Offline/localhost fallback
  }
}

export const BOOKSHELF_UPDATED_EVENT = 'vne:bookshelf-updated';

const KEY_SHELF_BOOKS = 'vne_my_bookshelf_v1';
const KEY_SHELF_NOTES = 'vne_bookshelf_notes_v1';
const KEY_SHELF_QUESTS = 'vne_bookshelf_daily_quests_v1';

export type BookReadingStatus = 'want_to_read' | 'reading' | 'completed';
export type BookNoteTag = 'quote' | 'insight' | 'summary' | 'question';

export interface BookshelfBook {
  id: string;
  bookSlug?: string;
  title: string;
  authorOrCategory: string;
  coverImage: string | null;
  status: BookReadingStatus;
  progressPct: number;
  readingExp: number;
  addedAt: string;
  lastReadAt?: string;
  personalGoal?: string;
}

export interface BookshelfNoteEntry {
  id: string;
  bookId: string;
  bookTitle: string;
  tag: BookNoteTag;
  note: string;
  pageOrChapter?: string;
  createdAt: string;
}

export interface DailyReadingQuestsState {
  date: string;
  checkinDone: boolean;
  readSessions: number;
  notesWritten: number;
  bonusClaimed: boolean;
}

function getLocalDateKey(): string {
  try {
    return new Date().toLocaleDateString('en-CA');
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(BOOKSHELF_UPDATED_EVENT));
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function calculateReaderRank(totalExp: number, isEn: boolean): {
  level: number;
  title: string;
  nextThreshold: number;
} {
  if (totalExp >= 600) {
    return {
      level: 4,
      title: isEn ? 'Grand Digital Scholar' : 'Học giả Kinh tế số',
      nextThreshold: 1000,
    };
  }
  if (totalExp >= 300) {
    return {
      level: 3,
      title: isEn ? 'Deep Research Reader' : 'Độc giả Nghiên cứu Chuyên sâu',
      nextThreshold: 600,
    };
  }
  if (totalExp >= 100) {
    return {
      level: 2,
      title: isEn ? 'Dedicated Book Collector' : 'Người Sưu tầm Tri thức',
      nextThreshold: 300,
    };
  }
  return {
    level: 1,
    title: isEn ? 'Starter Reader' : 'Độc giả Khởi đầu',
    nextThreshold: 100,
  };
}

export function getBookshelfBooks(): BookshelfBook[] {
  return safeRead<BookshelfBook[]>(KEY_SHELF_BOOKS, []);
}

export function isBookInShelf(bookSlug: string): boolean {
  return getBookshelfBooks().some((b) => b.bookSlug === bookSlug);
}

/**
 * Tự động đồng bộ các đầu sách đã mở khóa bằng VNE Points hoặc đã đúc NFT 1/1
 * vào Tủ sách cá nhân (tương tự cơ chế đồng bộ chậu cây trong Vườn của tôi).
 */
export function syncBookshelfWithOwnedResources(lang?: SupportedLanguage): BookshelfBook[] {
  const activeLang = lang || getLanguage();
  const catalog = getProducts(activeLang);
  const current = getBookshelfBooks();
  const existingSlugs = new Set(current.map((b) => b.bookSlug).filter(Boolean));
  const nftSlugs = new Set(getAllBookNfts().map((n) => n.book_slug));

  let changed = false;
  const next = [...current];

  for (const prod of catalog) {
    const owned = isItemUnlocked(`product:${prod.slug}`) || nftSlugs.has(prod.slug);
    if (owned && !existingSlugs.has(prod.slug)) {
      next.unshift({
        id: `shelf_${prod.slug}`,
        bookSlug: prod.slug,
        title: prod.title,
        authorOrCategory: prod.category_name,
        coverImage: prod.cover_image,
        status: 'reading',
        progressPct: 10,
        readingExp: 20,
        addedAt: new Date().toISOString(),
        lastReadAt: new Date().toISOString(),
      });
      existingSlugs.add(prod.slug);
      changed = true;
    }
  }

  if (changed) {
    safeWrite(KEY_SHELF_BOOKS, next);
  }
  return next;
}

export function addCatalogBookToShelf(
  product: CatalogProduct,
  status: BookReadingStatus = 'want_to_read',
  personalGoal?: string,
): BookshelfBook {
  const list = getBookshelfBooks();
  const existing = list.find((b) => b.bookSlug === product.slug);
  if (existing) return existing;

  const entry: BookshelfBook = {
    id: `shelf_${product.slug}`,
    bookSlug: product.slug,
    title: product.title,
    authorOrCategory: product.category_name,
    coverImage: product.cover_image,
    status,
    progressPct: status === 'completed' ? 100 : status === 'reading' ? 10 : 0,
    readingExp: 10,
    addedAt: new Date().toISOString(),
    personalGoal: personalGoal?.trim() || undefined,
  };
  safeWrite(KEY_SHELF_BOOKS, [entry, ...list]);
  pushBookshelfAction({ action: 'sync_book', book: entry });
  return entry;
}

export function addCustomBookToShelf(params: {
  title: string;
  authorOrCategory: string;
  status: BookReadingStatus;
  personalGoal?: string;
}): BookshelfBook {
  const list = getBookshelfBooks();
  const entry: BookshelfBook = {
    id: `custom_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    title: params.title.trim(),
    authorOrCategory: params.authorOrCategory.trim() || 'VNEconomics Reader',
    coverImage: null,
    status: params.status,
    progressPct: params.status === 'completed' ? 100 : params.status === 'reading' ? 10 : 0,
    readingExp: 10,
    addedAt: new Date().toISOString(),
    personalGoal: params.personalGoal?.trim() || undefined,
  };
  safeWrite(KEY_SHELF_BOOKS, [entry, ...list]);
  pushBookshelfAction({ action: 'sync_book', book: entry });
  return entry;
}

export function removeBookFromShelf(bookId: string): BookshelfBook[] {
  const next = getBookshelfBooks().filter((b) => b.id !== bookId);
  safeWrite(KEY_SHELF_BOOKS, next);
  pushBookshelfAction({ action: 'delete_book', book_id: bookId });
  return next;
}

export function updateBookStatus(bookId: string, status: BookReadingStatus): BookshelfBook[] {
  const next = getBookshelfBooks().map((b) => {
    if (b.id !== bookId) return b;
    return {
      ...b,
      status,
      progressPct: status === 'completed' ? 100 : status === 'want_to_read' ? 0 : Math.max(10, b.progressPct),
      lastReadAt: new Date().toISOString(),
    };
  });
  safeWrite(KEY_SHELF_BOOKS, next);
  return next;
}

export function logReadingSession(bookId: string, deltaPct = 15): {
  books: BookshelfBook[];
  quests: DailyReadingQuestsState;
  gainedExp: number;
} {
  let gainedExp = 15;
  const nowIso = new Date().toISOString();
  const next = getBookshelfBooks().map((b) => {
    if (b.id !== bookId) return b;
    const nextPct = Math.min(100, b.progressPct + deltaPct);
    const justCompleted = nextPct === 100 && b.progressPct < 100;
    if (justCompleted) gainedExp = 35;
    return {
      ...b,
      progressPct: nextPct,
      status: nextPct >= 100 ? ('completed' as const) : ('reading' as const),
      readingExp: b.readingExp + gainedExp,
      lastReadAt: nowIso,
    };
  });
  safeWrite(KEY_SHELF_BOOKS, next);

  const quests = getDailyReadingQuests();
  const nextQuests: DailyReadingQuestsState = {
    ...quests,
    readSessions: quests.readSessions + 1,
  };
  safeWrite(KEY_SHELF_QUESTS, nextQuests);

  return { books: next, quests: nextQuests, gainedExp };
}

export function getBookshelfNotes(): BookshelfNoteEntry[] {
  return safeRead<BookshelfNoteEntry[]>(KEY_SHELF_NOTES, []);
}

export function addBookshelfNote(params: {
  bookId: string;
  bookTitle: string;
  tag: BookNoteTag;
  note: string;
  pageOrChapter?: string;
}): { notes: BookshelfNoteEntry[]; quests: DailyReadingQuestsState } {
  const entry: BookshelfNoteEntry = {
    id: `note_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    bookId: params.bookId,
    bookTitle: params.bookTitle,
    tag: params.tag,
    note: params.note.trim(),
    pageOrChapter: params.pageOrChapter?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  const nextNotes = [entry, ...getBookshelfNotes()];
  safeWrite(KEY_SHELF_NOTES, nextNotes);
  pushBookshelfAction({ action: 'add_note', note: entry });

  // Add +20 Reading EXP to the associated book
  const books = getBookshelfBooks().map((b) =>
    b.id === params.bookId ? { ...b, readingExp: b.readingExp + 20, lastReadAt: new Date().toISOString() } : b,
  );
  safeWrite(KEY_SHELF_BOOKS, books);

  const quests = getDailyReadingQuests();
  const nextQuests: DailyReadingQuestsState = {
    ...quests,
    notesWritten: quests.notesWritten + 1,
  };
  safeWrite(KEY_SHELF_QUESTS, nextQuests);

  return { notes: nextNotes, quests: nextQuests };
}

export function deleteBookshelfNote(noteId: string): BookshelfNoteEntry[] {
  const next = getBookshelfNotes().filter((n) => n.id !== noteId);
  safeWrite(KEY_SHELF_NOTES, next);
  return next;
}

export function getDailyReadingQuests(): DailyReadingQuestsState {
  const today = getLocalDateKey();
  const saved = safeRead<DailyReadingQuestsState | null>(KEY_SHELF_QUESTS, null);
  if (!saved || saved.date !== today) {
    const fresh: DailyReadingQuestsState = {
      date: today,
      checkinDone: false,
      readSessions: 0,
      notesWritten: 0,
      bonusClaimed: false,
    };
    safeWrite(KEY_SHELF_QUESTS, fresh);
    return fresh;
  }
  return saved;
}

export function claimDailyReadingCheckin(): DailyReadingQuestsState {
  const quests = getDailyReadingQuests();
  if (quests.checkinDone) return quests;
  const next: DailyReadingQuestsState = { ...quests, checkinDone: true };
  safeWrite(KEY_SHELF_QUESTS, next);
  return next;
}

export function claimDailyReadingBonus(): {
  ok: boolean;
  requiresAccount: boolean;
  message: string;
  quests: DailyReadingQuestsState;
} {
  const isEn = getLanguage() === 'en';
  const quests = getDailyReadingQuests();
  const allDone = quests.checkinDone && quests.readSessions >= 1 && quests.notesWritten >= 1;
  if (!allDone) {
    return {
      ok: false,
      requiresAccount: false,
      message: isEn
        ? 'Complete all 3 daily reading habits first to claim the +25 VNE Points reward.'
        : 'Hãy hoàn thành đủ 3 thói quen đọc sách hôm nay trước khi nhận thưởng +25 VNE Points.',
      quests,
    };
  }
  if (quests.bonusClaimed) {
    return {
      ok: false,
      requiresAccount: false,
      message: isEn ? 'Daily reading bonus already claimed today.' : 'Bạn đã nhận thưởng đọc sách hôm nay rồi.',
      quests,
    };
  }

  const rewardRes = claimPracticePoints(
    25,
    isEn ? 'My Bookshelf Daily Reading Quests (3/3)' : 'Hoàn thành 3/3 Nhiệm vụ Đọc sách Tủ sách của tôi',
  );
  if (!rewardRes.ok) {
    return {
      ok: false,
      requiresAccount: rewardRes.requiresAccount,
      message: rewardRes.message,
      quests,
    };
  }

  const nextQuests: DailyReadingQuestsState = { ...quests, bonusClaimed: true };
  safeWrite(KEY_SHELF_QUESTS, nextQuests);
  return {
    ok: true,
    requiresAccount: false,
    message: isEn
      ? '+25 VNE Points credited to your wallet for completing Daily Reading Quests!'
      : '+25 VNE Points đã cộng vào ví của bạn nhờ hoàn thành 3/3 Nhiệm vụ Đọc sách!',
    quests: nextQuests,
  };
}
