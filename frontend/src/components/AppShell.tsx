"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, FileText, LayoutDashboard, Package, Plus, Receipt, Truck, Users, BarChart3, ShoppingCart, FileMinus, FilePlus, FileSignature, Settings } from "lucide-react";
import { DOC_CONFIG } from "@/lib/config";
import { useStore, useHydrated } from "@/lib/store";
import type { DocType } from "@/lib/types";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/quotations", label: "Quotations", icon: FileSignature },
  { href: "/proforma-invoices", label: "Proforma Invoices", icon: Receipt },
  { href: "/credit-notes", label: "Credit Notes", icon: FilePlus },
  { href: "/debit-notes", label: "Debit Notes", icon: FileMinus },
  { href: "/delivery-challans", label: "Delivery Challans", icon: Truck },
  { href: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/items", label: "Products & Services", icon: Package },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Business Settings", icon: Settings },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const biz = useStore((s) => s.businesses.find((b) => b.id === s.activeBusinessId));
  const [open, setOpen] = useState(false);

  const create = (type: DocType) => {
    setOpen(false);
    router.push(`/${DOC_CONFIG[type].slug}/new/edit`);
  };

  return (
    <div className="min-h-screen">
      <header className="no-print fixed top-0 inset-x-0 z-30 h-14 bg-primary text-white flex items-center px-4 gap-4">
        <Link href="/" className="font-semibold text-lg tracking-tight">Genesis Invoice</Link>
        <div className="ml-4 text-sm bg-white/15 rounded-full px-3 py-1">{hydrated ? biz?.name : ""}</div>
        <div className="ml-auto relative flex">
          <button onClick={() => setOpen(!open)} className="btn btn-pink rounded-r-none"><Plus size={16} /> Create New</button>
          <button onClick={() => setOpen(!open)} className="btn btn-pink rounded-l-none border-l border-white/30 px-2"><ChevronDown size={16} /></button>
          {open && (
            <div className="absolute right-0 top-11 w-56 card text-ink py-1 shadow-xl">
              {(Object.keys(DOC_CONFIG) as DocType[]).map((t) => (
                <button key={t} onClick={() => create(t)} className="w-full text-left px-4 py-2 hover:bg-faint">{DOC_CONFIG[t].label}</button>
              ))}
            </div>
          )}
        </div>
      </header>
      <aside className="no-print fixed top-14 bottom-0 left-0 w-56 bg-white border-r border-line overflow-y-auto py-3">
        {nav.map((n) => {
          const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
          const Icon = n.icon;
          return (
            <Link key={n.href} href={n.href} className={`flex items-center gap-3 px-5 py-2.5 text-[13.5px] ${active ? "bg-soft text-primary font-medium border-r-[3px] border-primary" : "text-ink hover:bg-faint"}`}>
              <Icon size={17} /> {n.label}
            </Link>
          );
        })}
      </aside>
      <main className="print-root pt-14 pl-56 min-h-screen">{children}</main>
    </div>
  );
}
