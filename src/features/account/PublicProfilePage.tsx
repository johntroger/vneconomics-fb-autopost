import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Award,
  BookMarked,
  Check,
  Copy,
  Edit3,
  ExternalLink,
  Globe,
  Lock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { getProductBySlug, handleCoverImageError, resolveCoverOrLogo } from '../../core/data/catalogService.ts';
import { useTranslation } from '../../core/i18n/index.ts';
import { useSEO } from '../../core/seo/useSEO.ts';
import { calculateReaderRank, getBookshelfBooks } from '../bookshelf/bookshelfService.ts';
import {
  BOOK_NFTS_UPDATED_EVENT,
  formatShortWallet,
  getAllBookNfts,
  type BookNftRecord,
} from '../library/bookNftRegistryService.ts';
import { ACCOUNT_UPDATED_EVENT, getSavedProfile } from './accountService.ts';
import {
  getCurrentUserOriginalHandle,
  getPublicProfile,
  getPublicProfileUrl,
  normalizeHandle,
  PUBLIC_PROFILE_UPDATED_EVENT,
  saveOneTimeProfileEdit,
  syncPublicProfilesFromCloud,
  type UserPublicProfileConfig,
} from './publicProfileService.ts';

interface PublicProfilePageProps {
  forcedHandle?: string;
}

