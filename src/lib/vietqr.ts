/**
 * VietQR helpers — QR chuyển khoản sinh trực tiếp từ mã ngân hàng + số TK,
 * KHÔNG cần khóa API. Dùng chung cho trang thanh toán, hóa đơn, biên nhận.
 */

export interface BankOption {
  /** Mã dùng cho img.vietqr.io (short name hoặc BIN) */
  code: string;
  /** Tên hiển thị */
  name: string;
  /** BIN (napas) */
  bin: string;
}

export const VIETNAM_BANKS: BankOption[] = [
  { code: "VCB", name: "Vietcombank", bin: "970436" },
  { code: "TCB", name: "Techcombank", bin: "970407" },
  { code: "MB", name: "MB Bank", bin: "970422" },
  { code: "ACB", name: "ACB", bin: "970416" },
  { code: "VPB", name: "VPBank", bin: "970432" },
  { code: "TPB", name: "TPBank", bin: "970423" },
  { code: "BIDV", name: "BIDV", bin: "970418" },
  { code: "ICB", name: "VietinBank", bin: "970415" },
  { code: "VBA", name: "Agribank", bin: "970405" },
  { code: "SHB", name: "SHB", bin: "970443" },
  { code: "MSB", name: "MSB", bin: "970426" },
  { code: "OCB", name: "OCB", bin: "970448" },
  { code: "EIB", name: "Eximbank", bin: "970431" },
  { code: "HDB", name: "HDBank", bin: "970437" },
  { code: "SCB", name: "SCB", bin: "970429" },
  { code: "STB", name: "Sacombank", bin: "970403" },
  { code: "VIB", name: "VIB", bin: "970441" },
  { code: "SEAB", name: "SeABank", bin: "970440" },
  { code: "BAB", name: "BacA Bank", bin: "970409" },
  { code: "NAB", name: "Nam A Bank", bin: "970428" },
  { code: "PVCB", name: "PVcomBank", bin: "970412" },
  { code: "LPB", name: "LPBank", bin: "970449" },
  { code: "ABB", name: "ABBANK", bin: "970425" },
  { code: "VAB", name: "VietABank", bin: "970427" },
  { code: "BVB", name: "BaoViet Bank", bin: "970438" },
  { code: "NCB", name: "NCB", bin: "970419" },
  { code: "KLB", name: "KienlongBank", bin: "970452" },
  { code: "VCCB", name: "BVBank", bin: "970454" },
  { code: "SGICB", name: "SaigonBank", bin: "970400" },
  { code: "PGB", name: "PGBank", bin: "970430" },
  { code: "COOPBANK", name: "Co-opBank", bin: "970446" },
  { code: "CAKE", name: "CAKE by VPBank", bin: "546034" },
  { code: "UBANK", name: "Ubank by VPBank", bin: "546035" },
  { code: "TIMO", name: "Timo by BVBank", bin: "963388" },
  { code: "VIETBANK", name: "VietBank", bin: "970433" },
  { code: "OJB", name: "OceanBank", bin: "970414" },
  { code: "WVN", name: "Woori Bank", bin: "970457" },
  { code: "SVB", name: "Shinhan Bank", bin: "970424" },
  { code: "HSBC", name: "HSBC Việt Nam", bin: "458761" },
  { code: "SCVN", name: "Standard Chartered", bin: "970410" },
  { code: "PBVN", name: "Public Bank", bin: "970439" },
  { code: "IBK", name: "IBK Hà Nội", bin: "970455" },
  { code: "IVB", name: "Indovina Bank", bin: "970434" },
  { code: "CIMB", name: "CIMB Việt Nam", bin: "422589" },
  { code: "DOB", name: "DongA Bank", bin: "970406" },
  { code: "VRB", name: "VRB", bin: "970421" },
  { code: "GPB", name: "GPBank", bin: "970408" },
  { code: "HLBVN", name: "Hong Leong Bank", bin: "970442" },
  { code: "MAFC", name: "Mirae Asset", bin: "977777" },
  { code: "VDB", name: "VDB", bin: "970461" },
];

export const findBank = (codeOrName?: string | null): BankOption | undefined => {
  if (!codeOrName) return undefined;
  const q = codeOrName.trim().toLowerCase();
  return VIETNAM_BANKS.find(
    (b) =>
      b.code.toLowerCase() === q ||
      b.bin === q ||
      b.name.toLowerCase() === q ||
      b.name.toLowerCase().replace(/\s+/g, "") === q.replace(/\s+/g, "")
  );
};

export const bankLabel = (codeOrName?: string | null): string =>
  findBank(codeOrName)?.name || codeOrName || "—";

export type QrTemplate = "compact" | "compact2" | "qr_only" | "print";

export interface VietQrParams {
  bankName: string;
  accountNumber: string;
  accountName?: string | null;
  amount?: number | null;
  content?: string | null;
  template?: QrTemplate;
}

/** URL ảnh QR VietQR — luôn dùng BIN nếu tra được để tránh sai mã ngân hàng. */
export const buildVietQrUrl = ({
  bankName,
  accountNumber,
  accountName,
  amount,
  content,
  template = "compact2",
}: VietQrParams): string => {
  const bankCode = findBank(bankName)?.bin || bankName.trim();
  const base = `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(
    accountNumber.trim()
  )}-${template}.png`;
  const qs = new URLSearchParams();
  if (amount && amount > 0) qs.set("amount", String(Math.round(amount)));
  if (content) qs.set("addInfo", content);
  if (accountName) qs.set("accountName", accountName);
  const s = qs.toString();
  return s ? `${base}?${s}` : base;
};

/** Tải ảnh QR về máy (dùng cho nút "Tải QR"). */
export const downloadQr = async (url: string, fileName = "vietqr.png") => {
  const res = await fetch(url);
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
};
