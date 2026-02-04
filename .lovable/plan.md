

## Hệ Thống Cổng Thanh Toán Tự Động - Multi-tenant SaaS

### Tổng quan
Xây dựng nền tảng SaaS cho phép nhiều merchant (người bán) đăng ký, cấu hình thông tin ngân hàng của riêng họ, và tạo các link/QR thanh toán để nhận tiền từ khách hàng. Hệ thống sẽ tích hợp SePay API để tự động xác nhận khi có thanh toán thành công.

---

### Tính năng MVP

#### 1. Trang chủ & Marketing
- Landing page giới thiệu dịch vụ với giao diện tươi sáng, đầy màu sắc
- Các lợi ích của việc sử dụng hệ thống
- Nút đăng ký/đăng nhập nổi bật

#### 2. Xác thực Merchant
- Đăng ký tài khoản bằng email và mật khẩu
- Đăng nhập và quản lý phiên đăng nhập
- Bảo mật với validation đầu vào

#### 3. Dashboard Merchant (mỗi merchant có dashboard riêng)
- **Tổng quan**: Số dư, tổng giao dịch hôm nay, giao dịch đang chờ
- **Cấu hình ngân hàng**: Nhập thông tin tài khoản ngân hàng, API key SePay
- **Tạo Payment Link**: Nhập số tiền, mô tả, tạo link thanh toán có thể chia sẻ
- **Tạo QR Code tĩnh**: Tạo mã QR cố định cho cửa hàng
- **Lịch sử giao dịch**: Danh sách các giao dịch đã nhận với trạng thái

#### 4. Trang Thanh Toán Cho Khách Hàng
- Trang công khai hiển thị thông tin thanh toán
- Hiển thị mã QR ngân hàng để khách quét
- Hướng dẫn chuyển khoản với nội dung chuẩn
- Tự động cập nhật trạng thái khi thanh toán thành công

#### 5. Tích hợp SePay API
- Webhook nhận thông báo khi có giao dịch mới
- Tự động đối chiếu và xác nhận thanh toán
- Cập nhật trạng thái giao dịch real-time

---

### Cấu trúc Dữ liệu

- **Merchants**: Thông tin người bán, cấu hình ngân hàng, API keys
- **Payment Links**: Các link thanh toán đã tạo
- **Transactions**: Lịch sử giao dịch, trạng thái

---

### Giao diện
- Phong cách tươi sáng với gradient màu sắc
- Mobile-responsive cho cả merchant dashboard và trang thanh toán
- Icons và animations nhẹ nhàng tạo trải nghiệm thân thiện

---

### Yêu cầu Kỹ thuật
- **Backend**: Supabase (Database + Auth + Edge Functions)
- **SePay Integration**: Edge function xử lý webhook từ SePay
- **Bảo mật**: Row Level Security để mỗi merchant chỉ thấy dữ liệu của mình

