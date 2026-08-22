# NKGD — Personal Trading OS

Phiên bản hiện tại: **v1.4.1**

Ứng dụng nhật ký giao dịch chạy trên máy cá nhân dành cho trader Forex, Vàng, Crypto và các thị trường tài chính khác. NKGD giúp ghi lại giao dịch, tính khối lượng, theo dõi P&L, phân tích hiệu suất và lưu ảnh biểu đồ trong một giao diện sáng/tối thống nhất.

## Tính năng chính

- **Đăng nhập bằng `.env`:** Mật khẩu được cấu hình bằng `NKGD_APP_PASSWORD`; ứng dụng yêu cầu nhập lại sau mỗi lần mở hoặc tải lại trang và bảo vệ cả giao diện lẫn API.
- **Light/Dark mode:** Chuyển nhanh giao diện sáng hoặc tối từ màn hình đăng nhập và thanh tiêu đề; lựa chọn được ghi nhớ cho lần truy cập tiếp theo.
- **Market top bar:** Hiển thị liên tục trạng thái phiên Á/Âu/Mỹ và tỷ giá EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, NZD/USD.
- **Quản lý đa tài khoản:** Tạo nhiều tài khoản Live, Demo hoặc Prop; chuyển nhanh tài khoản đang làm việc và tách riêng toàn bộ giao dịch, Dashboard, Calendar, import broker, số dư cùng mức rủi ro mặc định.
- **Dashboard hiệu suất:** Tổng P&L, win rate, profit factor, Average R, lệnh tốt/xấu nhất, equity curve và thống kê kỷ luật giao dịch.
- **Phân tích theo timeframe:** So sánh thời gian giữ lệnh trung bình, Win Rate, Profit Factor, P&L, Average R và phân bổ Win/Loss/BE giữa các khung thời gian.
- **Nhật ký giao dịch:** Lưu thời gian mở/đóng lệnh, symbol, timeframe, side, setup, cảm xúc, Entry/SL/TP/Exit, lot, units, phí, ghi chú và nhiều ảnh biểu đồ.
- **Chấm điểm tuân thủ:** Review từng lệnh theo 7 quy tắc, tự tính điểm 0–100 và so sánh win rate, P&L đúng kế hoạch, P&L phá kỷ luật, lỗi thường gặp cùng chi phí do lỗi giao dịch.
- **P&L theo đúng đơn vị tiền tệ:** Tự nhận diện đồng tiền định giá và tự động lấy tỷ giá lịch sử để quy đổi về USD; tỷ giá được cache tại máy.
- **Lot & Position Size Calculator:** Tính lot/units theo số dư, phần trăm rủi ro, khoảng Stop Loss, contract size và tỷ giá quy đổi.
- **Calendar P&L:** Xem hiệu suất theo từng tháng hoặc lọc một khoảng ngày tùy chọn; có preset 7 ngày, 30 ngày, tháng này và năm nay.
- **Economic Calendar:** Nhận diện phiên Á/Âu/Mỹ theo thời gian thực, theo dõi tin kinh tế, mức độ quan trọng, Actual/Forecast/Previous và các thị trường có thể bị tác động.
- **Import lịch sử broker:** Đọc lịch sử lệnh đã đóng từ MetaTrader 5 (`HTML`, `CSV`) và cTrader (`CSV`), xem trước dữ liệu và bỏ qua giao dịch trùng lặp.
- **Blog / Notes:** Viết nhật ký, phân tích, chiến lược và bài học bằng Markdown; hỗ trợ dán ảnh trực tiếp.
- **Quản lý symbol:** Có sẵn các cặp phổ biến và hỗ trợ cấu hình symbol, pip size, contract size tùy chỉnh.
- **Dữ liệu & Sao lưu:** Xuất/nhập toàn bộ dữ liệu bằng JSON, tạo dữ liệu mẫu hoặc xóa dữ liệu sau bước xác nhận.
- **Lưu trữ local:** Giao dịch, thiết lập và hình ảnh được lưu trực tiếp trong thư mục `data/`, không phụ thuộc cache của trình duyệt.

## Yêu cầu hệ thống

- [Node.js](https://nodejs.org/) 20 LTS trở lên
- npm (được cài kèm Node.js)
- Trình duyệt hiện đại như Chrome, Edge, Firefox hoặc Safari
- Kết nối Internet khi cần lấy tỷ giá quy đổi mới từ Frankfurter API

## Cài đặt

```bash
git clone https://github.com/thang5991/NKGD.git
cd NKGD
npm install
```

## Khởi chạy ứng dụng

### Chế độ phát triển

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). Vite sẽ phục vụ giao diện và API lưu trữ local trong cùng một tiến trình.

### Chế độ production

```bash
npm run build
npm start
```

