## Mục tiêu

Chủ shop **chỉ cần thêm tài khoản ngân hàng** là tạo được link/QR thanh toán gửi khách, và hệ thống tự xác nhận "đã nhận tiền" gần như tức thì — không ai phải tự đi lấy khóa API SePay nữa. Kèm dọn gọn giao diện, giữ đúng tông màu và font hiện tại.

Tiền vẫn chảy trực tiếp vào tài khoản của chủ shop.

---

## Phần 1 — Cấu hình SePay dùng chung ở cấp hệ thống

- Khóa SePay của nền tảng lưu ở phía máy chủ (secret + bảng cấu hình hệ thống), không bao giờ gửi xuống trình duyệt.
- Trang Quản trị có mục **"Kết nối SePay hệ thống"**: nhập/cập nhật khóa, nút kiểm tra kết nối, hiển thị danh sách tài khoản ngân hàng mà khóa này đang theo dõi được.
- Chủ shop: bỏ hẳn ô nhập khóa API ở phần cài đặt (vẫn giữ chế độ "dùng khóa riêng" cho ai đã có, đặt ở mục nâng cao — hệ thống ưu tiên khóa riêng nếu có, không thì dùng khóa hệ thống).

**Một điểm cần nói rõ:** SePay chỉ đọc được biến động của những tài khoản ngân hàng đã được thêm vào chính tài khoản SePay đó. Nên với mỗi số tài khoản mới của chủ shop, cần một lần thêm tài khoản đó vào SePay của nền tảng. Vì vậy luồng sẽ là:

```text
Chủ shop thêm TK ngân hàng
        ↓  (tự đối chiếu với danh sách TK mà khóa hệ thống thấy được)
Thấy → "Đã xác minh"  ✅ dùng ngay
Không thấy → "Chờ kích hoạt" ⏳ admin thêm TK vào SePay hệ thống, hệ thống tự chuyển sang Đã xác minh
```

- Việc đối chiếu chạy tự động: ngay khi thêm TK và định kỳ theo tác vụ nền, nên đa số trường hợp chuyển sang "Đã xác minh" mà không cần bấm gì.
- Trong lúc "Chờ kích hoạt", QR vẫn tạo và khách vẫn chuyển được tiền; chỉ phần tự xác nhận là chưa bật — trang thanh toán ghi rõ và có nút "Tôi đã chuyển" để chủ shop đối chiếu tay.

## Phần 2 — Tạo QR không cần khóa API

- QR chuyển khoản (VietQR) sinh từ mã ngân hàng + số TK + số tiền + mã tham chiếu — không phụ thuộc API. Chuẩn hóa lại một chỗ duy nhất để trang thanh toán, trang thanh toán 2.0, hóa đơn và biên nhận dùng chung.
- Bổ sung bảng mã ngân hàng đầy đủ (mã BIN) để QR luôn đúng, thay danh sách rút gọn hiện tại.
- Thêm nút tải QR và sao chép link ngay tại bước tạo link.

## Phần 3 — Xác nhận gần tức thì

- Tác vụ nền quét giao dịch chờ: rút xuống mỗi 30 giây, gom theo khóa (một lần gọi cho nhiều shop dùng khóa hệ thống) để không gọi SePay quá nhiều.
- Trang thanh toán: theo dõi thay đổi trực tiếp từ máy chủ, cộng thêm một nhịp hỏi lại mỗi 5 giây khi trang đang mở; báo trạng thái bằng nhãn Đang chờ → Đã nhận → Hết hạn.
- Webhook SePay: nhận diện shop theo **số tài khoản nhận** (hiện chỉ theo khóa webhook riêng), giữ chống trùng theo mã tham chiếu như hiện tại.
- Mỗi TK có ô **"Tình trạng tín hiệu"**: xác minh / lần nhận tín hiệu gần nhất / lỗi nếu có, kèm hướng xử lý bằng tiếng Việt.

## Phần 4 — Dọn gọn giao diện

- Cài đặt ngân hàng dựng lại theo dạng danh sách thẻ gọn: tên ngân hàng, số TK, huy hiệu Mặc định / Đã xác minh, thao tác nằm trong menu ba chấm; bước thêm TK rút còn 3 ô.
- Đồng bộ thẻ số liệu và bảng dữ liệu về bộ dùng chung đã có (StatCard, DataTableShell) cho các trang còn dùng thẻ rời.
- Chuẩn hóa khoảng cách, bán kính, trạng thái đang chọn; giữ nguyên bảng màu midnight và font hiện tại.
- Trên máy điện thoại: bảng chuyển thành danh sách thẻ, thanh công cụ một hàng.

---

## Ghi chú kỹ thuật

- Bảng `merchant_banks` thêm: `verification_status`, `verified_at`, `sepay_account_id` (đã có), `last_signal_at`; RPC `link_bank_to_platform_sepay`, `refresh_bank_verification`, và RPC admin `admin_platform_sepay_status`. Đủ GRANT + RLS, RPC admin kiểm tra `has_role`.
- Khóa nền tảng: secret `SEPAY_PLATFORM_API_KEY` (thêm qua công cụ secret), chỉ đọc trong edge function.
- Edge function mới `sepay-bank-verify` (đối chiếu TK với SePay). Sửa `check-pending-transactions` để dùng khóa nền tảng làm mặc định và gom theo khóa; sửa `sepay-webhook` nhận diện theo số TK.
- Thêm `src/lib/vietqr.ts` (bảng BIN + hàm sinh URL QR), thay các chỗ tự ghép URL rải rác.
- Không sửa file tự sinh (`client.ts`, `types.ts`, `.env`).
