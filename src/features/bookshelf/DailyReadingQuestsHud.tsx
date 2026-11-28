import React from 'react';
import { CheckCircle2, Circle, Coins, Sparkles, Sunrise } from 'lucide-react';
import type { DailyReadingQuestsState } from './bookshelfService.ts';

interface DailyReadingQuestsHudProps {
  isEn: boolean;
  quests: DailyReadingQuestsState;
  onCheckin: () => void;
  onOpenNoteModal: () => void;
  onClaimBonus: () => void;
}

export const DailyReadingQuestsHud: React.FC<DailyReadingQuestsHudProps> = ({
  isEn,
  quests,
  onCheckin,
  onOpenNoteModal,
  onClaimBonus,
}) => {
  const questsCompletedCount =
    (quests.checkinDone ? 1 : 0) +
    (quests.readSessions >= 1 ? 1 : 0) +
    (quests.notesWritten >= 1 ? 1 : 0);

  return (
    <section className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-sky-500/10 to-emerald-500/10 dark:from-amber-950/25 dark:via-sky-950/25 dark:to-ink-900 border border-amber-300/60 dark:border-ink-800 space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <Sunrise className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-bold text-sm sm:text-base text-ink-950 dark:text-paper-50 flex items-center gap-1.5">
                <span>{isEn ? 'Daily Reading Quests' : 'Nhiệm Vụ Đọc Sách Mỗi Ngày'}</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                {questsCompletedCount}/3 {isEn ? 'Completed' : 'Hoàn thành'}
              </span>
            </div>
            <p className="text-[11px] text-ink-600 dark:text-ink-400 mt-0.5">
              {isEn
                ? 'Complete 3 daily reading habits to grow your Reading EXP and claim +25 VNE Points into your wallet.'
                : 'Thực hiện 3 thói quen đọc sách mỗi ngày để tăng Reading EXP và nhận thưởng +25 VNE Points vào ví.'}
            </p>
          </div>
        </div>

        {questsCompletedCount === 3 && !quests.bonusClaimed && (
          <button
            type="button"
            onClick={onClaimBonus}
            className="self-start sm:self-center py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Coins className="w-4 h-4 text-amber-200" />
            <span>{isEn ? 'Claim +25 VNE Points' : 'Nhận +25 VNE Points'}</span>
          </button>
        )}
        {quests.bonusClaimed && (
          <span className="self-start sm:self-center py-1 px-3 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isEn ? 'Reward Claimed Today' : 'Đã nhận quà hôm nay'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={!quests.checkinDone ? onCheckin : undefined}
          className={`text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
            quests.checkinDone
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-white dark:bg-ink-900 border-paper-300 dark:border-ink-700 hover:border-amber-400 cursor-pointer'
          }`}
        >
          <div className="min-w-0">
            <div className="text-xs font-bold truncate">
              {isEn ? '1. Daily Reading Check-in' : '1. Điểm danh đọc sách'}
            </div>
            <div className="text-[10px] text-ink-500">
              {quests.checkinDone ? (isEn ? 'Done today' : 'Đã hoàn tất') : isEn ? 'Click to check in' : 'Bấm để điểm danh'}
            </div>
          </div>
          {quests.checkinDone ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <Circle className="w-4 h-4 text-ink-400 shrink-0" />
          )}
        </button>

        <div
          className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
            quests.readSessions >= 1
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-white dark:bg-ink-900 border-paper-300 dark:border-ink-700'
          }`}
        >
          <div className="min-w-0">
            <div className="text-xs font-bold truncate">
              {isEn ? '2. Log Reading Progress (+15%)' : '2. Ghi nhận tiến độ đọc (+15%)'}
            </div>
            <div className="text-[10px] text-ink-500">
              {Math.min(quests.readSessions, 1)}/1 {isEn ? 'session (+15 EXP)' : 'lần (+15 EXP)'}
            </div>
          </div>
          {quests.readSessions >= 1 ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <Circle className="w-4 h-4 text-ink-400 shrink-0" />
          )}
        </div>

        <button
          type="button"
          onClick={onOpenNoteModal}
          className={`text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
            quests.notesWritten >= 1
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-white dark:bg-ink-900 border-paper-300 dark:border-ink-700 hover:border-amber-400 cursor-pointer'
          }`}
        >
          <div className="min-w-0">
            <div className="text-xs font-bold truncate">
              {isEn ? '3. Write 1 Reading Note / Quote' : '3. Viết 1 ghi chú / trích dẫn'}
            </div>
            <div className="text-[10px] text-ink-500">
              {Math.min(quests.notesWritten, 1)}/1 {isEn ? 'note (+20 EXP)' : 'ghi chú (+20 EXP)'}
            </div>
          </div>
          {quests.notesWritten >= 1 ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <Circle className="w-4 h-4 text-ink-400 shrink-0" />
          )}
        </button>
      </div>
    </section>
  );
};
