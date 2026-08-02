## Mục tiêu

Đóng nốt phần "còn thiếu" của Sprint 4 (automation chưa chạy tự động), làm Admin Console đầy đủ quyền điều khiển hệ thống, và làm mới giao diện theo hướng gọn – khoa học – chuyên nghiệp.

---

## Phần 1 — Hoàn thiện automation còn thiếu

### 1.1 Recurring Billing tự chạy
- Edge function mới `recurring-billing-cron`: lấy các subscription tới hạn qua `list_due_subscriptions`, gọi `subscription_charge` cho từng cái, sinh payment link, ghi log kết quả.
- pg_cron chạy hằng ngày (03:00 giờ VN) gọi function.
- UI "Đăng ký định kỳ": thêm cột "Lần thu gần nhất / kết quả" + nút "Thu ngay" cho 1 subscription.

### 1.2 Split Payment tự áp dụng
- Trigger trên `transactions` khi `status` chuyển sang hoàn tất: tìm `split_rules` khớp (theo `payment_link_id`, fallback rule mặc định) → tạo `split_executions` + cộng `balance_topups` cho từng recipient.
- UI "Chia doanh thu": thêm tab "Lịch sử chia" đọc từ `split_executions`.

### 1.3 Nhắc nợ hóa đơn
- Cron hằng ngày quét `invoices` quá hạn, tăng `reminder_count` qua `invoice_mark_reminder`, đánh dấu `overdue`.
- UI Hóa đơn Pro: badge "Quá hạn" + bộ lọc theo trạng thái.

---

## Phần 2 — Admin Console đầy đủ

Bổ sung các module admin còn thiếu (hiện chỉ có 10 module, chưa quản được phần bán hàng và automation):

| Module mới | Nội dung |
|---|---|
| **Đơn hàng & Sản phẩm** | Xem toàn hệ thống, filter theo merchant/trạng thái, đổi trạng thái đơn |
| **Voucher toàn cục** | Xem voucher mọi shop, bật/tắt, xem lượt dùng |
| **Hóa đơn & Đăng ký định kỳ** | Danh sách toàn hệ thống, trạng thái thu tiền, nút thu thủ công |
| **Split & Đối soát** | Lịch sử `split_executions`, tổng tiền đã chia theo shop |
| **Cron & Jobs** | Danh sách job pg_cron, lần chạy gần nhất, nút chạy tay từng job |
| **Nhật ký hoạt động** | Bảng `audit_logs` mới ghi các hành động admin (đổi số dư, cấp quyền, đổi cấu hình) |

Mỗi module là 1 file riêng trong `src/components/admin/`, dữ liệu qua RPC admin-only riêng để dễ mở rộng/fix.

Menu Admin sắp lại 6 nhóm: Tổng quan · Vận hành · Tài chính · Bán hàng · Người dùng · Hệ thống.

---

## Phần 3 — Giao diện mới

- **KPI card thống nhất**: 1 component `StatCard` dùng chung cho cả Dashboard và Admin (số lớn, delta, sparkline nhỏ), thay các card rời rạc hiện tại.
- **Bảng dữ liệu thống nhất**: `DataTableShell` — header sticky, hàng cao 44px, trạng thái dạng pill, empty state có icon + CTA, skeleton khi load.
- **Toolbar chuẩn**: mỗi trang có 1 hàng toolbar (tìm kiếm · filter · refresh · export) đặt cùng vị trí, không còn nút rải rác.
- **Mobile**: bảng tự chuyển sang dạng card list dưới 640px; nav dưới cùng cho 5 mục hay dùng nhất.
- Giữ nguyên palette/font hiện tại (midnight + Space Grotesk), chỉ chuẩn hóa spacing, bán kính và trạng thái active.

---

## Phần 4 — Kiểm thử

Playwright headless đi qua: Dashboard 23 tab, Admin toàn bộ module, `/pay2/:code`, storefront + checkout. Ghi console/network error, fix rồi chạy lại. Báo cáo cuối bằng bảng pass/fail.

---

## Ghi chú kỹ thuật

- Bảng mới `audit_logs`: đủ `GRANT` + RLS chỉ admin đọc, ghi qua SECURITY DEFINER.
- RPC admin mới đều kiểm tra `has_role(auth.uid(),'admin')` và thu hồi EXECUTE của `anon`/`PUBLIC`.
- Edge function mới `recurring-billing-cron`, `invoice-reminder-cron`; không sửa `sepay-webhook` / `check-pending-transactions`.
- Cron job tạo bằng insert tool (chứa URL + key riêng của project), không nằm trong migration.
- Chia 3 commit: automation → admin → UI, để dễ review và rollback.
