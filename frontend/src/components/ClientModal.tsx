"use client";
import { useState } from "react";
import { nanoid } from "nanoid";
import { X } from "lucide-react";
import { useStore } from "@/lib/store";
import { STATES } from "@/lib/config";
import type { Party } from "@/lib/types";

export default function ClientModal({ initial, onClose, onSaved }: { initial?: Party; onClose: () => void; onSaved?: (c: Party) => void }) {
  const saveClient = useStore((s) => s.saveClient);
  const [c, setC] = useState<Party>(initial ?? { id: nanoid(8), name: "", address: "", state: "Delhi", stateCode: "07", country: "India" });
  const up = (p: Partial<Party>) => setC((x) => ({ ...x, ...p }));
  const L = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="block text-[12px] text-muted">{label}{children}</label>;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
      <div className="card w-full max-w-[560px] p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-4"><h2 className="text-lg font-semibold">{initial ? "Edit Client" : "Add New Client"}</h2><button onClick={onClose}><X size={18} /></button></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><L label="Business / Client Name *"><input className="field mt-1 text-ink" value={c.name} onChange={(e) => up({ name: e.target.value })} /></L></div>
          <L label="Email"><input className="field mt-1 text-ink" value={c.email ?? ""} onChange={(e) => up({ email: e.target.value })} /></L>
          <L label="Phone"><input className="field mt-1 text-ink" value={c.phone ?? ""} onChange={(e) => up({ phone: e.target.value })} /></L>
          <div className="col-span-2"><L label="Address"><input className="field mt-1 text-ink" value={c.address} onChange={(e) => up({ address: e.target.value })} /></L></div>
          <L label="City"><input className="field mt-1 text-ink" value={c.city ?? ""} onChange={(e) => up({ city: e.target.value })} /></L>
          <L label="Pincode"><input className="field mt-1 text-ink" value={c.pincode ?? ""} onChange={(e) => up({ pincode: e.target.value })} /></L>
          <L label="State"><select className="field mt-1 text-ink" value={c.stateCode} onChange={(e) => { const s = STATES.find((x) => x[1] === e.target.value)!; up({ state: s[0], stateCode: s[1] }); }}>{STATES.map(([n, code]) => <option key={code} value={code}>{n} ({code})</option>)}</select></L>
          <L label="Country"><input className="field mt-1 text-ink" value={c.country} onChange={(e) => up({ country: e.target.value })} /></L>
          <L label="GSTIN"><input className="field mt-1 text-ink uppercase" maxLength={15} value={c.gstin ?? ""} onChange={(e) => up({ gstin: e.target.value.toUpperCase() })} /></L>
          <L label="PAN"><input className="field mt-1 text-ink uppercase" maxLength={10} value={c.pan ?? ""} onChange={(e) => up({ pan: e.target.value.toUpperCase() })} /></L>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!c.name.trim()} onClick={() => { saveClient(c); onSaved?.(c); onClose(); }}>Save</button>
        </div>
      </div>
    </div>
  );
}
