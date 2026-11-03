import * as XLSX from "xlsx";

const numeric = (v: string | number) => (typeof v === "string" && /^\d{1,3}(,\d{2,3})*\.\d{2}$/.test(v) ? parseFloat(v.replace(/,/g, "")) : v);

export function downloadXlsx(filename: string, head: string[], rawRows: (string | number)[][], sheet = "Sheet1") {
  const rows = rawRows.map((r) => r.map(numeric));
  const ws = XLSX.utils.aoa_to_sheet([head, ...rows]);
  ws["!cols"] = head.map((h, i) => ({ wch: Math.min(40, Math.max(h.length, ...rows.map((r) => String(r[i] ?? "").length)) + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet.slice(0, 31));
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : filename + ".xlsx");
}