export const PublicProfilePage: React.FC<PublicProfilePageProps> = ({ forcedHandle }) => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { lang, isEn } = useTranslation();

  const cleanHandle = normalizeHandle(forcedHandle || username || '');
  const [profileConfig, setProfileConfig] = useState<UserPublicProfileConfig>(() =>
    getPublicProfile(cleanHandle),
  );
  const [currentUser, setCurrentUser] = useState(() => getSavedProfile());
  const [bookNfts, setBookNfts] = useState<BookNftRecord[]>(() => getAllBookNfts());
  const [copiedUrl, setCopiedUrl] = useState(false);

  // One-time Edit Modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editCustomHandle, setEditCustomHandle] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editSpecialtyTag, setEditSpecialtyTag] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [confirmedOneTime, setConfirmedOneTime] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      setProfileConfig(getPublicProfile(cleanHandle));
      setCurrentUser(getSavedProfile());
      setBookNfts(getAllBookNfts());
    };
    refresh();
    syncPublicProfilesFromCloud().then(refresh).catch(() => {});

    window.addEventListener(PUBLIC_PROFILE_UPDATED_EVENT, refresh);
    window.addEventListener(ACCOUNT_UPDATED_EVENT, refresh);
    window.addEventListener(BOOK_NFTS_UPDATED_EVENT, refresh);
    return () => {
      window.removeEventListener(PUBLIC_PROFILE_UPDATED_EVENT, refresh);
      window.removeEventListener(ACCOUNT_UPDATED_EVENT, refresh);
      window.removeEventListener(BOOK_NFTS_UPDATED_EVENT, refresh);
    };
  }, [cleanHandle]);

  const myOriginalHandle = getCurrentUserOriginalHandle();
  const isMe = Boolean(
    currentUser &&
      myOriginalHandle &&
      (cleanHandle === myOriginalHandle ||
        profileConfig.original_handle === myOriginalHandle ||
        profileConfig.custom_handle === myOriginalHandle),
  );

  const effectiveHandle = profileConfig.custom_handle || cleanHandle;
  const displayName = profileConfig.display_name || effectiveHandle;
  const publicUrl = getPublicProfileUrl(effectiveHandle);

  const shelfBooks = useMemo(() => (isMe ? getBookshelfBooks() : []), [isMe]);
  const totalReadingExp = useMemo(
    () => shelfBooks.reduce((sum, b) => sum + (b.readingExp || 0), 0),
    [shelfBooks],
  );
  const rank = useMemo(() => calculateReaderRank(totalReadingExp, isEn), [totalReadingExp, isEn]);

  useSEO({
    title: isEn
      ? `${displayName} (@${effectiveHandle}) | VNEconomics Public Profile`
      : `Hồ sơ ${displayName} (@${effectiveHandle}) | Tủ sách & NFT Sách VNEconomics`,
    description: isEn
      ? `Explore verified 1-of-1 Book NFTs and digital economy reading profile of @${effectiveHandle} on VNEconomics.`
      : `Khám phá hồ sơ tri thức và bộ sưu tập NFT Sách Độc bản 1/1 của @${effectiveHandle} trên VNEconomics.`,
    canonicalPath: `/${effectiveHandle}`,
  });

  const handleCopyUrl = () => {
    navigator.clipboard?.writeText(publicUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleOpenEdit = () => {
    setEditDisplayName(displayName);
    setEditCustomHandle(effectiveHandle);
    setEditLocation(profileConfig.location || (isEn ? 'Vietnam' : 'Việt Nam'));
    setEditSpecialtyTag(profileConfig.specialty_tag);
    setEditBio(profileConfig.bio);
    setEditAvatarUrl(profileConfig.avatar_url || '');
    setConfirmedOneTime(false);
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setEditError(isEn ? 'Avatar image must be under 2MB.' : 'Ảnh đại diện tối đa 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setEditAvatarUrl(String(ev.target.result));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveOneTime = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    if (!confirmedOneTime) {
      setEditError(
        isEn
          ? 'Please confirm that you understand your personal URL & profile can only be edited ONCE.'
          : 'Vui lòng tích ô xác nhận bạn đã hiểu quy tắc chỉ được sửa URL & hồ sơ duy nhất 1 lần!',
      );
      return;
    }

    const res = saveOneTimeProfileEdit(profileConfig.original_handle || cleanHandle, {
      custom_handle: editCustomHandle,
      display_name: editDisplayName,
      bio: editBio,
      location: editLocation,
      specialty_tag: editSpecialtyTag,
      avatar_url: editAvatarUrl,
    });

    if (!res.success || !res.profile) {
      setEditError(res.error || (isEn ? 'Could not save profile.' : 'Không thể lưu hồ sơ.'));
      return;
    }

    setProfileConfig(res.profile);
    setIsEditOpen(false);
    setEditSuccess(
      isEn
        ? `Personal URL permanently set to ${getPublicProfileUrl(res.profile.custom_handle)} (1/1 edit used).`
        : `Đã cập nhật URL cá nhân thành ${getPublicProfileUrl(res.profile.custom_handle)} và khóa bảo mật (1/1).`,
    );

    if (res.profile.custom_handle !== cleanHandle) {
      navigate(`/${res.profile.custom_handle}`, { replace: true });
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Hero Profile Banner (Inspired by yeutrongcay PublicProfilePage) */}
      <section className="rounded-2xl bg-gradient-to-r from-[#0F172A] via-[#1E3A8A] to-[#146EBE] text-white p-6 sm:p-8 space-y-5 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            {profileConfig.avatar_url ? (
              <img
                src={profileConfig.avatar_url}
                alt={displayName}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 shrink-0 bg-white"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-white/15 border-2 border-white/25 flex items-center justify-center font-serif text-3xl font-extrabold text-amber-300 shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-300/30 text-[11px] font-bold text-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {profileConfig.specialty_tag}
                </span>
                {profileConfig.has_edited_once && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-semibold text-sky-100">
                    <Lock className="w-3 h-3" /> {isEn ? 'Verified Handle' : 'URL Đã xác thực'}
                  </span>
                )}
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold leading-tight">{displayName}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-sky-100/85">
                <span className="font-mono font-bold text-amber-300">@{effectiveHandle}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {profileConfig.location}
                </span>
                {isMe && (
                  <>
                    <span>•</span>
                    <span>Lv.{rank.level} {rank.title}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Public URL & Edit Actions */}
          <div className="flex flex-col sm:items-end gap-2.5 shrink-0">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-black/25 border border-white/15 text-xs">
              <Globe className="w-3.5 h-3.5 text-sky-300 shrink-0" />
              <span className="font-mono text-sky-100 truncate max-w-[230px]">{publicUrl}</span>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold inline-flex items-center gap-1"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedUrl ? (isEn ? 'Copied' : 'Đã sao chép') : isEn ? 'Copy' : 'Sao chép'}
              </button>
            </div>

            {isMe && (
              <div className="flex flex-wrap items-center gap-2">
                {!profileConfig.has_edited_once ? (
                  <button
                    type="button"
                    onClick={handleOpenEdit}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-ink-950 text-xs font-bold shadow-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    {isEn ? 'Customize URL & Profile (1x)' : 'Tùy chỉnh URL & Hồ sơ (1 lần)'}
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 text-[11px] text-sky-100">
                    <Lock className="w-3.5 h-3.5" />
                    {isEn ? '1/1 URL edit locked' : 'Đã khóa lượt sửa URL (1/1)'}
                  </span>
                )}
                <Link
                  to="/tu-sach-cua-toi/"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold"
                >
                  <BookMarked className="w-3.5 h-3.5 text-amber-300" />
                  {isEn ? 'Open My Bookshelf' : 'Mở Tủ sách của tôi'}
                </Link>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs sm:text-sm text-sky-100/90 leading-relaxed max-w-3xl border-t border-white/15 pt-4">
          {profileConfig.bio}
        </p>
      </section>

      {editSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-2">
          <span>{editSuccess}</span>
          <button type="button" onClick={() => setEditSuccess(null)} className="underline">
            {isEn ? 'Dismiss' : 'Ẩn'}
          </button>
        </div>
      )}

      {/* 1-of-1 Book NFT Showcase */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-xl font-bold text-ink-950 dark:text-paper-50 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            {isEn ? `1-of-1 Book NFT Collection (${bookNfts.length})` : `Bộ sưu tập NFT Sách Độc bản 1/1 (${bookNfts.length})`}
          </h2>
          <Link to="/thu-vien-sach/" className="text-xs font-bold text-[#146EBE] hover:underline">
            {isEn ? 'Explore VNEconomics Library →' : 'Khám phá Thư viện Sách →'}
          </Link>
        </div>

        {bookNfts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-900 p-8 text-center space-y-2">
            <Sparkles className="w-8 h-8 text-amber-500 mx-auto" />
            <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-400">
              {isEn
                ? 'No 1-of-1 Book NFTs have been showcased on this profile yet.'
                : 'Hồ sơ này chưa trưng bày NFT Sách Độc bản (1/1) nào.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookNfts.map((nft) => {
              const localized = getProductBySlug(nft.book_slug, lang);
              const { src: coverSrc, isFallbackLogo } = resolveCoverOrLogo(
                localized?.cover_image ?? nft.cover_image,
              );
              return (
                <div
                  key={nft.verify_code}
                  className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-4 space-y-3"
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
                        Token #{nft.token_id} • 1-of-1
                      </span>
                      <h3 className="font-serif text-sm font-bold text-ink-950 dark:text-paper-50 line-clamp-2">
                        {localized?.title || nft.book_title}
                      </h3>
                      <div className="text-[11px] font-mono text-ink-500">
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
                      {isEn ? 'Verify 1/1' : 'Xác thực 1/1'} <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* One-Time Profile & URL Edit Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-ink-900 rounded-2xl w-full max-w-lg border border-paper-300 dark:border-ink-800 shadow-2xl overflow-hidden my-auto">
            <div className="px-5 py-4 bg-[#146EBE] text-white flex items-center justify-between">
              <h2 className="font-serif font-bold text-base">
                {isEn ? 'Customize Personal URL & Profile (One-Time)' : 'Tùy chỉnh URL Riêng & Hồ sơ (Duy nhất 1 lần)'}
              </h2>
              <button type="button" onClick={() => setIsEditOpen(false)} className="p-1 rounded-lg hover:bg-white/15">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOneTime} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold block">
                  {isEn ? 'Personal URL Handle (3–32 chars)' : 'Đường dẫn cá nhân riêng (3–32 ký tự)'}
                </label>
                <div className="flex items-center rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950 overflow-hidden">
                  <span className="px-3 py-2.5 bg-paper-200/70 dark:bg-ink-800 text-ink-500 font-mono shrink-0">
                    vneconomics.com/
                  </span>
                  <input
                    required
                    type="text"
                    value={editCustomHandle}
                    onChange={(e) => setEditCustomHandle(e.target.value)}
                    placeholder="your-handle"
                    className="flex-1 px-3 py-2.5 bg-transparent font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold block">{isEn ? 'Display Name' : 'Tên hiển thị'}</label>
                  <input
                    required
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold block">{isEn ? 'Location' : 'Khu vực'}</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold block">{isEn ? 'Specialty Badge' : 'Danh hiệu chuyên môn'}</label>
                <input
                  type="text"
                  value={editSpecialtyTag}
                  onChange={(e) => setEditSpecialtyTag(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold block">{isEn ? 'Bio' : 'Giới thiệu bản thân'}</label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold block">{isEn ? 'Avatar Image (<2MB, optional)' : 'Ảnh đại diện (<2MB, tùy chọn)'}</label>
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 cursor-pointer hover:border-[#146EBE]">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{editAvatarUrl ? (isEn ? 'Change image' : 'Đổi ảnh') : isEn ? 'Upload avatar' : 'Tải ảnh lên'}</span>
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              </div>

              <label className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmedOneTime}
                  onChange={(e) => setConfirmedOneTime(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-amber-900 dark:text-amber-200 leading-relaxed">
                  {isEn
                    ? 'I understand that my custom URL handle and profile identity can only be edited ONCE (1/1) and will be permanently locked afterward.'
                    : 'Tôi hiểu rằng mỗi tài khoản chỉ được đổi URL riêng và thông tin định danh duy nhất 1 LẦN (1/1) và sẽ khóa cố định sau khi lưu.'}
                </span>
              </label>

              {editError && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold">
                  {editError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-xl border border-paper-300 dark:border-ink-700 font-semibold"
                >
                  {isEn ? 'Cancel' : 'Hủy'}
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#146EBE] text-white font-bold">
                  {isEn ? 'Save & Lock URL (1/1)' : 'Lưu & Khóa URL (1/1)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
