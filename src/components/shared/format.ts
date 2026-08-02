export const vnd = (n: number | null | undefined) =>
  new Intl.NumberFormat("vi-VN").format(Number(n ?? 0)) + "₫";

export const dt = (v: string | null | undefined) => {
  if (!v) return "—";
  const d = new Date(v);
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
};

export const dateOnly = (v: string | null | undefined) => {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("vi-VN");
};
