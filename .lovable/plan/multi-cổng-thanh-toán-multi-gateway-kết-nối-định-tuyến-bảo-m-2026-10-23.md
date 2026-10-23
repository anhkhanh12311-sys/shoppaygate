# Multi Cổng Thanh Toán (Multi-Gateway) — kết nối, định tuyến & bảo mật server

## Mục tiêu

Chủ shop **tự kết nối nhiều cổng đối soát chuyển khoản** (SePay, Cassopay, PayOS) trong phần Cài đặt — mỗi cổng một kết nối riêng, khóa API **mã hóa và chỉ nằm ở máy chủ, trình duyệt không bao giờ đọc lại được**. Khách hàng ở mọi điểm bán (cửa hàng công khai, link thanh toán, trang thanh toán 2.0) thấy được nhiều phương thức; hệ thống **tự chọn cổng ổn định nhất** và tự chuyển dự phòng khi một cổng lỗi. Giao diện mới gọn gàng, mượt trên cả điện thoại và máy tính.

```text
Chủ shop thêm kết nối cổng (khóa API)
        ↓  (mã hóa ngay ở máy chủ, chỉ trả về dạng che khuất)
"Đã xác minh" ✅  ← edge function thử gọi API của cổng
        ↓
Điểm bán tự động liệt kê cổng đã xác minh
        ↓  (chọn theo sức khỏe: lỗi gần nhất, độ trễ)
Khách thanh toán → webhook của cổng → quy trình ghi giao dịch dùng chung
```

---

## Phần 1 — Bảo mật: khóa cổng chỉ sống ở máy chủ

- Bảng mới `gateway_connections`: `merchant_id`, `provider` (`sepay` / `cassopay` / `payos`), `display_name`, `is_active`, `priority`, `credentials_encrypted` (mã hóa bằng pgcrypto, khóa mã hóa là secret `GATEWAY_ENCRYPTION_KEY` phía máy chủ), `webhook_key_encrypted`, `status` (`unverified` / `verified` / `error`), `last_check_at`, `last_error`, `last_signal_at`.
- **Không có cột khóa dạng plain-text, không có view trả khóa về client.** Client chỉ đọc qua RPC `list_my_gateway_connections()` — trả về tên cổng, trạng thái, 4 ký tự cuối của khóa để nhận biết. Viết/xóa khóa qua RPC `upsert_gateway_connection` / `delete_gateway_connection` (mã hóa ngay tại chỗ, kiểm tra quyền chủ sở hữu).
- RLS: chỉ chủ merchant (và admin) đọc được dòng kết nối; khóa `authenticated` chỉ GRANT trên RPC, không GRANT SELECT cột nhạy cảm. Trigger chặn cập nhật `credentials_encrypted` từ client.
- Webhook của cổng nhận diện merchant bằng `webhook_key` riêng của từng kết nối (không lộ `merchant_id` qua URL).

## Phần 2 — Kết nối & xác minh từng cổng

- Module **"Cổng thanh toán"** mới trong Cài đặt: thẻ theo từng nhà cung cấp (SePay, Cassopay, PayOS), hướng dẫn từng bước lấy khóa ở nhà cung cấp, form nhập khóa, nút **"Kiểm tra kết nối"**, huy hiệu trạng thái, khóa hiển thị dạng che, bật/tắt và xóa. Giữ nguyên bảng màu midnight + font hiện tại, dùng bộ UI dùng chung (StatCard, DataTableShell).
- Edge function `gateway-verify`: thử gọi API thật của từng cổng (SePay: danh sách tài khoản theo dõi; PayOS: kiểm tra xác thực; Cassopay: kiểm tra số dư) → cập nhật trạng thái + thông báo lỗi bằng tiếng Việt.
- Mỗi kết nối có chỉ số sức khỏe (lần nhận tín hiệu gần nhất, lỗi gần nhất) — tái dùng mô hình "Tình trạng tín hiệu" đã có cho ngân hàng.

## Phần 3 — Webhook & định tuyến đa cổng

- Endpoint webhook riêng cho từng nhà cung cấp (`gateway-webhook-payos`, `gateway-webhook-cassopay`): chuẩn hóa dữ liệu về **cùng một quy trình ghi giao dịch dùng chung** đang có (chống trùng `webhook_events` theo mã tham chiếu, nhận diện theo mã PG-, cộng nạp số dư, callback cho thuê cổng, HMAC ký bản ghi khi nhà cung cấp hỗ trợ). `sepay-webhook` hiện tại được tái dùng làm đường của SePay.
- RPC `pick_best_gateway(merchant_id)`: chấm điểm các kết nối đã xác minh theo trạng thái lỗi/độ trễ; nếu chưa có kết nối nào thì **tự dùng QR VietQR không cần khóa** (đã có sẵn) nên điểm bán không bao giờ chết.
- `check-pending-transactions` / nền quét giao dịch mở rộng: quét theo từng kết nối cổng đang bật (không chỉ SePay), gom nhóm theo khóa để tiết kiệm lượt gọi.
- Rate limiting + giới hạn kích thước payload trên các webhook mới, giữ chống trùng theo mã tham chiếu như hiện tại.

## Phần 4 — Điểm bán: nhiều phương thức, một giao diện

- **Trang thanh toán 2.0** và **link thanh toán**: tab phương thức liệt kê các cổng đã xác minh của shop (QR chuyển khoản qua từng cổng) + QR dự phòng; chuyển phương thức mượt (animation, không nháy trang), trạng thái "Đang chờ → Đã nhận" cập nhật real-time như hiện tại.
- **Cửa hàng công khai**: bước thanh toán đơn hàng hiện chọn phương thức, mỗi phương thức render đúng QR của cổng đó; sau khi tạo đơn tự mở trang thanh toán theo phương thức đã chọn.
- **Trên điện thoại**: danh sách phương thức dạng thẻ cuộn ngang, form rút gọn, nút chạm dễ; **trên máy tính**: bố cục hai cột như Payment Page 2.0 hiện tại. Kiểm tra bằng trình duyệt ở cả 2 khổ màn hình.

---

## Ghi chú kỹ thuật

- Migration qua công cụ cơ sở dữ liệu: tạo bảng `gateway_connections` + GRANT đúng thứ tự + RLS + trigger bảo vệ; hàm RPC mã hóa/đọc an toàn; RPC chọn cổng. Thứ tự: CREATE TABLE → GRANT → ENABLE RLS → CREATE POLICY.
- Secret `GATEWAY_ENCRYPTION_KEY` thêm qua công cụ secret (khóa mã hóa 64 ký tự), chỉ edge function đọc được.
- Deploy 3 edge function: `gateway-verify`, `gateway-webhook-payos`, `gateway-webhook-cassopay`; sửa `check-pending-transactions` cho đa cổng. Cấu hình `verify_jwt = false` cho webhook trong `supabase/config.toml`.
- Client: hook mới `useGatewayConnections` (chỉ đọc dữ liệu an toàn), module `GatewayConnections.tsx` ở Cài đặt; sửa `PaymentPage2`, `StorePage`, `CreatePaymentLink` để liệt kê phương thức theo RPC chọn cổng; không sửa file tự sinh (`client.ts`, `types.ts`, `.env`).
- Cơ sở dữ liệu đang tạm ngủ: nếu migration bị lỗi kết nối sẽ chạy lại trong lúc build.
