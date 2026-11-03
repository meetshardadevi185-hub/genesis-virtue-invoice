"use client";
import { useState } from "react";
import { nanoid } from "nanoid";
import { X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { BankAccount } from "@/lib/types";

export default function BankModal({ initial, defaultName, onClose, onSaved }: { initial?: BankAccount; defaultName?: string; onClose: () => void; onSaved?: (b: BankAccount) => void }) {
  const saveBank = useStore((s) => s.saveBank);
  const [b, setB] = useState<BankAccount>(initial ?? { id: nanoid(8), accountName: defaultName ?? "", accountNumber: "", ifsc: "", accountType: "Current", bank: "", upi: "" });
  const up = (p: Partial<BankAccount>) => setB((x) => ({ ...x, ...p }));
  const F = ({ l, k, cls = "" }: { l: string; k: keyof BankAccount; cls?: string }) => (
    <label className={`block text-[12px] text-muted ${cls}`}>{l}<input className="field mt-1 text-ink" value={(b[k] as string) ?? ""} onChange={(e) => up({ [k]: e.target.value })} /></label>
  );
  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
      <div className="card w-full max-w-[480px] p-6">
        <div className="flex justify-between mb-4"><h2 className="text-lg font-semibold">{initial ? "Edit Bank & UPI" : "Add Bank Account / UPI"}</h2><button onClick={onClose}><X size={18} /></button></div>
        <div className="grid grid-cols-2 gap-3">
          <F l="Account holder name *" k="accountName" cls="col-span-2" />
          <F l="Bank name" k="bank" /><F l="Account type" k="accountType" />
          <F l="Account number" k="accountNumber" /><F l="IFSC" k="ifsc" />
          <F l="UPI ID (shows QR code on invoice)" k="upi" cls="col-span-2" />
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!b.accountName.trim()} onClick={() => { saveBank(b); onSaved?.(b); onClose(); }}>Save</button>
        </div>
      </div>
    </div>
  );
}
