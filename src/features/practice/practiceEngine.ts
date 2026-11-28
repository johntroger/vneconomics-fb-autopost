import type { SupportedLanguage } from '../../core/i18n/i18nService.ts';
import type { GlossaryDomain } from '../glossary/glossaryEnrichment.ts';

const KEY_SRS = 'vne_srs_progress_v1';
const KEY_MISTAKES = 'vne_mistake_vault_v1';
const KEY_HISTORY = 'vne_practice_history_v1';
const KEY_QUESTS = 'vne_daily_quests_v1';

export type DiagnosticTag =
  | 'nham-lan-khai-niem'
  | 'bay-ky-thuat'
  | 'ngu-canh-vi-mo'
  | 'ao-giac-ai';

export interface PracticeQuestion {
  id: string;
  domain: GlossaryDomain;
  domainLabel: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  diagnosticTag: DiagnosticTag;
  relatedSlug?: string;
}

export interface SrsRecord {
  slug: string;
  repetition: number;
  intervalDays: number;
  easeFactor: number;
  lastReviewedAt: string;
  nextReviewDate: string;
}

export interface MistakeEntry {
  id: string;
  question: PracticeQuestion;
  selectedOption: number;
  mistakeCount: number;
  resolved: boolean;
  lastMissedAt: string;
}

export interface PracticeSessionLog {
  id: string;
  domain: 'all' | GlossaryDomain;
  score: number;
  total: number;
  pointsEarned: number;
  completedAt: string;
}

export interface DailyQuestItem {
  id: 'arena_sprint' | 'srs_review' | 'revenge_mistake';
  title: string;
  desc: string;
  target: number;
  current: number;
  rewardVne: number;
  completed: boolean;
  claimed: boolean;
}

export interface DailyQuestState {
  date: string;
  quests: DailyQuestItem[];
}

