import { getLanguage } from '../../core/i18n/i18nService.ts';
import { getUserAIConfig } from '../ai/userAIService.ts';
import type {
  AiMarketModerationEval,
  AiOracleResolutionEval,
  PredictionMarket,
} from './predictionMarketService.ts';

export interface LocalValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Tầng 1: Tiền kiểm cục bộ (giống submission-guard.ts của Research Vocabulary)
 * Ngăn dữ liệu rác trước khi gọi AI hoặc gửi lên hàng đợi duyệt.
 */
export function validateNewMarketLocally(params: {
  title: string;
  type: 'binary' | 'multi';
  outcomeLabels: string[];
  resolutionSourceUrl: string;
  endDate: string;
}): LocalValidationResult {
  const en = getLanguage() === 'en';
  const title = params.title.trim();
  if (title.length < 12) {
    return {
      isValid: false,
      error: en
        ? 'Market question must be at least 12 characters and unambiguous.'
        : 'Câu hỏi dự báo phải dài tối thiểu 12 ký tự và nêu rõ điều kiện phân xử.',
    };
  }

  if (params.type === 'multi') {
    const clean = params.outcomeLabels.map((s) => s.trim()).filter(Boolean);
    const unique = new Set(clean.map((s) => s.toLowerCase()));
    if (clean.length < 2) {
      return {
        isValid: false,
        error: en
          ? 'Multi-outcome markets require at least 2 distinct options.'
          : 'Kèo đa kịch bản cần ít nhất 2 lựa chọn khác nhau.',
      };
    }
    if (unique.size !== clean.length) {
      return {
        isValid: false,
        error: en ? 'Duplicate outcomes detected.' : 'Các kịch bản lựa chọn không được trùng lặp.',
      };
    }
  }

  const endMs = Date.parse(params.endDate);
  if (!Number.isFinite(endMs)) {
    return {
      isValid: false,
      error: en ? 'Invalid close date.' : 'Ngày chốt sổ không hợp lệ.',
    };
  }

  const url = params.resolutionSourceUrl.trim();
  if (url && !/^https?:\/\/.+/i.test(url)) {
    return {
      isValid: false,
      error: en
        ? 'Resolution source URL must start with http:// or https://.'
        : 'Đường dẫn nguồn đối chiếu phải bắt đầu bằng http:// hoặc https://.',
    };
  }

  return { isValid: true };
}

/**
 * Lấy snapshot dữ liệu thực tế từ Binance / CoinGecko / ExchangeRate API
 * để bơm vào context cho AI Oracle, tránh AI đoán mò.
 */
export async function fetchLiveOracleSnapshot(market: PredictionMarket): Promise<{
  summaryText: string;
  btcUsd?: number;
  ethUsd?: number;
  adaUsd?: number;
  usdVnd?: number;
}> {
  const parts: string[] = [];
  let btcUsd: number | undefined;
  let ethUsd: number | undefined;
  let adaUsd: number | undefined;
  let usdVnd: number | undefined;

  try {
    if (market.category === 'crypto' || /btc|bitcoin|eth|ada/i.test(market.titleEn + market.titleVi)) {
      const res = await fetch(
        'https://api.binance.com/api/v3/ticker/price?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22ADAUSDT%22%5D',
      );
      if (res.ok) {
        const rows = (await res.json()) as Array<{ symbol: string; price: string }>;
        for (const r of rows) {
          const p = Number(r.price);
          if (r.symbol === 'BTCUSDT') btcUsd = p;
          if (r.symbol === 'ETHUSDT') ethUsd = p;
          if (r.symbol === 'ADAUSDT') adaUsd = p;
        }
        if (btcUsd) parts.push(`Binance Spot Live: BTC=$${btcUsd.toLocaleString()}, ETH=$${ethUsd?.toLocaleString()}, ADA=$${adaUsd}`);
      }
    }
  } catch {
    // Graceful fallback
  }

  try {
    if (market.category === 'macro' || market.category === 'policy' || /usd|vnd|fx/i.test(market.titleEn)) {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (res.ok) {
        const data = (await res.json()) as { rates?: { VND?: number } };
        if (data.rates?.VND) {
          usdVnd = Math.round(data.rates.VND);
          parts.push(`Open ExchangeRate Live: 1 USD = ${usdVnd.toLocaleString()} VND`);
        }
      }
    }
  } catch {
    // Graceful fallback
  }

  if (parts.length === 0) {
    parts.push(`Reference Source Declared: ${market.resolutionSourceLabel} (${market.resolutionSourceUrl})`);
  }

  return {
    summaryText: parts.join(' | '),
    btcUsd,
    ethUsd,
    adaUsd,
    usdVnd,
  };
}

