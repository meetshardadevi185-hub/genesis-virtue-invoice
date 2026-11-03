import { nanoid } from "nanoid";
import { r2 } from "./calc";
import type { DocumentData, Payment } from "./types";

export const PAY_MODES = ["UPI", "Bank Transfer", "Cash", "Cheque", "Card", "Other"];

/** Recompute paid amount + status from payments. `total` = grand total of the doc. */
export function settle(doc: DocumentData, payments: Payment[], total: number): Partial<DocumentData> {
  const paid = r2(payments.reduce((s, p) => s + p.amount, 0));
  const due = r2(total - (doc.advance || 0) - paid);
  let status = doc.status;
  if (status !== "Cancelled") {
    if (due <= 0 && total > 0) status = "Paid";
    else if (paid > 0) status = "Partially Paid";
    else if (status === "Paid" || status === "Partially Paid") status = "Unpaid";
  }
  return { payments, paid, status };
}

export const newPayment = (amount: number, mode = "UPI", date = new Date().toISOString().slice(0, 10), note = ""): Payment => ({ id: nanoid(6), amount: r2(amount), mode, date, note });
