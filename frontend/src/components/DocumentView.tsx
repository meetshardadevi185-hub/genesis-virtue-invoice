"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Download, Pencil, Printer } from "lucide-react";
import { useStore, useHydrated } from "@/lib/store";
import { DOC_CONFIG } from "@/lib/config";
import DocumentPreview from "./DocumentPreview";
import PaymentModal from "./PaymentModal";

export default function DocumentView({ id }: { id: string }) {
  const hydrated = useHydrated();
  const doc = useStore((s) => s.docs.find((d) => d.id === id));
  const print = useSearchParams().get("print");
  const [pay, setPay] = useState(false);

  useEffect(() => { if (hydrated && doc && print) setTimeout(() => window.print(), 500); }, [hydrated, doc, print]);

  if (!hydrated) return null;
  if (!doc) return <div className="p-8">Document not found. <Link href="/" className="text-primary underline">Home</Link></div>;
  const cfg = DOC_CONFIG[doc.type];

  return (
    <div className="py-6 overflow-x-auto">
      <div className="no-print flex justify-between max-w-[794px] mx-auto mb-4 px-2">
        <Link href={`/${cfg.slug}`} className="text-primary text-sm">← {cfg.plural}</Link>
        <div className="flex gap-2">
          <span className="self-center text-[12px] px-2 py-1 rounded-full bg-soft text-primary" data-testid="view-status">{doc.status}</span>
          {cfg.hasPayment && <button className="btn btn-outline" data-testid="view-record-payment" onClick={() => setPay(true)}>Record Payment</button>}
          <Link href={`/${cfg.slug}/${doc.id}/edit`} className="btn btn-outline"><Pencil size={15} /> Edit</Link>
          <button className="btn btn-outline" onClick={() => window.print()}><Printer size={15} /> Print</button>
          <button className="btn btn-primary" onClick={() => window.print()}><Download size={15} /> Download PDF</button>
        </div>
      </div>
      <DocumentPreview doc={doc} />
      {pay && <PaymentModal docId={doc.id} onClose={() => setPay(false)} />}
    </div>
  );
}
