## Nguyên nhân real-time không xác nhận thanh toán

Sau khi kiểm tra hệ thống, tín hiệu SePay không về được vì **2 chỗ đứt gãy** rõ ràng:

### 1. Edge function `check-pending-transactions` chỉ đọc SePay API key ở chỗ cũ
Hiện function chỉ query `merchant_secrets.sepay_api_key`. Nhưng sau khi triển khai **Multi‑bank Routing**, các cửa hàng lưu SePay key **trong từng ngân hàng** (`merchant_banks.sepay_api_key`) và thường KHÔNG nhập vào `merchant_secrets` nữa.

Bằng chứng từ DB:
- `hotrotuongtac`: 2 bank, 1 bank có SePay key, secret cũng có → OK
- `NgockhanhShop`: 2 bank, **0 bank có SePay key**, secret cũng **không có** → polling im lặng
- `Kshop`: 2 bank, **0 bank có SePay key**, secret cũng **không có** → polling im lặng
- Log `check-pending-transactions`: **trống** — chứng tỏ hàm bị bỏ qua vì query "no merchants".

### 2. Webhook SePay không gọi tới hệ thống
Log của `sepay-webhook` **hoàn toàn trống**. Nghĩa là SePay chưa được cấu hình để bắn webhook về endpoint của chúng ta (thiếu URL webhook + `Apikey <webhook_api_key>` bên SePay dashboard). Không có webhook + không có polling = không có tín hiệu.

### 3. Sepay-sync có cùng vấn đề
Function `sepay-sync` cũng chỉ đọc `merchant_secrets.sepay_api_key`, không rơi về bank-level key.

Realtime của Supabase đã bật cho `payment_links` và `transactions` (đã kiểm tra) — nên chỉ cần dữ liệu được ghi vào DB là UI PaymentPage sẽ tự đổi trạng thái.

---

## Kế hoạch sửa lỗi

### A. Nâng cấp `check-pending-transactions` để dùng key theo bank
- Gom tất cả nguồn SePay key của merchant:
  1. `merchant_secrets.sepay_api_key` (legacy)
  2. Mỗi `merchant_banks.sepay_api_key` (multi-bank routing) — mỗi key được query với `account_number = bank.bank_account_number`.
- Loại bỏ trùng lặp theo `(api_key, account_number)`.
- Với mỗi cặp, gọi `https://my.sepay.vn/userapi/transactions/list?account_number=…&limit=50` và khớp:
  - Ưu tiên `PG-XXXX` trong `transaction_content`
  - Fallback: `amount_in ≈ link.amount` + link `active` của merchant trong 24h
- Ghi `bank_reference` để chống trùng, cập nhật `payment_links.status='completed'` khi không phải `is_static`.
- Trả về JSON có `polled_pairs`, `matched`, `duplicate` để dễ debug.

### B. Đồng bộ cùng logic cho `sepay-sync` (thủ công)
Cho phép chọn "Đồng bộ tất cả bank" — lặp qua các bank có `sepay_api_key`, gộp kết quả trả về (mỗi bank 1 dòng thống kê).

### C. Widget "Trạng thái tín hiệu" trên PaymentPage
Thêm khối nhỏ dưới nút "Kiểm tra" hiển thị:
- ✅/⚠️ Webhook SePay đã bắn về (dựa `webhook_events` gần đây của merchant trong 24h — RPC public mới `get_merchant_signal_health(merchant_id)` trả về `webhook_hits_24h`, `banks_with_sepay_key`, `last_webhook_at`).
- Số lần polling đã chạy (đã có `checkCount`).
- Gợi ý khi cả webhook và polling đều 0: "Cửa hàng chưa cấu hình SePay — vui lòng chờ nhân viên xác nhận thủ công."

### D. Trong Dashboard → tab "Đồng bộ SePay" thêm cảnh báo chẩn đoán
- Nếu merchant có bank nhưng không bank nào có SePay key **và** `merchant_secrets.sepay_api_key` cũng trống → banner đỏ: "Chưa có nguồn tín hiệu SePay nào".
- Nếu có key nhưng 24h qua không có `webhook_events` nào → banner vàng kèm URL webhook cần dán vào SePay và `Apikey` header.

### E. Không thay đổi
- Bảng DB, RLS, realtime publication (đã đúng).
- Client polling trên `PaymentPage.tsx` (đã ổn) — chỉ cần backend trả kết quả đúng.

---

## Chi tiết kỹ thuật

**Query gom SePay sources trong `check-pending-transactions`:**
```ts
type SepaySource = { merchant_id: string; api_key: string; account_number?: string };
const sources: SepaySource[] = [];
// 1) merchant_secrets
const secrets = await sb.from("merchant_secrets")
  .select("merchant_id, sepay_api_key, merchants!inner(bank_account_number)")
  .not("sepay_api_key","is",null);
// 2) merchant_banks
const banks = await sb.from("merchant_banks")
  .select("merchant_id, sepay_api_key, bank_account_number")
  .not("sepay_api_key","is",null);
```

**RPC mới:**
```sql
CREATE FUNCTION public.get_merchant_signal_health(p_merchant_id uuid)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT json_build_object(
    'webhook_hits_24h', (SELECT COUNT(*) FROM webhook_events
       WHERE payload->>'accountNumber' IN
         (SELECT bank_account_number FROM merchant_banks WHERE merchant_id=p_merchant_id)
       AND created_at > now() - interval '24 hours'),
    'last_webhook_at', (SELECT MAX(created_at) FROM webhook_events
       WHERE payload->>'accountNumber' IN
         (SELECT bank_account_number FROM merchant_banks WHERE merchant_id=p_merchant_id)),
    'banks_with_sepay_key', (SELECT COUNT(*) FROM merchant_banks
       WHERE merchant_id=p_merchant_id AND sepay_api_key IS NOT NULL),
    'legacy_secret_key', (SELECT sepay_api_key IS NOT NULL FROM merchant_secrets WHERE merchant_id=p_merchant_id)
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_merchant_signal_health(uuid) TO anon, authenticated;
```

## Files thay đổi
- `supabase/functions/check-pending-transactions/index.ts` (rewrite phần gom key)
- `supabase/functions/sepay-sync/index.ts` (fallback bank keys)
- Migration mới: RPC `get_merchant_signal_health`
- `src/pages/PaymentPage.tsx` (thêm widget signal health, dùng RPC)
- `src/components/dashboard/SepaySync.tsx` (banner chẩn đoán)
