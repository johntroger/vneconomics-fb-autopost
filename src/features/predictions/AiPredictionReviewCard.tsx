import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import type {
  AiMarketModerationEval,
  AiOracleResolutionEval,
} from './predictionMarketService.ts';

interface ModerationCardProps {
  mode: 'moderation';
  evaluation: AiMarketModerationEval;
  isEn: boolean;
}

interface OracleCardProps {
  mode: 'oracle';
  evaluation: AiOracleResolutionEval;
  isEn: boolean;
}

type AiPredictionReviewCardProps = ModerationCardProps | OracleCardProps;

export const AiPredictionReviewCard: React.FC<AiPredictionReviewCardProps> = (props) => {
  const { isEn } = props;

  if (props.mode === 'moderation') {
    const ev = props.evaluation;
    const isApproved = ev.verdict === 'approve';
    const isNeedsRevision = ev.verdict === 'needs_revision';

    const boxClass = isApproved
      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-900'
      : isNeedsRevision
        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900'
        : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900';

    const badgeClass = isApproved
      ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800'
      : isNeedsRevision
        ? 'text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800'
        : 'text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800';

    return (
      <div className={`rounded-xl border p-4 space-y-3 ${boxClass}`}>
        <div className="flex items-start justify-between gap-3 border-b border-paper-200 dark:border-ink-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#146EBE]/10 text-[#146EBE] shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs uppercase tracking-wider">
                  {isEn ? 'AI Market Quality Audit' : 'AI Thẩm định Chất lượng Kèo'}
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badgeClass}`}>
                  {isApproved
                    ? isEn
                      ? '✓ Recommend Approve'
                      : '✓ Đạt chuẩn (Approve)'
                    : isNeedsRevision
                      ? isEn
                        ? '⚠ Needs Review'
                        : '⚠ Cần kiểm tra thêm'
                      : isEn
                        ? '✕ Recommend Reject'
                        : '✕ Không đạt (Reject)'}
                </span>
              </div>
              <p className="text-[11px] text-ink-500 font-mono mt-0.5">
                Model: {ev.model} • {new Date(ev.evaluated_at).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xl font-black tabular-nums">
              {ev.score}
              <span className="text-xs text-ink-400 font-normal">/100</span>
            </div>
            <span className="text-[10px] text-ink-500 uppercase font-semibold">
              {isEn ? 'Quality Score' : 'Điểm chuẩn'}
            </span>
          </div>
        </div>

        <div className="text-xs bg-paper-50/90 dark:bg-ink-900/70 p-3 rounded-lg border border-paper-200 dark:border-ink-800">
          <strong className="block mb-1">{isEn ? 'Summary:' : 'Nhận định chung:'}</strong>
          {ev.summary}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          {[
            { k: isEn ? 'Clarity' : 'Rõ ràng', v: ev.criteria.clarity },
            { k: isEn ? 'Verifiability' : 'Kiểm chứng', v: ev.criteria.verifiability },
            { k: isEn ? 'Timeline' : 'Thời hạn', v: ev.criteria.timeline_validity },
            { k: isEn ? 'Safety' : 'An toàn', v: ev.criteria.safety_compliance },
          ].map((c) => (
            <div
              key={c.k}
              className="p-2 rounded-lg bg-paper-50/70 dark:bg-ink-900/50 border border-paper-200 dark:border-ink-800 text-center"
            >
              <span className="text-[10px] text-ink-500 block">{c.k}</span>
              <span className="font-bold tabular-nums">{c.v}</span>
            </div>
          ))}
        </div>

        {ev.red_flags.length > 0 && (
          <div className="p-3 rounded-lg bg-rose-100/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{isEn ? 'Red Flags:' : 'Cảnh báo cần rà soát:'}</span>
            </div>
            <ul className="list-disc list-inside text-[11px] text-rose-800 dark:text-rose-200 space-y-0.5">
              {ev.red_flags.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}

        {ev.key_strengths.length > 0 && (
          <div className="p-3 rounded-lg bg-emerald-100/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{isEn ? 'Strengths:' : 'Điểm đạt chuẩn:'}</span>
            </div>
            <ul className="list-disc list-inside text-[11px] text-emerald-800 dark:text-emerald-200 space-y-0.5">
              {ev.key_strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Oracle Scan Card
  const scan = props.evaluation;
  const isYes = scan.suggested_verdict === 'YES';
  const isNo = scan.suggested_verdict === 'NO';

  const oracleBoxClass = isYes
    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-900'
    : isNo
      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900'
      : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900';

  const verdictBadge = isYes
    ? 'bg-emerald-600 text-white'
    : isNo
      ? 'bg-rose-600 text-white'
      : 'bg-amber-500 text-white';

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${oracleBoxClass}`}>
      <div className="flex items-start justify-between gap-3 border-b border-paper-200 dark:border-ink-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#146EBE]/10 text-[#146EBE] shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xs uppercase tracking-wider">
                {isEn ? 'AI Oracle Resolution Suggestion' : 'Gợi ý Chốt kèo từ AI Oracle'}
              </span>
              <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${verdictBadge}`}>
                {isEn ? `Suggest: ${scan.suggested_verdict}` : `Đề xuất: ${scan.suggested_verdict}`}
              </span>
            </div>
            <p className="text-[11px] text-ink-500 font-mono mt-0.5">
              {scan.model} • {new Date(scan.scanned_at).toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-xl font-black tabular-nums">{scan.confidence_score}%</div>
          <span className="text-[10px] text-ink-500 uppercase font-semibold">
            {isEn ? 'Confidence' : 'Độ tin cậy'}
          </span>
        </div>
      </div>

      {scan.live_data_snapshot && (
        <div className="text-[11px] font-mono bg-paper-100 dark:bg-ink-950/70 px-3 py-2 rounded-lg border border-paper-200 dark:border-ink-800 text-ink-700 dark:text-paper-200">
          <strong>{isEn ? 'Live API Snapshot:' : 'Số liệu Live API:'}</strong> {scan.live_data_snapshot}
        </div>
      )}

      <div className="text-xs bg-paper-50/90 dark:bg-ink-900/70 p-3 rounded-lg border border-paper-200 dark:border-ink-800 leading-relaxed">
        <strong className="block mb-1">{isEn ? 'Evidence Summary:' : 'Bằng chứng AI tổng hợp:'}</strong>
        {scan.evidence_summary}
      </div>

      {scan.source_urls.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="font-bold text-ink-500">{isEn ? 'Sources:' : 'Nguồn kiểm chứng:'}</span>
          {scan.source_urls.map((url, idx) => (
            <a
              key={idx}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-paper-50 dark:bg-ink-900 border border-paper-300 dark:border-ink-700 text-[#146EBE] hover:underline max-w-[260px] truncate"
            >
              <span className="truncate">{url}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          ))}
        </div>
      )}

      {scan.red_flags.length > 0 && (
        <div className="p-2.5 rounded-lg bg-rose-100/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-[11px] text-rose-800 dark:text-rose-200 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{isEn ? 'Oracle Warnings:' : 'Lưu ý trước khi chốt:'}</span>
          </div>
          <ul className="list-disc list-inside">
            {scan.red_flags.map((rf, i) => (
              <li key={i}>{rf}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
