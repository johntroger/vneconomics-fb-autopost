import { getLanguage, type SupportedLanguage } from '../../core/i18n/i18nService.ts';
import { getGlossaryTerms, type CatalogGlossaryTerm } from '../../core/data/catalogService.ts';

export type GlossaryDomain = 'kinh-te-so' | 'blockchain' | 'ai';

export interface LexiconEntry {
  slug: string;
  term: string;
  ipa?: string;
  partOfSpeech: string;
  vietnamese: string;
  domain: GlossaryDomain;
  domainLabel: string;
  tags: string[];
  entryType: 'term' | 'acronym';
  isFlagship: boolean;
  coreDefinition: string;
  coreDefinitionEn: string;
  mechanism?: string;
  mechanismEn?: string;
  pitfalls?: string;
  pitfallsEn?: string;
  benchmarks?: string;
  benchmarksEn?: string;
  academicExample?: string;
  seminalCitation?: string;
  relatedSlugs?: string[];
  sourceLabel: string;
}

export const LEXICON_DOMAINS: { key: 'all' | GlossaryDomain; label: string; labelEn: string }[] = [
  { key: 'all', label: 'Tất cả lĩnh vực', labelEn: 'All Domains' },
  { key: 'kinh-te-so', label: 'Kinh tế số', labelEn: 'Digital Economy' },
  { key: 'blockchain', label: 'Blockchain & Web3', labelEn: 'Blockchain & Web3' },
  { key: 'ai', label: 'Trí tuệ nhân tạo (AI)', labelEn: 'Artificial Intelligence (AI)' },
];

