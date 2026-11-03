"use client";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Download } from "lucide-react";
import { useStore, useHydrated } from "@/lib/store";
import { useDocTotal } from "@/components/DocumentList";
import { fmtNum, lineAmount } from "@/lib/calc";
import { downloadXlsx } from "@/lib/exportXlsx";

const TABS = ["GST Report", "TDS Report", "Sales by Client", "Line Items Report"] as const;

export default function Reports() {
  const hydrated = useHydrated();
  const { docs, clients } = useStore();
  const totalOf = useDocTotal();
  const [tab, setTab] = useState<(typeof TABS)[number]>("GST Report");
  const [fClient, setFClient] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fNo, setFNo] = useState("");
  if (!hydrated) return null;
  const inv = docs.filter((d) => (d.type === "invoice" || d.type === "debit-note") && d.status !== "Cancelled")
    .filter((d) => (!fClient || d.clientId === fClient) && (!from || d.date >= from) && (!to || d.date <= to) && (!fNo || d.number.toLowerCase().includes(fNo.toLowerCase())));
  const cname = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";

  let head: string[] = [], rows: (string | number)[][] = [];
  if (tab === "GST Report") {
    head = ["Invoice No", "Date", "Client", "GSTIN", "Taxable", "CGST", "SGST", "IGST", "Total"];
    rows = inv.map((d) => { const t = totalOf(d); return [d.number, format(parseISO(d.date), "dd MMM yyyy"), cname(d.clientId), clients.find((c) => c.id === d.clientId)?.gstin ?? "—", fmtNum(t.taxable), fmtNum(t.cgst), fmtNum(t.sgst), fmtNum(t.igst), fmtNum(t.total)]; });
  } else if (tab === "TDS Report") {
    head = ["Invoice No", "Date", "Client", "PAN", "Amount", "TDS %", "TDS Amount"];
    rows = inv.filter((d) => d.status === "Paid").map((d) => [d.number, format(parseISO(d.date), "dd MMM yyyy"), cname(d.clientId), clients.find((c) => c.id === d.clientId)?.pan ?? "—", fmtNum(totalOf(d).taxable), "0", "0.00"]);
  } else if (tab === "Sales by Client") {
    head = ["Client", "Invoices", "Total Sales"];
    const m = new Map<string, [number, number]>();
    inv.forEach((d) => { const v = m.get(d.clientId) ?? [0, 0]; m.set(d.clientId, [v[0] + 1, v[1] + totalOf(d).total]); });
    rows = [...m].map(([id, [n, s]]) => [cname(id), n, fmtNum(s)]);
  } else {
    head = ["Invoice No", "Item", "HSN/SAC", "Qty", "Rate", "Amount", "GST %"];
    rows = inv.flatMap((d) => d.items.map((l) => [d.number, l.name, l.hsn ?? "—", l.quantity, fmtNum(l.rate), fmtNum(lineAmount(l)), l.gstRate]));
  }

  const csv = () => downloadXlsx(tab.replace(/\s+/g, "-").toLowerCase(), head, rows, tab);

  return (
    <div className="p-6 max-w-[1200px]">
      <div className="flex justify-between mb-5"><h1 className="text-xl font-semibold">Reports</h1><button className="btn btn-outline" onClick={csv}><Download size={15} /> Export Excel</button></div>
      <div className="card">
        <div className="flex border-b border-line px-3 pt-2">{TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 border-b-2 ${tab === t ? "border-primary text-primary font-medium" : "border-transparent text-muted"}`}>{t}</button>)}</div>
        <div className="filters flex flex-wrap items-end gap-3 p-4 border-b border-line bg-faint/50 text-[11px] text-muted">
          <label>Client<select className="field mt-1 w-52 text-ink" value={fClient} onChange={(e) => setFClient(e.target.value)}><option value="">All clients</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label>Invoice No<input className="field mt-1 w-36 text-ink" value={fNo} onChange={(e) => setFNo(e.target.value)} /></label>
          <label>From<input type="date" className="field mt-1 text-ink" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>To<input type="date" className="field mt-1 text-ink" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-muted text-[12px] bg-faint">{head.map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={head.length} className="p-10 text-center text-muted">No data.</td></tr>}
            {rows.map((r, i) => <tr key={i} className="border-t border-line">{r.map((c, j) => <td key={j} className="p-3">{c}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
