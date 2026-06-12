ns# Kế hoạch triển khai

## 1. Module Khuyến mãi & Voucher (mới, độc lập)

**Database** (`vouchers`, `voucher_redemptions`):
- `code` (unique per merchant), `type` (percent/fixed/freeship), `value`, `min_order`, `max_discount`, `usage_limit`, `used_count`, `per_customer_limit`, `starts_at`, `expires_at`, `is_active`, `applies_to` (all/products/categories).
- RLS: merchant CRUD của mình. Public RPC `validate_voucher(merchant_id, code, subtotal)` trả discount.
- Update `public_create_order` nhận `p_voucher_code`, ghi `discount`, `voucher_id` vào `orders` (thêm cột).
- RPC `get_voucher_stats()` cho dashboard.

**Frontend**:
- `src/hooks/useVouchers.tsx` — CRUD + stats.
- `src/components/dashboard/VouchersManagement.tsx` — bảng + dialog tạo, copy code, badge trạng thái, biểu đồ usage.
- Tích hợp `StorePage.tsx` checkout: ô nhập mã → gọi validate → hiển thị discount/total mới.
- Menu sidebar "Khuyến mãi" trong nhóm Cửa hàng.

## 2. Đa ngân hàng + Tự động điều phối (nâng cấp)

**Database**:
- `merchant_banks`: thêm `daily_limit`, `current_daily_received`, `last_reset_date`, `priority`, `auto_route_enabled`, `sepay_account_id` (link SePay).
- RPC `pick_best_bank(merchant_id, amount)`: chọn bank theo thuật toán — ưu tiên: còn hạn mức trong ngày → priority cao nhất → ít giao dịch gần nhất → default.
- Trigger reset `current_daily_received` khi qua ngày.
- RPC `link_bank_to_sepay(bank_id, sepay_api_key, account_id)` — lưu liên kết.

**Frontend**:
- `src/components/dashboard/BankRoutingManager.tsx` — bảng banks với toggle auto-route, set priority (drag/up-down), set daily limit, nút "Liên kết SePay" (modal nhập API key + chọn account).
- Hook `useBankRouting.tsx`.
- Tab "Điều phối" trong trang Ngân hàng hiện có.
- Khi tạo payment link: gọi `pick_best_bank` thay vì luôn dùng default → ghi `selected_bank_id` vào payment_links (thêm cột).

## 3. Hoàn thiện Thuê nạp tiền tự động

**Database**:
- `topup_rental_plans` (mới): gói thuê (tên, giá/tháng, tx_quota, callback_required, features).
- `topup_callbacks`: bổ sung `retry_count`, `next_retry_at`, `last_error`.
- `merchant_subscriptions`: thêm `tx_quota_used`, `tx_quota_limit`, `quota_reset_at`.
- RPC `record_topup_quota_usage(merchant_id)` — increment + check limit.
- RPC `get_topup_rental_dashboard()` — thống kê callback success rate, tx còn lại, ngày hết hạn.

**Edge function** `topup-callback-retry`:
- Cron mỗi 5 phút retry các callback `status='failed'` còn `retry_count < 5` với backoff.
- Sign payload bằng HMAC-SHA256 + `topup_secret`.

**Frontend**:
- `src/components/dashboard/TopupRentalCenter.tsx` — tổng quan: quota, callback log, test webhook, regenerate secret, copy URL.
- `src/components/dashboard/TopupCallbackLogs.tsx` — bảng log với filter status, nút retry thủ công.
- Hook `useTopupRental.tsx`.

## 4. Pro Dashboard UI (làm lại layout)

- **Sidebar gọn**: thu nhỏ icon-only khi hover-expand, group có separator + label nhỏ uppercase.
- **Topbar** mới: breadcrumb + global search (Cmd+K) + quick actions (tạo link, tạo voucher) + notifications popover.
- **Dense tables**: row 40px, sticky header, column resize, multi-filter chip bar.
- **KPI cards**: spark-line mini chart bằng recharts, so sánh % WoW.
- **Theme**: giữ glassmorphism nhưng tăng density — padding p-4 thay p-6, font-size 13px base cho table.
- File mới: `src/components/layout/ProTopbar.tsx`, `src/components/layout/CommandPalette.tsx`, `src/components/ui/kpi-card.tsx`, `src/components/ui/data-table-pro.tsx`.

## Thứ tự thực hiện

1. Migration #1: vouchers + cập nhật orders.
2. Migration #2: multi-bank routing fields + RPC pick_best_bank.
3. Migration #3: topup rental plans + quota tracking.
4. Edge function `topup-callback-retry` + cron.
5. Hooks & components Voucher → Bank routing → Topup rental.
6. Pro Dashboard layout (Topbar, CommandPalette, KPI cards, DataTablePro).
7. Tích hợp menu sidebar mới + route Dashboard.

## Nguyên tắc

- Mỗi tính năng = 1 hook + 1 component chính + (nếu cần) sub-components, đặt theo nhóm `dashboard/voucher/`, `dashboard/bank-routing/`, `dashboard/topup-rental/`.
- Không sửa các file cũ trừ Dashboard.tsx (thêm route) và StorePage.tsx (thêm input voucher).
- Tất cả RPC mới có `SECURITY DEFINER` + scope theo `auth.uid()`.
