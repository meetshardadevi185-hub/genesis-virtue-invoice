"use client";
import Link from "next/link";
import { useStore, useHydrated } from "@/lib/store";
import { useDocTotal } from "@/components/DocumentList";
import { DOC_CONFIG } from "@/lib/config";
import { money } from "@/lib/calc";
import type { DocType } from "@/lib/types";

export default function Dashboard() {
  const hydrated = useHydrated();
  const docs = useStore((s) => s.docs);
  const clients = useStore((s) => s.clients);
  const totalOf = useDocTotal();
  if (!hydrated) return null;

  const inv = docs.filter((d) => d.type === "invoice" && d.status !== "Cancelled");
  const sales = inv.reduce((s, d) => s + totalOf(d).total, 0);
  const received = inv.reduce((s, d) => s + (d.paid || 0) + (d.advance || 0), 0);
  const pending = sales - received;
  const gst = inv.reduce((s, d) => { const t = totalOf(d); return s + t.cgst + t.sgst + t.igst; }, 0);
  const recent = [...docs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);

  return (
    <div className="p-6 max-w-[1200px]">
      <h1 className="text-xl font-semibold mb-5">Dashboard</h1>
      <div className="grid grid-cols-4 gap-4">
        {[["Total Sales", sales, "text-primary"], ["Received", received, "text-green-600"], ["Pending", pending, "text-amber-600"], ["GST Collected", gst, "text-ink"]].map(([k, v, c]) => (
          <div key={k as string} className="card p-5"><div className="text-muted text-[12px]">{k}</div><div className={`text-[22px] font-semibold mt-1 ${c}`}>{money(v as number)}</div></div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-4 mt-4">
        {(Object.keys(DOC_CONFIG) as DocType[]).map((t) => (
          <Link key={t} href={`/${DOC_CONFIG[t].slug}`} className="card p-4 hover:border-primary">
            <div className="text-[13px] text-muted">{DOC_CONFIG[t].plural}</div>
            <div className="text-[20px] font-semibold">{docs.filter((d) => d.type === t).length}</div>
          </Link>
        ))}
        <Link href="/clients" className="card p-4 hover:border-primary"><div className="text-[13px] text-muted">Clients</div><div className="text-[20px] font-semibold">{clients.length}</div></Link>
      </div>
      <div className="card mt-6">
        <div className="p-4 font-medium border-b border-line">Recent documents</div>
        <table className="w-full text-[13px]">
          <tbody>
            {recent.map((d) => (
              <tr key={d.id} className="border-t border-line first:border-0">
                <td className="p-3"><Link className="text-primary" href={`/${DOC_CONFIG[d.type].slug}/${d.id}`}>{d.number}</Link></td>
                <td className="text-muted">{DOC_CONFIG[d.type].label}</td>
                <td>{clients.find((c) => c.id === d.clientId)?.name ?? "—"}</td>
                <td className="text-right pr-4 font-medium">{money(totalOf(d).total, d.currency)}</td>
                <td className="text-muted pr-3">{d.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
