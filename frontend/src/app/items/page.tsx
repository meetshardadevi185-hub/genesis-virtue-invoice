"use client";
import { useState } from "react";
import { nanoid } from "nanoid";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useStore, useHydrated } from "@/lib/store";
import { GST_RATES, UNITS } from "@/lib/config";
import { money } from "@/lib/calc";
import type { CatalogItem } from "@/lib/types";
import RichText from "@/components/RichText";
import { stripHtml } from "@/lib/sanitize";

export default function Items() {
  const hydrated = useHydrated();
  const { items, saveItem, deleteItem } = useStore();
  const [e, setE] = useState<CatalogItem | null>(null);
  if (!hydrated) return null;
  const blank = (): CatalogItem => ({ id: nanoid(8), name: "", unit: "pcs", rate: 0, gstRate: 18 });
  return (
    <div className="p-6 max-w-[1000px]">
      <div className="flex justify-between mb-5"><h1 className="text-xl font-semibold">Products &amp; Services</h1><button className="btn btn-pink" onClick={() => setE(blank())}><Plus size={16} /> Add Item</button></div>
      <div className="card">
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-muted text-[12px] bg-faint"><th className="p-3">Name</th><th>HSN/SAC</th><th>Unit</th><th>GST</th><th className="text-right">Rate</th><th></th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t border-line"><td className="p-3"><div className="font-medium">{i.name}</div>{i.description && <div className="text-[11px] text-muted max-w-[320px] truncate">{stripHtml(i.description)}</div>}</td><td>{i.hsn || "—"}</td><td>{i.unit}</td><td>{i.gstRate}%</td><td className="text-right">{money(i.rate)}</td>
                <td className="text-right pr-3"><button className="p-1.5 text-muted hover:text-primary" onClick={() => setE(i)}><Pencil size={15} /></button><button className="p-1.5 text-muted hover:text-red-600" onClick={() => confirm("Delete item?") && deleteItem(i.id)}><Trash2 size={15} /></button></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {e && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
          <div className="card w-full max-w-[480px] p-6">
            <div className="flex justify-between mb-4"><h2 className="text-lg font-semibold">Item</h2><button onClick={() => setE(null)}><X size={18} /></button></div>
            <div className="grid grid-cols-2 gap-3 text-[12px] text-muted">
              <label className="col-span-2">Name *<input className="field mt-1 text-ink" value={e.name} onChange={(x) => setE({ ...e, name: x.target.value })} /></label>
              <div className="col-span-2">Description (auto-fills when you pick this item)<div className="mt-1 text-ink"><RichText testId="rt-item" minHeight={70} value={e.description} onChange={(html) => setE((cur) => (cur ? { ...cur, description: html } : cur))} /></div></div>
              <label>HSN/SAC<input className="field mt-1 text-ink" value={e.hsn ?? ""} onChange={(x) => setE({ ...e, hsn: x.target.value })} /></label>
              <label>Unit<select className="field mt-1 text-ink" value={e.unit} onChange={(x) => setE({ ...e, unit: x.target.value })}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></label>
              <label>Rate<input type="number" className="field mt-1 text-ink" value={e.rate} onChange={(x) => setE({ ...e, rate: +x.target.value })} /></label>
              <label>GST %<select className="field mt-1 text-ink" value={e.gstRate} onChange={(x) => setE({ ...e, gstRate: +x.target.value })}>{GST_RATES.map((g) => <option key={g} value={g}>{g}%</option>)}</select></label>
            </div>
            <div className="flex justify-end gap-2 mt-5"><button className="btn btn-outline" onClick={() => setE(null)}>Cancel</button><button className="btn btn-primary" disabled={!e.name.trim()} onClick={() => { saveItem(e); setE(null); }}>Save</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