Mặc định ứng dụng chạy tại [http://localhost:3000](http://localhost:3000). Có thể đổi cổng bằng biến môi trường `PORT`:

```bash
PORT=8080 npm start
```

### Cấu hình mật khẩu và Economic Calendar

Sao chép file cấu hình mẫu trước khi chạy ứng dụng:

```bash
cp .env.example .env
```

```env
NKGD_APP_PASSWORD=your-strong-local-password
TRADING_ECONOMICS_API_KEY=your_api_key
```

`NKGD_APP_PASSWORD` là bắt buộc và phải có ít nhất 6 ký tự. Trading Economics API key là tùy chọn vì ứng dụng có nguồn lịch dự phòng. Các giá trị này chỉ được đọc ở backend local, không được gửi xuống trình duyệt hoặc commit lên GitHub.

Lệnh hữu ích:

| Lệnh | Mục đích |
| --- | --- |
| `npm run dev` | Chạy môi trường phát triển tại cổng 3000 |
| `npm run build` | Kiểm tra TypeScript và tạo bản build trong `dist/` |
| `npm start` | Chạy server production từ bản build |
| `npm run preview` | Xem trước bản build bằng Vite |

## Bắt đầu sử dụng

1. Mở **Nhật ký giao dịch** và chọn **Thêm giao dịch** để nhập lệnh thủ công.
2. Điền Entry, Stop Loss, Take Profit, Exit và lot/units. Ứng dụng sẽ tính P&L, R:R và R thực tế.
3. Với cặp có đồng tiền định giá khác USD, giữ kết nối Internet để ứng dụng lấy tỷ giá của ngày giao dịch. Kết quả đã lấy được lưu trong `data/fxRates.json` để tái sử dụng.
4. Bật **Đánh giá lệnh này** trong form giao dịch, sau đó chọn các quy tắc đã vi phạm để tạo thống kê kỷ luật trên Dashboard.
5. Mở **Lịch Hiệu suất P&L** để xem theo tháng hoặc chọn khoảng ngày cần thống kê.
6. Mở **Dữ liệu & Sao lưu** để xuất file backup định kỳ.

## Import từ MetaTrader 5 và cTrader

Trong **Dữ liệu & Sao lưu → Nhập Nhật ký từ Nền tảng Giao dịch**:

- **MetaTrader 5:** Xuất báo cáo Account History dưới dạng HTML hoặc CSV, sau đó chọn **Import MetaTrader 5**.
- **cTrader:** Xuất lịch sử giao dịch đã đóng dưới dạng CSV, sau đó chọn **Import cTrader**.
- Kiểm tra màn hình xem trước trước khi xác nhận. Ứng dụng chỉ nhập lệnh đã đóng, giữ nguyên dữ liệu đang có và bỏ qua các bản ghi trùng ID.

Các trường được ánh xạ gồm thời gian mở/đóng, symbol, Buy/Sell, volume, Entry, Exit, SL, TP, commission, swap, P&L và comment khi file nguồn có cung cấp.

## Dữ liệu được lưu ở đâu?

```text
data/
├── accounts.json     # Danh sách tài khoản giao dịch
├── trades.json       # Giao dịch
├── blog.json         # Bài viết và ghi chú
├── customPairs.json  # Symbol tùy chỉnh
├── settings.json     # Thiết lập ứng dụng
├── images.json       # Metadata hình ảnh
├── fxRates.json      # Cache tỷ giá tự động (tạo khi sử dụng)
└── uploads/          # Ảnh biểu đồ
```

Các file trong `data/` là dữ liệu sử dụng thực tế. Hãy xuất backup trong ứng dụng hoặc sao chép cả thư mục này trước khi nâng cấp, di chuyển máy hay xóa dữ liệu.

## Cách tính P&L và rủi ro

Giá trị thô được tính theo đồng tiền định giá của symbol:

```text
Long P&L  = (Exit - Entry) × Units
Short P&L = (Entry - Exit) × Units
Risk      = |Entry - Stop Loss| × Units
```

Sau đó P&L và Risk được quy đổi sang đồng tiền tài khoản bằng tỷ giá lịch sử, rồi trừ phí giao dịch. `R thực tế = P&L / Risk`.

Với CFD, chỉ số hoặc symbol có contract size đặc thù, hãy kiểm tra cấu hình symbol trong ứng dụng trước khi dùng kết quả để đặt lệnh thực tế.

## Sao lưu và an toàn dữ liệu

- Mật khẩu nằm trong `.env` qua biến `NKGD_APP_PASSWORD` và không được đóng gói vào backup. Muốn đổi mật khẩu, sửa biến này rồi khởi động lại server.
- Nếu quên mật khẩu, đặt giá trị mới trong `.env` rồi khởi động lại ứng dụng. Dữ liệu giao dịch không bị ảnh hưởng.
- Dữ liệu được lưu trên máy đang chạy server; ứng dụng không cung cấp đồng bộ cloud hoặc đăng nhập nhiều người dùng.
- Không đưa file `.env`, dữ liệu giao dịch cá nhân hoặc ảnh biểu đồ riêng tư lên repository công khai.
- Nên dùng chức năng **Xuất JSON Backup** thường xuyên và lưu bản backup ở vị trí khác máy.
- Chỉ bind server ra mạng nội bộ/Internet khi bạn đã bổ sung cơ chế xác thực và kiểm soát truy cập phù hợp.

## Xử lý lỗi thường gặp

- **Trang báo “Not found”:** Chạy lại `npm run build` trước `npm start`.
- **Cổng 3000 đang được sử dụng:** Dừng tiến trình cũ hoặc chạy production với cổng khác, ví dụ `PORT=8080 npm start`.
- **Không lấy được tỷ giá:** Kiểm tra kết nối Internet, sau đó bấm **Thử lại**. Cuối tuần/ngày nghỉ, hệ thống tự tìm tỷ giá gần nhất trong tối đa 7 ngày trước đó.
- **Import broker không nhận file:** Chắc chắn báo cáo có các cột symbol, side/type, volume và profit; ưu tiên file CSV/HTML nguyên bản do nền tảng xuất ra.
- **Dữ liệu chưa cập nhật:** Bấm nút làm mới trên thanh tiêu đề và kiểm tra terminal đang chạy ứng dụng có lỗi hay không.

## Công nghệ

- React 18, TypeScript, Vite
- Tailwind CSS
- Recharts
- Node.js REST API và filesystem storage
- Lucide Icons

## Phạm vi sử dụng

NKGD là công cụ ghi chép và phân tích cá nhân, không phải hệ thống đặt lệnh và không cung cấp lời khuyên đầu tư. Hãy đối chiếu thông số lot, contract size, phí và tỷ giá với broker trước khi giao dịch.
