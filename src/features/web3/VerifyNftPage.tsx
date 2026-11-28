import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Award, CheckCircle2, ShieldAlert, ShieldCheck, UserCheck } from 'lucide-react';
import { getProductBySlug } from '../../core/data/catalogService.ts';
import { getNftByVerifyCode } from './multiChainWalletService.ts';
import { formatShortWallet, getBookNftByVerifyCode } from '../library/bookNftRegistryService.ts';
import { useTranslation } from '../../core/i18n/index.ts';
import { useSEO } from '../../core/seo/useSEO.ts';

export const VerifyNftPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const { lang, isEn } = useTranslation();
  const standardRecord = getNftByVerifyCode(id);
  const bookRecord = !standardRecord ? getBookNftByVerifyCode(id) : undefined;
  const localizedBook = bookRecord ? getProductBySlug(bookRecord.book_slug, lang) : undefined;

  const displayTitle = standardRecord?.title || localizedBook?.title || bookRecord?.book_title || '';
  const displayCode = standardRecord?.verifyCode || bookRecord?.verify_code || '';
  const displayNetwork = standardRecord?.network || bookRecord?.network || '';
  const displayTokenId = standardRecord?.tokenId || bookRecord?.token_id || '';
  const displayMintedAt = standardRecord?.mintedAt || bookRecord?.minted_at || '';
  const displayTxHash = standardRecord?.txHash || bookRecord?.tx_hash || '';
  const displaySha = standardRecord?.sha256Proof || bookRecord?.sha256_proof || '';
  const hasRecord = Boolean(standardRecord || bookRecord);

  useSEO({
    title: hasRecord
      ? isEn
        ? `Verify ${displayCode} | VNEconomics`
        : `Xác thực ${displayCode} | VNEconomics`
      : isEn
        ? 'Verify NFT Certificate | VNEconomics'
        : 'Tra cứu Chứng chỉ NFT | VNEconomics',
    description: isEn
      ? 'Public verification portal for 1-of-1 Exclusive Book NFTs, Digital Economy Passports, Course Certificates & SHA-256 Proofs on Testnet.'
      : 'Cổng xác thực công khai NFT Sách Độc bản 1-of-1, Hộ chiếu Kinh tế số, Chứng chỉ Khóa học & Bằng chứng SHA-256 trên Testnet.',
    canonicalPath: `/verify/${id}`,
  });

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link to="/thu-vien-sach/" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#146EBE]">
          <ArrowLeft className="w-3.5 h-3.5" />{' '}
          {isEn ? 'Back to Book Library' : 'Quay lại Thư viện Sách'}
        </Link>
        <Link to="/cardano-hub/" className="inline-flex items-center gap-1.5 text-xs font-medium text-editorial-teal">
          {isEn ? 'Cardano Hub & NFT Studio →' : 'Cardano Hub & NFT Studio →'}
        </Link>
      </div>

      {hasRecord ? (
        <div className="rounded-2xl border border-emerald-300 dark:border-emerald-900 bg-paper-50 dark:bg-ink-900 p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              {bookRecord
                ? isEn
                  ? 'Valid 1-of-1 Exclusive Book NFT (First-to-Mint Owner)'
                  : 'Chứng nhận NFT Sách Độc bản 1-of-1 Hợp lệ (Chủ sở hữu đầu tiên)'
                : isEn
                  ? 'Valid NFT Certificate (Testnet $0 Real Money)'
                  : 'Chứng nhận NFT Hợp lệ (Testnet 0đ Tiền Thật)'}
            </div>
            {bookRecord && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-bold">
                <Award className="w-3.5 h-3.5" /> 1-of-1 Master Edition
              </span>
            )}
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink-950 dark:text-paper-50">
            {displayTitle}
          </h1>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-paper-100 dark:bg-ink-950 p-4 rounded-xl border border-paper-300 dark:border-ink-800">
            <div>
              <dt className="text-ink-500">{isEn ? 'Verification Code' : 'Mã tra cứu'}</dt>
              <dd className="font-mono font-bold mt-0.5">{displayCode}</dd>
            </div>
            <div>
              <dt className="text-ink-500">{isEn ? 'Network' : 'Mạng lưới'}</dt>
              <dd className="font-semibold mt-0.5">{displayNetwork}</dd>
            </div>
            {bookRecord && (
              <>
                <div>
                  <dt className="text-ink-500">{isEn ? 'Exclusive First Owner' : 'Chủ sở hữu Độc bản'}</dt>
                  <dd className="font-bold mt-0.5 flex items-center gap-1 text-[#146EBE] dark:text-sky-400">
                    <UserCheck className="w-3.5 h-3.5" /> {bookRecord.owner_name}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-500">{isEn ? 'Owner Wallet' : 'Ví sở hữu'}</dt>
                  <dd className="font-mono mt-0.5">{formatShortWallet(bookRecord.owner_address)}</dd>
                </div>
              </>
            )}
            <div>
              <dt className="text-ink-500">Token ID</dt>
              <dd className="font-mono mt-0.5">#{displayTokenId}</dd>
            </div>
            <div>
              <dt className="text-ink-500">{isEn ? 'Minted At' : 'Thời gian đúc'}</dt>
              <dd className="tabular-nums mt-0.5">{displayMintedAt.slice(0, 19).replace('T', ' ')}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-ink-500">Transaction Hash</dt>
              <dd className="font-mono break-all mt-0.5">{displayTxHash}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-ink-500">SHA-256 Proof</dt>
              <dd className="font-mono break-all mt-0.5 text-editorial-teal">{displaySha}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-8 text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
          <h1 className="font-serif text-xl font-bold">
            {isEn ? `Certificate ${id} Not Found` : `Chưa tìm thấy chứng chỉ ${id}`}
          </h1>
          <p className="text-xs text-ink-500">
            {isEn
              ? 'This verification code does not exist in the current browser or has not been synced to the server yet.'
              : 'Mã này chưa tồn tại trên trình duyệt hiện tại hoặc chưa đồng bộ về máy chủ MySQL.'}
          </p>
          <div className="pt-2">
            <Link
              to="/cardano-hub/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-editorial-teal text-white text-xs font-semibold"
            >
              <ShieldCheck className="w-4 h-4" /> {isEn ? 'Mint New Testnet NFT' : 'Đúc NFT Testnet mới'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