export const PRACTICE_QUESTIONS: PracticeQuestion[] = [
  {
    id: 'ec_platform_1',
    domain: 'kinh-te-so',
    domainLabel: 'Kinh tế số',
    prompt: 'Điểm khác biệt cốt lõi của Kinh tế nền tảng (Platform Economy) so với mô hình kinh doanh tuyến tính truyền thống là gì?',
    options: [
      'Sở hữu toàn bộ nhà máy và hàng tồn kho từ đầu đến cuối',
      'Tạo hạ tầng trung gian kết nối các phía thị trường và khai thác hiệu ứng mạng lưới',
      'Loại bỏ hoàn toàn chi phí nghiên cứu và phát triển (R&D)',
      'Chỉ bán hàng trên mạng xã hội thay vì cửa hàng vật lý',
    ],
    correctIndex: 1,
    explanation:
      'Kinh tế nền tảng điều phối hệ sinh thái (Two-Sided Market) và tạo giá trị từ tương tác giữa các nhóm người dùng thay vì chỉ dựa vào sở hữu tài sản vật lý.',
    diagnosticTag: 'nham-lan-khai-niem',
    relatedSlug: 'platform-economy',
  },
  {
    id: 'ec_network_2',
    domain: 'kinh-te-so',
    domainLabel: 'Kinh tế số',
    prompt: 'Trong thị trường hai phía (Two-Sided Market), vì sao nền tảng thường miễn phí hoặc trợ giá cho một phía (Subsidy Side)?',
    options: [
      'Vì quy định bắt buộc của luật cạnh tranh',
      'Để tăng nhanh số lượng phía nhạy cảm giá, từ đó tạo Cross-side Network Effects hút phía trả tiền',
      'Vì chi phí cố định ban đầu bằng 0',
      'Để giảm thuế thu nhập doanh nghiệp',
    ],
    correctIndex: 1,
    explanation:
      'Rochet & Tirole (2003) chỉ ra cấu trúc giá bất đối xứng giúp giải quyết bài toán con gà – quả trứng bằng cách thu hút phía tạo thanh khoản trước.',
    diagnosticTag: 'ngu-canh-vi-mo',
    relatedSlug: 'two-sided-market',
  },
  {
    id: 'ec_zmc_3',
    domain: 'kinh-te-so',
    domainLabel: 'Kinh tế số',
    prompt: 'Phát biểu nào đúng nhất về "Chi phí cận biên bằng không" (Zero Marginal Cost) của hàng hóa số?',
    options: [
      'Chi phí tạo ra bản gốc đầu tiên bằng 0 đồng',
      'Chi phí nhân bản và phân phối thêm 1 đơn vị sản phẩm số gần như bằng 0 sau khi đã có bản gốc',
      'Doanh nghiệp phần mềm không cần chi phí vận hành máy chủ',
      'Giá bán sản phẩm số luôn phải là 0 đồng',
    ],
    correctIndex: 1,
    explanation:
      'Chi phí R&D (Fixed/Sunk Cost) ban đầu có thể rất lớn, nhưng chi phí tái sản xuất thêm 1 bản sao (ebook, phần mềm, video) gần như bằng 0.',
    diagnosticTag: 'nham-lan-khai-niem',
    relatedSlug: 'zero-marginal-cost',
  },
  {
    id: 'ec_cbdc_4',
    domain: 'kinh-te-so',
    domainLabel: 'Kinh tế số',
    prompt: 'CBDC (Central Bank Digital Currency) khác với Bitcoin ở điểm căn bản nào?',
    options: [
      'CBDC là nghĩa vụ nợ trực tiếp của Ngân hàng Trung ương và mang tính tập trung',
      'CBDC không thể dùng để thanh toán bán lẻ',
      'Bitcoin do Ngân hàng Thế giới phát hành',
      'CBDC luôn có nguồn cung cố định 21 triệu đơn vị',
    ],
    correctIndex: 0,
    explanation:
      'CBDC là tiền pháp định kỹ thuật số do NHTW phát hành và bảo lãnh, chịu sự điều hành chính sách tiền tệ quốc gia.',
    diagnosticTag: 'ngu-canh-vi-mo',
    relatedSlug: 'cbdc-central-bank-digital-currency',
  },
  {
    id: 'ec_rwa_5',
    domain: 'kinh-te-so',
    domainLabel: 'Kinh tế số',
    prompt: 'Điều kiện tiên quyết để một token RWA (Real-World Assets) có giá trị pháp lý và kinh tế bền vững là gì?',
    options: [
      'Chỉ cần phát hành tên token giống tên tài sản thật',
      'Phải gắn cơ chế lưu ký tài sản ngoài chuỗi, khung pháp lý chuyển nhượng và Oracle xác minh dự trữ',
      'Phải niêm yết trên ít nhất 10 sàn meme coin',
      'Không cần kiểm toán tài sản đảm bảo',
    ],
    correctIndex: 1,
    explanation:
      'RWA đòi hỏi liên kết chặt giữa pháp lý ngoài chuỗi (SPV/Custodian) và xác minh dự trữ (Proof of Reserve) trên chuỗi.',
    diagnosticTag: 'bay-ky-thuat',
    relatedSlug: 'rwa-real-world-assets',
  },
  {
    id: 'bc_eutxo_1',
    domain: 'blockchain',
    domainLabel: 'Blockchain & Web3',
    prompt: 'Ưu thế nổi bật của mô hình eUTxO (Cardano) so với mô hình Account-based (Ethereum) là gì?',
    options: [
      'Không hỗ trợ hợp đồng thông minh',
      'Cho phép kiểm tra tính hợp lệ và phí giao dịch cục bộ (deterministic) trước khi gửi lên chuỗi',
      'Bắt buộc mọi giao dịch phải qua một máy chủ tập trung',
      'Chỉ lưu trữ được tối đa 1 loại token',
    ],
    correctIndex: 1,
    explanation:
      'Nhờ trạng thái cục bộ gắn trong từng UTxO (Datum + Validator), giao dịch eUTxO có kết quả tất định và ít rủi ro mất phí vì giao dịch thất bại trên chuỗi.',
    diagnosticTag: 'bay-ky-thuat',
    relatedSlug: 'eutxo-extended-utxo',
  },
  {
    id: 'bc_zkp_2',
    domain: 'blockchain',
    domainLabel: 'Blockchain & Web3',
    prompt: 'Zero-Knowledge Proof (ZKP) cho phép làm điều gì trong xác thực số?',
    options: [
      'Công khai toàn bộ mật khẩu người dùng lên sổ cái',
      'Chứng minh một mệnh đề là đúng mà không cần tiết lộ dữ liệu bí mật đằng sau nó',
      'Xóa bỏ hoàn toàn chữ ký số',
      'Tăng gấp đôi kích thước mỗi khối dữ liệu',
    ],
    correctIndex: 1,
    explanation:
      'ZKP đảm bảo 3 tính chất Completeness, Soundness và Zero-Knowledge, ứng dụng mạnh cho ZK-Rollups và định danh số bảo vệ quyền riêng tư.',
    diagnosticTag: 'bay-ky-thuat',
    relatedSlug: 'zero-knowledge-proof',
  },
  {
    id: 'bc_sc_3',
    domain: 'blockchain',
    domainLabel: 'Blockchain & Web3',
    prompt: 'Vì sao việc kiểm thử Hợp đồng thông minh (Smart Contract) trên Testnet trước khi đưa lên Mainnet lại cực kỳ quan trọng?',
    options: [
      'Vì code Smart Contract sau khi triển khai thường bất biến và lỗi bảo mật có thể gây thất thoát không thể hoàn tác',
      'Vì Testnet chạy chậm hơn Mainnet 100 lần',
      'Vì Mainnet không hỗ trợ ngôn ngữ Solidity',
      'Để tăng giá token đầu cơ',
    ],
    correctIndex: 0,
    explanation:
      'Smart Contract có tính bất biến sau khi deploy; các lỗi Reentrancy hay phân quyền trên Mainnet có thể làm mất tài sản vĩnh viễn.',
    diagnosticTag: 'bay-ky-thuat',
    relatedSlug: 'smart-contract',
  },
  {
    id: 'bc_ada_4',
    domain: 'blockchain',
    domainLabel: 'Blockchain & Web3',
    prompt: 'Chuẩn ví trình duyệt phổ biến trên hệ sinh thái Cardano (như Eternl, Lace, Vespr) tuân theo tiêu chuẩn nào?',
    options: ['ERC-20', 'CIP-30', 'HTTP-404', 'BIP-39-EVM'],
    correctIndex: 1,
    explanation:
      'CIP-30 (Cardano dApp-Wallet Web Bridge) chuẩn hóa cách ứng dụng web kết nối ví Cardano an toàn để ký giao dịch hoặc chứng thực.',
    diagnosticTag: 'bay-ky-thuat',
    relatedSlug: 'eutxo-extended-utxo',
  },
  {
    id: 'ai_rag_1',
    domain: 'ai',
    domainLabel: 'Trí tuệ nhân tạo (AI)',
    prompt: 'Mục tiêu chính của kỹ thuật RAG (Retrieval-Augmented Generation) là gì?',
    options: [
      'Huấn luyện lại toàn bộ trọng số LLM từ đầu mỗi ngày',
      'Truy xuất tài liệu liên quan từ kho tri thức ngoài và đưa vào ngữ cảnh để LLM trả lời chính xác, giảm ảo giác',
      'Thay thế hoàn toàn GPU bằng CPU',
      'Nén mô hình AI xuống còn 1MB',
    ],
    correctIndex: 1,
    explanation:
      'RAG giúp LLM tiếp cận dữ liệu mới nhất hoặc tài liệu nội bộ và trích dẫn nguồn chuẩn xác mà không cần huấn luyện lại toàn bộ mô hình.',
    diagnosticTag: 'ao-giac-ai',
    relatedSlug: 'rag-retrieval-augmented-generation',
  },
  {
    id: 'ai_hallucination_2',
    domain: 'ai',
    domainLabel: 'Trí tuệ nhân tạo (AI)',
    prompt: 'Khi dùng AI hỗ trợ viết tổng quan tài liệu (Literature Review), đâu là rủi ro "AI Hallucination" nguy hiểm nhất?',
    options: [
      'AI trả lời quá ngắn gọn',
      'AI bịa đặt tên bài báo, tác giả hoặc mã DOI không tồn tại với giọng điệu rất thuyết phục',
      'AI dùng phông chữ Times New Roman',
      'AI dịch sát nghĩa tiếng Anh',
    ],
    correctIndex: 1,
    explanation:
      'LLM dự đoán token theo xác suất nên có thể ghép tên tác giả, năm và tên tạp chí thành một trích dẫn giả. Luôn phải kiểm chứng DOI gốc.',
    diagnosticTag: 'ao-giac-ai',
    relatedSlug: 'hallucination-ai',
  },
  {
    id: 'ai_mcp_3',
    domain: 'ai',
    domainLabel: 'Trí tuệ nhân tạo (AI)',
    prompt: 'MCP (Model Context Protocol) đóng vai trò gì trong kiến trúc AI Agent?',
    options: [
      'Một thuật toán nén ảnh JPEG',
      'Giao thức chuẩn mở giúp AI Agent kết nối đồng nhất với nguồn dữ liệu, API và công cụ bên ngoài',
      'Một loại tiền mã hóa trên Ethereum',
      'Phần mềm diệt virus truyền thống',
    ],
    correctIndex: 1,
    explanation:
      'MCP hoạt động như chuẩn "USB-C cho AI", giúp chuẩn hóa cách Agent Host gọi Tools, Resources và Prompts từ các MCP Server.',
    diagnosticTag: 'bay-ky-thuat',
    relatedSlug: 'mcp-model-context-protocol',
  },
  {
    id: 'ai_geo_4',
    domain: 'ai',
    domainLabel: 'Trí tuệ nhân tạo (AI)',
    prompt: 'Khác với SEO truyền thống, GEO (Generative Engine Optimization) tập trung tối ưu điều gì?',
    options: [
      'Nhồi nhét thật nhiều từ khóa ẩn ở chân trang',
      'Cấu trúc hóa định nghĩa rõ ràng, số liệu có nguồn, Schema JSON-LD & llms.txt để được AI Search trích dẫn',
      'Chỉ tối ưu tốc độ tải ảnh PNG',
      'Mua backlink hàng loạt từ diễn đàn',
    ],
    correctIndex: 1,
    explanation:
      'Nghiên cứu KDD 2024 về GEO cho thấy trích dẫn nguồn uy tín, thống kê định lượng và cấu trúc súc tích giúp tăng tỷ lệ được AI Overview/Perplexity trích dẫn.',
    diagnosticTag: 'nham-lan-khai-niem',
    relatedSlug: 'geo-generative-engine-optimization',
  },
];

