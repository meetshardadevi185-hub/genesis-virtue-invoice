import type { DocumentData, LineItem, Totals } from "./types";

export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function lineAmount(l: LineItem) {
  const gross = (l.quantity || 0) * (l.rate || 0);
  return r2(gross - gross * ((l.discountPct || 0) / 100));
}

export function computeTotals(doc: DocumentData, intra: boolean): Totals {
  const subtotal = r2(doc.items.reduce((s, l) => s + lineAmount(l), 0));
  const discount = r2(subtotal * (doc.discountPct / 100) + (doc.discountFlat || 0));
  const factor = subtotal > 0 ? (subtotal - discount) / subtotal : 1;
  let tax = 0;
  for (const l of doc.items) tax += lineAmount(l) * factor * (l.gstRate / 100);
  tax = r2(tax);
  const cgst = intra ? r2(tax / 2) : 0;
  const sgst = intra ? r2(tax / 2) : 0;
  const igst = intra ? 0 : tax;
  const charges = r2(doc.charges.reduce((s, c) => s + (c.amount || 0), 0));
  const taxable = r2(subtotal - discount);
  const total = r2(taxable + cgst + sgst + igst + charges);
  const totalQty = doc.items.reduce((s, l) => s + (l.quantity || 0), 0);
  const advance = doc.advance || 0;
  return {
    subtotal, discount, taxable, cgst, sgst, igst, charges, totalQty, total, advance,
    due: r2(total - advance - (doc.paid || 0)),
    intra,
  };
}

export function lineTax(l: LineItem, doc: DocumentData, intra: boolean) {
  const subtotal = doc.items.reduce((s, x) => s + lineAmount(x), 0);
  const discount = subtotal * (doc.discountPct / 100) + (doc.discountFlat || 0);
  const factor = subtotal > 0 ? (subtotal - discount) / subtotal : 1;
  const tax = r2(lineAmount(l) * factor * (l.gstRate / 100));
  const half = r2(tax / 2);
  return intra
    ? { cgst: half, sgst: half, igst: 0, total: r2(lineAmount(l) * factor + half * 2) }
    : { cgst: 0, sgst: 0, igst: tax, total: r2(lineAmount(l) * factor + tax) };
}

/** Indian digit grouping: 1,23,456.00 */
export function fmtNum(n: number) {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
}
export function fmtInt(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n || 0);
}
export const CUR: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£", AED: "د.إ" };
export const money = (n: number, cur = "INR") => `${CUR[cur] ?? cur + " "}${fmtNum(n)}`;

const ones = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
function below1000(n: number): string {
  const p: string[] = [];
  if (n >= 100) { p.push(ones[Math.floor(n / 100)], "HUNDRED"); n %= 100; }
  if (n >= 20) { p.push(tens[Math.floor(n / 10)]); n %= 10; }
  if (n > 0) p.push(ones[n]);
  return p.join(" ");
}
export function amountInWords(amount: number, cur = "INR") {
  const rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);
  const parts: string[] = [];
  let n = rupees;
  const crore = Math.floor(n / 1e7); n %= 1e7;
  const lakh = Math.floor(n / 1e5); n %= 1e5;
  const thou = Math.floor(n / 1e3); n %= 1e3;
  if (crore) parts.push(below1000(crore), "CRORE");
  if (lakh) parts.push(below1000(lakh), "LAKH");
  if (thou) parts.push(below1000(thou), "THOUSAND");
  if (n) parts.push(below1000(n));
  const major = cur === "INR" ? "RUPEES" : cur;
  const minor = cur === "INR" ? "PAISE" : "CENTS";
  let s = (parts.join(" ") || "ZERO") + " " + major;
  if (paise) s += " AND " + below1000(paise) + " " + minor;
  return s + " ONLY";
}
