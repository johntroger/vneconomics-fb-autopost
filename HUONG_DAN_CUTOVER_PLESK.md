# HƯỚNG DẪN CUTOVER ZERO-DOWNTIME & ROLLBACK (< 2 PHÚT) TRÊN PLESK

Tài liệu triển khai gói `vneconomics-production.zip` lên server Plesk cho tên miền **https://vneconomics.com/**.

---

## Bước 1: Backup nguyên trạng WordPress cũ (Bắt buộc)
1. Trong **Plesk → Files**, giữ nguyên thư mục `/httpdocs` hiện tại (hoặc nén dự phòng `wp-backup-httpdocs.zip`).
2. Trong **Plesk → Databases**, Export toàn bộ SQL của WordPress cũ lưu về máy và giữ nguyên database cũ trên server tối thiểu **30 ngày**.

## Bước 2: Giải nén Bản mới vào Thư mục Song song (`/httpdocs_v2`)
1. Tạo thư mục `/httpdocs_v2/` cùng cấp với `/httpdocs/`.
2. Upload tệp **`vneconomics-production.zip`** (tạo từ lệnh `npm run export:plesk`) vào `/httpdocs_v2/` và bấm **Extract Files**.
3. **Copy toàn bộ thư mục Media cũ ngay trên server** (nhanh và không tốn băng thông upload):
   - Copy `/httpdocs/wp-content/uploads` → `/httpdocs_v2/wp-content/uploads`.
   - Copy tệp `/httpdocs_v2/uploads/.htaccess` vào `/httpdocs_v2/wp-content/uploads/.htaccess` để chặn thực thi PHP.

## Bước 3: Import Database MySQL Mới
Tạo 1 MySQL Database mới (`utf8mb4_unicode_ci`) trong Plesk và import theo đúng thứ tự:
1. `migrations/001_social_autopost.sql` & `migrations/002_telegram_autopost.sql` (nếu dùng DB mới hoàn toàn cho cả Autopost).
2. `migrations/003_core_platform_schema.sql`
3. `migrations/004_gamification_web3_nft.sql`
4. `exports/seed_vneconomics_data.sql` *(216 bài viết, 58 trang, 219 thuật ngữ Từ điển Cardano, 59 sách, 10 khóa học, 21 quy tắc 301 Redirect)*.
5. *(Tùy chọn AEO)* Sau khi chạy `node scripts/enrich-aeo-batch.mjs --limit=216` với `GEMINI_API_KEY`, import thêm `exports/aeo_enrichment.sql`.

## Bước 4: Đặt `config.php` Ngoài `httpdocs_v2` (Bảo mật tối đa)
Sao chép `api/config.sample.php` thành **`config.php`** đặt ở **thư mục cha ngoài `httpdocs_v2`** (trình nạp `api/db.php` tự động dò tìm ở thư mục cha), điền:
- Thông số `db` (Database mới vừa tạo).
- `security.admin_token`, `security.download_hmac_secret`, `security.admin_firebase_uids`.
- `firebase.project_id` của VNEconomics.
- `turnstile.secret_key` (Cloudflare Turnstile).
- Thông số `facebook`, `telegram`, `gemini` của hệ thống Autopost.

## Bước 5: Chuyển Document Root (Cutover vào giờ thấp điểm 01:00–03:00 sáng)
1. Vào **Plesk → Websites & Domains → Hosting Settings**.
2. Đổi **Document root** từ `/httpdocs` sang **`/httpdocs_v2`** → bấm **OK**.
3. Kiểm tra nhanh các URL:
   - `https://vneconomics.com/api/health.php` → trả `db_status: "connected"`
   - `https://vneconomics.com/sitemap_index.xml` & `https://vneconomics.com/llms.txt`
   - Thử mở 1 bài viết, 1 sản phẩm (`/product/...`), 1 thuật ngữ (`/tu-dien/...`) và `/learn-and-earn/`.

## Bước 6: Cấu hình Cloudflare (WAF + Turnstile + Cache Rule bắt buộc cho SSR)
1. Bật Cloudflare Proxy (đám mây cam) và giới hạn Firewall Plesk chỉ nhận dải IP Cloudflare.
2. Bật **WAF Managed Rules**, **Bot Fight Mode** (cho phép Googlebot, Bingbot, GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot, Facebook/Zalo) và **Rate Limiting** cho `/api/*`.
3. **Cache Rule bắt buộc**:
   - Chỉ cache các tệp tĩnh (`/assets/*`, `/wp-content/uploads/*`).
   - **Bypass Cache** đối với HTML và `/api/*` để header `Vary: User-Agent` trên `api/ssr_render.php` luôn phân biệt chính xác Bot vs. Người dùng thật.

## Bước 7: Cập nhật Cron Autopost & Search Console
1. Trong **Plesk → Scheduled Tasks**, bổ sung tác vụ đồng bộ bài viết từ MySQL mới sang Autopost:
   `php /var/www/vhosts/vneconomics.com/httpdocs_v2/api/local_autopost_sync.php`
2. Giữ nguyên 4 cron đăng bài Facebook/Telegram (`08:00`, `13:00`, `17:00`, `21:00`) trỏ về đường dẫn `/httpdocs_v2/api/cron_fb_autopost.php`.
3. Submit lại `https://vneconomics.com/sitemap_index.xml` trong **Google Search Console** và **Bing Webmaster Tools**.

## Quy trình Rollback Khẩn cấp (< 2 phút)
Nếu phát hiện bất kỳ lỗi nghiêm trọng nào sau Cutover:
1. Vào **Plesk → Hosting Settings**.
2. Đổi **Document root** từ `/httpdocs_v2` ngược về **`/httpdocs`** → bấm **OK**.
3. Xóa cache Cloudflare (*Purge Everything*). Website WordPress cũ hoạt động lại bình thường ngay lập tức.

---

## Ghi chú về 3 Ngân hàng Đề thi
Toàn bộ dữ liệu 3 đề thi (`kiem-tra-kien-thuc-digital-marketing`, `kiem-tra-kien-thuc-e-marcomme`, `bai-thi-cuoi-ky-khoa-hoc-tai-chinh-phap-ly-blockchain`) đã được trích xuất nguyên vẹn tại **`exports/exam_banks/`** (JSON + `exam_banks_export.sql`) để bạn import sang **`https://staging-store.vneconomics.com/`** bất cứ lúc nào.