const PRACTICE_QUESTIONS_EN: Record<string, Partial<PracticeQuestion>> = {
  ec_platform_1: {
    domainLabel: 'Digital Economy',
    prompt: 'What is the core difference between the Platform Economy and traditional linear business models?',
    options: [
      'Owning all factories and physical inventory from end to end',
      'Building multi-sided intermediary infrastructure that unlocks network effects',
      'Eliminating research and development (R&D) expenses completely',
      'Selling goods exclusively via social media posts',
    ],
    explanation:
      'A platform economy orchestrates multi-sided interactions and creates value through network effects rather than linear physical asset ownership.',
  },
  ec_network_2: {
    domainLabel: 'Digital Economy',
    prompt: 'In a Two-Sided Market, why do platforms often subsidize or offer free access to one side?',
    options: [
      'Because antitrust law strictly bans charging consumers',
      'To rapidly grow the price-sensitive side and attract the money side via cross-side network effects',
      'Because initial software R&D fixed costs are zero',
      'To reduce corporate income tax rates',
    ],
    explanation:
      'Rochet & Tirole (2003) showed asymmetric pricing solves the chicken-and-egg problem by onboarding liquidity-creating participants first.',
  },
  ec_zmc_3: {
    domainLabel: 'Digital Economy',
    prompt: 'Which statement best describes "Zero Marginal Cost" in digital goods?',
    options: [
      'The cost of producing the very first master copy is $0',
      'The cost of replicating and distributing one additional digital unit approaches $0 after fixed R&D',
      'Software firms pay nothing for cloud servers',
      'Digital products must always be priced at $0',
    ],
    explanation:
      'Fixed/sunk R&D costs can be substantial, while replicating one extra digital unit (ebook, video, software license) approaches zero cost.',
  },
  ec_cbdc_4: {
    domainLabel: 'Digital Economy',
    prompt: 'How does a CBDC (Central Bank Digital Currency) fundamentally differ from Bitcoin?',
    options: [
      'A CBDC is a centralized sovereign liability issued and backed by a central bank',
      'A CBDC cannot be used in retail payments',
      'Bitcoin is issued by the World Bank',
      'A CBDC always has a fixed 21 million supply cap',
    ],
    explanation:
      'A CBDC represents digital fiat sovereign currency governed by central bank monetary policy.',
  },
  ec_rwa_5: {
    domainLabel: 'Digital Economy',
    prompt: 'What is essential for a tokenized Real-World Asset (RWA) to retain durable legal and economic value?',
    options: [
      'Only naming the token after a physical asset',
      'Off-chain custody legal structure, transfer enforceability, and on-chain Proof of Reserve oracles',
      'Listing on at least 10 meme coin exchanges',
      'Avoiding all third-party reserve audits',
    ],
    explanation:
      'Credible RWAs require enforceable off-chain legal custody paired with verifiable on-chain reserve attestation.',
  },
  bc_eutxo_1: {
    domainLabel: 'Blockchain & Web3',
    prompt: 'What is a key advantage of Cardano’s eUTxO model compared to Ethereum’s Account-based model?',
    options: [
      'It removes support for smart contracts',
      'Deterministic local validation and predictable fees before transaction submission',
      'It routes every transaction through one centralized server',
      'It supports at most one native asset type',
    ],
    explanation:
      'Because state is localized inside discrete UTxOs (Datum + Validator), validation outcome and fees can be verified locally before broadcast.',
  },
  bc_zkp_2: {
    domainLabel: 'Blockchain & Web3',
    prompt: 'What does a Zero-Knowledge Proof (ZKP) allow in digital verification?',
    options: [
      'Publishing all user passwords on a public ledger',
      'Proving a statement is valid without revealing the secret underlying data',
      'Eliminating digital signatures altogether',
      'Doubling block payload sizes intentionally',
    ],
    explanation:
      'ZKPs satisfy completeness, soundness, and zero-knowledge—powering ZK-Rollups and privacy-preserving decentralized identity.',
  },
  bc_sc_3: {
    domainLabel: 'Blockchain & Web3',
    prompt: 'Why is testing smart contracts on a Testnet mandatory before Mainnet deployment?',
    options: [
      'Deployed smart contract code is typically immutable and security bugs can cause irreversible loss',
      'Testnets run 100x slower than Mainnet',
      'Mainnet does not support Solidity',
      'To artificially inflate speculative token prices',
    ],
    explanation:
      'Because deployed bytecode is immutable, vulnerabilities such as reentrancy or broken access controls can lead to permanent loss on Mainnet.',
  },
  bc_ada_4: {
    domainLabel: 'Blockchain & Web3',
    prompt: 'Which web dApp-wallet bridge standard do Cardano browser wallets (Eternl, Lace, Vespr) implement?',
    options: ['ERC-20', 'CIP-30', 'HTTP-404', 'BIP-39-EVM'],
    explanation:
      'CIP-30 defines the standard browser API enabling Web3 dApps to request addresses and signatures safely from Cardano wallets.',
  },
  ai_rag_1: {
    domainLabel: 'Artificial Intelligence (AI)',
    prompt: 'What is the primary goal of Retrieval-Augmented Generation (RAG)?',
    options: [
      'Retraining all LLM weights from scratch daily',
      'Retrieving relevant external documents into context so LLMs generate grounded answers with fewer hallucinations',
      'Replacing GPUs with CPUs everywhere',
      'Compressing neural networks down to 1MB',
    ],
    explanation:
      'RAG injects verified external chunks into the prompt so models answer with up-to-date, traceable sources without full retraining.',
  },
  ai_hallucination_2: {
    domainLabel: 'Artificial Intelligence (AI)',
    prompt: 'When using AI for an academic Literature Review, what is the most dangerous "AI Hallucination" risk?',
    options: [
      'Answers that are slightly brief',
      'Fabricating non-existent papers, authors, or DOIs in confident academic prose',
      'Using Times New Roman typography',
      'Translating idioms too literally',
    ],
    explanation:
      'Probabilistic next-token generation can assemble plausible-looking yet completely fake citations; always verify raw DOIs via Crossref.',
  },
  ai_mcp_3: {
    domainLabel: 'Artificial Intelligence (AI)',
    prompt: 'What role does MCP (Model Context Protocol) play in AI Agent architecture?',
    options: [
      'A legacy JPEG image compression algorithm',
      'An open standard connecting AI agents uniformly to external data sources, APIs, and tools',
      'A speculative ERC-20 token on Ethereum',
      'A desktop antivirus scanner',
    ],
    explanation:
      'MCP acts as a universal "USB-C for AI", standardizing how hosts discover and invoke external Tools, Resources, and Prompts.',
  },
  ai_geo_4: {
    domainLabel: 'Artificial Intelligence (AI)',
    prompt: 'Unlike classic SEO, what does GEO (Generative Engine Optimization) primarily optimize for?',
    options: [
      'Stuffing hidden keywords in the footer',
      'Structuring clear definitions, cited statistics, JSON-LD Schema & llms.txt to earn citations in AI Search',
      'Compressing PNG thumbnails only',
      'Buying bulk forum backlinks',
    ],
    explanation:
      'Aggarwal et al. (KDD 2024) demonstrated that authoritative citations, verifiable statistics, and structured clarity boost AI Search citation share.',
  },
};

