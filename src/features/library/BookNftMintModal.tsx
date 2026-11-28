import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wallet,
  X,
} from 'lucide-react';
import type { CatalogProduct } from '../../core/data/catalogService.ts';
import { handleCoverImageError, resolveCoverOrLogo } from '../../core/data/catalogService.ts';
import { useTranslation } from '../../core/i18n/index.ts';
import { getSavedProfile } from '../account/accountService.ts';
import { detectCardanoWallets } from '../web3/multiChainWalletService.ts';
import {
  formatShortWallet,
  getBookNftBySlug,
  mintExclusiveBookNft,
  type BookNftRecord,
} from './bookNftRegistryService.ts';

interface BookNftMintModalProps {
  book: CatalogProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onClaimed?: (record: BookNftRecord) => void;
}

export const BookNftMintModal: React.FC<BookNftMintModalProps> = ({
  book,
  isOpen,
  onClose,
  onClaimed,
}) => {
  const { isEn } = useTranslation();
  const profile = getSavedProfile();

  const [ownerName, setOwnerName] = useState(profile?.displayName || '');
  const [mintingMode, setMintingMode] = useState<'evm' | 'cardano' | 'sandbox' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [mintedRecord, setMintedRecord] = useState<BookNftRecord | null>(null);
  const [existingOwner, setExistingOwner] = useState<BookNftRecord | null>(null);
  const [cardanoWallets] = useState<string[]>(() => detectCardanoWallets());

  useEffect(() => {
    if (!isOpen || !book) {
      setErrorMsg('');
      setMintingMode(null);
      setMintedRecord(null);
      setExistingOwner(null);
      return;
    }
    const currentOwner = getBookNftBySlug(book.slug);
    setExistingOwner(currentOwner || null);
    setMintedRecord(null);
    setErrorMsg('');
    setOwnerName(getSavedProfile()?.displayName || '');
  }, [isOpen, book]);

  if (!isOpen || !book) return null;

  const { src: coverSrc, isFallbackLogo } = resolveCoverOrLogo(book.cover_image);
  const activeRecord = mintedRecord || existingOwner;

  const handleMint = async (mode: 'evm' | 'cardano' | 'sandbox', cardanoWalletId?: string) => {
    setErrorMsg('');
    setMintingMode(mode);
    try {
      const res = await mintExclusiveBookNft({
        bookSlug: book.slug,
        bookTitle: book.title,
        coverImage: book.cover_image || undefined,
        mode,
        cardanoWalletId,
        customOwnerName: ownerName,
      });

      if (!res.ok) {
        setErrorMsg(res.message);
        if (res.existingOwner) {
          setExistingOwner(res.existingOwner);
        }
        return;
      }

      if (res.record) {
        setMintedRecord(res.record);
        setExistingOwner(res.record);
        onClaimed?.(res.record);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : isEn
            ? 'Could not mint Book NFT.'
            : 'Không thể đúc NFT Sách.',
      );
    } finally {
      setMintingMode(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-ink-900 rounded-2xl sm:rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 dark:border-ink-800 overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1c244b] via-[#1e3a8a] to-[#146EBE] text-white p-5 sm:p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-base sm:text-lg truncate">
                {isEn ? '1-of-1 Exclusive Book NFT Studio' : 'Studio Đúc NFT Sách Độc bản (1-of-1)'}
              </h2>
              <p className="text-xs text-sky-100/85 truncate">
                {isEn
                  ? 'First-to-Mint Owns This Book • $0 Testnet'
                  : 'Ai đúc NFT trước, người đó sở hữu sách trước • 0đ Testnet'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white shrink-0"
            aria-label={isEn ? 'Close' : 'Đóng'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Book Preview */}
          <div className="flex items-center gap-4 p-3.5 rounded-xl bg-paper-100 dark:bg-ink-950 border border-paper-200 dark:border-ink-800">
            <div className="w-14 h-20 rounded-lg bg-white dark:bg-ink-900 border border-paper-200 dark:border-ink-800 flex items-center justify-center overflow-hidden shrink-0">
              <img
                src={coverSrc}
                alt={book.title}
                onError={handleCoverImageError}
                className={isFallbackLogo ? 'w-full h-full object-contain p-1.5' : 'w-full h-full object-contain'}
              />
            </div>
            <div className="min-w-0 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#146EBE] dark:text-sky-400">
                {book.category_name}
              </span>
              <h3 className="font-serif text-sm sm:text-base font-bold text-ink-950 dark:text-paper-50 line-clamp-2">
                {book.title}
              </h3>
              <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                {isEn ? '$0 Real Money • +15 VNE Bonus' : '0đ tiền thật • Thưởng +15 VNE Points'}
              </div>
            </div>
          </div>

          {/* Exclusivity Rule Banner */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>
              {isEn
                ? '1-of-1 Exclusivity Rule: Every book in VNEconomics has only ONE Master NFT. Whoever mints first holds permanent exclusive ownership in the VNEconomics registry.'
                : 'Nguyên tắc Độc bản 1-of-1: Mỗi cuốn sách trong thư viện VNEconomics chỉ có DUY NHẤT 1 NFT gốc. Ai đúc NFT trước sẽ trở thành chủ sở hữu đầu tiên và duy nhất trong thế giới VNEconomics.'}
            </span>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeRecord ? (
            <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/25 p-5 space-y-4">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                {mintedRecord
                  ? isEn
                    ? 'You Successfully Claimed This 1-of-1 Book NFT!'
                    : 'Bạn đã đúc thành công NFT Sách Độc bản!'
                  : isEn
                    ? 'Already Claimed — Exclusive Owner Registered'
                    : 'Sách này đã có Chủ sở hữu NFT Độc bản'}
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white/80 dark:bg-ink-950/70 p-3.5 rounded-xl border border-emerald-200/80 dark:border-emerald-900/50">
                <div>
                  <dt className="text-ink-500">{isEn ? 'First & Exclusive Owner' : 'Chủ sở hữu đầu tiên'}</dt>
                  <dd className="font-bold text-ink-950 dark:text-paper-50 mt-0.5 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-[#146EBE]" />
                    {activeRecord.owner_name}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-500">{isEn ? 'Wallet Address' : 'Địa chỉ ví'}</dt>
                  <dd className="font-mono font-semibold mt-0.5">{formatShortWallet(activeRecord.owner_address)}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">{isEn ? 'Verify Code' : 'Mã xác thực'}</dt>
                  <dd className="font-mono font-bold text-[#146EBE] mt-0.5">{activeRecord.verify_code}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">{isEn ? 'Network' : 'Mạng lưới'}</dt>
                  <dd className="font-semibold mt-0.5">{activeRecord.network}</dd>
                </div>
              </dl>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  to={`/verify/${activeRecord.verify_code}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-bold transition-colors"
                >
                  {isEn ? 'View Public Certificate' : 'Xem Chứng nhận Độc bản'} <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-ink-700 text-xs font-semibold"
                >
                  {isEn ? 'Close' : 'Đóng'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5">
                  {isEn ? 'Owner Display Name on Certificate' : 'Tên chủ sở hữu ghi trên NFT Sách'}
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder={isEn ? 'e.g., Alex Nguyen (optional)' : 'VD: Nguyễn Minh Anh (tùy chọn)'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-ink-700 bg-slate-50 dark:bg-ink-950 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={mintingMode !== null}
                  onClick={() => handleMint('sandbox')}
                  className="w-full py-3 px-4 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
                >
                  {mintingMode === 'sandbox' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  )}
                  {mintingMode === 'sandbox'
                    ? isEn
                      ? 'Minting 1-of-1 Book NFT...'
                      : 'Đang đúc NFT Sách Độc bản...'
                    : isEn
                      ? 'Claim & Mint 1-of-1 Book NFT Now ($0 Testnet Sandbox)'
                      : 'Đúc NFT Sở hữu Sách Đầu tiên Ngay (0đ Sandbox)'}
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={mintingMode !== null}
                    onClick={() => handleMint('evm')}
                    className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-ink-700 bg-slate-50 dark:bg-ink-800 hover:border-[#146EBE] text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Wallet className="w-3.5 h-3.5 text-[#146EBE]" />
                    {mintingMode === 'evm'
                      ? isEn
                        ? 'Connecting EVM...'
                        : 'Đang kết nối EVM...'
                      : isEn
                        ? 'Mint via EVM Testnet'
                        : 'Đúc qua Ví EVM Testnet'}
                  </button>

                  {cardanoWallets.length > 0 ? (
                    <button
                      type="button"
                      disabled={mintingMode !== null}
                      onClick={() => handleMint('cardano', cardanoWallets[0])}
                      className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-ink-700 bg-slate-50 dark:bg-ink-800 hover:border-[#146EBE] text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Wallet className="w-3.5 h-3.5 text-editorial-navy dark:text-sky-400" />
                      {isEn
                        ? `Mint via Cardano (${cardanoWallets[0].toUpperCase()})`
                        : `Đúc qua Cardano (${cardanoWallets[0].toUpperCase()})`}
                    </button>
                  ) : (
                    <Link
                      to="/cardano-hub/"
                      onClick={onClose}
                      className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-ink-700 bg-slate-50 dark:bg-ink-800 hover:border-[#146EBE] text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                    >
                      <Wallet className="w-3.5 h-3.5 text-editorial-navy dark:text-sky-400" />
                      {isEn ? 'Connect Cardano CIP-30' : 'Kết nối Ví Cardano CIP-30'}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
