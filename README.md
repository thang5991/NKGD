# Trading Journal Local — Personal Trading OS

Website **Nhật ký giao dịch chuyên nghiệp (Personal Trading OS)** dành cho trader Forex, Vàng (XAUUSD), Crypto và các thị trường tài chính.

Giao diện dark mode hiện đại lấy cảm hứng từ Ondo Perps: nền đen charcoal (`#090A09`), chữ trắng ngà (`#F4F5EF`), điểm nhấn xanh lime (`#B8F35A`), viền mảnh và card phẳng cao cấp.

---

## 🚀 Công nghệ & Kiến trúc

- **Framework**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS + Lucide Icons + Custom Ondo Dark Theme
- **Data Layer**: IndexedDB Local Storage (`TradingJournalDB`) với Database Abstraction Layer độc lập
- **Image Storage**: Ảnh chụp màn hình biểu đồ được tự động resize (<1800px), nén JPEG và lưu trực tiếp dưới dạng **Binary Blob** trong IndexedDB
- **Charts**: Recharts (Equity Curve mượt mà, tooltip chi tiết)

---

## ⚡ Hướng dẫn Chạy ứng dụng

### 1. Cài đặt thư viện
```bash
npm install
```

### 2. Chạy môi trường Development
```bash
npm run dev
```
Mở trình duyệt tại: `http://localhost:3000`

### 3. Build Production
```bash
npm run build
npm run preview
```

---

## 🌟 Các Tính năng Chính

### 1. 📊 Dashboard Tổng quan
- Các chỉ số KPI chính: Tổng P&L, Tổng số lệnh, Win Rate, Số lệnh Thắng/Thua, Hòa vốn (Breakeven), Profit Factor, Average R thực tế.
- **Equity Curve**: Biểu đồ đường cong vốn tích lũy theo thời gian thực.
- Thống kê chi tiết Gross Profit, Gross Loss, Best Trade, Worst Trade, Average P&L.
- Bảng 6 giao dịch gần nhất với Side (Long/Short), Setup, R:R và số lượng ảnh biểu đồ đính kèm.

### 2. 📅 Calendar P&L
- Xem hiệu suất giao dịch trực quan theo từng ngày trong tháng.
- Ngày thắng có màu xanh mint (`#39D98A`), ngày thua có màu đỏ (`#FF665F`), ngày hiện tại được viền nổi bật.
- Hiển thị P&L, số lệnh và tổng R của từng ngày. Bấm vào bất kỳ ngày nào để xem danh sách lệnh chi tiết của ngày đó.
- **Tổng kết theo Tuần (Weekly Summary)**: Thẻ tổng kết P&L, số lệnh và Win Rate của từng tuần trong tháng.
- Nút chuyển tháng trước, tháng sau và quay về tháng hiện tại.

### 3. 📖 Nhật ký Giao dịch (Trade Journal)
- Nhập đầy đủ thông tin: Ngày giờ, Cặp giao dịch, Side (Long/Short), Thị trường, Setup, Cảm xúc (Bình tĩnh, Kỷ luật, Tự tin, FOMO, Sợ hãi, Tham lam, Mệt mỏi).
- Giá: Entry, Stop Loss, Take Profit, Exit.
- Khối lượng: Lot, Units (tự động đồng bộ theo contract size), Phí giao dịch (Fee).
- **Công thức tính toán chuẩn xác**:
  - Long: `P&L = (Exit - Entry) * Units - Fee`
  - Short: `P&L = (Entry - Exit) * Units - Fee`
  - Risk ban đầu: `Risk = |Entry - SL| * Units`
  - Bội số R thực tế: `R = P&L / Risk` (Dấu của R luôn luôn cùng dấu với P&L)
  - Tỷ lệ R:R kế hoạch: `Reward / Risk`