const FLAGSHIP_LEXICON: LexiconEntry[] = [
  // === KINH TẾ SỐ ===
  {
    slug: 'platform-economy',
    term: 'Platform Economy',
    ipa: '/ˈplætfɔːrm ɪˈkɒnəmi/',
    partOfSpeech: 'Danh từ - n.',
    vietnamese: 'Kinh tế nền tảng',
    domain: 'kinh-te-so',
    domainLabel: 'Kinh tế số',
    tags: ['Kinh tế nền tảng', 'Two-Sided Market', 'Network Effects'],
    entryType: 'term',
    isFlagship: true,
    coreDefinition:
      'Mô hình kinh tế trong đó giá trị được tạo ra và trao đổi thông qua các hạ tầng số trung gian (platforms) kết nối trực tiếp nhiều nhóm người dùng (nhà cung cấp, người tiêu dùng, nhà phát triển) thay vì sở hữu toàn bộ tài sản vật lý theo chuỗi giá trị tuyến tính.',
    coreDefinitionEn:
      'An economic and social activity model facilitated by digital platforms that act as multi-sided intermediaries connecting producers, consumers, and complementors rather than owning linear production assets.',
    mechanism:
      'Vận hành dựa trên hiệu ứng mạng lưới (Network Effects), chi phí cận biên phân phối gần bằng 0 và cơ chế định giá bất đối xứng giữa các phía của thị trường đa chiều (Multi-sided Markets).',
    pitfalls:
      'Tránh đồng nhất "Platform Economy" với chỉ riêng "Thương mại điện tử (E-commerce)". Một sàn thương mại bán hàng tự doanh (inventory-led) là chuỗi tuyến tính, không phải nền tảng mở thực thụ.',
    benchmarks:
      'Chỉ số đo lường cốt lõi: GMV (Gross Merchandise Value), Take Rate (tỷ lệ phí nền tảng 5%–30%), LTV/CAC (> 3.0) và Cross-side Network Elasticity.',
    academicExample:
      'The rise of the platform economy shifts competitive advantage from internal asset ownership to ecosystem orchestration.',
    seminalCitation: 'Parker, G. G., Van Alstyne, M. W., & Choudary, S. P. (2016). Platform Revolution. W. W. Norton.',
    relatedSlugs: ['network-effects', 'two-sided-market', 'zero-marginal-cost'],
    sourceLabel: 'Biên tập VNEconomics • Kinh tế số',
  },
  {
    slug: 'network-effects',
    term: 'Network Effects',
    ipa: '/ˈnetwɜːrk ɪˈfekts/',
    partOfSpeech: 'Danh từ - n.',
    vietnamese: 'Hiệu ứng mạng lưới',
    domain: 'kinh-te-so',
    domainLabel: 'Kinh tế số',
    tags: ['Kinh tế số', 'Chiến lược nền tảng', 'Metcalfe'],
    entryType: 'term',
    isFlagship: true,
    coreDefinition:
      'Hiện tượng giá trị của một sản phẩm, dịch vụ hoặc mạng lưới tăng lên theo cấp số nhân khi số lượng người dùng tham gia mạng lưới đó tăng lên.',
    coreDefinitionEn:
      'A phenomenon whereby increased numbers of people or participants improve the value of a good or service for every existing and new user.',
    mechanism:
      'Gồm hai loại: Hiệu ứng mạng lưới trực tiếp (Same-side: càng nhiều người dùng Zalo/Telegram càng hữu ích) và gián tiếp (Cross-side: càng nhiều người mua trên sàn thì càng thu hút nhiều người bán và ngược lại).',
    pitfalls:
      'Đừng nhầm lẫn Network Effects với Economies of Scale (Tính kinh tế theo quy mô). Quy mô giúp giảm chi phí sản xuất đơn vị ở phía cung, còn Network Effects làm tăng giá trị cảm nhận ở phía cầu.',
    benchmarks:
      'Quy luật Metcalfe: Giá trị mạng lưới tỷ lệ với n(n-1)/2. Ngưỡng tới hạn (Critical Mass) quyết định điểm bùng phát hoặc suy thoái (Negative Network Effects khi quá tải/spam).',
    seminalCitation: 'Katz, M. L., & Shapiro, C. (1985). Network Externalities, Competition, and Compatibility. American Economic Review.',
    relatedSlugs: ['platform-economy', 'two-sided-market'],
    sourceLabel: 'Biên tập VNEconomics • Kinh tế số',
  },
  {
    slug: 'two-sided-market',
    term: 'Two-Sided Market',
    ipa: '/tuː ˈsaɪdɪd ˈmɑːrkɪt/',
    partOfSpeech: 'Danh từ - n.',
    vietnamese: 'Thị trường hai phía',
    domain: 'kinh-te-so',
    domainLabel: 'Kinh tế số',
    tags: ['Platform', 'Rochet & Tirole', 'Pricing'],
    entryType: 'term',
    isFlagship: true,
    coreDefinition:
      'Cấu trúc thị trường trung gian kết nối hai nhóm người dùng độc lập nhưng phụ thuộc lẫn nhau, trong đó cấu trúc giá (ai trả tiền, ai được trợ giá) quyết định tổng sản lượng giao dịch.',
    coreDefinitionEn:
      'An economic platform having two distinct user groups that provide each other with network benefits, where price structure across sides affects transaction volume.',
    mechanism:
      'Nền tảng thường trợ giá cho phía nhạy cảm về giá (Subsidy Side — ví dụ người dùng đọc tin miễn phí) để thu hút phía còn lại sẵn sàng trả tiền (Money Side — nhà quảng cáo).',
    pitfalls:
      'Cần giải thích rõ bài toán "Con gà và quả trứng" (Chicken-and-Egg Problem) khi nghiên cứu giai đoạn khởi tạo thị trường hai phía.',
    benchmarks:
      'Tỷ lệ chuyển đổi giữa Subsidy Side và Money Side; chi phí giữ chân nhóm cung cấp thanh khoản cốt lõi.',
    seminalCitation: 'Rochet, J. C., & Tirole, J. (2003). Platform Competition in Two-Sided Markets. JEEA.',
    relatedSlugs: ['platform-economy', 'network-effects'],
    sourceLabel: 'Biên tập VNEconomics • Kinh tế số',
  },
  {
    slug: 'zero-marginal-cost',
    term: 'Zero Marginal Cost',
    ipa: '/ˈzɪərəʊ ˈmɑːrdʒɪnəl kɒst/',
    partOfSpeech: 'Danh từ - n.',
    vietnamese: 'Chi phí cận biên bằng không',
    domain: 'kinh-te-so',
    domainLabel: 'Kinh tế số',
    tags: ['Kinh tế vi mô số', 'Digital Goods', 'SaaS'],
    entryType: 'term',
    isFlagship: true,
    coreDefinition:
      'Đặc tính của hàng hóa số (phần mềm, khóa học video, ebook, dữ liệu) khi chi phí để sản xuất thêm một bản sao bổ sung gần như bằng 0 sau khi đã hoàn tất bản gốc đầu tiên.',
    coreDefinitionEn:
      'An economic condition in digital goods where the cost of producing and distributing one additional unit approaches zero once fixed development costs are sunk.',
    mechanism:
      'Tạo ra đường tổng chi phí bình quân (ATC) giảm liên tục theo sản lượng, dẫn đến cấu trúc thị trường dễ hình thành độc quyền tự nhiên (Winner-Takes-Most) nếu không có rào cản pháp lý.',
    pitfalls:
      'Không được suy diễn rằng chi phí phát triển ban đầu (Fixed Cost / Sunk Cost) bằng 0 — chi phí R&D AI hoặc phần mềm thường rất lớn.',
    benchmarks:
      'Biên lợi nhuận gộp (Gross Margin) của doanh nghiệp SaaS / Digital Content chuẩn thường đạt 75%–90%.',
    seminalCitation: 'Rifkin, J. (2014). The Zero Marginal Cost Society. Palgrave Macmillan.',
    relatedSlugs: ['platform-economy', 'network-effects'],
    sourceLabel: 'Biên tập VNEconomics • Kinh tế số',
  },
  {
    slug: 'cbdc-central-bank-digital-currency',
    term: 'CBDC (Central Bank Digital Currency)',
    ipa: '/ˌsiː.biː.diːˈsiː/',
    partOfSpeech: 'Từ viết tắt - Acronym',
    vietnamese: 'Tiền kỹ thuật số của Ngân hàng Trung ương',
    domain: 'kinh-te-so',
    domainLabel: 'Kinh tế số',
    tags: ['CBDC', 'Tài chính số', 'Chính sách tiền tệ'],
    entryType: 'acronym',
    isFlagship: true,
    coreDefinition:
      'Dạng tiền pháp định kỹ thuật số do Ngân hàng Trung ương trực tiếp phát hành và bảo lãnh (nghĩa vụ nợ trực tiếp của NHTW), khác với tiền điện tử tư nhân hay stablecoin.',
    coreDefinitionEn:
      'A digital form of sovereign fiat currency that is a direct liability of a country’s central bank, distinct from decentralized cryptocurrencies and commercial bank deposits.',
    mechanism:
      'Chia làm 2 nhánh: Retail CBDC (phục vụ người dân thanh toán bán lẻ) và Wholesale CBDC (thanh toán liên ngân hàng, xuyên biên giới). Có thể dùng sổ cái tập trung hoặc DLT cấp phép.',
    pitfalls:
      'Không đánh đồng CBDC với Bitcoin hay Cardano. CBDC mang tính tập trung (Centralized) và chịu kiểm soát chính sách tiền tệ quốc gia.',
    benchmarks:
      'Các dự án tiêu biểu: e-CNY (Trung Quốc), Project mBridge (BIS), Sand Dollar (Bahamas). Rủi ro cần kiểm soát: rút tiền khỏi ngân hàng thương mại (Disintermediation).',
    seminalCitation: 'Bank for International Settlements (BIS). (2021). Central bank digital currencies: foundational principles.',
    relatedSlugs: ['stablecoin', 'rwa-real-world-assets'],
    sourceLabel: 'Biên tập VNEconomics • Tài chính số',
  },
  {
    slug: 'rwa-real-world-assets',
    term: 'RWA (Real-World Assets)',
    ipa: '/ˌɑːr.dʌb.əl.juːˈeɪ/',
    partOfSpeech: 'Từ viết tắt - Acronym',
    vietnamese: 'Tài sản thực được mã hóa (Tokenization)',
    domain: 'kinh-te-so',
    domainLabel: 'Kinh tế số',
    tags: ['Tokenization', 'RWA', 'DeFi', 'Tài sản số'],
    entryType: 'acronym',
    isFlagship: true,
    coreDefinition:
      'Quá trình số hóa và biểu diễn quyền sở hữu các tài sản truyền thống (trái phiếu chính phủ, bất động sản, tín chỉ carbon, vàng, hóa đơn thương mại) thành token trên blockchain.',
    coreDefinitionEn:
      'Tangible or traditional financial assets (treasuries, real estate, commodities, carbon credits) represented on-chain as programmable tokens.',
    mechanism:
      'Kết hợp khung pháp lý lưu ký ngoài chuỗi (SPV / Custodian) với hợp đồng thông minh trên chuỗi và Oracle xác minh dự trữ (Proof of Reserve) để đảm bảo 1 token tương ứng tài sản thật.',
    pitfalls:
      'Token hóa không làm tài sản kém thanh khoản tự động trở nên thanh khoản nếu thiếu thị trường thứ cấp và hành lang pháp lý chuyển nhượng quyền sở hữu.',
    benchmarks:
      'BlackRock BUIDL, Ondo Finance, trái phiếu kho bạc Mỹ token hóa là nhóm dẫn đầu phân khúc RWA tổ chức.',
    relatedSlugs: ['cbdc-central-bank-digital-currency', 'smart-contract'],
    sourceLabel: 'Biên tập VNEconomics • Tài sản số',
  },
  {
    slug: 'depin-decentralized-physical-infrastructure',
    term: 'DePIN (Decentralized Physical Infrastructure Networks)',
    ipa: '/ˈdiː.pɪn/',
    partOfSpeech: 'Từ viết tắt - Acronym',
    vietnamese: 'Mạng lưới Hạ tầng Vật lý Phi tập trung',
    domain: 'kinh-te-so',
    domainLabel: 'Kinh tế số',
    tags: ['DePIN', 'IoT', 'Web3', 'Hạ tầng số'],
    entryType: 'acronym',
    isFlagship: true,
    coreDefinition:
      'Mô hình sử dụng token khuyến khích cộng đồng cá nhân/doanh nghiệp tự triển khai và vận hành hạ tầng vật lý (trạm phát Wi-Fi, cảm biến thời tiết, GPU tính toán, pin năng lượng) thay cho tập đoàn độc quyền.',
    coreDefinitionEn:
      'Networks that use blockchain token incentives to coordinate crowdsourced deployment and operation of real-world physical infrastructure such as wireless hotspots, GPUs, and energy grids.',
    mechanism:
      'Vận hành theo vòng lặp cung–cầu (Flywheel): phần thưởng token giai đoạn đầu thu hút nhà cung cấp phần cứng → mạng lưới phủ rộng → doanh thu từ khách hàng B2B/B2C dùng để mua lại/đốt token.',
    pitfalls:
      'Nếu phần thưởng token phát hành quá nhanh mà không có nhu cầu sử dụng thực tế từ khách hàng trả tiền fiat, mô hình sẽ sụp đổ lạm phát.',
    relatedSlugs: ['platform-economy', 'network-effects'],
    sourceLabel: 'Biên tập VNEconomics • Kinh tế số',
  },

  // === TRÍ TUỆ NHÂN TẠO (AI) ===
  {
    slug: 'llm-large-language-model',
    term: 'LLM (Large Language Model)',
    ipa: '/ˌel.elˈem/',
    partOfSpeech: 'Từ viết tắt - Acronym',
    vietnamese: 'Mô hình Ngôn ngữ Lớn',
    domain: 'ai',
    domainLabel: 'Trí tuệ nhân tạo (AI)',
    tags: ['LLM', 'GenAI', 'Transformer', 'NLP'],
    entryType: 'acronym',
    isFlagship: true,
    coreDefinition:
      'Mô hình học sâu dựa trên kiến trúc Transformer với hàng tỷ đến hàng nghìn tỷ tham số, được huấn luyện trên kho văn bản khổng lồ để hiểu, suy luận và sinh ngôn ngữ tự nhiên cũng như mã nguồn.',
    coreDefinitionEn:
      'A deep-learning foundation model built primarily on the Transformer architecture, trained on massive corpora to predict tokens, reason, and generate human-like text and code.',
    mechanism:
      'Trải qua 3 giai đoạn: Pre-training (học dự đoán token tiếp theo), Supervised Fine-Tuning (SFT theo chỉ dẫn) và RLHF / Alignment (tối ưu theo phản hồi con người & quy tắc an toàn).',
    pitfalls:
      'LLM là mô hình xác suất ngôn ngữ chứ không phải cơ sở dữ liệu sự thật tuyệt đối; luôn có nguy cơ "ảo giác" (Hallucination) nếu không kết hợp RAG hoặc kiểm chứng nguồn.',
    benchmarks:
      'Đánh giá qua MMLU, GSM8K, HumanEval, GPQA và kích thước Context Window (128K – 2M tokens).',
    seminalCitation: 'Vaswani, A., et al. (2017). Attention Is All You Need. NeurIPS.',
    relatedSlugs: ['rag-retrieval-augmented-generation', 'hallucination-ai', 'ai-agent-agentic-workflow'],
    sourceLabel: 'Biên tập VNEconomics • AI & Công nghệ',
  },
  {
    slug: 'rag-retrieval-augmented-generation',
    term: 'RAG (Retrieval-Augmented Generation)',
    ipa: '/ræɡ/',
    partOfSpeech: 'Từ viết tắt - Acronym',
    vietnamese: 'Sinh văn bản tăng cường truy xuất',
    domain: 'ai',
    domainLabel: 'Trí tuệ nhân tạo (AI)',
    tags: ['RAG', 'Vector DB', 'Anti-Hallucination', 'Enterprise AI'],
    entryType: 'acronym',
    isFlagship: true,
    coreDefinition:
      'Kỹ thuật kết hợp truy xuất dữ liệu từ kho tri thức bên ngoài (tài liệu PDF, cơ sở dữ liệu nội bộ, web) rồi đưa vào ngữ cảnh (prompt) để LLM tổng hợp câu trả lời chính xác và có trích dẫn.',
    coreDefinitionEn:
      'An AI architecture that retrieves relevant documents from an external knowledge base and injects them into an LLM’s context window before generating grounded answers.',
    mechanism:
      'Gồm bước Indexing (chia đoạn Chunking → Embedding thành vector → lưu Vector DB) và Inference (truy vấn người dùng → tìm Top-K đoạn tương đồng/BM25 → Rerank → LLM sinh câu trả lời).',
    pitfalls:
      'RAG kém chất lượng thường do chia đoạn (chunking) cắt ngang bảng số liệu hoặc chỉ dùng tìm kiếm vector thuần túy mà thiếu Hybrid Search (BM25 + Semantic).',
    benchmarks:
      'Đo lường bằng bộ chỉ số RAGAS: Context Precision, Context Recall, Faithfulness (độ trung thực nguồn) và Answer Relevance.',
    seminalCitation: 'Lewis, P., et al. (2020). Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. NeurIPS.',
    relatedSlugs: ['llm-large-language-model', 'hallucination-ai', 'geo-generative-engine-optimization'],
    sourceLabel: 'Biên tập VNEconomics • AI & Công nghệ',
  },
  {
    slug: 'ai-agent-agentic-workflow',
    term: 'AI Agent & Agentic Workflow',
    ipa: '/ˈeɪ.dʒənt/',
    partOfSpeech: 'Danh từ - n.',
    vietnamese: 'Tác tử AI & Quy trình tự chủ',
    domain: 'ai',
    domainLabel: 'Trí tuệ nhân tạo (AI)',
    tags: ['AI Agent', 'MCP', 'Tool Use', 'Automation'],
    entryType: 'term',
    isFlagship: true,
    coreDefinition:
      'Hệ thống AI có khả năng tự lập kế hoạch, chia nhỏ mục tiêu, chủ động gọi công cụ bên ngoài (Tool Calling / API / Trình duyệt / Terminal), quan sát kết quả và tự sửa lỗi theo vòng lặp để hoàn thành nhiệm vụ.',
    coreDefinitionEn:
      'An autonomous AI system powered by an LLM that can plan multi-step actions, invoke external tools/APIs, inspect observations, and iterate until a goal is completed.',
    mechanism:
      'Vận hành theo vòng lặp ReAct (Reason + Act) hoặc Plan-and-Execute kết hợp 4 thành phần: Model (não bộ), Memory (ngắn/dài hạn), Tools/MCP (tay chân) và Guardrails (kiểm soát an toàn).',
    pitfalls:
      'Không nên dùng Multi-Agent phức tạp cho bài toán có thể giải quyết bằng 1 prompt hoặc workflow tuyến tính đơn giản vì làm tăng độ trễ và chi phí token.',
    benchmarks:
      'SWE-bench (lập trình), GAIA Benchmark (tác tử tổng quát), tỷ lệ hoàn thành tác vụ End-to-End và chi phí token/tác vụ.',
    relatedSlugs: ['mcp-model-context-protocol', 'llm-large-language-model', 'rag-retrieval-augmented-generation'],
    sourceLabel: 'Biên tập VNEconomics • AI & Công nghệ',
  },
  {
    slug: 'mcp-model-context-protocol',
    term: 'MCP (Model Context Protocol)',
    ipa: '/ˌem.siːˈpiː/',
    partOfSpeech: 'Từ viết tắt - Acronym',
    vietnamese: 'Giao thức Ngữ cảnh Mô hình',
    domain: 'ai',
    domainLabel: 'Trí tuệ nhân tạo (AI)',
    tags: ['MCP', 'AI Agents', 'Interoperability'],
    entryType: 'acronym',
    isFlagship: true,
    coreDefinition:
      'Giao thức chuẩn mở (do Anthropic đề xuất) cho phép các ứng dụng AI và AI Agent kết nối đồng nhất với nguồn dữ liệu, công cụ (Tools) và quy trình bên ngoài giống như chuẩn "USB-C cho AI".',
    coreDefinitionEn:
      'An open standard protocol that standardizes how AI applications and agents connect to external data sources, APIs, and local/remote tools.',
    mechanism:
      'Gồm 3 vai trò: MCP Host (IDE/Chat App), MCP Client và MCP Server (cung cấp Tools, Resources, Prompts qua JSON-RPC 2.0 trên stdio hoặc HTTP/SSE).',
    pitfalls:
      'Cần kiểm soát chặt quyền truy cập (Least Privilege) và xác thực khi kết nối MCP Server với cơ sở dữ liệu sản xuất để tránh rò rỉ dữ liệu hoặc Prompt Injection.',
    relatedSlugs: ['ai-agent-agentic-workflow', 'llm-large-language-model'],
    sourceLabel: 'Biên tập VNEconomics • AI & Công nghệ',
  },
  {
    slug: 'hallucination-ai',
    term: 'AI Hallucination',
    ipa: '/həˌluːsɪˈneɪʃn/',
    partOfSpeech: 'Danh từ - n.',
    vietnamese: 'Ảo giác của AI',
    domain: 'ai',
    domainLabel: 'Trí tuệ nhân tạo (AI)',
    tags: ['Hallucination', 'Citation Integrity', 'AI Safety'],
    entryType: 'term',
    isFlagship: true,
    coreDefinition:
      'Hiện tượng mô hình ngôn ngữ tạo ra thông tin sai sự thật, số liệu bịa đặt hoặc tài liệu tham khảo/DOI không tồn tại nhưng lại trình bày với giọng điệu cực kỳ tự tin và hợp lý.',
    coreDefinitionEn:
      'A phenomenon where a generative AI model produces fabricated facts, statistics, or non-existent citations presented fluently and confidently as truth.',
    mechanism:
      'Xuất phát từ bản chất dự đoán phân phối xác suất token tiếp theo thay vì truy vấn chân lý logic, đặc biệt khi câu hỏi vượt ngoài dữ liệu huấn luyện hoặc thiếu ngữ cảnh RAG.',
    pitfalls:
      'Trong nghiên cứu khoa học và khóa luận, trích dẫn nguồn do AI bịa đặt là lỗi nghiêm trọng nhất, có thể dẫn tới bị hủy kết quả hoặc từ chối đăng tạp chí.',
    benchmarks:
      'Giảm thiểu bằng RAG, Grounding with Search, Temperature thấp (0.0–0.2) và kiểm tra chéo DOI/Crossref.',
    relatedSlugs: ['rag-retrieval-augmented-generation', 'llm-large-language-model'],
    sourceLabel: 'Biên tập VNEconomics • AI & Nghiên cứu',
  },
  {
    slug: 'geo-generative-engine-optimization',
    term: 'GEO (Generative Engine Optimization)',
    ipa: '/ˌdʒiː.iːˈəʊ/',
    partOfSpeech: 'Từ viết tắt - Acronym',
    vietnamese: 'Tối ưu hóa Công cụ Tạo sinh',
    domain: 'ai',
    domainLabel: 'Trí tuệ nhân tạo (AI)',
    tags: ['GEO', 'AEO', 'AI Search', 'SEO'],
    entryType: 'acronym',
    isFlagship: true,
    coreDefinition:
      'Tập hợp chiến lược tối ưu nội dung, cấu trúc dữ liệu (JSON-LD, llms.txt) và độ tin cậy trích dẫn để thương hiệu/bài viết được các hệ thống tìm kiếm AI (ChatGPT Search, Perplexity, Google AI Overview) ưu tiên trích dẫn.',
    coreDefinitionEn:
      'The practice of structuring content, empirical citations, and machine-readable metadata so generative AI search engines cite and synthesize your source in their answers.',
    mechanism:
      'Khác với SEO truyền thống tối ưu thứ hạng 10 link xanh, GEO tối ưu "Tỷ lệ được nhắc tên & trích dẫn" thông qua định nghĩa rõ ràng (TL;DR), số liệu gốc, Schema.org và tệp llms.txt.',
    pitfalls:
      'Nhồi nhét từ khóa (Keyword Stuffing) làm giảm uy tín trong GEO; ngược lại, trích dẫn thống kê cụ thể và giọng văn khách quan giúp tăng đáng kể tỷ lệ hiển thị trong AI Search.',
    seminalCitation: 'Aggarwal, P., et al. (2024). GEO: Generative Engine Optimization. KDD 2024.',
    relatedSlugs: ['aeo-answer-engine-optimization', 'rag-retrieval-augmented-generation'],
    sourceLabel: 'Biên tập VNEconomics • SEO/GEO/AEO',
  },
  {
    slug: 'aeo-answer-engine-optimization',
    term: 'AEO (Answer Engine Optimization)',
    ipa: '/ˌeɪ.iːˈəʊ/',
    partOfSpeech: 'Từ viết tắt - Acronym',
    vietnamese: 'Tối ưu hóa Công cụ Trả lời',
    domain: 'ai',
    domainLabel: 'Trí tuệ nhân tạo (AI)',
    tags: ['AEO', 'FAQ Schema', 'DefinedTerm'],
    entryType: 'acronym',
    isFlagship: true,
    coreDefinition:
      'Phương pháp cấu trúc hóa thông tin theo cặp Hỏi–Đáp súc tích (40–60 từ) kết hợp Schema.org (DefinedTerm, FAQPage) để công cụ tìm kiếm và trợ lý ảo trả lời trực tiếp câu hỏi của người dùng.',
    coreDefinitionEn:
      'Optimizing digital content with direct, concise answers and structured schema markup so search and voice assistants can extract immediate answers.',
    mechanism:
      'Đặt câu trả lời trực diện ngay dưới tiêu đề dạng câu hỏi ("X là gì?"), đi kèm danh sách gạch đầu dòng và dữ liệu có cấu trúc JSON-LD.',
    relatedSlugs: ['geo-generative-engine-optimization'],
    sourceLabel: 'Biên tập VNEconomics • SEO/GEO/AEO',
  },

  // === BLOCKCHAIN FLAGSHIP BILINGUAL ===
  {
    slug: 'eutxo-extended-utxo',
    term: 'eUTxO (Extended Unspent Transaction Output)',
    ipa: '/iːˈjuː.tiː.eks.əʊ/',
    partOfSpeech: 'Từ viết tắt - Acronym',
    vietnamese: 'Mô hình Đầu ra Giao dịch Chưa chi tiêu Mở rộng',
    domain: 'blockchain',
    domainLabel: 'Blockchain & Web3',
    tags: ['Cardano', 'eUTxO', 'Plutus', 'Smart Contract'],
    entryType: 'acronym',
    isFlagship: true,
    coreDefinition:
      'Mô hình sổ cái của Cardano mở rộng từ UTxO của Bitcoin bằng cách cho phép gắn thêm dữ liệu trạng thái tùy ý (Datum) và logic xác thực hợp đồng thông minh (Redeemer & Script) vào mỗi UTxO.',
    coreDefinitionEn:
      'Cardano’s ledger model extending Bitcoin’s UTxO by attaching arbitrary data (Datum) and smart-contract validation logic (Validator Scripts) to unspent outputs.',
    mechanism:
      'Cho phép kiểm tra tính hợp lệ và phí giao dịch cục bộ (deterministic) trước khi gửi lên chuỗi, đồng thời hỗ trợ xử lý song song nhiều giao dịch không xung đột trạng thái toàn cục.',
    pitfalls:
      'Dễ gặp tranh chấp đồng thời (Concurrency contention) nếu thiết kế DApp dồn toàn bộ thanh khoản vào một UTxO duy nhất mà không chia nhỏ trạng thái.',
    relatedSlugs: ['account-based-model', 'ada', 'smart-contract'],
    sourceLabel: 'Biên tập VNEconomics • Cardano & Web3',
  },
  {
    slug: 'smart-contract',
    term: 'Smart Contract',
    ipa: '/smɑːrt ˈkɒntrækt/',
    partOfSpeech: 'Danh từ - n.',
    vietnamese: 'Hợp đồng thông minh',
    domain: 'blockchain',
    domainLabel: 'Blockchain & Web3',
    tags: ['Smart Contract', 'Solidity', 'Plutus', 'Automation'],
    entryType: 'term',
    isFlagship: true,
    coreDefinition:
      'Chương trình máy tính tự động thực thi các điều khoản thỏa thuận được lưu trữ trên blockchain ngay khi các điều kiện lập trình sẵn được đáp ứng, không cần bên trung gian.',
    coreDefinitionEn:
      'Self-executing program code stored on a blockchain that automatically enforces and settles agreement terms when predefined conditions are met.',
    mechanism:
      'Trên Ethereum (EVM), hợp đồng chạy trên bytecode Solidity; trên Cardano, validator script Plutus kiểm tra điều kiện chi tiêu UTxO.',
    pitfalls:
      'Code hợp đồng thông minh bất biến sau khi triển khai nên lỗi bảo mật (Reentrancy, tràn số, sai phân quyền) có thể gây thất thoát tài sản không thể hoàn tác. Cần kiểm thử kỹ trên Testnet.',
    seminalCitation: 'Szabo, N. (1994). Smart Contracts. Virtual School.',
    relatedSlugs: ['eutxo-extended-utxo', 'zero-knowledge-proof', 'rwa-real-world-assets'],
    sourceLabel: 'Biên tập VNEconomics • Blockchain',
  },
  {
    slug: 'zero-knowledge-proof',
    term: 'ZKP (Zero-Knowledge Proof)',
    ipa: '/ˈzɪərəʊ ˈnɒlɪdʒ pruːf/',
    partOfSpeech: 'Từ viết tắt - Acronym',
    vietnamese: 'Bằng chứng Không Tiết lộ Thông tin',
    domain: 'blockchain',
    domainLabel: 'Blockchain & Web3',
    tags: ['ZKP', 'Privacy', 'ZK-Rollup', 'Cryptography'],
    entryType: 'acronym',
    isFlagship: true,
    coreDefinition:
      'Phương pháp mật mã học cho phép một bên (Prover) chứng minh cho bên kia (Verifier) rằng một mệnh đề là đúng mà không cần tiết lộ bất kỳ dữ liệu bí mật nào đằng sau mệnh đề đó.',
    coreDefinitionEn:
      'A cryptographic protocol allowing one party to prove to another that a statement is true without revealing any underlying secret information beyond the validity of the statement itself.',
    mechanism:
      'Đảm bảo 3 tính chất toán học: Completeness (đúng thì chứng minh được), Soundness (sai không thể giả mạo) và Zero-Knowledge (không lộ thông tin gốc). Ứng dụng mạnh trong ZK-Rollups (zk-SNARKs/zk-STARKs) và định danh số (DID).',
    relatedSlugs: ['smart-contract', 'eutxo-extended-utxo'],
    sourceLabel: 'Biên tập VNEconomics • Blockchain',
  },
];