export function getLocalizedPracticeQuestions(lang: SupportedLanguage): PracticeQuestion[] {
  if (lang === 'vi') return PRACTICE_QUESTIONS;
  return PRACTICE_QUESTIONS.map((q) => ({
    ...q,
    ...(PRACTICE_QUESTIONS_EN[q.id] || {}),
  }));
}

export const DIAGNOSTIC_TAG_LABELS: Record<DiagnosticTag, string> = {
  'nham-lan-khai-niem': 'Nhầm lẫn khái niệm',
  'bay-ky-thuat': 'Bẫy kỹ thuật / Kiến trúc',
  'ngu-canh-vi-mo': 'Ngữ cảnh Kinh tế vĩ mô',
  'ao-giac-ai': 'Bẫy Ảo giác & Kiểm chứng AI',
};

export const DIAGNOSTIC_TAG_LABELS_EN: Record<DiagnosticTag, string> = {
  'nham-lan-khai-niem': 'Conceptual Confusion',
  'bay-ky-thuat': 'Technical / Architecture Trap',
  'ngu-canh-vi-mo': 'Macroeconomic Context',
  'ao-giac-ai': 'AI Hallucination & Verification',
};

export function getDiagnosticTagLabel(tag: DiagnosticTag, lang: SupportedLanguage): string {
  return lang === 'en' ? DIAGNOSTIC_TAG_LABELS_EN[tag] : DIAGNOSTIC_TAG_LABELS[tag];
}