- Hỗ trợ thêm nhiều ảnh screenshot biểu đồ trước/khi vào/sau khi đóng lệnh. Hỗ trợ Paste trực tiếp (`Ctrl+V` / `Cmd+V`).
- Bộ lọc tìm kiếm thông minh theo mã cặp, setup, ghi chú, vị thế Long/Short, kết quả Win/Loss/BE và thị trường.
- Modal xem chi tiết lệnh và phóng to biểu đồ (Lightbox).

### 4. ✍️ Blog / Notes (Module Độc lập)
- Module riêng biệt hoàn toàn với Trade Notes, lưu trữ tại Object Store `blog` trong IndexedDB.
- Phân loại bài viết: **Nhật ký (Journal)**, **Phân tích (Analysis)**, **Chiến lược (Strategy)**, **Bài học (Lesson)**, **Blog tự do**.
- Thanh công cụ định dạng Markdown: In đậm, In nghiêng, Tiêu đề H2/H3, Danh sách, Checklist nhiệm vụ, Trích dẫn, Khối code, Nút chèn nhanh mẫu phân tích giao dịch.
- Đếm từ và ký tự trực tiếp theo thời gian thực.
- Trạng thái lưu: `Chưa lưu` / `Đã lưu`, thời gian cập nhật lần cuối.
- Phím tắt lưu bài nhanh: `Ctrl + S` / `Cmd + S`.
- Đính kèm nhiều hình ảnh, tự động nén và lưu dạng Blob trong IndexedDB.
- Khi xóa bài viết, tất cả các ảnh liên quan trong IndexedDB sẽ tự động được dọn dẹp sạch sẽ.

### 5. 🧮 Lot & Position Size Calculator (Medio Style)
- Tính toán khối lượng vào lệnh chuẩn theo Pip Value thực tế.
- Đầu vào: Số dư tài khoản ($), % Rủi ro mong muốn, Cặp giao dịch, Stop Loss (Pips hoặc khoảng giá Entry - SL).
- Đầu ra: Số tiền rủi ro ($), Khoảng cách SL (Pips), Pip Value / Lot ($), Khối lượng đề xuất (Lot & Units).
- Hỗ trợ tỷ giá quy đổi USD cho các cặp chéo (Cross Pairs) không có USD làm quote currency.
- Nút **"Dùng Khối lượng này cho Giao dịch"**: Tự động chuyển thông số sang Form tạo lệnh nhanh chóng.

### 6. 🌐 Quản lý Cặp Giao dịch Tùy chỉnh (Custom Pairs)
- Có sẵn 28 cặp Forex chính từ 8 đồng tiền lớn: USD, EUR, GBP, JPY, AUD, CAD, CHF, NZD cùng với XAUUSD, BTCUSDT, ETHUSDT.
- Cho phép tạo thêm mã riêng bất kỳ (VD: `US30`, `NAS100`, `SOLUSDT`, `EURSGD`...).
- Thiết lập tùy chỉnh: Pip Size, Contract Size, Loại tài sản.
- Lưu trữ trong IndexedDB, xuất hiện trong toàn bộ dropdown lựa chọn cặp.

### 7. 💾 Sao lưu & Khôi phục (Backup / Restore)
- **Xuất JSON Backup**: Chuyển đổi toàn bộ giao dịch, bài viết blog, cặp tùy chỉnh, cài đặt và ảnh Blob (dưới dạng base64) vào 1 file JSON duy nhất.
- **Nhập JSON Backup**: Khôi phục lại toàn bộ dữ liệu và chuyển đổi ngược lại thành Binary Blob trong IndexedDB.
- **Tạo Dữ liệu Mẫu (Seed Demo)**: Tự động tạo 7 giao dịch và 2 bài viết blog thực tế để trải nghiệm đầy đủ các tính năng.
- **Xóa toàn bộ dữ liệu**: Xóa sạch dữ liệu an toàn với mã xác nhận.

---

## 🔒 An toàn & Bảo mật Dữ liệu

- Không gửi dữ liệu ra Internet.
- Dữ liệu nằm trọn vẹn trong IndexedDB của trình duyệt.
- Dùng chức năng **Xuất file Sao lưu JSON** định kỳ để lưu trữ an toàn.
