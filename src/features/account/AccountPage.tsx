import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Coins, Copy, ExternalLink, Globe, ShieldCheck, Swords, UserCheck, UserPlus } from 'lucide-react';
import { useTranslation } from '../../core/i18n/index.ts';
import { useSEO } from '../../core/seo/useSEO.ts';
import { getPointsState, POINTS_UPDATED_EVENT } from '../game/vneGameService.ts';
import { ACCOUNT_UPDATED_EVENT, getSavedProfile, type UserAccountProfile } from './accountService.ts';
import { AuthModal } from './AuthModal.tsx';
import { getCurrentUserPublicHandle, getPublicProfileUrl } from './publicProfileService.ts';

export const AccountPage: React.FC = () => {
  const { isEn } = useTranslation();
  const [profile, setProfile] = useState<UserAccountProfile | null>(() => getSavedProfile());
  const [pointsState, setPointsState] = useState(() => getPointsState());
  const [authOpen, setAuthOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const personalHandle = profile ? getCurrentUserPublicHandle() : '';
  const personalUrl = personalHandle ? getPublicProfileUrl(personalHandle) : '';

  useSEO({
    title: isEn ? 'Account & VNE Points Wallet | VNEconomics' : 'Tài khoản & Ví VNE Points | VNEconomics',
    description: isEn
      ? 'Register your free VNEconomics account to earn VNE Points from practice into your wallet.'
      : 'Đăng ký tài khoản miễn phí để tham gia luyện tập và kiếm thêm VNE Points vào ví VNEconomics.',
    canonicalPath: '/tai-khoan/',
  });

  useEffect(() => {
    const syncAccount = () => setProfile(getSavedProfile());
    const syncPoints = () => setPointsState(getPointsState());
    window.addEventListener(ACCOUNT_UPDATED_EVENT, syncAccount);
    window.addEventListener(POINTS_UPDATED_EVENT, syncPoints);
    return () => {
      window.removeEventListener(ACCOUNT_UPDATED_EVENT, syncAccount);
      window.removeEventListener(POINTS_UPDATED_EVENT, syncPoints);
    };
  }, []);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#146EBE]/10 text-[#146EBE] dark:text-sky-400 text-[11px] font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              {isEn ? 'VNEconomics Account & Wallet' : 'Tài khoản & Ví VNEconomics'}
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink-950 dark:text-paper-50">
              {profile
                ? isEn
                  ? `Welcome, ${profile.displayName}`
                  : `Xin chào, ${profile.displayName}`
                : isEn
                  ? 'Register Free Account to Earn VNE Points'
                  : 'Đăng ký Tài khoản Miễn phí để Kiếm VNE Points'}
            </h1>
          </div>

          <div className="px-4 py-3 rounded-xl bg-amber-400/15 border border-amber-400/40 text-right">
            <div className="text-[11px] font-semibold text-ink-600 dark:text-ink-300">
              {isEn ? 'Current Wallet Balance' : 'Số dư Ví hiện tại'}
            </div>
            <div className="text-xl font-extrabold text-[#146EBE] dark:text-amber-300 tabular-nums inline-flex items-center gap-1.5">
              <Coins className="w-5 h-5 text-amber-500" />
              {pointsState.totalPoints} VNE
            </div>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-300 leading-relaxed">
          {isEn
            ? 'Every visitor starts with 10 VNE Points and receives an automatic daily reset to 100 VNE Points. Register an account and complete practice challenges in the Arena to earn extra VNE Points into your wallet and unlock all books, courses, and AI Skills.'
            : 'Mỗi người dùng mặc định được tặng 10 VNE Points và tự động reset lại 100 VNE Points mỗi ngày. Hãy đăng ký tài khoản và tham gia luyện tập tại Đấu trường Tri thức để kiếm thêm VNE Points vào ví, mở khóa sách, khóa học và sàn AI Skills.'}
        </p>

        {profile ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 text-xs sm:text-sm">
                <div className="font-bold text-emerald-800 dark:text-emerald-300 inline-flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" />
                  {isEn ? 'Account Active — Practice Rewards Enabled' : 'Tài khoản đã kích hoạt — Đã mở thưởng VNE từ luyện tập'}
                </div>
                <div className="text-ink-600 dark:text-ink-400">
                  {profile.email} • {profile.role}
                </div>
              </div>
              <Link
                to="/luyen-tap/"
                className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs sm:text-sm font-bold"
              >
                <Swords className="w-4 h-4" />
                {isEn ? 'Practice Now to Earn VNE' : 'Luyện tập kiếm VNE ngay'}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {personalHandle && (
              <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1 min-w-0">
                  <div className="font-bold text-[#146EBE] dark:text-sky-400 inline-flex items-center gap-1.5">
                    <Globe className="w-4 h-4" />
                    {isEn ? 'Your Personal Public Profile URL' : 'Đường dẫn Hồ sơ Công khai riêng của bạn'}
                  </div>
                  <div className="font-mono text-ink-800 dark:text-paper-100 truncate">{personalUrl}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(personalUrl);
                      setCopiedUrl(true);
                      setTimeout(() => setCopiedUrl(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-paper-300 dark:border-ink-700 bg-white dark:bg-ink-900 font-bold"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedUrl ? (isEn ? 'Copied' : 'Đã sao chép') : isEn ? 'Copy URL' : 'Sao chép URL'}
                  </button>
                  <Link
                    to={`/${personalHandle}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white font-bold"
                  >
                    {isEn ? 'Open Public Profile' : 'Mở Trang cá nhân'}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-sm font-bold shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              {isEn ? 'Register / Sign In Free ($0)' : 'Đăng ký / Đăng nhập Miễn phí (0đ)'}
            </button>
            <Link
              to="/luyen-tap/"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 text-sm font-semibold hover:border-[#146EBE]"
            >
              {isEn ? 'Explore Practice Arena' : 'Xem Đấu trường Luyện tập'}
            </Link>
          </div>
        )}
      </div>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(saved) => {
          setProfile(saved);
          setAuthOpen(false);
        }}
      />
    </div>
  );
};
