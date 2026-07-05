## Mục tiêu

Nâng cấp app thành "Siêu cổng thanh toán đa năng" cho Chủ shop nhỏ + Doanh nghiệp/SaaS, đồng thời sắp xếp lại menu Dashboard + Admin khoa học hơn, làm mới sidebar, và rà quét sửa mọi bug hiện có.

Làm theo 4 sprint, mỗi sprint là 1 lần commit riêng để dễ review.

---

## Sprint 1 — Tái cấu trúc IA + Sidebar mới (UI-only, không phá logic)

### 1.1 Gom lại menu Dashboard
Từ 23 mục rải rác → 5 nhóm chính:

```
● TỔNG QUAN         Overview, AI Insights, Balance changes
● THU TIỀN           Tạo link, QR tĩnh, Payment Page 2.0*, Nạp số dư
● BÁN HÀNG           Sản phẩm, Đơn hàng, Cửa hàng, Voucher, Khách hàng, Mẫu bill
● GIAO DỊCH          Lịch sử GD, Lịch sử bill, Lọc thông minh, Đồng bộ SePay
● HỆ THỐNG           Ngân hàng, Điều phối NH, Cho thuê cổng, Trung tâm thuê nạp,
                     Nhân viên, Loa thanh toán, Webhook & API, Tài khoản
```
(*) Payment Page 2.0 sẽ được thêm ở Sprint 3.

### 1.2 Gom lại menu Admin
```
● TỔNG QUAN     Overview, Giám sát SePay
● VẬN HÀNH       Giao dịch, Callback merchant, Cron & Health*
● TÀI CHÍNH      Số dư, Gói cước, Đăng ký gói
● NGƯỜI DÙNG    Người dùng, Cửa hàng
● HỆ THỐNG       System settings
```

### 1.3 Sidebar UI mới
- Chuyển sang shadcn `Sidebar` với `collapsible="icon"` (thu gọn thành icon strip).
- Nhóm có label bold + separator mảnh, icon 18px, active state có accent bar bên trái.
- Header sticky với breadcrumb thay cho tiêu đề tab, có `SidebarTrigger`.
- Sẽ đi qua flow redesign 3 direction (chụp preview → chọn palette/font/layout → 3 prototype → bạn chọn).

---

## Sprint 2 — Rà soát & sửa bug toàn hệ thống

Chạy Playwright headless trên preview localhost, đi qua từng module và ghi lại:
- Console errors + failed network requests
- Payment flow: tạo link → mở /pay/:code → cron poll → transaction xuất hiện
- SePay Sync (dashboard + admin monitor)
- Voucher validate + redeem
- Topup + Topup callback + retry
- Bank routing (pick_best_bank, record_bank_usage)
- Orders + Products + Store public
- Admin: adjust balance, grant role, cron health

Xuất báo cáo lỗi + fix từng cái, verify lại bằng Playwright.

---

## Sprint 3 — SuperGateway phần 1: Smart Routing + Payment Page 2.0

### 3.1 Smart Routing đa NH (nâng cấp `pick_best_bank`)
Thêm trường cho `merchant_banks`:
- `fee_weight` (numeric) — chi phí ưu tiên (ví dụ NH miễn phí = 0).
- `avg_settlement_seconds` (int) — độ trễ trung bình đo được.
- `health_status` ('healthy'|'degraded'|'down') — cập nhật khi cron poll timeout.

RPC mới `pick_best_bank_v2(merchant_id, amount)` chấm điểm: `score = priority*10 + fee_weight + (settlement/10) - (daily_headroom_ratio*5)`, loại bank `down`.

UI: card "Routing Playground" cho merchant test giả lập số tiền → xem bank nào được chọn + lý do.

### 3.2 Payment Page 2.0
Route mới `/pay2/:code` (giữ `/pay/:code` cũ để backward compat):
- Layout 2 cột: bên trái QR + tab phương thức (VietQR / Chuyển khoản thủ công / Ví MoMo mock / Thẻ mock).
- Realtime status pill (Chờ → Đang xác minh → Thành công).
- Brand theo `shop_receipt_settings` (logo, màu, slogan).
- Nút "Đổi ngân hàng khác" gọi routing_v2 để rotate bank nếu bank hiện tại degraded.
- Countdown 15 phút + auto-refresh.

---

## Sprint 4 — SuperGateway phần 2: Subscription + Split + Invoice Pro

### 4.1 Recurring Billing (merchant → khách của merchant)
Bảng `customer_subscriptions` (merchant_id, customer_id, plan_name, price, interval, next_charge_at, status). Cron hàng ngày sinh `payment_links` mới + gửi email/SMS mock qua edge function.

### 4.2 Split Payment
Bảng `split_rules` (merchant_id, payment_link_id nullable, recipients jsonb [{bank_id, percent}]). Khi transaction complete → job `apply_split` cộng vào `balance_topups` từng recipient. UI: builder kéo % + preview.

### 4.3 Invoice Pro
Bảng `invoices` (số HĐ, khách, dòng, tổng, hạn thanh toán, status, payment_link_id). Trang list + form tạo, nút "Gửi nhắc nợ" tạo `payment_link` gắn kèm. Export PDF client-side bằng existing BrandedReceipt.

---

## Technical notes

- Tất cả bảng mới đều enable RLS + GRANT authenticated/service_role + policies bằng `is_merchant_owner()` (đã có).
- Edge function mới: `recurring-billing-cron`, `apply-split-payment` — invoke từ pg_cron đang chạy.
- Không đụng vào `sepay-webhook`, `check-pending-transactions` (đã ổn định).
- Migration mỗi sprint tách riêng.
- Types file `src/integrations/supabase/types.ts` tự regenerate sau migration.

---

## Sau khi bạn duyệt plan

Mình sẽ bắt đầu ngay Sprint 1: chụp preview hiện tại và chạy flow redesign 3 direction cho sidebar mới. Sprint 2-4 chạy tuần tự, mỗi sprint kết thúc bằng verify Playwright + báo cáo ngắn.