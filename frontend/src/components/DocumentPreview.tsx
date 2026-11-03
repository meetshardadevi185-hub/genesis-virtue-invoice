"use client";
import { Fragment } from "react";
import { sanitizeHtml } from "@/lib/sanitize";
import { QRCodeSVG } from "qrcode.react";
import { format, parseISO } from "date-fns";
import type { DocumentData } from "@/lib/types";
import { DOC_CONFIG } from "@/lib/config";
import { amountInWords, computeTotals, fmtInt, fmtNum, lineAmount, lineTax, CUR } from "@/lib/calc";
import { useStore } from "@/lib/store";
import Logo from "./Logo";

const d = (s?: string, f = "MMM dd, yyyy") => (s ? format(parseISO(s), f) : "");

export default function DocumentPreview({ doc }: { doc: DocumentData }) {
  const biz = useStore((s) => s.businesses.find((b) => b.id === doc.businessId));
  const client = useStore((s) => s.clients.find((c) => c.id === doc.clientId));
  const bank = useStore((s) => s.banks.find((b) => b.id === doc.bankId));
  const cfg = DOC_CONFIG[doc.type];
  const intra = !client || !biz || client.stateCode === biz.stateCode;
  const t = computeTotals(doc, intra);
  const cur = CUR[doc.currency] ?? doc.currency;
  const m = (n: number) => `${cur}${fmtNum(n)}`;
  const tax = intra ? ["CGST", "SGST"] : ["IGST"];
  const showTax = doc.type !== "challan";
  const upiId = doc.upiId || bank?.upi;
  // QR asks for what is still unpaid (total - advance - payments received); hidden once fully paid
  const upi = bank && upiId && t.due > 0
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(bank.accountName)}&am=${t.due.toFixed(2)}&cu=INR&tn=${encodeURIComponent(doc.number)}`
    : "";

  const addr = (p?: { address: string; city?: string; state: string; country: string; pincode?: string }) =>
    p ? [p.address, p.city, p.state, `${p.country}${p.pincode ? " - " + p.pincode : ""}`].filter(Boolean) : [];

  return (
    <div className="doc-page shadow-lg mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="doc-title">{doc.title || cfg.label}</h1>
          {doc.subtitle && <div className="text-[11px] text-muted mt-1 max-w-[380px]">{doc.subtitle}</div>}
          <table className="mt-3 text-[13px]">
            <tbody>
              <tr><td className="text-muted pr-5 py-1">{cfg.numberLabel}</td><td className="font-medium">{doc.number}</td></tr>
              <tr><td className="text-muted pr-5 py-1">{cfg.dateLabel}</td><td className="font-medium">{d(doc.date)}</td></tr>
              {doc.dueDate && <tr><td className="text-muted pr-5 py-1">{cfg.dueLabel}</td><td className="font-medium">{d(doc.dueDate)}</td></tr>}
            </tbody>
          </table>
        </div>
        <Logo size={120} />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6">
        <div className="doc-box">
          <div className="text-[19px] text-primary mb-1">{cfg.partyFrom}</div>
          <div className="font-semibold">{biz?.name}</div>
          <div className="text-[#444] leading-5">{addr(biz).map((l, i) => <div key={i}>{l}</div>)}</div>
          {biz?.gstin && <div><b className="font-medium">GSTIN:</b> <span className="text-[#555]">{biz.gstin}</span></div>}
          {biz?.pan && <div><b className="font-medium">PAN:</b> <span className="text-[#555]">{biz.pan}</span></div>}
        </div>
        <div className="doc-box">
          <div className="text-[19px] text-primary mb-1">{cfg.partyFor}</div>
          <div className="font-semibold">{client?.name || "—"}</div>
          <div className="text-[#444] leading-5">{addr(client).map((l, i) => <div key={i}>{l}</div>)}</div>
          {client?.gstin && <div><b className="font-medium">GSTIN:</b> <span className="text-[#555]">{client.gstin}</span></div>}
          {client?.pan && <div><b className="font-medium">PAN:</b> <span className="text-[#555]">{client.pan}</span></div>}
        </div>
      </div>

      <div className="flex justify-around text-[13px] mt-5">
        <div>Country of Supply: <span className="text-muted">{client?.country || biz?.country || "India"}</span></div>
        <div>Place of Supply: <span className="text-muted">{client ? `${client.state} (${client.stateCode})` : ""}</span></div>
      </div>

      <table className="doc-table w-full mt-3 text-[12px] border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="w-6"></th>
            <th>Item</th>
            {showTax && <th className="w-10">GST Rate</th>}
            <th>Quantity</th>
            <th>Rate</th>
            <th>Amount</th>
            {showTax && tax.map((x) => <th key={x}>{x}</th>)}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((l, i) => {
            const lt = lineTax(l, doc, intra);
            const alt = i % 2 === 0;
            return (
              <Fragment key={l.id}>
                <tr className={alt ? "" : "alt"}>
                  <td className="px-2 py-3 align-top">{i + 1}.</td>
                  <td className="py-3 align-top">{l.name}{l.hsn && <div className="text-[10px] text-muted">HSN/SAC: {l.hsn}</div>}</td>
                  {showTax && <td className="py-3 align-top">{l.gstRate}%</td>}
                  <td className="py-3 align-top">{fmtInt(l.quantity)}</td>
                  <td className="py-3 align-top">{m(l.rate).replace(/\.00$/, "")}</td>
                  <td className="py-3 align-top">{m(lineAmount(l))}</td>
                  {showTax && (intra ? <><td className="py-3 align-top">{m(lt.cgst)}</td><td className="py-3 align-top">{m(lt.sgst)}</td></> : <td className="py-3 align-top">{m(lt.igst)}</td>)}
                  <td className="py-3 align-top">{m(showTax ? lt.total : lineAmount(l))}</td>
                </tr>
                {l.description && (
                  <tr key={l.id + "d"} className={alt ? "" : "alt"}>
                    <td></td>
                    <td colSpan={9} className="pb-3 pr-3 text-[#555]"><div className="rt" data-testid="doc-desc" dangerouslySetInnerHTML={{ __html: sanitizeHtml(l.description) }} /></td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          <tr className="alt">
            <td></td>
            <td className="py-3 font-medium">Total</td>
            {showTax && <td></td>}
            <td className="font-medium">{doc.summariseQty ? fmtInt(t.totalQty) : ""}</td>
            <td></td>
            <td className="font-medium">{m(t.subtotal)}</td>
            {showTax && <td colSpan={tax.length}></td>}
            <td className="font-medium">{m(t.total - t.charges)}</td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-between gap-6 mt-5">
        <div className="flex-1 text-[12px]">
          <div>Total (in words) : {amountInWords(t.total, doc.currency)}</div>
          {doc.showBank && bank && (
            <div className="flex gap-4 mt-5">
              <div className="doc-box flex-1 text-[12px]">
                <div className="text-[16px] text-primary mb-1">Bank Details</div>
                {[["Account Name", bank.accountName], ["Account Number", bank.accountNumber], ["IFSC", bank.ifsc], ["Account Type", bank.accountType], ["Bank", bank.bank]].map(([k, v]) => (
                  <div key={k} className="flex py-0.5"><span className="w-[110px]">{k}</span><span className="text-[#555]">{v}</span></div>
                ))}
              </div>
              {upi && cfg.hasPayment && (
                <div className="text-center w-[130px]" data-testid="upi-qr" data-upi={upi}>
                  <div className="text-primary text-[13px]">Scan to pay via UPI</div>
                  <div className="text-[8px] text-muted mb-1">Maximum of 1 lakh can be transferred via upi in a single day</div>
                  <QRCodeSVG value={upi} size={96} className="mx-auto" />
                  <div className="text-[11px] mt-1">{upiId}</div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="w-[230px] text-[12.5px]">
          <Row k="Amount" v={m(t.subtotal)} />
          {t.discount > 0 && <Row k="Discount" v={"- " + m(t.discount)} />}
          {showTax && (intra ? <><Row k="CGST" v={m(t.cgst)} /><Row k="SGST" v={m(t.sgst)} /></> : <Row k="IGST" v={m(t.igst)} />)}
          {doc.charges.map((c) => <Row key={c.id} k={c.label} v={m(c.amount)} />)}
          {t.advance > 0 && <Row k="Advance payment" v={"- " + m(t.advance)} />}
          <div className="flex justify-between border-t-2 border-b border-black mt-3 py-2 text-[17px]"><span>Total ({doc.currency})</span><span>{m(t.total)}</span></div>
          {doc.paid > 0 && <Row k="Paid" v={m(doc.paid)} />}
          {(t.advance > 0 || doc.paid > 0) && <Row k="Amount Due" v={m(t.due)} />}
        </div>
      </div>

      {(doc.notes || doc.terms) && (
        <div className="mt-6 text-[11.5px]">
          {doc.terms && <><div className="text-primary text-[15px]">Terms and Conditions</div><div className="rt text-[#444] mb-3" dangerouslySetInnerHTML={{ __html: sanitizeHtml(doc.terms) }} /></>}
          {doc.notes && <><div className="text-primary text-[15px]">Additional Notes</div><div className="rt text-[#444]" dangerouslySetInnerHTML={{ __html: sanitizeHtml(doc.notes) }} /></>}
        </div>
      )}

      <div className="absolute bottom-6 left-10 right-10 border-t border-dashed border-gray-400 pt-2 flex justify-between text-[9px] text-muted">
        <div className="flex gap-8">
          <div><div className="text-[8px]">{cfg.numberLabel}</div><div className="text-ink text-[10px]">{doc.number}</div></div>
          <div><div className="text-[8px]">{cfg.dateLabel}</div><div className="text-ink text-[10px]">{d(doc.date, "dd MMM yyyy")}</div></div>
          <div><div className="text-[8px]">{cfg.partyFor}</div><div className="text-ink text-[10px]">{client?.name}</div></div>
        </div>
        <div className="text-right">This is an electronically generated document, no signature is required.</div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between py-2 text-[#333]"><span>{k}</span><span>{v}</span></div>;
}