// === SM-2 SPACED REPETITION ===
export function getSrsMap(): Record<string, SrsRecord> {
  try {
    const raw = localStorage.getItem(KEY_SRS);
    return raw ? (JSON.parse(raw) as Record<string, SrsRecord>) : {};
  } catch {
    return {};
  }
}

export function previewSrsInterval(
  record: SrsRecord | undefined,
  grade: 1 | 3 | 4 | 5,
  lang: SupportedLanguage = 'vi',
): string {
  const rep = record?.repetition ?? 0;
  const interval = record?.intervalDays ?? 0;
  const ef = record?.easeFactor ?? 2.5;
  let days = 1;
  if (grade < 3) days = 1;
  else if (rep === 0) days = 1;
  else if (rep === 1) days = 3;
  else days = Math.max(1, Math.round(interval * ef));

  if (lang === 'en') {
    if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'}`;
    const months = Math.round(days / 30);
    return `${months} ${months === 1 ? 'month' : 'months'}`;
  }
  return days < 30 ? `${days} ngày` : `${Math.round(days / 30)} tháng`;
}

export function submitSrsReview(slug: string, grade: 1 | 3 | 4 | 5): SrsRecord {
  const map = getSrsMap();
  const prev = map[slug];
  let repetition = prev?.repetition ?? 0;
  let intervalDays = prev?.intervalDays ?? 0;
  let easeFactor = prev?.easeFactor ?? 2.5;

  if (grade < 3) {
    repetition = 0;
    intervalDays = 1;
  } else {
    if (repetition === 0) intervalDays = 1;
    else if (repetition === 1) intervalDays = 3;
    else intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));
    repetition += 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  easeFactor = Math.max(1.3, Math.min(3.0, Math.round(easeFactor * 100) / 100));

  const now = new Date();
  const nextDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  const nextRec: SrsRecord = {
    slug,
    repetition,
    intervalDays,
    easeFactor,
    lastReviewedAt: now.toISOString(),
    nextReviewDate: nextDate.toISOString(),
  };

  map[slug] = nextRec;
  try {
    localStorage.setItem(KEY_SRS, JSON.stringify(map));
  } catch {
    // Ignore
  }
  recordQuestProgress('srs_review', 1);
  return nextRec;
}

