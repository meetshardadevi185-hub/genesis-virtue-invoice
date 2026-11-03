"use client";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useStore, useHydrated } from "@/lib/store";
import ClientModal from "@/components/ClientModal";
import type { Party } from "@/lib/types";

export default function Clients() {
  const hydrated = useHydrated();
  const { clients, deleteClient } = useStore();
  const [edit, setEdit] = useState<Party | null | undefined>(undefined);
  if (!hydrated) return null;
  return (
    <div className="p-6 max-w-[1100px]">
      <div className="flex justify-between mb-5"><h1 className="text-xl font-semibold">Clients</h1><button className="btn btn-pink" onClick={() => setEdit(null)}><Plus size={16} /> Add Client</button></div>
      <div className="card">
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-muted text-[12px] bg-faint"><th className="p-3">Name</th><th>Email</th><th>Phone</th><th>State</th><th>GSTIN</th><th></th></tr></thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="p-3 font-medium">{c.name}</td><td>{c.email || "—"}</td><td>{c.phone || "—"}</td><td>{c.state}</td><td>{c.gstin || "—"}</td>
                <td className="text-right pr-3"><button className="p-1.5 text-muted hover:text-primary" onClick={() => setEdit(c)}><Pencil size={15} /></button><button className="p-1.5 text-muted hover:text-red-600" onClick={() => confirm("Delete client?") && deleteClient(c.id)}><Trash2 size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit !== undefined && <ClientModal initial={edit ?? undefined} onClose={() => setEdit(undefined)} />}
    </div>
  );
}
