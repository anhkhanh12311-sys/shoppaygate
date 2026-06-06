import { format } from "date-fns";
import { vi } from "date-fns/locale";

export interface ExportableTransaction {
  id: string;
  amount: number;
  transfer_content: string | null;
  bank_reference: string | null;
  status: string;
  paid_at: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  completed: "Thành công",
  pending: "Đang chờ",
  failed: "Thất bại",
  cancelled: "Đã hủy",
};

const formatVnd = (amount: number) =>
  new Intl.NumberFormat("vi-VN").format(amount);

const fmtDate = (value: string | null) =>
  value ? format(new Date(value), "dd/MM/yyyy HH:mm", { locale: vi }) : "-";

/** Build a normalized 2D structure used by all export formats. */
const buildRows = (transactions: ExportableTransaction[]) => {
  const headers = [
    "STT",
    "Thời gian",
    "Số tiền (VND)",
    "Nội dung CK",
    "Mã ngân hàng",
    "Trạng thái",
    "Mã giao dịch",
  ];
  const rows = transactions.map((tx, i) => [
    i + 1,
    fmtDate(tx.paid_at || tx.created_at),
    tx.amount,
    tx.transfer_content || "-",
    tx.bank_reference || "-",
    STATUS_LABEL[tx.status] || tx.status,
    tx.id,
  ]);
  return { headers, rows };
};

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const fileStamp = () => format(new Date(), "yyyyMMdd_HHmm");

export const exportToCSV = (transactions: ExportableTransaction[]) => {
  const { headers, rows } = buildRows(transactions);
  const escape = (val: string | number) => {
    const s = String(val).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  // BOM so Excel reads UTF-8 (Vietnamese) correctly
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `giao-dich_${fileStamp()}.csv`);
};

export const exportToExcel = async (transactions: ExportableTransaction[]) => {
  const XLSX = await import("xlsx");
  const { headers, rows } = buildRows(transactions);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = [
    { wch: 5 },
    { wch: 18 },
    { wch: 16 },
    { wch: 32 },
    { wch: 18 },
    { wch: 12 },
    { wch: 38 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Giao dịch");
  XLSX.writeFile(wb, `giao-dich_${fileStamp()}.xlsx`);
};

export const exportToPDF = async (
  transactions: ExportableTransaction[],
  meta?: { merchantName?: string; rangeLabel?: string }
) => {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const { rows } = buildRows(transactions);

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.text("BÁO CÁO GIAO DỊCH", pageWidth / 2, 40, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(110);
  const subtitle = [
    meta?.merchantName ? `Merchant: ${meta.merchantName}` : null,
    meta?.rangeLabel ? `Khoảng: ${meta.rangeLabel}` : null,
    `Xuất lúc: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: vi })}`,
  ]
    .filter(Boolean)
    .join("   |   ");
  doc.text(subtitle, pageWidth / 2, 58, { align: "center" });

  const totalAmount = transactions.reduce((s, t) => s + (t.amount || 0), 0);

  autoTable(doc, {
    startY: 74,
    head: [["STT", "Thời gian", "Số tiền (VND)", "Nội dung CK", "Mã NH", "Trạng thái", "Mã GD"]],
    body: rows.map((r) => [
      r[0],
      r[1],
      formatVnd(r[2] as number),
      r[3],
      r[4],
      r[5],
      String(r[6]).slice(0, 13) + "…",
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    columnStyles: { 2: { halign: "right" } },
    margin: { left: 30, right: 30 },
  });

  // @ts-expect-error - lastAutoTable is added by the autotable plugin at runtime
  const finalY = (doc.lastAutoTable?.finalY ?? 74) + 20;
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(
    `Tổng cộng: ${transactions.length} giao dịch  -  ${formatVnd(totalAmount)} VND`,
    pageWidth - 30,
    finalY,
    { align: "right" }
  );

  doc.save(`bao-cao-giao-dich_${fileStamp()}.pdf`);
};