function generateHeuristicMarketModeration(market: PredictionMarket): AiMarketModerationEval {
  const en = getLanguage() === 'en';
  let score = 72;
  const redFlags: string[] = [];
  const strengths: string[] = [];

  const clarity = market.titleVi.trim().length >= 20 ? 85 : 65;
  if (clarity >= 80) {
    score += 6;
    strengths.push(en ? 'Clear, specific prediction question.' : 'Câu hỏi dự báo rõ ràng, cụ thể.');
  } else {
    redFlags.push(en ? 'Question is brief and could be ambiguous.' : 'Câu hỏi hơi ngắn, có thể gây hiểu nhầm tiêu chí chốt.');
  }

  const hasValidUrl = /^https?:\/\/.+/i.test(market.resolutionSourceUrl || '') && market.resolutionSourceUrl !== 'https://vneconomics.com/';
  const verifiability = hasValidUrl ? 88 : 55;
  if (hasValidUrl) {
    score += 10;
    strengths.push(
      en
        ? `Official resolution source declared (${market.resolutionSourceLabel}).`
        : `Đã khai báo nguồn đối chiếu cụ thể (${market.resolutionSourceLabel}).`,
    );
  } else {
    score -= 12;
    redFlags.push(
      en
        ? 'Missing external authoritative resolution source URL.'
        : 'Chưa khai báo URL nguồn đối chiếu chính thống bên ngoài (GSO, Fed, Binance, Verra...).',
    );
  }

  const endMs = Date.parse(market.endDate);
  const timelineValidity = Number.isFinite(endMs) && endMs > Date.now() ? 90 : 50;
  if (timelineValidity < 60) {
    score -= 15;
    redFlags.push(en ? 'Close date is in the past.' : 'Ngày chốt sổ đang nằm trong quá khứ.');
  } else {
    strengths.push(en ? `Valid future settlement date (${market.endDate}).` : `Thời hạn chốt sổ hợp lệ (${market.endDate}).`);
  }

  const bannedPattern = /(casino|gamble|violence|terror|illegal)/i;
  const safetyCompliance = bannedPattern.test(`${market.titleVi} ${market.titleEn}`) ? 30 : 95;
  if (safetyCompliance < 50) {
    score -= 35;
    redFlags.push(en ? 'Flagged unsafe or prohibited topic.' : 'Phát hiện từ khóa nhạy cảm/không phù hợp chính sách.');
  }

  score = Math.max(25, Math.min(96, score));
  const verdict: AiMarketModerationEval['verdict'] =
    score >= 80 && redFlags.length === 0 ? 'approve' : score < 60 || redFlags.length >= 2 ? 'reject' : 'needs_revision';

  return {
    verdict,
    score,
    summary:
      verdict === 'approve'
        ? en
          ? `Market "${market.titleEn}" passes clarity, source verifiability, and safety checks.`
          : `Kèo "${market.titleVi}" đạt chuẩn về độ rõ ràng, nguồn kiểm chứng và tính an toàn.`
        : en
          ? `Market needs stronger official source verification or clearer settlement criteria before publishing.`
          : `Kèo cần bổ sung nguồn đối chiếu chính thức hoặc làm rõ điều kiện chốt trước khi duyệt công khai.`,
    criteria: {
      clarity,
      verifiability,
      timeline_validity: timelineValidity,
      safety_compliance: safetyCompliance,
    },
    red_flags: redFlags,
    key_strengths: strengths,
    suggested_notes:
      verdict === 'approve'
        ? en
          ? 'Ready for Admin approval to Active board.'
          : 'Khuyến nghị Admin bấm Duyệt lên sàn chính.'
        : en
          ? 'Ask creator for an authoritative resolution URL before approving.'
          : 'Kiểm tra kỹ nguồn đối chiếu trước khi duyệt.',
    model: 'vne-heuristic-oracle-v1',
    evaluated_at: new Date().toISOString(),
  };
}

