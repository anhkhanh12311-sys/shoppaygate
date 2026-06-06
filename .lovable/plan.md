Trước khi build, điều chỉnh plan như sau:

=== EMAIL ===

Bỏ tab Email khỏi ShareReceiptModal phase 1.

Chỉ giữ 4 kênh: Zalo / SMS / Link / In.

Xóa edge function send-bill-email và 

dependency RESEND_API_KEY.

Để placeholder "Email (sắp ra mắt)" bị disabled.

=== AUTO-OPEN MODAL ===

Mặc định TẮT auto-open modal sau giao dịch.

Thêm toggle trong /settings/branded-receipt:

"Tự động hỏi gửi bill sau mỗi giao dịch"

Default: off. Chỉ mở khi user bật tay.

Luôn có nút share thủ công trong lịch sử GD.

=== ZALO DEEPLINK ===

Không share ảnh bill qua Zalo deeplink 

vì browser không hỗ trợ.

Thay bằng:

- Nút "Copy link bill" 

- Nút "Mở Zalo" → zalo://

- Text mẫu: "Cảm ơn quý khách! 

  Xem bill tại: [link bill]"

=== QR URL ===

Trong form settings, thêm:

- Hướng dẫn nhỏ bên dưới input Zalo OA URL:

  "Vào Zalo OA → Quản lý → Copy link trang"

- Hướng dẫn bên dưới input Google Maps:

  "Tìm shop trên Maps → Chia sẻ → Copy link"

- Validate URL hợp lệ trước khi lưu

=== PREVIEW MOBILE ===

Trong trang settings, thêm toggle 2 chế độ:

[📱 Mobile] [🖥 Desktop]

Mặc định hiện Mobile vì bill chủ yếu 

xem trên điện thoại.

=== LOGO FALLBACK ===

Nếu logo lỗi load hoặc chưa upload:

Hiện avatar tròn màu primary_color 

chứa chữ cái đầu tên shop.

Không để bill bị vỡ layout.

=== VOUCHER GIỚI HẠN ===

Thêm 2 field vào shop_receipt_settings:

- voucher_max_uses (int, nullable) 

  "Giới hạn số lần dùng (để trống = không giới hạn)"

- voucher_expiry_days (int, default 30)

  "Hết hạn sau X ngày kể từ ngày mua"

Hiển thị hạn sử dụng tính từ ngày GD 

trên bill (không phải ngày cố định).

=== LOADING STATES ===

Thêm loading/skeleton cho:

- Khi lưu settings → button disabled + spinner

- Khi tạo QR code → skeleton placeholder

- Khi copy link → đổi icon ✓ trong 2 giây

- Khi tải trang /bill/:id → skeleton toàn bill

=== FONT FALLBACK ===

Trong Be Vietnam Pro import, thêm fallback:

font-family: 'Be Vietnam Pro', 

             'Segoe UI', 

             sans-serif;

Đảm bảo bill không vỡ nếu Google Fonts 

load chậm, đặc biệt trên Safari iOS.

=== THỨ TỰ BUILD GIỮ NGUYÊN ===

Chỉ bỏ bước edge function send-bill-email.

Các bước còn lại theo plan cũ.

Xác nhận đã hiểu và bắt đầu build 

từ bước 1: Migration DB + storage bucket.

&nbsp;