export function isSrsDue(record: SrsRecord | undefined): boolean {
  if (!record) return true;
  return new Date(record.nextReviewDate).getTime() <= Date.now();
}

// === MISTAKE VAULT (FIFO 50) ===
export function getMistakeVault(): MistakeEntry[] {
  try {
    const raw = localStorage.getItem(KEY_MISTAKES);
    return raw ? (JSON.parse(raw) as MistakeEntry[]) : [];
  } catch {
    return [];
  }
}

export function recordPracticeMistake(question: PracticeQuestion, selectedOption: number): MistakeEntry[] {
  const list = getMistakeVault();
  const existing = list.find((m) => m.id === question.id);
  const entry: MistakeEntry = {
    id: question.id,
    question,
    selectedOption,
    mistakeCount: (existing?.mistakeCount || 0) + 1,
    resolved: false,
    lastMissedAt: new Date().toISOString(),
  };
  const updated = [entry, ...list.filter((m) => m.id !== question.id)].slice(0, 50);
  try {
    localStorage.setItem(KEY_MISTAKES, JSON.stringify(updated));
  } catch {
    // Ignore
  }
  return updated;
}

export function resolvePracticeMistake(questionId: string): MistakeEntry[] {
  const list = getMistakeVault();
  const updated = list.map((m) => (m.id === questionId ? { ...m, resolved: true } : m));
  try {
    localStorage.setItem(KEY_MISTAKES, JSON.stringify(updated));
  } catch {
    // Ignore
  }
  recordQuestProgress('revenge_mistake', 1);
  return updated;
}

