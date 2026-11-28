import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Lock, LogIn, Mail, ShieldCheck, User, UserPlus, X } from 'lucide-react';
import { useTranslation } from '../../core/i18n/index.ts';
import {
  isFirebaseConfigured,
  loginWithEmail,
  loginWithGoogleAccount,
  registerWithEmail,
  saveLocalProfile,
  type LearnerRole,
  type UserAccountProfile,
} from './accountService.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (profile: UserAccountProfile) => void;
}

const ROLES: { value: LearnerRole; labelEn: string }[] = [
  { value: 'Sinh viên', labelEn: 'Student' },
  { value: 'Nghiên cứu sinh', labelEn: 'PhD / Researcher' },
  { value: 'Giảng viên', labelEn: 'Lecturer / Professor' },
  { value: 'Nhà phát triển / Đầu tư', labelEn: 'Developer / Investor' },
];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { isEn } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<LearnerRole>('Sinh viên');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const firebaseReady = isFirebaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || (!firebaseReady && !displayName.trim() && mode === 'register')) {
      setErrorMsg(isEn ? 'Please enter your Email address.' : 'Vui lòng nhập đầy đủ Email.');
      return;
    }
    if (firebaseReady && password.length < 6) {
      setErrorMsg(isEn ? 'Password must be at least 6 characters.' : 'Mật khẩu cần tối thiểu 6 ký tự.');
      return;
    }

    setLoading(true);
    try {
      let profile: UserAccountProfile;
      if (mode === 'register') {
        profile = await registerWithEmail(email, password || 'local123', displayName);
        profile = saveLocalProfile({ ...profile, role });
        setSuccessMsg(isEn ? 'Account created successfully!' : 'Đăng ký tài khoản thành công!');
      } else {
        profile = await loginWithEmail(email, password || 'local123');
        setSuccessMsg(isEn ? 'Signed in successfully!' : 'Đăng nhập thành công!');
      }
      onSuccess?.(profile);
      setTimeout(() => onClose(), 700);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : isEn
            ? 'Unable to authenticate account.'
            : 'Không thể xác thực tài khoản.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const profile = await loginWithGoogleAccount();
      onSuccess?.(profile);
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : isEn
            ? 'Unable to connect Google Login.'
            : 'Chưa thể kết nối Google Login.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLocal = () => {
    const profile = saveLocalProfile({
      displayName: displayName.trim() || (isEn ? 'VNEconomics Learner' : 'Học viên VNEconomics'),
      email: email.trim() || 'learner@vneconomics.local',
      role,
      provider: 'local',
    });
    onSuccess?.(profile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-ink-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-ink-800 flex flex-col my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1c244b] to-[#146EBE] text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg">
                {mode === 'login'
                  ? isEn
                    ? 'Sign In'
                    : 'Đăng Nhập Tài Khoản'
                  : isEn
                    ? 'Create Personal Account'
                    : 'Tạo Tài Khoản Cá Nhân'}
              </h2>
              <p className="text-xs text-sky-100/80">
                {isEn
                  ? 'Save Digital Economy, Blockchain & AI learning progress'
                  : 'Lưu tiến độ luyện tập Kinh tế số, Blockchain & AI'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
            aria-label={isEn ? 'Close' : 'Đóng'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-ink-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`py-2 rounded-lg transition ${
                mode === 'login'
                  ? 'bg-white dark:bg-ink-700 text-[#146EBE] dark:text-sky-300 shadow-xs'
                  : 'text-ink-500'
              }`}
            >
              {isEn ? 'Sign In' : 'Đăng nhập'}
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`py-2 rounded-lg transition ${
                mode === 'register'
                  ? 'bg-white dark:bg-ink-700 text-[#146EBE] dark:text-sky-300 shadow-xs'
                  : 'text-ink-500'
              }`}
            >
              {isEn ? 'Register' : 'Đăng ký mới'}
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1">
                    {isEn ? 'Display Name' : 'Họ và tên hiển thị'}
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={isEn ? 'e.g., Alex Nguyen' : 'VD: Nguyễn Minh Anh'}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-ink-700 bg-slate-50 dark:bg-ink-950 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1">
                    {isEn ? 'Learning Role' : 'Vai trò học tập'}
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as LearnerRole)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-ink-700 bg-slate-50 dark:bg-ink-950 text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {isEn ? r.labelEn : r.value}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-ink-700 bg-slate-50 dark:bg-ink-950 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1">
                {isEn ? 'Password' : 'Mật khẩu'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isEn ? 'Minimum 6 characters' : 'Tối thiểu 6 ký tự'}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-ink-700 bg-slate-50 dark:bg-ink-950 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {loading
                ? isEn
                  ? 'Processing...'
                  : 'Đang xử lý...'
                : mode === 'login'
                  ? isEn
                    ? 'Sign In Now'
                    : 'Đăng nhập ngay'
                  : isEn
                    ? 'Create Account'
                    : 'Tạo tài khoản'}
            </button>
          </form>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-200 dark:border-ink-800" />
            <span className="px-2.5 text-[11px] text-ink-400">{isEn ? 'or' : 'hoặc'}</span>
            <div className="flex-grow border-t border-slate-200 dark:border-ink-800" />
          </div>

          <div className="grid grid-cols-1 gap-2">
            {firebaseReady && (
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-ink-700 hover:border-[#146EBE] text-xs font-semibold text-ink-800 dark:text-paper-100 inline-flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-[#146EBE]" />
                {isEn ? 'Continue with Google (Firebase Auth)' : 'Tiếp tục với Google (Firebase Auth)'}
              </button>
            )}
            <button
              type="button"
              onClick={handleQuickLocal}
              className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-ink-700 bg-slate-50 dark:bg-ink-800 hover:border-[#146EBE] text-xs font-semibold text-ink-800 dark:text-paper-100"
            >
              {isEn
                ? 'Quick Create Local Learning Profile'
                : 'Tạo nhanh Hồ sơ Học tập Cá nhân (Local Profile)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
