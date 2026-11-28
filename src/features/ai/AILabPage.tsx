import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Sparkles,
  Send,
  GraduationCap,
  Shield,
  BookOpen,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import {
  clearUserAIConfig,
  callUserAI,
  DEFAULT_MODELS,
  getUserAIConfig,
  saveUserAIConfig,
  testUserAIKey,
} from './userAIService.ts';
import { searchCatalogContext, type RagContextItem } from '../../core/data/catalogService.ts';
import { useTranslation } from '../../core/i18n/index.ts';
import { useSEO } from '../../core/seo/useSEO.ts';
import type { AIProvider, UserAIConfig } from '../../core/types/index.ts';

type LabTab = 'copilot' | 'thesis';

export const AILabPage: React.FC = () => {
  const { lang, isEn } = useTranslation();

  useSEO({
    title: isEn ? 'AI Lab & BYOK Research Assistant | VNEconomics' : 'AI Lab & Trợ lý Nghiên cứu BYOK | VNEconomics',
    description: isEn
      ? 'Connect your personal AI API Key (Gemini, OpenAI, OpenRouter) directly in the browser to query VNEconomics knowledge and review research drafts.'
      : 'Kết nối API Key cá nhân (Gemini, OpenAI, OpenRouter) ngay trên trình duyệt để hỏi đáp kho tri thức VNEconomics và nhận xét khóa luận.',
    canonicalPath: '/ai-lab/',
  });

  const [config, setConfig] = useState<UserAIConfig>(() => getUserAIConfig());
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const [activeTab, setActiveTab] = useState<LabTab>('copilot');
  const [question, setQuestion] = useState('');
  const [contexts, setContexts] = useState<RagContextItem[]>([]);
  const [answer, setAnswer] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState('');

  const [thesisMode, setThesisMode] = useState<'research' | 'applied'>('research');
  const [thesisDraft, setThesisDraft] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleProviderChange = (provider: AIProvider) => {
    const next = { ...config, provider, model: DEFAULT_MODELS[provider] };
    setConfig(next);
    setTestResult(null);
  };

  const handleSave = () => {
    saveUserAIConfig(config);
    setTestResult({
      ok: true,
      message: isEn
        ? `Configuration saved to ${config.storageMode === 'session' ? 'Session Storage (clears on tab close)' : 'local browser storage'}.`
        : `Đã lưu cấu hình vào ${config.storageMode === 'session' ? 'Session (tự xóa khi đóng tab)' : 'trình duyệt cục bộ'}.`,
    });
  };

  const handleTest = async () => {
    setTesting(true);
    saveUserAIConfig(config);
    const res = await testUserAIKey(config);
    setTestResult(res);
    setTesting(false);
  };

  const handleClear = () => {
    clearUserAIConfig();
    const reset: UserAIConfig = {
      provider: 'gemini',
      model: DEFAULT_MODELS.gemini,
      apiKey: '',
      storageMode: 'local',
    };
    setConfig(reset);
    setTestResult({
      ok: true,
      message: isEn ? 'API Key removed from browser.' : 'Đã xóa API Key khỏi trình duyệt.',
    });
  };

  const handleAskCopilot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoadingAi(true);
    setAiError('');
    setAnswer('');

    const matched = searchCatalogContext(question, 5, lang);
    setContexts(matched);

    if (!config.apiKey.trim()) {
      setLoadingAi(false);
      setAiError(
        isEn
          ? 'Showing matching VNEconomics articles below. Paste a free Gemini API Key on the left to let AI synthesize a full answer!'
          : 'Đã lọc sẵn các tài liệu khớp nhất ở bên dưới. Hãy dán 1 mã Gemini API Key miễn phí ở khung bên trái để AI tổng hợp câu trả lời chi tiết!',
      );
      return;
    }

    const contextBlock =
      matched.length > 0
        ? matched
            .map((m, i) => `[${i + 1}] (${m.kind}) ${m.title} — URL: ${m.url}\n${isEn ? 'Summary' : 'Tóm tắt'}: ${m.snippet}`)
            .join('\n\n')
        : isEn
          ? 'No exact match found in the index; answer rigorously using authoritative digital economics principles.'
          : 'Không tìm thấy bài trùng khớp trực tiếp trong chỉ mục; hãy trả lời theo kiến thức kinh tế số chuẩn xác.';

    try {
      const reply = await callUserAI({
        prompt: isEn
          ? `User Question: "${question}"\n\nRetrieved Context from VNEconomics Knowledge Base:\n${contextBlock}\n\nInstructions: Reply clearly in pure English using structured bullet points and cite relevant source titles from the context above.`
          : `Câu hỏi của người dùng: "${question}"\n\nNgữ cảnh trích xuất từ kho tri thức VNEconomics:\n${contextBlock}\n\nYêu cầu: Trả lời rõ ràng, có cấu trúc gạch đầu dòng và nhắc tên tài liệu liên quan từ ngữ cảnh trên.`,
      });
      setAnswer(reply);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : isEn ? 'AI request error' : 'Lỗi gọi AI');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleReviewThesis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thesisDraft.trim()) return;
    setLoadingAi(true);
    setAiError('');
    setAnswer('');

    const rubric = isEn
      ? thesisMode === 'research'
        ? 'You are an undergraduate Thesis Advisor reviewing an Empirical Research Thesis (university graduation level, constructive rather than overly punitive Q1 journal gatekeeping). Evaluate: (1) Clarity of research gap & questions, (2) Model logic & hypotheses, (3) Scales & empirical tests, (4) Academic tone. Classify issues by Major / Moderate / Minor severity and give specific rewrite suggestions.'
        : 'You are an Applied Business Thesis Examiner reviewing an Enterprise Case Report (Theoretical Framework - Current Situation - Proposed Solutions). Evaluate: (1) Link between theory and company evidence, (2) Data & metrics rigor, (3) Actionability of solutions (goals, resources, timeline), (4) Report style. Classify issues by severity and suggest concrete fixes.'
      : thesisMode === 'research'
        ? 'Bạn là Giảng viên hướng dẫn chấm Khóa luận tốt nghiệp hướng NGHIÊN CỨU ĐỊNH LƯỢNG (chuẩn đại học, không đòi hỏi quá khắt khe như tạp chí Q1). Đánh giá: (1) Tính rõ ràng của khoảng trống & câu hỏi nghiên cứu, (2) Logic mô hình & giả thuyết, (3) Thang đo & phương pháp kiểm định, (4) Văn phong học thuật. Phân loại vấn đề theo mức Nghiêm trọng / Trung bình / Nhẹ và gợi ý câu sửa cụ thể.'
        : 'Bạn là Giảng viên phản biện Khóa luận tốt nghiệp hướng ỨNG DỤNG (Cơ sở lý luận - Thực trạng tại doanh nghiệp - Giải pháp). Đánh giá: (1) Sự gắn kết giữa lý luận và thực trạng, (2) Số liệu minh chứng tại doanh nghiệp, (3) Tính khả thi của giải pháp (mục tiêu, nguồn lực, lộ trình), (4) Văn phong báo cáo. Chấm mức độ từng lỗi và đề xuất cách sửa cụ thể cho sinh viên.';

    try {
      const reply = await callUserAI({
        systemPrompt: rubric,
        prompt: isEn
          ? `Review this thesis excerpt / draft in English:\n\n${thesisDraft.slice(0, 12000)}`
          : `Hãy nhận xét đoạn/bản thảo khóa luận sau:\n\n${thesisDraft.slice(0, 12000)}`,
        maxTokens: 1600,
      });
      setAnswer(reply);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : isEn ? 'AI request error' : 'Lỗi gọi AI');
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-editorial-teal/10 text-editorial-teal dark:bg-emerald-500/15 dark:text-emerald-300">
          <Sparkles className="w-3.5 h-3.5" />
          {isEn ? 'Personal AI Assistant • Free & Private' : 'Trợ lý AI Cá nhân • Miễn phí & Bảo mật'}
        </span>
        <h1 className="font-serif text-3xl font-bold text-ink-950 dark:text-paper-50">
          {isEn ? 'VNEconomics AI Assistant & Thesis Reviewer' : 'Trợ lý AI Hỏi đáp & Nhận xét Khóa luận'}
        </h1>
        <p className="text-sm text-ink-600 dark:text-ink-400 max-w-3xl">
          {isEn
            ? 'Connect your own free Google Gemini (or OpenAI) key once — your key stays 100% inside your browser so your drafts and questions remain private.'
            : 'Chỉ cần dán mã khóa AI miễn phí từ Google Gemini (hoặc OpenAI) một lần. Mã khóa được giữ 100% trên trình duyệt của bạn, không gửi lên máy chủ để đảm bảo riêng tư tuyệt đối.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Simple 2-Step Key Setup */}
        <section className="lg:col-span-5 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-ink-950 dark:text-paper-50">
              <KeyRound className="w-4 h-4 text-editorial-teal" />
              {isEn ? 'Connect Your AI in 30s' : 'Kết nối Trợ lý AI trong 30 giây'}
            </div>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#146EBE] hover:underline"
            >
              <span>{isEn ? 'Get Free Key' : 'Lấy Key miễn phí'}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-700 dark:text-ink-400">
              {isEn ? '1. Choose AI Provider' : '1. Chọn nền tảng AI'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['gemini', 'openai', 'openrouter'] as AIProvider[]).map((pv) => (
                <button
                  key={pv}
                  type="button"
                  onClick={() => handleProviderChange(pv)}
                  className={`py-2 px-1.5 sm:px-2.5 rounded-lg text-[11px] sm:text-xs font-semibold border transition-colors truncate ${
                    config.provider === pv
                      ? 'border-editorial-teal bg-editorial-teal/10 text-editorial-teal dark:text-emerald-300'
                      : 'border-paper-300 dark:border-ink-700 text-ink-700 dark:text-ink-400'
                  }`}
                >
                  {pv === 'gemini' ? (isEn ? 'Gemini (Free)' : 'Gemini (Miễn phí)') : pv === 'openai' ? 'OpenAI' : 'OpenRouter'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="vne-ai-key" className="text-xs font-semibold text-ink-700 dark:text-ink-400">
              {isEn ? '2. Paste Your API Key' : '2. Dán mã API Key của bạn'}
            </label>
            <input
              id="vne-ai-key"
              type="password"
              placeholder={isEn ? 'Paste AIza... or sk-... here' : 'Dán mã AIza... hoặc sk-... vào đây'}
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 text-sm font-mono"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-500 hover:text-ink-900 dark:hover:text-paper-100"
          >
            <span>{isEn ? 'Advanced options (Model & Browser storage)' : 'Tùy chọn nâng cao (Chọn Model & Cách lưu)'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>

          {showAdvanced && (
            <div className="space-y-3 p-3 rounded-xl bg-paper-100/70 dark:bg-ink-950/60 border border-paper-200 dark:border-ink-800">
              <div className="space-y-1">
                <label htmlFor="vne-ai-model" className="text-xs font-semibold text-ink-700 dark:text-ink-400">
                  {isEn ? 'AI Model ID' : 'Phiên bản Model'}
                </label>
                <input
                  id="vne-ai-model"
                  type="text"
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-700 dark:text-ink-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-editorial-teal" />
                  {isEn ? 'Storage Mode' : 'Cách lưu trên máy'}
                </label>
                <select
                  value={config.storageMode}
                  onChange={(e) => setConfig({ ...config, storageMode: e.target.value as 'local' | 'session' })}
                  className="w-full px-3 py-1.5 rounded-lg border border-paper-300 dark:border-ink-700 bg-paper-50 dark:bg-ink-950 text-xs"
                >
                  <option value="local">
                    {isEn ? 'Remember on my device (localStorage)' : 'Ghi nhớ trên máy cá nhân (localStorage)'}
                  </option>
                  <option value="session">
                    {isEn ? 'Forget when closing tab (public PC)' : 'Tự xóa khi đóng tab (dùng máy công cộng)'}
                  </option>
                </select>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-[#146EBE] hover:bg-[#0f5ba0] text-white text-xs font-semibold transition-colors"
            >
              {isEn ? 'Save Key' : 'Lưu Key'}
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="px-4 py-2 rounded-lg border border-paper-300 dark:border-ink-700 text-xs font-semibold hover:border-editorial-teal disabled:opacity-50"
            >
              {testing ? (isEn ? 'Testing...' : 'Đang kiểm tra...') : isEn ? 'Test Connection' : 'Kiểm tra kết nối'}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-2 rounded-lg border border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs font-semibold inline-flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isEn ? 'Clear Key' : 'Xóa Key'}
            </button>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                testResult.ok
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
              }`}
            >
              {testResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-paper-100 dark:bg-ink-950/70 border border-paper-300 dark:border-ink-800 text-xs space-y-1.5 text-ink-600 dark:text-ink-400">
            <div className="font-semibold text-ink-900 dark:text-paper-100">
              {isEn ? '3 steps to get a free Gemini API Key:' : '3 bước lấy Gemini API Key miễn phí:'}
            </div>
            <p>
              {isEn
                ? '1. Visit Google AI Studio (aistudio.google.com) and sign in with Gmail.'
                : '1. Truy cập Google AI Studio (aistudio.google.com) và đăng nhập Gmail.'}
            </p>
            <p>
              {isEn ? (
                <>2. Select <strong>Get API key → Create API key</strong>.</>
              ) : (
                <>2. Chọn mục <strong>Get API key → Create API key</strong>.</>
              )}
            </p>
            <p>
              {isEn ? (
                <>3. Paste the key above and click <strong>Test Connection</strong>.</>
              ) : (
                <>3. Dán khóa vào ô trên và bấm <strong>Kiểm tra kết nối</strong>.</>
              )}
            </p>
          </div>
        </section>

        {/* Right: Copilot + Thesis Assistant */}
        <section className="lg:col-span-7 rounded-2xl border border-paper-300 dark:border-ink-800 bg-paper-50 dark:bg-ink-900 p-6 space-y-5">
          <div className="flex gap-2 border-b border-paper-200 dark:border-ink-800 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('copilot')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold ${
                activeTab === 'copilot'
                  ? 'bg-[#146EBE] text-white'
                  : 'text-ink-600 dark:text-ink-400 hover:bg-paper-200 dark:hover:bg-ink-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              VNE AI Research Copilot (Mini-RAG)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('thesis')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold ${
                activeTab === 'thesis'
                  ? 'bg-[#146EBE] text-white'
                  : 'text-ink-600 dark:text-ink-400 hover:bg-paper-200 dark:hover:bg-ink-800'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              {isEn ? 'Thesis Review Assistant (AI Skills)' : 'Trợ lý Nhận xét Khóa luận (AI Skills)'}
            </button>
          </div>

          {activeTab === 'copilot' ? (
            <form onSubmit={handleAskCopilot} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-700 dark:text-ink-400">
                  {isEn
                    ? 'Ask anything across 216 articles, 59 books, 10 courses & 219 lexicon terms'
                    : 'Hỏi bất kỳ điều gì trên kho 216 bài viết, 59 sách, 10 khóa học & 219 thuật ngữ'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={
                      isEn
                        ? 'Example: What is a Cardano dRep? Or which AI Marketing books should I read?'
                        : 'Ví dụ: dRep trên Cardano là gì? Hoặc tài liệu AI Marketing nào nên đọc?'
                    }
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={loadingAi}
                    className="px-4 py-2.5 rounded-xl bg-editorial-teal text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {loadingAi ? (isEn ? 'Thinking...' : 'Đang xử lý...') : isEn ? 'Ask AI' : 'Hỏi AI'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(isEn
                    ? ['What is Cardano dRep?', 'Digital Economy pillars', 'How to start DeFi safely?']
                    : ['dRep trên Cardano là gì?', 'Các trụ cột Kinh tế số', 'Tài liệu AI Marketing hay']
                  ).map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => setQuestion(sample)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-paper-100 dark:bg-ink-800 hover:border-[#146EBE] border border-paper-300 dark:border-ink-700 text-ink-600 dark:text-ink-300 transition-colors"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>

              {contexts.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-ink-500 dark:text-ink-400">
                    {isEn
                      ? `Extracted Context from VNEconomics (${contexts.length} top matches):`
                      : `Ngữ cảnh trích xuất từ VNEconomics (${contexts.length} nguồn khớp nhất):`}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {contexts.map((ctx) => (
                      <Link
                        key={ctx.url}
                        to={ctx.url}
                        className="p-2.5 rounded-lg border border-paper-300 dark:border-ink-800 bg-paper-100 dark:bg-ink-950/60 hover:border-editorial-teal text-xs"
                      >
                        <div className="font-semibold text-ink-900 dark:text-paper-100 line-clamp-1">{ctx.title}</div>
                        <div className="text-[11px] text-editorial-teal font-mono mt-0.5">{ctx.url}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={handleReviewThesis} className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setThesisMode('research')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                    thesisMode === 'research'
                      ? 'border-editorial-teal bg-editorial-teal/10 text-editorial-teal'
                      : 'border-paper-300 dark:border-ink-700'
                  }`}
                >
                  {isEn ? 'Research-Oriented Thesis' : 'Khóa luận Hướng Nghiên cứu'}
                </button>
                <button
                  type="button"
                  onClick={() => setThesisMode('applied')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                    thesisMode === 'applied'
                      ? 'border-editorial-teal bg-editorial-teal/10 text-editorial-teal'
                      : 'border-paper-300 dark:border-ink-700'
                  }`}
                >
                  {isEn ? 'Applied Enterprise Thesis' : 'Khóa luận Hướng Ứng dụng (Doanh nghiệp)'}
                </button>
              </div>
              <textarea
                rows={6}
                value={thesisDraft}
                onChange={(e) => setThesisDraft(e.target.value)}
                placeholder={
                  isEn
                    ? 'Paste your proposal abstract, research questions, hypotheses model, or enterprise case solutions here...'
                    : 'Dán tóm tắt đề cương, câu hỏi nghiên cứu, mô hình giả thuyết hoặc phần thực trạng/giải pháp khóa luận vào đây...'
                }
                className="w-full p-3 rounded-xl border border-paper-300 dark:border-ink-700 bg-paper-100 dark:bg-ink-950 text-sm"
              />
              <button
                type="submit"
                disabled={loadingAi}
                className="px-4 py-2.5 rounded-xl bg-editorial-teal text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loadingAi
                  ? isEn
                    ? 'Reviewing...'
                    : 'Đang phản biện...'
                  : isEn
                    ? 'Review Draft with Your AI Key'
                    : 'Nhận xét bản thảo bằng AI Key của bạn'}
              </button>
            </form>
          )}

          {aiError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
              {aiError}
            </div>
          )}

          {answer && (
            <div className="p-5 rounded-xl border border-paper-300 dark:border-ink-800 bg-paper-100 dark:bg-ink-950/70 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-editorial-teal">
                {isEn ? 'AI Analysis Output' : 'Kết quả phân tích AI'}
              </div>
              <div className="text-sm text-ink-800 dark:text-paper-200 whitespace-pre-wrap leading-relaxed">{answer}</div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
