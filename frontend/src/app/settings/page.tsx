"use client";
import { useEffect, useState } from "react";
import { useStore, useHydrated } from "@/lib/store";
import { STATES } from "@/lib/config";
import type { BankAccount, Business } from "@/lib/types";

export default function Settings() {
  const hydrated = useHydrated();
  const { businesses, banks, activeBusinessId, saveBusiness, saveBank } = useStore();
  const [b, setB] = useState<Business | null>(null);
  const [bk, setBk] = useState<BankAccount | null>(null);
  const [ok, setOk] = useState(false);
  useEffect(() => { if (hydrated) { setB(businesses.find((x) => x.id === activeBusinessId) ?? null); setBk(banks[0] ?? null); } }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!hydrated || !b || !bk) return null;
  const ub = (p: Partial<Business>) => setB({ ...b, ...p });
  const uk = (p: Partial<BankAccount>) => setBk({ ...bk, ...p });
  const T = ({ l, v, f, cls = "" }: { l: string; v?: string; f: (s: string) => void; cls?: string }) => <label className={`text-[12px] text-muted ${cls}`}>{l}<input className="field mt-1 text-ink" value={v ?? ""} onChange={(e) => f(e.target.value)} /></label>;
  return (
    <div className="p-6 max-w-[800px]">
      <h1 className="text-xl font-semibold mb-5">Business Settings</h1>
      <div className="card p-6 mb-5">
        <h2 className="font-medium mb-3">Business details</h2>
        <div className="grid grid-cols-2 gap-3">
          <T l="Business name" v={b.name} f={(s) => ub({ name: s })} cls="col-span-2" />
          <T l="Tagline (shown under title)" v={b.tagline} f={(s) => ub({ tagline: s })} cls="col-span-2" />
          <T l="Address" v={b.address} f={(s) => ub({ address: s })} cls="col-span-2" />
          <T l="City" v={b.city} f={(s) => ub({ city: s })} /><T l="Pincode" v={b.pincode} f={(s) => ub({ pincode: s })} />
          <label className="text-[12px] text-muted">State<select className="field mt-1 text-ink" value={b.stateCode} onChange={(e) => { const s = STATES.find((x) => x[1] === e.target.value)!; ub({ state: s[0], stateCode: s[1] }); }}>{STATES.map(([n, c]) => <option key={c} value={c}>{n} ({c})</option>)}</select></label>
          <T l="Country" v={b.country} f={(s) => ub({ country: s })} />
          <T l="GSTIN" v={b.gstin} f={(s) => ub({ gstin: s.toUpperCase() })} /><T l="PAN" v={b.pan} f={(s) => ub({ pan: s.toUpperCase() })} />
        </div>
      </div>
      <div className="card p-6">
        <h2 className="font-medium mb-3">Bank account</h2>
        <div className="grid grid-cols-2 gap-3">
          <T l="Account name" v={bk.accountName} f={(s) => uk({ accountName: s })} /><T l="Bank" v={bk.bank} f={(s) => uk({ bank: s })} />
          <T l="Account number" v={bk.accountNumber} f={(s) => uk({ accountNumber: s })} /><T l="IFSC" v={bk.ifsc} f={(s) => uk({ ifsc: s })} />
          <T l="Account type" v={bk.accountType} f={(s) => uk({ accountType: s })} /><T l="UPI ID (for QR)" v={bk.upi} f={(s) => uk({ upi: s })} />
        </div>
      </div>
      <button className="btn btn-primary mt-5" onClick={() => { saveBusiness(b); saveBank(bk); setOk(true); setTimeout(() => setOk(false), 1500); }}>{ok ? "Saved ✓" : "Save settings"}</button>
    </div>
  );
}
