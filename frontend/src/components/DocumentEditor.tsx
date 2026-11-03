"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { nanoid } from "nanoid";
import { CalendarPlus, Pencil, Plus, Trash2, X, Eye, Save, Landmark, Star } from "lucide-react";
import { useStore, useHydrated } from "@/lib/store";
import { DOC_CONFIG, GST_RATES, UNITS, slugToType } from "@/lib/config";
import { CUR, computeTotals, fmtNum, lineAmount, lineTax } from "@/lib/calc";
import type { Charge, DocumentData, LineItem } from "@/lib/types";
import Logo from "./Logo";
import ClientModal from "./ClientModal";
import BankModal from "./BankModal";
import RichText from "./RichText";
import ItemPicker from "./ItemPicker";

export default function DocumentEditor({ id, slug }: { id: string; slug: string }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const stored = useStore((s) => s.docs.find((d) => d.id === id));
  const { businesses, clients, banks, items: catalog, saveDoc, saveItem } = useStore();
  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [clientModal, setClientModal] = useState<null | "new" | "edit">(null);
  const [bankModal, setBankModal] = useState<null | "edit" | "new">(null);
  const [savedLine, setSavedLine] = useState<string | null>(null);
  const [showDue, setShowDue] = useState(false);
  const [discOpen, setDiscOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!hydrated || doc) return;
    let d = stored;
    if (!d && id === "new") { const t = slugToType(slug); if (t) d = useStore.getState().newDoc(t); }
    if (d) { setDoc(d); setShowDue(!!d.dueDate); setDiscOpen(d.discountPct > 0 || d.discountFlat > 0); }
  }, [hydrated, stored, doc, id, slug]);

  if (!hydrated) return null;
  if (!doc) return id === "new" ? null : <div className="p-8">Document not found. <Link className="text-primary underline" href="/">Go home</Link></div>;

  const cfg = DOC_CONFIG[doc.type];
  const biz = businesses.find((b) => b.id === doc.businessId);
  const client = clients.find((c) => c.id === doc.clientId);
  const bank = banks.find((b) => b.id === doc.bankId);
  const intra = !client || !biz || client.stateCode === biz.stateCode;
  const t = computeTotals(doc, intra);
  const cur = CUR[doc.currency] ?? doc.currency;
  const set = (p: Partial<DocumentData>) => setDoc((d) => (d ? { ...d, ...p } : d));
  const setLine = (lid: string, p: Partial<LineItem>) => set({ items: doc.items.map((l) => (l.id === lid ? { ...l, ...p } : l)) });
  const saveLineAsItem = (l: LineItem) => {
    const name = l.name.trim();
    const existing = catalog.find((c) => c.name.toLowerCase() === name.toLowerCase());
    saveItem({ id: existing?.id ?? nanoid(8), name, description: l.description, hsn: l.hsn, unit: l.unit, rate: l.rate, gstRate: l.gstRate });
    setSavedLine(l.id);
    setTimeout(() => setSavedLine(null), 1800);
  };
  const addLine = () => set({ items: [...doc.items, { id: nanoid(6), name: "", gstRate: 18, quantity: 1, unit: "pcs", rate: 0 }] });
  const lastNo = (() => {
    const same = useStore.getState().docs.filter((x) => x.type === doc.type && x.id !== doc.id);
    return same.length ? same.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0].number : null;
  })();

  const save = (go?: boolean) => {
    saveDoc(doc);
    if (id === "new" && !go) window.history.replaceState(null, "", `/${cfg.slug}/${doc.id}/edit`);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    if (go) router.push(`/${cfg.slug}/${doc.id}`);
  };

  const hdr = "text-white text-[12px] font-medium px-2 py-3";
  const cols = intra
    ? "grid-cols-[24px_minmax(140px,2fr)_62px_66px_76px_84px_92px_82px_82px_96px_22px]"
    : "grid-cols-[24px_minmax(140px,2fr)_62px_66px_76px_84px_92px_92px_96px_22px]";

  return (
    <div className="max-w-[1150px] mx-auto py-6 px-4 pb-24">
      <div className="no-print flex items-center justify-between mb-4">
        <Link href={`/${cfg.slug}`} className="text-primary text-sm">← {cfg.plural}</Link>
        <div className="flex gap-2">
          <button onClick={() => save()} className="btn btn-outline"><Save size={15} /> {saved ? "Saved ✓" : "Save"}</button>
          <button onClick={() => save(true)} className="btn btn-primary"><Eye size={15} /> Save &amp; Preview</button>
        </div>
      </div>

      <div className="card p-8">
        {/* Header */}
        <div className="flex justify-between">
          <div className="flex-1">
            <div className="text-center">
              <div className="inline-flex items-center gap-2"><input className="dashed-input text-[26px] font-semibold text-center" value={doc.title} onChange={(e) => set({ title: e.target.value })} /><Pencil size={14} className="text-muted" /></div>
              <div><input className="dashed-input text-[12px] text-center text-muted w-[420px] max-w-full" placeholder="Add Subtitle" value={doc.subtitle ?? ""} onChange={(e) => set({ subtitle: e.target.value })} /></div>
            </div>
            <div className="mt-5 grid grid-cols-[130px_260px] gap-y-4 items-center">
              <label className="dotted w-fit text-[13px]">{cfg.numberLabel}<span className="text-pink">*</span></label>
              <div><input className="underline-input" value={doc.number} onChange={(e) => set({ number: e.target.value })} />{lastNo && <div className="text-[10px] text-muted">Last No: {lastNo}</div>}</div>
              <label className="dotted w-fit text-[13px]">{cfg.dateLabel}<span className="text-pink">*</span></label>
              <input type="date" className="underline-input" value={doc.date} onChange={(e) => set({ date: e.target.value })} />
              {showDue ? (
                <>
                  <label className="dotted w-fit text-[13px]">{cfg.dueLabel}</label>
                  <div className="flex items-center gap-2"><input type="date" className="underline-input" value={doc.dueDate ?? ""} onChange={(e) => set({ dueDate: e.target.value })} /><button onClick={() => { setShowDue(false); set({ dueDate: undefined }); }}><X size={14} /></button></div>
                </>
              ) : (
                <button className="flex items-center gap-1.5 text-primary text-[12px] col-span-2 w-fit" onClick={() => setShowDue(true)}><CalendarPlus size={14} /> Add due date</button>
              )}
            </div>
          </div>
          <div className="w-[130px] border border-line rounded-lg p-3 flex flex-col items-center self-start">
            <Logo size={100} />
            <div className="flex gap-3 text-[11px] mt-2 text-muted"><span className="flex items-center gap-0.5"><X size={11} /> Remove</span><span className="flex items-center gap-0.5 text-primary"><Pencil size={11} /> change</span></div>
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-[#f7f7f9] border border-line rounded-lg p-4">
            <div className="font-semibold text-[15px] mb-3">{cfg.partyFrom} <span className="text-[11px] text-muted font-normal ml-1">(Your Details)</span></div>
            <select className="field mb-3 bg-[#eee]" value={doc.businessId} onChange={(e) => set({ businessId: e.target.value })}>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name.toUpperCase()}</option>)}
            </select>
            {biz && (
              <div className="bg-white border border-line rounded-md p-3 text-[12px] relative">
                <Link href="/settings" className="absolute right-3 top-3 text-primary flex items-center gap-1"><Pencil size={11} /> Edit</Link>
                <div className="font-medium">{biz.name}</div>
                <div className="text-[#444] mt-1">{[biz.address, biz.city, biz.state, `${biz.country} - ${biz.pincode}`].filter(Boolean).join(", ")}</div>
                <div className="grid grid-cols-[90px_1fr] mt-2 text-[11px] text-muted gap-y-1"><span>GSTIN</span><span className="text-ink">{biz.gstin}</span><span>PAN</span><span className="text-ink">{biz.pan}</span></div>
              </div>
            )}
          </div>
          <div className="bg-[#f7f7f9] border border-line rounded-lg p-4">
            <div className="font-semibold text-[15px] mb-3">{cfg.partyFor} <span className="text-[11px] text-muted font-normal ml-1">(Client&apos;s Details)</span></div>
            <div className="flex gap-2 mb-3">
              <select className="field" value={doc.clientId} onChange={(e) => set({ clientId: e.target.value })}>
                <option value="">Select a client</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button className="btn btn-outline whitespace-nowrap" onClick={() => setClientModal("new")}><Plus size={14} /> New</button>
            </div>
            {client && (
              <div className="bg-white border border-line rounded-md p-3 text-[12px] relative">
                <button onClick={() => setClientModal("edit")} className="absolute right-3 top-3 text-primary flex items-center gap-1"><Pencil size={11} /> Edit</button>
                <div className="font-medium">{client.name}</div>
                <div className="text-[#444] mt-1">{[client.address, client.city, client.state, client.country].filter(Boolean).join(", ")}</div>
                {client.gstin && <div className="grid grid-cols-[90px_1fr] mt-2 text-[11px] text-muted"><span>GSTIN</span><span className="text-ink">{client.gstin}</span></div>}
              </div>
            )}
          </div>
        </div>

        {/* Config row */}
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-3 mt-5 items-end">
          <button className="btn btn-outline justify-center text-[12px]">% Configure GST</button>
          <div>
            <div className="text-[12px] mb-1">Currency<span className="text-pink">*</span></div>
            <select className="field text-[12px]" value={doc.currency} onChange={(e) => set({ currency: e.target.value })}>
              <option value="INR">Indian Rupee(INR, ₹)</option><option value="USD">US Dollar(USD, $)</option><option value="EUR">Euro(EUR, €)</option><option value="GBP">Pound(GBP, £)</option><option value="AED">Dirham(AED)</option>
            </select>
          </div>
          <button className="btn btn-outline justify-center text-[12px]">123 Number and Currency Format</button>
          <button className="btn btn-outline justify-center text-[12px]">Edit Columns/Formulas</button>
        </div>

        {/* Table */}
        <div className="mt-5">
          <div className={`grid ${cols} bg-primary rounded-md items-center`}>
            <div className={hdr}></div><div className={hdr}>Item</div><div className={hdr}>GST %</div><div className={hdr}>Qty / Time</div><div className={hdr}>Unit</div><div className={hdr}>Rate</div>
            <div className={hdr}>Amount</div>{intra ? <><div className={hdr}>CGST</div><div className={hdr}>SGST</div></> : <div className={hdr}>IGST</div>}<div className={hdr}>Total</div><div></div>
          </div>
          {doc.items.map((l, i) => {
            const lt = lineTax(l, doc, intra);
            return (
              <div key={l.id} className="border-b border-line">
              <div className={`grid ${cols} gap-1 items-start py-2 text-[12px]`}>
                <div className="pt-2 text-center text-muted">{i + 1}</div>
                <div>
                  <ItemPicker value={l.name} onType={(v) => setLine(l.id, { name: v })}
                    onPick={(c) => setLine(l.id, { name: c.name, rate: c.rate, gstRate: c.gstRate, unit: c.unit, hsn: c.hsn, description: c.description || l.description })} />
                </div>
                <input list="gstrates" type="number" min={0} step="any" className="field px-2" value={l.gstRate} onChange={(e) => setLine(l.id, { gstRate: +e.target.value })} title="Type any GST % or pick from list" />
                <input type="number" min={0} className="field" value={l.quantity} onChange={(e) => setLine(l.id, { quantity: +e.target.value })} />
                <select className="field px-1" value={l.unit} onChange={(e) => setLine(l.id, { unit: e.target.value })}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select>
                <input type="number" min={0} className="field" value={l.rate} onChange={(e) => setLine(l.id, { rate: +e.target.value })} />
                <div className="pt-2">{cur}{fmtNum(lineAmount(l))}</div>
                {intra ? <><div className="pt-2">{cur}{fmtNum(lt.cgst)}</div><div className="pt-2">{cur}{fmtNum(lt.sgst)}</div></> : <div className="pt-2">{cur}{fmtNum(lt.igst)}</div>}
                <div className="pt-2 font-medium">{cur}{fmtNum(lt.total)}</div>
                <button className="pt-2 text-muted hover:text-red-600" aria-label="Delete line" onClick={() => set({ items: doc.items.filter((x) => x.id !== l.id) })}><Trash2 size={14} /></button>
              </div>
              <div className="pl-7 pr-6 pb-3">
                <RichText testId={`rt-${i}`} value={l.description} onChange={(html) => setLine(l.id, { description: html })} />
                {l.name.trim() && (
                  <button type="button" data-testid="save-item" className="mt-1.5 text-[11px] text-primary flex items-center gap-1 hover:underline" onClick={() => saveLineAsItem(l)}>
                    <Star size={11} /> {savedLine === l.id ? "Saved to items ✓" : catalog.some((c) => c.name.toLowerCase() === l.name.trim().toLowerCase()) ? "Update saved item" : "Save item for reuse"}
                  </button>
                )}
              </div>
              </div>
            );
          })}
          <datalist id="gstrates">{GST_RATES.map((g) => <option key={g} value={g} />)}</datalist>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <button onClick={addLine} className="border border-dashed border-primary/50 text-primary rounded-md py-2 text-[12px] hover:bg-faint">⊕ Add New Line</button>
            <button onClick={addLine} className="border border-dashed border-primary/50 text-primary rounded-md py-2 text-[12px] hover:bg-faint">⊕ Add New Group</button>
          </div>
        </div>

        {/* Bottom */}
        <div className="grid grid-cols-[1fr_300px] gap-6 mt-6">
          <div>
            <div className="bg-[#f7f7f9] border border-line rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-soft grid place-items-center text-primary"><Landmark size={17} /></div><div><div className="text-[12px] font-medium">Show Bank Account Details</div><div className="text-[10px] text-muted">NEFT, IMPS, CASH</div></div></div>
                <button onClick={() => set({ showBank: !doc.showBank })} className={`w-10 h-5 rounded-full relative transition ${doc.showBank ? "bg-primary" : "bg-gray-300"}`}><span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${doc.showBank ? "left-[22px]" : "left-0.5"}`} /></button>
              </div>
              {doc.showBank && bank && (
                <>
                  <div className="bg-white border border-line rounded-md p-3 mt-3 text-[11px]">
                    <div className="flex justify-between"><span className="font-medium text-[12px]">Bank Account</span><button className="text-primary flex items-center gap-1" onClick={() => setBankModal("edit")}><Pencil size={10} /> Edit</button></div>
                    <div className="font-medium mt-1">{bank.accountName}</div>
                    <div className="text-muted mt-1 flex gap-4"><span>Bank: <b className="font-normal text-ink">{bank.bank}</b></span><span>Acc. No: <b className="font-normal text-ink">{bank.accountNumber}</b></span><span>IFSC: <b className="font-normal text-ink">{bank.ifsc}</b></span></div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <select className="field text-[12px]" value={doc.bankId} onChange={(e) => set({ bankId: e.target.value, upiId: undefined })}>{banks.map((b) => <option key={b.id} value={b.id}>{b.bank} - {b.accountNumber}</option>)}</select>
                    <button className="btn btn-outline whitespace-nowrap text-[12px]" onClick={() => setBankModal("new")}><Plus size={13} /> Add New</button>
                  </div>
                  <label className="block mt-3 text-[11px] text-muted">UPI ID (QR code on {cfg.label.toLowerCase()})
                    <input className="field mt-1 text-ink text-[12px]" placeholder="e.g. 7706030003@hdfc" value={doc.upiId ?? bank.upi ?? ""} onChange={(e) => set({ upiId: e.target.value })} />
                  </label>
                </>
              )}
              {doc.showBank && !bank && <button className="btn btn-outline mt-3 text-[12px]" onClick={() => setBankModal("new")}><Plus size={13} /> Add Bank Account / UPI</button>}
            </div>
            <div className="mt-4">
              <div className="text-[12px] mb-1">Terms and Conditions</div>
              <RichText testId="rt-terms" placeholder="Add terms and conditions" minHeight={70} value={doc.terms} onChange={(html) => set({ terms: html })} />
              <div className="text-[12px] mt-3 mb-1">Additional Notes</div>
              <RichText testId="rt-notes" placeholder="Add notes" minHeight={70} value={doc.notes} onChange={(html) => set({ notes: html })} />
            </div>
          </div>

          <div className="bg-[#f7f7f9] border border-line rounded-lg p-4 text-[12.5px] h-fit">
            <div className="flex justify-between py-1.5"><span>Amount</span><b className="font-semibold">{cur}{fmtNum(t.subtotal)}</b></div>
            {t.discount > 0 && <div className="flex justify-between py-1.5"><span>Discount</span><span>- {cur}{fmtNum(t.discount)}</span></div>}
            {doc.type !== "challan" && (intra
              ? <><div className="flex justify-between py-1.5"><span>CGST</span><span>{cur}{fmtNum(t.cgst)}</span></div><div className="flex justify-between py-1.5"><span>SGST</span><span>{cur}{fmtNum(t.sgst)}</span></div></>
              : <div className="flex justify-between py-1.5"><span>IGST</span><span>{cur}{fmtNum(t.igst)}</span></div>)}
            {doc.charges.map((c) => (
              <div key={c.id} className="flex items-center gap-1 py-1.5">
                <input className="dashed-input flex-1" value={c.label} onChange={(e) => set({ charges: doc.charges.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)) as Charge[] })} />
                <input type="number" className="dashed-input w-20 text-right" value={c.amount} onChange={(e) => set({ charges: doc.charges.map((x) => (x.id === c.id ? { ...x, amount: +e.target.value } : x)) })} />
                <button onClick={() => set({ charges: doc.charges.filter((x) => x.id !== c.id) })}><X size={13} /></button>
              </div>
            ))}
            <div className="flex items-center justify-between py-1.5"><span className="dotted">Advance payment</span><span className="flex items-center gap-1">{cur}<input type="number" className="dashed-input w-20 text-right" value={doc.advance} onChange={(e) => set({ advance: +e.target.value })} /></span></div>
            <button className="text-primary py-1.5 block" onClick={() => setDiscOpen(!discOpen)}>🏷 Add Discounts ⌄</button>
            {discOpen && (
              <div className="flex gap-2 pb-2">
                <label className="flex-1 text-[11px]">% <input type="number" className="field" value={doc.discountPct} onChange={(e) => set({ discountPct: +e.target.value })} /></label>
                <label className="flex-1 text-[11px]">Flat <input type="number" className="field" value={doc.discountFlat} onChange={(e) => set({ discountFlat: +e.target.value })} /></label>
              </div>
            )}
            <button className="text-primary py-1.5 block" onClick={() => set({ charges: [...doc.charges, { id: nanoid(5), label: "Additional charge", amount: 0 }] })}>⊕ Add Additional Charges ⌄</button>
            <label className="flex items-center gap-2 py-1.5"><input type="checkbox" className="accent-[#6b3fc2]" checked={doc.summariseQty} onChange={(e) => set({ summariseQty: e.target.checked })} /> Summarise Total Quantity</label>
            <div className="flex justify-between border-t border-line mt-2 pt-3 text-[17px]"><span className="dotted">Total <span className="text-[13px]">({doc.currency})</span></span><b>{cur}{fmtNum(t.total)}</b></div>
            {(t.advance > 0 || doc.paid > 0) && <div className="flex justify-between pt-2 text-muted"><span>Amount due</span><span>{cur}{fmtNum(t.due)}</span></div>}
          </div>
        </div>
      </div>

      {bankModal && <BankModal initial={bankModal === "edit" ? bank : undefined} defaultName={biz?.name} onClose={() => setBankModal(null)} onSaved={(b) => set({ bankId: b.id, upiId: undefined })} />}
      {clientModal && <ClientModal initial={clientModal === "edit" ? client : undefined} onClose={() => setClientModal(null)} onSaved={(c) => set({ clientId: c.id })} />}
    </div>
  );
}