// === PRACTICE HISTORY ===
export function getPracticeHistory(): PracticeSessionLog[] {
  try {
    const raw = localStorage.getItem(KEY_HISTORY);
    return raw ? (JSON.parse(raw) as PracticeSessionLog[]) : [];
  } catch {
    return [];
  }
}

export function savePracticeSession(
  domain: 'all' | GlossaryDomain,
  score: number,
  total: number,
  pointsEarned: number,
): PracticeSessionLog[] {
  const list = getPracticeHistory();
  const next: PracticeSessionLog[] = [
    {
      id: `prac_${Date.now()}`,
      domain,
      score,
      total,
      pointsEarned,
      completedAt: new Date().toISOString(),
    },
    ...list,
  ].slice(0, 30);
  try {
    localStorage.setItem(KEY_HISTORY, JSON.stringify(next));
  } catch {
    // Ignore
  }
  recordQuestProgress('arena_sprint', 1);
  return next;
}

// === DAILY QUESTS ===
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

const QUEST_TEXT_EN: Record<DailyQuestItem['id'], { title: string; desc: string }> = {
  arena_sprint: {
    title: 'Knowledge Arena Sprint',
    desc: 'Complete 1 quiz round on Digital Economy, Blockchain & AI',
  },
  srs_review: {
    title: 'SM-2 Flashcard Recall',
    desc: 'Rate memory recall for 5 specialized terminology flashcards',
  },
  revenge_mistake: {
    title: 'Clear the Mistake Vault',
    desc: 'Resolve 2 previously missed questions in Revenge Drill',
  },
};