function generateHeuristicOracleScan(
  market: PredictionMarket,
  snapshot: Awaited<ReturnType<typeof fetchLiveOracleSnapshot>>,
): AiOracleResolutionEval {
  const en = getLanguage() === 'en';
  const now = Date.now();
  const endMs = Date.parse(market.endDate);
  const isPastDeadline = Number.isFinite(endMs) && now >= endMs;
  const redFlags: string[] = [];

  if (!isPastDeadline) {
    redFlags.push(
      en
        ? `Market close date (${market.endDate}) has not arrived yet.`
        : `Chưa tới ngày chốt sổ (${market.endDate}) — cẩn trọng khi chốt sớm.`,
    );
  }

  // Quantitative auto-check for BTC price market
  if (market.id === 'pm_btc_target_2027' && snapshot.btcUsd) {
    const btc = snapshot.btcUsd;
    if (btc >= 150000) {
      return {
        suggested_verdict: 'YES',
        suggested_outcome_id: 'btc_150k',
        confidence_score: 96,
        evidence_summary: `Binance Spot BTC = $${btc.toLocaleString()} (>= $150,000 threshold).`,
        live_data_snapshot: snapshot.summaryText,
        source_urls: ['https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', market.resolutionSourceUrl],
        red_flags: [],
        model: 'live-binance-oracle-v1',
        scanned_at: new Date().toISOString(),
      };
    }
    if (btc >= 120000) {
      return {
        suggested_verdict: 'YES',
        suggested_outcome_id: 'btc_120k',
        confidence_score: 95,
        evidence_summary: `Binance Spot BTC = $${btc.toLocaleString()} (>= $120,000 threshold).`,
        live_data_snapshot: snapshot.summaryText,
        source_urls: ['https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', market.resolutionSourceUrl],
        red_flags: [],
        model: 'live-binance-oracle-v1',
        scanned_at: new Date().toISOString(),
      };
    }
    return {
      suggested_verdict: 'UNCERTAIN',
      confidence_score: 52,
      evidence_summary: en
        ? `Live BTC spot is $${btc.toLocaleString()} — neither $120k nor $85k milestone triggered yet.`
        : `Giá BTC hiện tại là $${btc.toLocaleString()} — chưa chạm các ngưỡng phân xử.`,
      live_data_snapshot: snapshot.summaryText,
      source_urls: [market.resolutionSourceUrl],
      red_flags: redFlags,
      model: 'live-binance-oracle-v1',
      scanned_at: new Date().toISOString(),
    };
  }

  return {
    suggested_verdict: 'UNCERTAIN',
    suggested_outcome_id: market.outcomes[0]?.id,
    confidence_score: isPastDeadline ? 60 : 40,
    evidence_summary: en
      ? `No personal Gemini AI key configured for live web grounding. Live feed snapshot: ${snapshot.summaryText}. Please verify ${market.resolutionSourceLabel} manually or add a Gemini API Key in AI Lab.`
      : `Chưa có Gemini AI Key để quét web tự động. Dữ liệu API hiện tại: ${snapshot.summaryText}. Admin có thể kiểm tra trực tiếp ${market.resolutionSourceLabel} hoặc dán thêm bằng chứng bên dưới.`,
    live_data_snapshot: snapshot.summaryText,
    source_urls: [market.resolutionSourceUrl],
    red_flags: redFlags,
    model: 'heuristic-fallback-v1',
    scanned_at: new Date().toISOString(),
  };
}

