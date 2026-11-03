"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Ban, BellRing, CheckCircle2, Copy, Download, FilePlus, FileMinus, FileText, Link2, Mail, MessageCircle, MoreHorizontal, Plus, Search, ShoppingCart, Trash2, Truck, Files, Eye, Pencil } from "lucide-react";
import { useStore, useHydrated } from "@/lib/store";
import { DOC_CONFIG } from "@/lib/config";
import { money } from "@/lib/calc";
import { useDocTotal } from "@/lib/useDocTotal";
import PaymentModal from "./PaymentModal";
import { newPayment, settle } from "@/lib/payments";
import type { DocType, DocumentData } from "@/lib/types";
import { downloadXlsx } from "@/lib/exportXlsx";
import { FileSpreadsheet, X } from "lucide-react";

const statusColor: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-700", Unpaid: "bg-red-50 text-red-700", Sent: "bg-blue-50 text-blue-700", Paid: "bg-green-50 text-green-700",
  "Partially Paid": "bg-amber-50 text-amber-700", Cancelled: "bg-red-50 text-red-700", "Pending Approval": "bg-purple-50 text-purple-700",
};

export { useDocTotal };

export default function DocumentList({ type }: { type: DocType }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const cfg = DOC_CONFIG[type];
  const { docs, clients, patchDoc, deleteDoc, duplicateDoc, convertDoc } = useStore();
  const totalOf = useDocTotal();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("All");
  const [menu, setMenu] = useState<string | null>(null);
  const [fClient, setFClient] = useState("");
  const [fNo, setFNo] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [toast, setToast] = useState("");
  const [payFor, setPayFor] = useState<string | null>(null);

  const list = useMemo(
    () => docs.filter((d) => d.type === type).filter((d) => tab === "All" || d.status === tab)
      .filter((d) => (d.number + (clients.find((c) => c.id === d.clientId)?.name ?? "")).toLowerCase().includes(q.toLowerCase()))
      .filter((d) => !fClient || d.clientId === fClient)
      .filter((d) => !fNo || d.number.toLowerCase().includes(fNo.toLowerCase()))
      .filter((d) => (!from || d.date >= from) && (!to || d.date <= to))
      .filter((d) => { const t = totalOf(d).total; return (!min || t >= +min) && (!max || t <= +max); })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [docs, type, tab, q, clients, fClient, fNo, from, to, min, max, totalOf]
  );
  if (!hydrated) return null;

  const all = docs.filter((d) => d.type === type);
  const sum = (f: (d: DocumentData) => boolean) => all.filter(f).reduce((s, d) => s + totalOf(d).total, 0);
  const note = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };
  const go = (d: DocumentData, sub = "") => router.push(`/${DOC_CONFIG[d.type].slug}/${d.id}${sub}`);

  const filtered = !!(fClient || fNo || from || to || min || max || q || tab !== "All");
  const clear = () => { setFClient(""); setFNo(""); setFrom(""); setTo(""); setMin(""); setMax(""); setQ(""); setTab("All"); };
  const exportXlsx = () => {
    const withTax = type !== "challan";
    const head = [cfg.label + " No", "Client", "GSTIN", "Date", cfg.dueLabel, "Status", "Amount", ...(withTax ? ["CGST", "SGST", "IGST"] : []), "Total", "Currency"];
    const rows = list.map((d) => { const t = totalOf(d); const c = clients.find((x) => x.id === d.clientId); return [d.number, c?.name ?? "", c?.gstin ?? "", d.date, d.dueDate ?? "", d.status, t.subtotal, ...(withTax ? [t.cgst, t.sgst, t.igst] : []), t.total, d.currency]; });
    downloadXlsx(`${cfg.slug}-${new Date().toISOString().slice(0, 10)}`, head, rows, cfg.plural);
  };
  const create = () => router.push(`/${cfg.slug}/new/edit`);
  const convert = (d: DocumentData, to: DocType) => { const n = convertDoc(d.id, to); if (n) { note(`Created ${DOC_CONFIG[to].label}`); go(n, "/edit"); } };
  const link = (d: DocumentData) => `${location.origin}/${DOC_CONFIG[d.type].slug}/${d.id}`;

  const actions = (d: DocumentData) => {
    const c = clients.find((x) => x.id === d.clientId);
    const A = (icon: React.ReactNode, label: string, fn: () => void, danger = false) => ({ icon, label, fn, danger });
    const groups = [
      [
        ...(cfg.hasPayment ? [
          A(<CheckCircle2 size={15} />, "Record Payment", () => setPayFor(d.id)),
          A(<CheckCircle2 size={15} />, "Mark Paid", () => { const t = totalOf(d).total; const rec = (d.payments ?? []).reduce((x, p) => x + p.amount, 0); const rest = t - (d.advance || 0) - rec; patchDoc(d.id, settle(d, rest > 0 ? [...(d.payments ?? []), newPayment(rest)] : d.payments ?? [], t)); note("Marked as paid"); }),
          A(<Ban size={15} />, "Mark Unpaid", () => { patchDoc(d.id, settle(d, [], totalOf(d).total)); note("Marked as unpaid"); }),
        ] : []),
        A(<Copy size={15} />, "Duplicate", () => { const n = duplicateDoc(d.id); if (n) note("Duplicated"); }),
        A(<Plus size={15} />, "Send for Approval", () => { patchDoc(d.id, { status: "Pending Approval" }); note("Sent for approval"); }),
      ],
      [
        A(<Link2 size={15} />, `Copy ${cfg.label} link`, () => { navigator.clipboard?.writeText(link(d)); note("Link copied"); }),
        A(<Download size={15} />, "Download", () => window.open(`/${cfg.slug}/${d.id}?print=1`, "_blank")),
      ],
      [
        A(<Mail size={15} />, "Send Email", () => { patchDoc(d.id, { status: d.status === "Draft" ? "Sent" : d.status, emailSent: true }); location.href = `mailto:${c?.email ?? ""}?subject=${encodeURIComponent(`${cfg.label} ${d.number}`)}&body=${encodeURIComponent(link(d))}`; }),
        A(<MessageCircle size={15} className="text-green-600" />, "Send Whatsapp", () => { patchDoc(d.id, { status: d.status === "Draft" ? "Sent" : d.status, whatsappSent: true }); window.open(`https://wa.me/${(c?.phone ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(`${cfg.label} ${d.number}: ${link(d)}`)}`, "_blank"); }),
        A(<BellRing size={15} />, "Send Reminder By Email", () => { location.href = `mailto:${c?.email ?? ""}?subject=${encodeURIComponent(`Reminder: ${cfg.label} ${d.number}`)}`; }),
        A(<BellRing size={15} />, "Send Reminder By Whatsapp", () => window.open(`https://wa.me/${(c?.phone ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(`Reminder: ${cfg.label} ${d.number} is pending.`)}`, "_blank")),
      ],
      [
        ...(type !== "credit-note" ? [A(<FilePlus size={15} />, "Create Credit Note", () => convert(d, "credit-note"))] : []),
        ...(type !== "debit-note" ? [A(<FileMinus size={15} />, "Create Debit Note", () => convert(d, "debit-note"))] : []),
        ...(type !== "invoice" ? [A(<FileText size={15} />, "Convert to Invoice", () => convert(d, "invoice"))] : []),
        ...(type !== "purchase-order" ? [A(<ShoppingCart size={15} />, "Convert to Purchase Order", () => convert(d, "purchase-order"))] : []),
        ...(type !== "challan" ? [A(<Truck size={15} />, "Generate Delivery Challan", () => convert(d, "challan"))] : []),
      ],
      [
        A(<Trash2 size={15} />, "Delete", () => { if (confirm(`Delete ${d.number}?`)) deleteDoc(d.id); }, true),
        A(<Ban size={15} />, "Cancel", () => { patchDoc(d.id, { status: "Cancelled" }); note("Cancelled"); }, true),
      ],
      [A(<Files size={15} />, "Convert to New Document", () => convert(d, "proforma"))],
    ];
    return groups;
  };

  const tabs = ["All", "Draft", "Sent", ...(cfg.hasPayment ? ["Unpaid", "Partially Paid", "Paid"] : []), "Pending Approval", "Cancelled"];

  return (
    <div className="p-6 max-w-[1250px]">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold">{cfg.plural}</h1>
        <div className="flex gap-2">
          <button className="btn btn-outline" onClick={exportXlsx}><FileSpreadsheet size={16} /> Export Excel</button>
          <button className="btn btn-pink" onClick={create}><Plus size={16} /> Create New {cfg.label}</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-5">
        {[["Total", sum(() => true), "text-primary"], ...(cfg.hasPayment ? [["Received", all.filter((d) => d.status !== "Cancelled").reduce((x, d) => x + (d.paid || 0) + (d.advance || 0), 0), "text-green-600"], ["Pending", all.filter((d) => d.status !== "Cancelled").reduce((x, d) => x + Math.max(0, totalOf(d).total - (d.paid || 0) - (d.advance || 0)), 0), "text-amber-600"]] : [["Sent", sum((d) => d.status === "Sent"), "text-blue-600"], ["Draft", sum((d) => d.status === "Draft"), "text-gray-600"]]), ["Count", all.length, "text-ink"]].map(([k, v, cls]) => (
          <div key={k as string} className="card p-4"><div className="text-muted text-[12px]">{k}</div><div className={`text-[20px] font-semibold ${cls}`}>{k === "Count" ? v : money(v as number)}</div></div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-line overflow-x-auto">
          {tabs.map((t) => <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-[13px] border-b-2 whitespace-nowrap ${tab === t ? "border-primary text-primary font-medium" : "border-transparent text-muted"}`}>{t}</button>)}
          <div className="ml-auto relative pb-2"><Search size={14} className="absolute left-2.5 top-2.5 text-muted" /><input className="field pl-8 w-64" placeholder={`Search ${cfg.plural.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
        <div className="filters flex flex-wrap items-end gap-3 p-4 border-b border-line bg-faint/50 text-[11px] text-muted">
          <label>Client<select className="field mt-1 w-52 text-ink" value={fClient} onChange={(e) => setFClient(e.target.value)}><option value="">All clients</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label>{cfg.label} No<input className="field mt-1 w-36 text-ink" placeholder="e.g. 16" value={fNo} onChange={(e) => setFNo(e.target.value)} /></label>
          <label>From<input type="date" className="field mt-1 text-ink" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>To<input type="date" className="field mt-1 text-ink" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <label>Min ₹<input type="number" className="field mt-1 w-28 text-ink" value={min} onChange={(e) => setMin(e.target.value)} /></label>
          <label>Max ₹<input type="number" className="field mt-1 w-28 text-ink" value={max} onChange={(e) => setMax(e.target.value)} /></label>
          {filtered && <button className="btn btn-outline" onClick={clear}><X size={14} /> Clear</button>}
          <div className="ml-auto text-[12px]">{list.length} of {all.length} shown</div>
        </div>
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-muted text-[12px] bg-faint"><th className="p-3">{cfg.label} No</th><th>Client</th><th>Date</th><th>{cfg.dueLabel}</th><th className="text-right">Amount</th>{cfg.hasPayment && <th className="text-right">Due</th>}<th className="pl-6">Status</th><th>Sent</th><th></th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={9} className="p-10 text-center text-muted">No {cfg.plural.toLowerCase()} found.</td></tr>}
            {list.map((d) => {
              const c = clients.find((x) => x.id === d.clientId);
              return (
                <tr key={d.id} className="border-t border-line hover:bg-faint/60">
                  <td className="p-3"><Link className="text-primary font-medium" href={`/${cfg.slug}/${d.id}`}>{d.number}</Link></td>
                  <td>{c?.name ?? <span className="text-muted">—</span>}</td>
                  <td>{format(parseISO(d.date), "dd MMM yyyy")}</td>
                  <td>{d.dueDate ? format(parseISO(d.dueDate), "dd MMM yyyy") : "—"}</td>
                  <td className="text-right font-medium">{money(totalOf(d).total, d.currency)}</td>
                  {cfg.hasPayment && <td className="text-right" data-testid="due-cell">{money(Math.max(0, totalOf(d).total - (d.paid || 0) - (d.advance || 0)), d.currency)}</td>}
                  <td className="pl-6"><span className={`px-2 py-0.5 rounded-full text-[11px] ${statusColor[d.status]}`}>{d.status}</span></td>
                  <td className="text-[12px]">{d.emailSent || d.whatsappSent ? <span className="text-green-600">Sent</span> : <span className="text-muted">Not Sent <button className="text-primary" onClick={() => { patchDoc(d.id, { emailSent: true, status: d.status === "Draft" ? "Sent" : d.status }); }}>(Send)</button></span>}</td>
                  <td className="relative pr-3 text-right whitespace-nowrap">
                    <Link href={`/${cfg.slug}/${d.id}`} className="inline-block p-1.5 text-muted hover:text-primary"><Eye size={15} /></Link>
                    <Link href={`/${cfg.slug}/${d.id}/edit`} className="inline-block p-1.5 text-muted hover:text-primary"><Pencil size={15} /></Link>
                    <button className="p-1.5 text-muted hover:text-primary" onClick={() => setMenu(menu === d.id ? null : d.id)}><MoreHorizontal size={17} /></button>
                    {menu === d.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
                        <div className="absolute right-4 top-9 z-50 w-[265px] bg-white rounded-lg shadow-2xl border border-line text-left py-1.5 text-[13px]">
                          {actions(d).map((g, gi) => (
                            <div key={gi} className={gi > 0 ? "border-t border-line mt-1 pt-1" : ""}>
                              {g.map((a) => (
                                <button key={a.label} onClick={() => { setMenu(null); a.fn(); }} className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-faint ${a.danger ? "text-red-600" : "text-primary"}`}>
                                  {a.icon}<span className="text-ink">{a.label}</span>
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {payFor && <PaymentModal docId={payFor} onClose={() => setPayFor(null)} />}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-white px-4 py-2 rounded-lg z-[60]">{toast}</div>}
    </div>
  );
}