export function getDailyQuests(lang: SupportedLanguage = 'vi'): DailyQuestState {
  const today = todayKey();
  let base: DailyQuestState | null = null;
  try {
    const raw = localStorage.getItem(KEY_QUESTS);
    if (raw) {
      const parsed = JSON.parse(raw) as DailyQuestState;
      if (parsed.date === today && Array.isArray(parsed.quests)) base = parsed;
    }
  } catch {
    // Fallback
  }

  if (!base) {
    base = {
      date: today,
      quests: [
        {
          id: 'arena_sprint',
          title: 'Khai chiến Đấu trường Tri thức',
          desc: 'Hoàn thành 1 phiên trắc nghiệm Kinh tế số / Blockchain / AI',
          target: 1,
          current: 0,
          rewardVne: 30,
          completed: false,
          claimed: false,
        },
        {
          id: 'srs_review',
          title: 'Ôn tập Flashcard SM-2',
          desc: 'Đánh giá mức độ ghi nhớ 5 thuật ngữ chuyên ngành',
          target: 5,
          current: 0,
          rewardVne: 25,
          completed: false,
          claimed: false,
        },
        {
          id: 'revenge_mistake',
          title: 'Vá lỗ hổng Mistake Vault',
          desc: 'Trả lời đúng lại 2 câu từng sai trong Kho Lỗi sai',
          target: 2,
          current: 0,
          rewardVne: 35,
          completed: false,
          claimed: false,
        },
      ],
    };
    try {
      localStorage.setItem(KEY_QUESTS, JSON.stringify(base));
    } catch {
      // Ignore
    }
  }

  if (lang === 'en') {
    return {
      ...base,
      quests: base.quests.map((q) => ({
        ...q,
        title: QUEST_TEXT_EN[q.id].title,
        desc: QUEST_TEXT_EN[q.id].desc,
      })),
    };
  }
  return base;
}

export function recordQuestProgress(id: DailyQuestItem['id'], delta: number): DailyQuestState {
  const state = getDailyQuests('vi');
  state.quests = state.quests.map((q) => {
    if (q.id !== id || q.completed) return q;
    const current = Math.min(q.target, q.current + delta);
    return { ...q, current, completed: current >= q.target };
  });
  try {
    localStorage.setItem(KEY_QUESTS, JSON.stringify(state));
  } catch {
    // Ignore
  }
  return state;
}

export function markQuestClaimed(id: DailyQuestItem['id']): DailyQuestState {
  const state = getDailyQuests('vi');
  state.quests = state.quests.map((q) => (q.id === id ? { ...q, claimed: true } : q));
  try {
    localStorage.setItem(KEY_QUESTS, JSON.stringify(state));
  } catch {
    // Ignore
  }
  return state;
}