/**
 * Gọi Gemini (hỗ trợ Google Search Grounding) hoặc OpenAI/OpenRouter để chấm JSON có cấu trúc.
 */
async function callStructuredAIJson<T>(params: {
  systemPrompt: string;
  userPrompt: string;
  enableGoogleSearch?: boolean;
}): Promise<{ data: T; model: string } | null> {
  const cfg = getUserAIConfig();
  const apiKey = cfg.apiKey.trim();
  if (!apiKey) return null;

  if (cfg.provider === 'gemini') {
    const models = [cfg.model, 'gemini-2.5-flash', 'gemini-2.0-flash'].filter(
      (m, i, arr) => Boolean(m) && arr.indexOf(m) === i,
    );
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const body: Record<string, unknown> = {
          systemInstruction: { parts: [{ text: params.systemPrompt }] },
          contents: [{ parts: [{ text: params.userPrompt }] }],
          generationConfig: {
            temperature: 0.15,
            responseMimeType: 'application/json',
          },
        };
        if (params.enableGoogleSearch) {
          body.tools = [{ google_search: {} }];
        }
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) continue;
        const json = await res.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) continue;
        const cleaned = String(text).replace(/```json|```/g, '').trim();
        return { data: JSON.parse(cleaned) as T, model };
      } catch {
        continue;
      }
    }
    return null;
  }

  try {
    const endpoint =
      cfg.provider === 'openrouter'
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
        temperature: 0.15,
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content;
    if (!text) return null;
    return { data: JSON.parse(String(text)) as T, model: cfg.model };
  } catch {
    return null;
  }
}

export async function runAiMarketModeration(market: PredictionMarket): Promise<AiMarketModerationEval> {
  const systemPrompt = `Bạn là Biên tập viên Kiểm duyệt Thị trường Dự báo (Prediction Market Moderator) cho VNEconomics.
Hãy chấm điểm đề xuất thị trường dự báo theo 4 tiêu chí (0-100):
1. clarity (Câu hỏi rõ ràng, không đa nghĩa)
2. verifiability (Có nguồn đối chiếu chính thống, kiểm chứng được)
3. timeline_validity (Ngày chốt sổ hợp lý ở tương lai)
4. safety_compliance (Tuân thủ an toàn nội dung, kinh tế học thuật)
Trả về JSON đúng schema:
{
  "verdict": "approve" | "needs_revision" | "reject",
  "score": number,
  "summary": string,
  "criteria": { "clarity": number, "verifiability": number, "timeline_validity": number, "safety_compliance": number },
  "red_flags": string[],
  "key_strengths": string[],
  "suggested_notes": string
}`;

  const userPrompt = `Thẩm định kèo dự báo mới:
- Tiêu đề VI: ${market.titleVi}
- Tiêu đề EN: ${market.titleEn}
- Loại kèo: ${market.type}
- Các lựa chọn: ${market.outcomes.map((o) => o.labelVi).join(' | ')}
- Quy tắc: ${market.rulesVi}
- Nguồn đối chiếu: ${market.resolutionSourceLabel} (${market.resolutionSourceUrl})
- Ngày chốt sổ: ${market.endDate}`;

  const aiRes = await callStructuredAIJson<Partial<AiMarketModerationEval>>({
    systemPrompt,
    userPrompt,
  });

  if (!aiRes) {
    return generateHeuristicMarketModeration(market);
  }

  const d = aiRes.data;
  return {
    verdict: d.verdict === 'approve' || d.verdict === 'reject' ? d.verdict : 'needs_revision',
    score: Number(d.score) || 75,
    summary: d.summary || 'Đã hoàn tất phân tích chất lượng kèo dự báo.',
    criteria: {
      clarity: Number(d.criteria?.clarity) || 75,
      verifiability: Number(d.criteria?.verifiability) || 75,
      timeline_validity: Number(d.criteria?.timeline_validity) || 80,
      safety_compliance: Number(d.criteria?.safety_compliance) || 90,
    },
    red_flags: Array.isArray(d.red_flags) ? d.red_flags : [],
    key_strengths: Array.isArray(d.key_strengths) ? d.key_strengths : [],
    suggested_notes: d.suggested_notes || 'Admin kiểm tra lại nguồn đối chiếu trước khi duyệt.',
    model: aiRes.model,
    evaluated_at: new Date().toISOString(),
  };
}

