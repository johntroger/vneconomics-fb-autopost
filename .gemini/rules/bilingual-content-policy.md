# Quy tắc Song ngữ Bắt buộc (Strict Bilingual VI / EN Policy)

Áp dụng vĩnh viễn cho toàn bộ mã nguồn, giao diện và nội dung mới tạo trên dự án **VNEconomics**:

1. **Nguyên tắc Tuyệt đối cho Phiên bản Tiếng Anh (`lang === 'en'`)**:
   - **KHÔNG ĐƯỢC PHÉP** xuất hiện bất kỳ ký tự/từ ngữ tiếng Việt nào (bao gồm chữ `đ/Đ` và mọi nguyên âm có dấu tiếng Việt) trong giao diện, nhãn nút, tiêu đề, mô tả, thẻ sản phẩm, khóa học, thuật ngữ từ điển, câu hỏi luyện tập hay bài viết khi đang ở chế độ Tiếng Anh.
   - Ký hiệu tiền tệ tiếng Việt (`0đ`) phải chuyển thành `$0` hoặc `Free` ở bản tiếng Anh.
   - Nếu một bài viết dài chưa có bản dịch HTML đầy đủ trong cơ sở dữ liệu, tuyệt đối không hiển thị nội dung gốc tiếng Việt ở chế độ `EN` — chỉ hiển thị bản tóm tắt tiếng Anh chuẩn (`title_en`, `tldr_en`, `excerpt_en`) kèm nút dịch trực tiếp bằng AI BYOK.

2. **Nguyên tắc cho Phiên bản Tiếng Việt (`lang === 'vi'`)**:
   - Được phép giữ các thuật ngữ chuyên ngành tiếng Anh (như *Blockchain*, *Smart Contract*, *RAG*, *MCP*, *eUTxO*, *SEO/GEO/AEO*, *Vibe Coding*).

3. **Bắt buộc Song ngữ cho Mọi Nội dung Mới**:
   - Mỗi khi tạo mới bất kỳ thành phần UI, bài viết, sách, khóa học, AI Skill, thuật ngữ từ điển hoặc câu hỏi luyện tập nào, **bắt buộc** phải bổ sung đồng thời cả 2 phiên bản `vi` và `en` (trong `src/core/i18n/locales/{vi,en}.ts`, dữ liệu `*_en` / `src/data/catalog.en.json`, hoặc cột `*_en` trong MySQL).
   - Luôn chạy `npm test` (bao gồm `tests/bilingual.test.mjs`) để tự động kiểm duyệt độ tinh khiết 100% tiếng Anh trước khi hoàn tất.
