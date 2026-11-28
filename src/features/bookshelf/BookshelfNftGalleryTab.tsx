import React from 'react';
import { Link } from 'react-router-dom';
import { Award, ExternalLink } from 'lucide-react';
import { getProductBySlug, handleCoverImageError, resolveCoverOrLogo } from '../../core/data/catalogService.ts';
import type { SupportedLanguage } from '../../core/i18n/i18nService.ts';
import { formatShortWallet, type BookNftRecord } from '../library/bookNftRegistryService.ts';

interface BookshelfNftGalleryTabProps {
  lang: SupportedLanguage;
  isEn: boolean;
  bookNfts: BookNftRecord[];
}

export const BookshelfNftGalleryTab: React.FC<BookshelfNftGalleryTabProps> = ({
  lang,
  isEn,
  bookNfts,
}) => {
  if (bookNfts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 p-10 text-center space-y-3">
        <Award className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="font-serif text-lg font-bold text-ink-950 dark:text-paper-50">
          {isEn ? 'No 1-of-1 Book NFTs Minted Yet' : 'Chưa có NFT Sách Độc bản (1/1) nào được đúc'}
        </h3>
        <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-400 max-w-lg mx-auto">
          {isEn
            ? 'First-to-mint owns the book exclusively in the VNEconomics universe! Visit the Library or your shelf to mint your first $0 Testnet Book NFT.'
            : 'Ai đúc NFT trước sẽ sở hữu cuốn sách đó trước trong thế giới VNEconomics! Vào Thư viện hoặc chọn sách trên kệ để đúc NFT 1/1 miễn phí 0đ.'}
        </p>
        <Link
          to="/thu-vien-sach/"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#146EBE] text-white text-xs font-bold"
        >
          {isEn ? 'Explore Books to Mint →' : 'Khám phá Sách để đúc NFT →'}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {bookNfts.map((nft) => {
        const localized = getProductBySlug(nft.book_slug, lang);
        const { src: coverSrc, isFallbackLogo } = resolveCoverOrLogo(
          localized?.cover_image ?? nft.cover_image,
        );
        return (
          <div
            key={nft.verify_code}
            className="rounded-2xl border border-amber-300/60 dark:border-amber-800/60 bg-paper-50 dark:bg-ink-900 p-4 space-y-3 shadow-xs"
          >
            <div className="flex items-start gap-3">
              <div className="w-16 h-22 rounded-xl bg-paper-100 dark:bg-ink-950 border border-paper-200 dark:border-ink-800 flex items-center justify-center overflow-hidden p-1.5 shrink-0">
                <img
                  src={coverSrc}
                  alt={localized?.title || nft.book_title}
                  onError={handleCoverImageError}
                  className={isFallbackLogo ? 'w-full h-full object-contain p-1.5' : 'w-full h-full object-contain'}
                />
              </div>
              <div className="min-w-0 space-y-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                  <Award className="w-3 h-3" /> Token #{nft.token_id} • 1-of-1
                </span>
                <h3 className="font-serif text-sm font-bold text-ink-950 dark:text-paper-50 line-clamp-2">
                  {localized?.title || nft.book_title}
                </h3>
                <div className="text-[11px] text-ink-600 dark:text-ink-400">
                  {isEn ? 'Owner: ' : 'Chủ sở hữu: '}
                  <strong className="text-[#146EBE] dark:text-sky-400">{nft.owner_name}</strong>
                </div>
                <div className="text-[10px] font-mono text-ink-500">
                  {formatShortWallet(nft.owner_address)} • {nft.verify_code}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-paper-200 dark:border-ink-800 text-xs">
              <span className="text-[11px] text-ink-500">{nft.network}</span>
              <Link
                to={`/verify/${nft.verify_code}`}
                className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                {isEn ? 'Verify Certificate' : 'Xác thực NFT'} <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
};