export async function runAiOracleResolutionScan(
  market: PredictionMarket,
  extraAdminEvidence?: string,
): Promise<AiOracleResolutionEval> {
  const snapshot = await fetchLiveOracleSnapshot(market);
  const todayIso = new Date().toISOString().slice(0, 10);

  const systemPrompt = `Bạn là AI Oracle chuyên quét dữ liệu thực tế để gợi ý chốt kết quả (Resolution) cho Thị trường Dự báo VNEconomics.
QUY TẮC BẮT BUỘC:
- Chỉ gợi ý "YES" hoặc "NO" nếu có số liệu/bằng chứng thực tế rõ ràng và phù hợp ngày chốt sổ (hôm nay: ${todayIso}).
- Nếu chưa đến hạn chốt hoặc chưa có thông báo chính thức từ nguồn đối chiếu, BẮT BUỘC trả về "UNCERTAIN" và nêu rõ trong red_flags.
- Trả về JSON đúng schema:
{
  "suggested_verdict": "YES" | "NO" | "UNCERTAIN",
  "suggested_outcome_id": string,
  "confidence_score": number,
  "evidence_summary": string,
  "source_urls": string[],
  "red_flags": string[]
}`;

  const userPrompt = `Kiểm tra dữ liệu thực tế cho kèo:
- Câu hỏi: ${market.titleVi} (${market.titleEn})
- Quy tắc phân xử: ${market.rulesVi}
- Nguồn chính thức: ${market.resolutionSourceLabel} (${market.resolutionSourceUrl})
- Ngày chốt sổ: ${market.endDate}
- Các kịch bản (outcome_id : tên): ${market.outcomes.map((o) => `${o.id}: ${o.labelVi}`).join(' | ')}
- Dữ liệu Live API vừa quét: ${snapshot.summaryText}
- Bằng chứng Admin cung cấp thêm: ${extraAdminEvidence?.trim() || 'Không có'}`;

  const aiRes = await callStructuredAIJson<Partial<AiOracleResolutionEval>>({
    systemPrompt,
    userPrompt,
    enableGoogleSearch: true,
  });

  if (!aiRes) {
    return generateHeuristicOracleScan(market, snapshot);
  }

  const d = aiRes.data;
  const verdict =
    d.suggested_verdict === 'YES' || d.suggested_verdict === 'NO' ? d.suggested_verdict : 'UNCERTAIN';

  return {
    suggested_verdict: verdict,
    suggested_outcome_id: d.suggested_outcome_id || market.outcomes[0]?.id,
    confidence_score: Math.max(0, Math.min(100, Number(d.confidence_score) || 55)),
    evidence_summary: d.evidence_summary || snapshot.summaryText,
    live_data_snapshot: snapshot.summaryText,
    source_urls: Array.isArray(d.source_urls) && d.source_urls.length > 0 ? d.source_urls : [market.resolutionSourceUrl],
    red_flags: Array.isArray(d.red_flags) ? d.red_flags : [],
    model: aiRes.model,
    scanned_at: new Date().toISOString(),
  };
}
