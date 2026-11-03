"use client";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDocTotal } from "./DocumentList";
import { fmtNum, CUR, r2 } from "@/lib/calc";
import { PAY_MODES, newPayment, settle } from "@/lib/payments";

export default function PaymentModal({ docId, onClose }: { docId: string; onClose: () => void }) {
  const doc = useStore((s) => s.docs.find((d) => d.id === docId));
  const patchDoc = useStore((s) => s.patchDoc);
  const totalOf = useDocTotal();
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("UPI");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  if (!doc) return null;

  const total = totalOf(doc).total;
  const cur = CUR[doc.currency] ?? doc.currency;
  const payments = doc.payments ?? [];
  const paid = r2(payments.reduce((s, p) => s + p.amount, 0));
  const due = r2(total - (doc.advance || 0) - paid);
  const apply = (next: typeof payments) => patchDoc(doc.id, settle(doc, next, total));

  const add = (amt: number) => {
    if (!(amt > 0)) return setErr("Enter an amount greater than 0");
    if (amt > due + 0.001) return setErr(`Amount cannot exceed the due amount (${cur}${fmtNum(due)})`);
    setErr("");
    apply([...payments, newPayment(amt, mode, date, note)]);
    setAmount(""); setNote("");
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 grid place-items-center p-4" data-testid="payment-modal">
      <div className="card w-full max-w-[520px] p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-1"><h2 className="text-lg font-semibold">Record Payment — {doc.number}</h2><button onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        <div className="grid grid-cols-4 gap-2 my-4 text-center text-[12px]">
          <div className="bg-faint rounded-md p-2"><div className="text-muted">Total</div><b data-testid="pay-total">{cur}{fmtNum(total)}</b></div>
          <div className="bg-faint rounded-md p-2"><div className="text-muted">Advance</div><b>{cur}{fmtNum(doc.advance || 0)}</b></div>
          <div className="bg-green-50 rounded-md p-2"><div className="text-muted">Received</div><b className="text-green-700" data-testid="pay-received">{cur}{fmtNum(paid)}</b></div>
          <div className="bg-amber-50 rounded-md p-2"><div className="text-muted">Due</div><b className="text-amber-700" data-testid="pay-due">{cur}{fmtNum(due)}</b></div>
        </div>
        <div className="text-[12px] mb-3">Payment status: <b data-testid="pay-status">{doc.status}</b></div>

        {due > 0 && (
          <div className="border border-line rounded-lg p-3 mb-4">
            <div className="grid grid-cols-2 gap-3 text-[12px] text-muted">
              <label>Amount received<input type="number" className="field mt-1 text-ink" data-testid="pay-amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`up to ${fmtNum(due)}`} /></label>
              <label>Date<input type="date" className="field mt-1 text-ink" value={date} onChange={(e) => setDate(e.target.value)} /></label>
              <label>Payment mode<select className="field mt-1 text-ink" value={mode} onChange={(e) => setMode(e.target.value)}>{PAY_MODES.map((m) => <option key={m}>{m}</option>)}</select></label>
              <label>Note / Ref no.<input className="field mt-1 text-ink" value={note} onChange={(e) => setNote(e.target.value)} /></label>
            </div>
            {err && <div className="text-red-600 text-[12px] mt-2" data-testid="pay-error">{err}</div>}
            <div className="flex gap-2 mt-3">
              <button className="btn btn-primary" data-testid="pay-add" onClick={() => add(+amount)}>Add Payment</button>
              <button className="btn btn-outline" data-testid="pay-full" onClick={() => add(due)}>Receive full due ({cur}{fmtNum(due)})</button>
            </div>
          </div>
        )}

        {payments.length > 0 && (
          <div className="mb-4">
            <div className="text-[12px] font-medium mb-1">Payment history</div>
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-[12px] py-1.5 border-t border-line" data-testid="pay-row">
                <span>{format(parseISO(p.date), "dd MMM yyyy")} · {p.mode}{p.note ? ` · ${p.note}` : ""}</span>
                <span className="flex items-center gap-2"><b>{cur}{fmtNum(p.amount)}</b><button aria-label="Delete payment" className="text-muted hover:text-red-600" onClick={() => apply(payments.filter((x) => x.id !== p.id))}><Trash2 size={13} /></button></span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between">
          <button className="btn btn-outline text-red-600" data-testid="pay-unpaid" onClick={() => apply([])}>Mark as Unpaid</button>
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