const ACRONYM_PATTERN = /^[A-Z0-9]{2,8}(\s*\(|$|-)/;

const EN_DOMAIN_LABELS: Record<GlossaryDomain, string> = {
  'kinh-te-so': 'Digital Economy & Governance',
  blockchain: 'Blockchain & Web3',
  ai: 'Artificial Intelligence (AI)',
};

const EN_FLAGSHIP_DETAILS: Record<
  string,
  { partOfSpeech: string; mechanismEn: string; pitfallsEn?: string; benchmarksEn?: string; tagsEn: string[] }
> = {
  'platform-economy': {
    partOfSpeech: 'Noun (n.)',
    tagsEn: ['Platform Economy', 'Two-Sided Market', 'Network Effects'],
    mechanismEn:
      'Operates via direct and cross-side network effects, near-zero marginal distribution costs, and asymmetric pricing across multi-sided market participants.',
    pitfallsEn:
      'Do not conflate Platform Economy with inventory-led e-commerce retailers operating linear value chains.',
    benchmarksEn:
      'Key metrics: Gross Merchandise Value (GMV), Take Rate (5%–30%), LTV/CAC (> 3.0), and cross-side network elasticity.',
  },
  'network-effects': {
    partOfSpeech: 'Noun (n.)',
    tagsEn: ['Digital Economy', 'Platform Strategy', 'Metcalfe'],
    mechanismEn:
      'Splits into Same-Side effects (direct value per added peer) and Cross-Side effects (more buyers attract more sellers and vice versa).',
    pitfallsEn:
      'Do not confuse demand-side Network Effects with supply-side Economies of Scale.',
    benchmarksEn:
      'Metcalfe’s Law approximates network value scaling proportionally with n(n-1)/2 once critical mass is reached.',
  },
  'two-sided-market': {
    partOfSpeech: 'Noun (n.)',
    tagsEn: ['Platform', 'Rochet & Tirole', 'Pricing'],
    mechanismEn:
      'Platforms routinely subsidize the price-sensitive side to grow liquidity and monetize the inelastic side.',
    pitfallsEn:
      'Always address the chicken-and-egg bootstrapping problem when modeling early-stage two-sided platforms.',
    benchmarksEn: 'Conversion ratio between subsidy side and money side; core liquidity retention.',
  },
  'zero-marginal-cost': {
    partOfSpeech: 'Noun (n.)',
    tagsEn: ['Digital Microeconomics', 'Digital Goods', 'SaaS'],
    mechanismEn:
      'Drives continuously declining average total cost curves, creating natural winner-takes-most dynamics in digital markets.',
    pitfallsEn:
      'Zero marginal reproduction cost never implies zero fixed R&D or cloud infrastructure costs.',
    benchmarksEn: 'Mature SaaS and digital content gross margins typically range between 75% and 90%.',
  },
  'cbdc-central-bank-digital-currency': {
    partOfSpeech: 'Acronym',
    tagsEn: ['CBDC', 'Digital Finance', 'Monetary Policy'],
    mechanismEn:
      'Divided into Retail CBDC (everyday payments) and Wholesale CBDC (interbank settlement), implemented via centralized or permissioned DLT ledgers.',
    pitfallsEn:
      'CBDCs are centralized sovereign liabilities and are fundamentally distinct from decentralized crypto assets like Bitcoin or ADA.',
    benchmarksEn: 'Notable pilots: e-CNY, BIS Project mBridge, Sand Dollar.',
  },
  'rwa-real-world-assets': {
    partOfSpeech: 'Acronym',
    tagsEn: ['Tokenization', 'RWA', 'DeFi', 'Digital Assets'],
    mechanismEn:
      'Combines off-chain legal custody (SPVs/Custodians) with smart contracts and Proof-of-Reserve oracles for 1:1 asset backing.',
    pitfallsEn:
      'Tokenization alone does not create secondary market liquidity if legal ownership transfer remains restricted.',
    benchmarksEn: 'Tokenized US Treasuries and institutional money market funds lead institutional RWA adoption.',
  },
  'depin-decentralized-physical-infrastructure': {
    partOfSpeech: 'Acronym',
    tagsEn: ['DePIN', 'IoT', 'Web3', 'Infrastructure'],
    mechanismEn:
      'Token incentives bootstrap hardware deployment early, followed by real-world B2B/B2C revenue buying and burning protocol tokens.',
    pitfallsEn:
      'Excessive token emissions without paying end-customer demand inevitably collapse unit economics.',
  },
  'llm-large-language-model': {
    partOfSpeech: 'Acronym',
    tagsEn: ['LLM', 'GenAI', 'Transformer', 'NLP'],
    mechanismEn:
      'Trained across three stages: pre-training on web-scale corpora, supervised fine-tuning (SFT), and RLHF / safety alignment.',
    pitfallsEn:
      'LLMs are probabilistic sequence generators, not deterministic truth databases—requiring RAG or source verification to mitigate hallucinations.',
    benchmarksEn: 'Evaluated on MMLU, GSM8K, HumanEval, GPQA, and effective context windows (128K–2M tokens).',
  },
  'rag-retrieval-augmented-generation': {
    partOfSpeech: 'Acronym',
    tagsEn: ['RAG', 'Vector DB', 'Anti-Hallucination', 'Enterprise AI'],
    mechanismEn:
      'Combines Indexing (chunking → vector embeddings → vector store) and Inference (hybrid BM25 + semantic retrieval → reranking → grounded generation).',
    pitfallsEn:
      'Poor table chunking or relying solely on dense vector similarity without BM25 lexical matching hurts precision.',
    benchmarksEn: 'Measured with RAGAS metrics: Context Precision, Context Recall, Faithfulness, and Answer Relevance.',
  },
  'ai-agent-agentic-workflow': {
    partOfSpeech: 'Noun (n.)',
    tagsEn: ['AI Agent', 'MCP', 'Tool Use', 'Automation'],
    mechanismEn:
      'Executes ReAct (Reason + Act) or Plan-and-Execute loops combining Foundation Models, Memory, Tools/MCP, and Guardrails.',
    pitfallsEn:
      'Avoid over-engineering multi-agent orchestration when a single deterministic prompt or linear workflow suffices.',
    benchmarksEn: 'SWE-bench, GAIA benchmark, end-to-end completion rate, and token cost per task.',
  },
  'mcp-model-context-protocol': {
    partOfSpeech: 'Acronym',
    tagsEn: ['MCP', 'AI Agents', 'Interoperability'],
    mechanismEn:
      'Separates Host, Client, and Server roles exposing typed Tools, Resources, and Prompts over JSON-RPC 2.0.',
    pitfallsEn:
      'Enforce least-privilege authentication and strict input validation to prevent prompt injection across external MCP servers.',
  },
  'hallucination-ai': {
    partOfSpeech: 'Noun (n.)',
    tagsEn: ['Hallucination', 'Citation Integrity', 'AI Safety'],
    mechanismEn:
      'Arises from probabilistic next-token prediction when prompts exceed grounded context or retrieval fails.',
    pitfallsEn:
      'In academic research, submitting AI-fabricated references or DOIs is a critical integrity violation.',
    benchmarksEn: 'Mitigated via RAG, search grounding, low temperature (0.0–0.2), and DOI Crossref verification.',
  },
  'geo-generative-engine-optimization': {
    partOfSpeech: 'Acronym',
    tagsEn: ['GEO', 'AEO', 'AI Search', 'SEO'],
    mechanismEn:
      'Optimizes entity definitions, quantitative citations, Schema.org JSON-LD, and llms.txt to maximize AI answer inclusion.',
    pitfallsEn:
      'Keyword stuffing hurts GEO credibility; verifiable statistics and authoritative citations lift inclusion rates.',
  },
  'aeo-answer-engine-optimization': {
    partOfSpeech: 'Acronym',
    tagsEn: ['AEO', 'FAQ Schema', 'DefinedTerm'],
    mechanismEn:
      'Places direct 40–60 word answers below question headings alongside structured DefinedTerm and FAQPage JSON-LD.',
  },
  'eutxo-extended-utxo': {
    partOfSpeech: 'Acronym',
    tagsEn: ['Cardano', 'eUTxO', 'Plutus', 'Smart Contract'],
    mechanismEn:
      'Enables deterministic off-chain fee calculation and parallel validation across non-overlapping UTxOs.',
    pitfallsEn:
      'DApps pooling all liquidity inside one global UTxO risk concurrency contention unless state is sharded.',
  },
  'smart-contract': {
    partOfSpeech: 'Noun (n.)',
    tagsEn: ['Smart Contract', 'Solidity', 'Plutus', 'Automation'],
    mechanismEn:
      'Executes deterministically on EVM bytecode (Solidity) or via Plutus validator scripts checking UTxO spending conditions.',
    pitfallsEn:
      'Immutable code means security bugs such as reentrancy or broken access controls can cause irreversible losses—always audit on Testnet first.',
  },
  'zero-knowledge-proof': {
    partOfSpeech: 'Acronym',
    tagsEn: ['ZKP', 'Privacy', 'ZK-Rollup', 'Cryptography'],
    mechanismEn:
      'Guarantees completeness, soundness, and zero-knowledge—powering zk-SNARK/zk-STARK rollups and private decentralized identity.',
  },
};

function mapLegacyTerm(raw: CatalogGlossaryTerm, lang: SupportedLanguage): LexiconEntry {
  const isAcronym = ACRONYM_PATTERN.test(raw.term.trim()) || /\([A-Z0-9]{2,}\)/.test(raw.term);
  const textLower = `${raw.term} ${raw.short_definition}`.toLowerCase();

  let domain: GlossaryDomain = 'blockchain';
  let domainLabel = lang === 'en' ? 'Blockchain & Web3' : 'Blockchain & Web3';
  if (
    textLower.includes('ai ') ||
    textLower.includes('artificial intelligence') ||
    textLower.includes('machine learning')
  ) {
    domain = 'ai';
    domainLabel = lang === 'en' ? 'Artificial Intelligence (AI)' : 'Trí tuệ nhân tạo (AI)';
  } else if (
    textLower.includes('aml') ||
    textLower.includes('kyc') ||
    textLower.includes('fiat') ||
    textLower.includes('treasury') ||
    textLower.includes('governance') ||
    textLower.includes('regulation')
  ) {
    domain = 'kinh-te-so';
    domainLabel = lang === 'en' ? 'Digital Economy & Governance' : 'Kinh tế số & Quản trị';
  }

  return {
    slug: raw.slug,
    term: raw.term,
    partOfSpeech:
      lang === 'en'
        ? isAcronym
          ? 'Acronym / Term'
          : 'Specialized Term'
        : isAcronym
          ? 'Từ viết tắt / Thuật ngữ'
          : 'Thuật ngữ chuyên ngành',
    vietnamese:
      lang === 'en'
        ? domainLabel
        : raw.source_label === 'Từ điển Cardano & Web3'
          ? `Thuật ngữ ${domainLabel}`
          : raw.source_label,
    domain,
    domainLabel,
    tags: [domainLabel, 'AEO DefinedTerm', 'Cardano Ecosystem'],
    entryType: isAcronym ? 'acronym' : 'term',
    isFlagship: false,
    coreDefinition: raw.short_definition,
    coreDefinitionEn: raw.short_definition,
    mechanism: raw.full_explanation,
    mechanismEn: raw.full_explanation,
    sourceLabel: lang === 'en' ? 'Cardano & Web3 Lexicon' : raw.source_label,
  };
}

export function getLexiconEntries(explicitLang?: SupportedLanguage): LexiconEntry[] {
  const lang = explicitLang || getLanguage();
  const flagshipLocalized: LexiconEntry[] = FLAGSHIP_LEXICON.map((item) => {
    if (lang !== 'en') return item;
    const enOverride = EN_FLAGSHIP_DETAILS[item.slug];
    return {
      ...item,
      partOfSpeech: enOverride?.partOfSpeech || 'Noun (n.)',
      vietnamese: item.term,
      domainLabel: EN_DOMAIN_LABELS[item.domain],
      tags: enOverride?.tagsEn || item.tags,
      coreDefinition: item.coreDefinitionEn,
      mechanism: enOverride?.mechanismEn || item.coreDefinitionEn,
      pitfalls: enOverride?.pitfallsEn,
      benchmarks: enOverride?.benchmarksEn,
      sourceLabel: 'VNEconomics Editorial • Research Lexicon',
    };
  });

  const flagshipMap = new Map(flagshipLocalized.map((item) => [item.slug, item]));
  const legacyTerms = getGlossaryTerms(lang);

  const merged: LexiconEntry[] = [...flagshipLocalized];
  for (const raw of legacyTerms) {
    if (!flagshipMap.has(raw.slug)) {
      merged.push(mapLegacyTerm(raw, lang));
    }
  }
  return merged;
}

export function getLexiconEntryBySlug(slug: string, explicitLang?: SupportedLanguage): LexiconEntry | undefined {
  return getLexiconEntries(explicitLang).find((e) => e.slug === slug);
}
