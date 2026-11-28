import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  Bookmark,
  Download,
  Flame,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  Upload,
  User,
  X,
} from 'lucide-react';
import { getPointsState, getUnlockedItemKeys } from '../game/vneGameService.ts';
import { getLexiconEntries } from '../glossary/glossaryEnrichment.ts';
import { useTranslation } from '../../core/i18n/index.ts';
import {
  getDailyQuests,
  getLocalizedPracticeQuestions,
  getMistakeVault,
  getPracticeHistory,
  getSrsMap,
} from '../practice/practiceEngine.ts';
import {
  exportFullLearnerBackup,
  getMasteredSlugs,
  importLearnerBackup,
  saveLocalProfile,
  signOutAccount,
  type LearnerRole,
  type UserAccountProfile,
} from './accountService.ts';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserAccountProfile | null;
  onOpenAuth: () => void;
  onProfileChange: (p: UserAccountProfile | null) => void;
}

type ProfileTab = 'overview' | 'mistakes' | 'bookmarks' | 'unlocked' | 'settings';

const ROLE_LABELS_EN: Record<LearnerRole, string> = {
  'Sinh viên': 'Student',
  'Nghiên cứu sinh': 'PhD / Researcher',
  'Giảng viên': 'Lecturer / Professor',
  'Nhà phát triển / Đầu tư': 'Developer / Investor',
};

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onOpenAuth,
  onProfileChange,
}) => {
  const { lang, isEn } = useTranslation();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [editName, setEditName] = useState(profile?.displayName || '');
  const [editRole, setEditRole] = useState<LearnerRole>(profile?.role || 'Sinh viên');
  const [editGoal, setEditGoal] = useState(
    profile?.targetGoal || (isEn ? 'Master Digital Economy, Blockchain & AI' : 'Làm chủ Kinh tế số, Blockchain & AI'),
  );
  const [statusMsg, setStatusMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pointsState = useMemo(() => getPointsState(), [isOpen]);
  const srsMap = useMemo(() => getSrsMap(), [isOpen]);
  const mistakes = useMemo(() => getMistakeVault(), [isOpen]);
  const history = useMemo(() => getPracticeHistory(), [isOpen]);
  const quests = useMemo(() => getDailyQuests(lang), [isOpen, lang]);
  const localizedQuestions = useMemo(() => getLocalizedPracticeQuestions(lang), [lang]);
  const unlockedKeys = useMemo(() => getUnlockedItemKeys(), [isOpen]);
  const masteredSlugs = useMemo(() => getMasteredSlugs(), [isOpen]);

  const bookmarkedTerms = useMemo(() => {
    try {
      const raw = localStorage.getItem('vne_lexicon_bookmarks');
      const slugs = raw ? (JSON.parse(raw) as string[]) : [];
      const entries = getLexiconEntries(lang);
      return entries.filter((e) => slugs.includes(e.slug));
    } catch {
      return [];
    }
  }, [isOpen, lang]);

  if (!isOpen) return null;

  const unresolvedMistakes = mistakes.filter((m) => !m.resolved);
  const srsCount = Object.keys(srsMap).length;
  const avgAccuracy =
    history.length > 0
      ? Math.round((history.reduce((acc, h) => acc + h.score / Math.max(1, h.total), 0) / history.length) * 100)
      : 0;

  const domainBreakdown = (['kinh-te-so', 'blockchain', 'ai'] as const).map((dom) => {
    const totalQ = localizedQuestions.filter((q) => q.domain === dom).length;
    const missedQ = unresolvedMistakes.filter((m) => m.question.domain === dom).length;
    const label =
      dom === 'kinh-te-so'
        ? isEn
          ? 'Digital Economy'
          : 'Kinh tế số'
        : dom === 'blockchain'
          ? 'Blockchain'
          : 'AI & Agents';
    const pct = totalQ > 0 ? Math.max(0, Math.round(((totalQ - missedQ) / totalQ) * 100)) : 100;
    return { dom, label, pct, missedQ };
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveLocalProfile({
      displayName: editName.trim() || profile?.displayName || (isEn ? 'VNEconomics Learner' : 'Học viên VNEconomics'),
      role: editRole,
      targetGoal: editGoal.trim() || (isEn ? 'Master Digital Economy, Blockchain & AI' : 'Làm chủ Kinh tế số, Blockchain & AI'),
    });
    onProfileChange(updated);
    setStatusMsg(isEn ? 'Personal profile updated.' : 'Đã cập nhật hồ sơ cá nhân.');
  };

  const handleExport = () => {
    const json = exportFullLearnerBackup();
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vneconomics-profile-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = importLearnerBackup(String(reader.result || ''));
      setStatusMsg(res.message);
    };
    reader.readAsText(file);
  };

  const handleLogout = async () => {
    await signOutAccount();
    onProfileChange(null);
    onClose();
  };

  const navItems: { id: ProfileTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'overview', label: isEn ? 'Overview & Mastery' : 'Tổng quan & Năng lực', icon: LayoutDashboard },
    { id: 'mistakes', label: isEn ? 'Mistake Vault' : 'Kho Lỗi sai (Vault)', icon: AlertTriangle, badge: unresolvedMistakes.length },
    { id: 'bookmarks', label: isEn ? 'Saved Terms' : 'Thuật ngữ đã lưu', icon: Bookmark, badge: bookmarkedTerms.length },
    { id: 'unlocked', label: isEn ? 'Unlocked Resources' : 'Tài nguyên đã mở khóa', icon: FolderKanban, badge: unlockedKeys.length },
    { id: 'settings', label: isEn ? 'Settings & JSON Backup' : 'Cài đặt & Sao lưu JSON', icon: Settings },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-hidden">
      <div className="bg-white dark:bg-ink-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-ink-800 w-full max-w-6xl h-[90dvh] flex flex-col md:flex-row overflow-hidden">
        {/* LEFT SIDEBAR (modeled after IELTS Web UserProfileModal) */}
        <aside className="w-full md:w-72 bg-[#1c244b] text-white flex flex-col justify-between shrink-0 p-4 sm:p-5">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#146EBE] flex items-center justify-center font-black text-sm shrink-0">
                  {(profile?.displayName || 'VN').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate">
                    {profile?.displayName || (isEn ? 'Guest Learner' : 'Khách học tập')}
                  </div>
                  <div className="text-[11px] text-sky-200 truncate">
                    {profile
                      ? `${isEn ? ROLE_LABELS_EN[profile.role] || profile.role : profile.role} • ${profile.provider}`
                      : isEn
                        ? 'Not signed in'
                        : 'Chưa đăng nhập tài khoản'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="md:hidden p-1.5 rounded-lg bg-white/10 text-white"
                aria-label={isEn ? 'Close' : 'Đóng'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!profile && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="w-full py-2 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-bold transition-colors"
              >
                {isEn ? 'Sign In / Create Profile' : 'Đăng nhập / Tạo Hồ sơ ngay'}
              </button>
            )}

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                      active ? 'bg-[#146EBE] text-white shadow-sm' : 'text-sky-100/80 hover:bg-white/10'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-bold tabular-nums">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 border-t border-white/15 space-y-2">
            <Link
              to="/luyen-tap/"
              onClick={onClose}
              className="w-full py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> {isEn ? 'Open Practice Arena →' : 'Mở Đấu trường Luyện tập →'}
            </Link>
            {profile && (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2 rounded-xl text-xs font-semibold text-rose-200 hover:bg-rose-500/20 flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" /> {isEn ? 'Sign Out' : 'Đăng xuất'}
              </button>
            )}
          </div>
        </aside>

        {/* RIGHT WORKSPACE */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 bg-slate-50 dark:bg-ink-950">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-ink-800 pb-4">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-ink-950 dark:text-paper-50">
                {navItems.find((n) => n.id === activeTab)?.label}
              </h2>
              <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">
                {isEn
                  ? `Tier ${pointsState.tierLevel} • Goal: ${profile?.targetGoal || 'Digital Economy, Blockchain & AI'}`
                  : `Cấp ${pointsState.tierLevel}: ${pointsState.tierTitle} • Mục tiêu: ${profile?.targetGoal || 'Kinh tế số, Blockchain & AI'}`}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="hidden md:inline-flex p-2 rounded-xl border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-900 text-ink-600 hover:text-ink-950"
              aria-label={isEn ? 'Close' : 'Đóng'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800">
                  <div className="text-xs text-ink-500 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-[#146EBE]" /> VNE Points
                  </div>
                  <div className="text-2xl font-black text-ink-950 dark:text-paper-50 mt-1 tabular-nums">
                    {pointsState.totalPoints}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800">
                  <div className="text-xs text-ink-500 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-500" /> {isEn ? 'Study Streak' : 'Chuỗi học tập'}
                  </div>
                  <div className="text-2xl font-black text-ink-950 dark:text-paper-50 mt-1 tabular-nums">
                    {pointsState.dailyStreak} {isEn ? 'days' : 'ngày'}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800">
                  <div className="text-xs text-ink-500 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-emerald-600" /> {isEn ? 'SM-2 Reviewed' : 'Thẻ SM-2 đã ôn'}
                  </div>
                  <div className="text-2xl font-black text-ink-950 dark:text-paper-50 mt-1 tabular-nums">
                    {srsCount + masteredSlugs.length}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800">
                  <div className="text-xs text-ink-500 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" /> {isEn ? 'Avg Accuracy' : 'Độ chính xác TB'}
                  </div>
                  <div className="text-2xl font-black text-ink-950 dark:text-paper-50 mt-1 tabular-nums">
                    {avgAccuracy}%
                  </div>
                </div>
              </div>

              {/* 3 Domain Mastery Bars */}
              <div className="p-5 rounded-2xl bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 space-y-4">
                <h3 className="font-bold text-sm text-ink-950 dark:text-paper-50">
                  {isEn
                    ? 'Domain Mastery across 3 Pillars (Digital Economy • Blockchain • AI)'
                    : 'Độ vững kiến thức theo 3 Trụ cột (Kinh tế số • Blockchain • AI)'}
                </h3>
                <div className="space-y-3">
                  {domainBreakdown.map((d) => (
                    <div key={d.dom} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>{d.label}</span>
                        <span className="tabular-nums text-[#146EBE]">
                          {d.pct}% ({isEn ? `${d.missedQ} to review` : `${d.missedQ} lỗi cần vá`})
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 dark:bg-ink-800 overflow-hidden">
                        <div className="h-full bg-[#146EBE] rounded-full" style={{ width: `${d.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Quests Snapshot */}
              <div className="p-5 rounded-2xl bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-ink-950 dark:text-paper-50">
                    {isEn ? "Today's Practice Quests" : 'Nhiệm vụ Luyện tập Hôm nay'}
                  </h3>
                  <Link
                    to="/luyen-tap/"
                    onClick={onClose}
                    className="text-xs font-bold text-[#146EBE] hover:underline"
                  >
                    {isEn ? 'Start practice →' : 'Vào luyện tập →'}
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {quests.quests.map((q) => (
                    <div
                      key={q.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-ink-800 bg-slate-50 dark:bg-ink-950 space-y-1.5"
                    >
                      <div className="text-xs font-bold text-ink-900 dark:text-paper-100">{q.title}</div>
                      <div className="text-[11px] text-ink-500">
                        {isEn ? 'Progress: ' : 'Tiến độ: '}
                        {q.current}/{q.target} • +{q.rewardVne} VNE
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mistakes' && (
            <div className="space-y-3">
              {unresolvedMistakes.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 text-center space-y-2">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    {isEn
                      ? 'Great job! You have zero pending items in your Mistake Vault.'
                      : 'Tuyệt vời! Bạn chưa có lỗi sai nào tồn đọng trong Mistake Vault.'}
                  </p>
                  <Link
                    to="/luyen-tap/"
                    onClick={onClose}
                    className="inline-block px-4 py-2 rounded-xl bg-[#146EBE] text-white text-xs font-bold"
                  >
                    {isEn ? 'Challenge Knowledge Arena' : 'Thử thách Đấu trường Tri thức'}
                  </Link>
                </div>
              ) : (
                unresolvedMistakes.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl bg-white dark:bg-ink-900 border border-amber-200 dark:border-amber-900/50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[#146EBE]">{m.question.domainLabel}</span>
                      <span className="text-amber-700 dark:text-amber-400 font-semibold">
                        {isEn ? `Missed ${m.mistakeCount}x` : `Sai ${m.mistakeCount} lần`}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-ink-900 dark:text-paper-100">{m.question.prompt}</p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      {isEn ? 'Correct answer: ' : 'Đáp án đúng: '}
                      {m.question.options[m.question.correctIndex]}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'bookmarks' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bookmarkedTerms.length === 0 ? (
                <p className="text-xs text-ink-500 col-span-2">
                  {isEn
                    ? 'No saved terms yet. Open the Lexicon and click "Save".'
                    : 'Chưa có thuật ngữ nào được lưu. Hãy mở Từ điển và bấm nút “Lưu lại”.'}
                </p>
              ) : (
                bookmarkedTerms.map((t) => (
                  <Link
                    key={t.slug}
                    to={`/tu-dien/${t.slug}/`}
                    onClick={onClose}
                    className="p-4 rounded-xl bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 hover:border-[#146EBE] space-y-1"
                  >
                    <div className="text-xs font-bold text-ink-950 dark:text-paper-50">{t.term}</div>
                    <div className="text-[11px] text-[#146EBE]">
                      {isEn ? t.coreDefinitionEn : t.vietnamese}
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}

          {activeTab === 'unlocked' && (
            <div className="space-y-2">
              {unlockedKeys.length === 0 ? (
                <p className="text-xs text-ink-500">
                  {isEn
                    ? 'No books or AI Skills unlocked with VNE Points yet.'
                    : 'Chưa mở khóa sách hoặc AI Skill nào bằng VNE Points.'}
                </p>
              ) : (
                unlockedKeys.map((k) => (
                  <div
                    key={k}
                    className="p-3 rounded-xl bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 text-xs font-mono"
                  >
                    {k}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <form
                onSubmit={handleSaveProfile}
                className="p-5 rounded-2xl bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 space-y-4"
              >
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-[#146EBE]" />{' '}
                  {isEn ? 'Personal Profile Details' : 'Thông tin Hồ sơ Cá nhân'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {isEn ? 'Display Name' : 'Tên hiển thị'}
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder={isEn ? 'VNEconomics Learner' : 'Học viên VNEconomics'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-ink-700 bg-slate-50 dark:bg-ink-950 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">{isEn ? 'Role' : 'Vai trò'}</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as LearnerRole)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-ink-700 bg-slate-50 dark:bg-ink-950 text-xs"
                    >
                      <option value="Sinh viên">{isEn ? 'Student' : 'Sinh viên'}</option>
                      <option value="Nghiên cứu sinh">{isEn ? 'PhD / Researcher' : 'Nghiên cứu sinh'}</option>
                      <option value="Giảng viên">{isEn ? 'Lecturer / Professor' : 'Giảng viên'}</option>
                      <option value="Nhà phát triển / Đầu tư">{isEn ? 'Developer / Investor' : 'Nhà phát triển / Đầu tư'}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {isEn ? 'Learning Goal' : 'Mục tiêu học tập'}
                  </label>
                  <input
                    type="text"
                    value={editGoal}
                    onChange={(e) => setEditGoal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-ink-700 bg-slate-50 dark:bg-ink-950 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-bold"
                >
                  {isEn ? 'Save Changes' : 'Lưu thay đổi'}
                </button>
              </form>

              <div className="p-5 rounded-2xl bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 space-y-3">
                <h3 className="font-bold text-sm">
                  {isEn ? 'Backup & Restore Learning Data (.JSON)' : 'Sao lưu & Khôi phục Dữ liệu Học tập (.JSON)'}
                </h3>
                <p className="text-xs text-ink-500">
                  {isEn
                    ? 'Export all VNE Points, practice history, SM-2 cards, Mistake Vault, and unlocked resources to another device.'
                    : 'Xuất toàn bộ điểm VNE, lịch sử luyện tập, thẻ SM-2, Mistake Vault và tài nguyên đã mở khóa sang thiết bị khác.'}
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleExport}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#146EBE] text-white text-xs font-bold"
                  >
                    <Download className="w-4 h-4" /> {isEn ? 'Export JSON Backup' : 'Xuất file Backup JSON'}
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-ink-700 text-xs font-semibold"
                  >
                    <Upload className="w-4 h-4" /> {isEn ? 'Import JSON Backup' : 'Nhập file Backup JSON'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </div>
              </div>

              {statusMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {statusMsg}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
