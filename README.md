# VNEconomics Facebook Autopost

Hệ thống tự động lấy bài viết từ **https://vneconomics.com/** và **https://marketing2student.com/** (qua WP REST API), dùng **Gemini API** viết lại nội dung theo Template chuẩn, chuyển đổi ảnh `.webp` → `.jpg` và tự động đăng lên Fanpage **https://www.facebook.com/vneconomics/** theo 4 khung giờ cố định mỗi ngày.

## Lịch đăng mặc định (4 bài/ngày - `Asia/Ho_Chi_Minh`)
- **08:00**: `vneconomics.com`
- **13:00**: `marketing2student.com`
- **17:00**: `vneconomics.com`
- **21:00**: `marketing2student.com`

Thuật toán tự động **luân phiên chuyên mục (Category Round-Robin + LRU)** để phủ đều toàn bộ bài viết. Khi hết bài mới, hệ thống tự quay vòng bài cũ và đổi góc độ viết bài (`Angle 1 → 2 → 3`) để tránh trùng lặp nội dung.

---

## Hướng dẫn cài đặt trên Plesk

### 1. Tạo Database & Cấu hình `api/config.php`
1. Trong Plesk, tạo 1 MySQL Database (charset `utf8mb4_unicode_ci`) và import file `migrations/001_social_autopost.sql` (hoặc hệ thống sẽ tự tạo bảng ở lần chạy đầu tiên).
2. Sao chép `api/config.sample.php` thành `api/config.php` (hoặc đặt `config.php` ra thư mục cha ngoài `httpdocs` để bảo mật).
3. Điền các thông số vào `api/config.php`:
   - `db`: thông tin MySQL vừa tạo.
   - `gemini.api_key`: API Key Gemini trả phí của bạn.
   - `facebook.page_id` & `facebook.page_access_token`: lấy từ Meta for Developers (chọn `enabled => false` trước để chạy thử chế độ `SIMULATED`, khi ổn định mới bật `enabled => true`).

### 2. Đồng bộ bài viết lần đầu & Kiểm thử
- Mở trình duyệt vào `https://<domain-cua-ban>/admin.html`, nhập `admin_token` và bấm **Đồng bộ WordPress**.
- Hoặc chạy qua SSH/CLI trên Plesk:
  ```bash
  php /var/www/vhosts/<domain>/httpdocs/api/wp_sync.php
  php /var/www/vhosts/<domain>/httpdocs/api/cron_fb_autopost.php --slot=08:00 --force=1
  ```

### 3. Cấu hình 4 Cron Job trên Plesk (Scheduled Tasks)
Vào **Plesk → Websites & Domains → Scheduled Tasks → Add Task** (chọn **Run a PHP script** hoặc **Run a command**, múi giờ `Asia/Ho_Chi_Minh`):

1. **08:00 hàng ngày**:
   `php /var/www/vhosts/<domain>/httpdocs/api/cron_fb_autopost.php --slot=08:00`
2. **13:00 hàng ngày**:
   `php /var/www/vhosts/<domain>/httpdocs/api/cron_fb_autopost.php --slot=13:00`
3. **17:00 hàng ngày**:
   `php /var/www/vhosts/<domain>/httpdocs/api/cron_fb_autopost.php --slot=17:00`
4. **21:00 hàng ngày**:
   `php /var/www/vhosts/<domain>/httpdocs/api/cron_fb_autopost.php --slot=21:00`
