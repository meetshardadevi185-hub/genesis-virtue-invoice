import type { DocType } from "./types";

export interface DocConfig {
  type: DocType;
  slug: string;
  label: string; // singular
  plural: string;
  prefix: string;
  numberLabel: string;
  dateLabel: string;
  dueLabel: string;
  partyFrom: string;
  partyFor: string;
  hasPayment: boolean;
}

export const DOC_CONFIG: Record<DocType, DocConfig> = {
  invoice: { type: "invoice", slug: "invoices", label: "Invoice", plural: "Invoices", prefix: "GVL/2627/", numberLabel: "Invoice No", dateLabel: "Invoice Date", dueLabel: "Due Date", partyFrom: "Billed By", partyFor: "Billed To", hasPayment: true },
  quotation: { type: "quotation", slug: "quotations", label: "Quotation", plural: "Quotations", prefix: "GV0001/", numberLabel: "Quotation No", dateLabel: "Quotation Date", dueLabel: "Valid Till", partyFrom: "Quotation From", partyFor: "Quotation For", hasPayment: false },
  proforma: { type: "proforma", slug: "proforma-invoices", label: "Proforma Invoice", plural: "Proforma Invoices", prefix: "PI/2627/", numberLabel: "Proforma Invoice No", dateLabel: "Proforma Invoice Date", dueLabel: "Due Date", partyFrom: "Billed By", partyFor: "Billed To", hasPayment: true },
  "credit-note": { type: "credit-note", slug: "credit-notes", label: "Credit Note", plural: "Credit Notes", prefix: "CN/2627/", numberLabel: "Credit Note No", dateLabel: "Credit Note Date", dueLabel: "Due Date", partyFrom: "Billed By", partyFor: "Billed To", hasPayment: false },
  "debit-note": { type: "debit-note", slug: "debit-notes", label: "Debit Note", plural: "Debit Notes", prefix: "DN/2627/", numberLabel: "Debit Note No", dateLabel: "Debit Note Date", dueLabel: "Due Date", partyFrom: "Billed By", partyFor: "Billed To", hasPayment: false },
  challan: { type: "challan", slug: "delivery-challans", label: "Delivery Challan", plural: "Delivery Challans", prefix: "DC/2627/", numberLabel: "Challan No", dateLabel: "Challan Date", dueLabel: "Due Date", partyFrom: "Billed By", partyFor: "Shipped To", hasPayment: false },
  "purchase-order": { type: "purchase-order", slug: "purchase-orders", label: "Purchase Order", plural: "Purchase Orders", prefix: "PO/2627/", numberLabel: "PO No", dateLabel: "PO Date", dueLabel: "Delivery Date", partyFrom: "Buyer", partyFor: "Vendor", hasPayment: false },
};

export const slugToType = (slug: string): DocType | undefined =>
  Object.values(DOC_CONFIG).find((c) => c.slug === slug)?.type;

export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28];
export const UNITS = ["pcs", "nos", "hrs", "days", "months", "kg", "ltr", "mtr", "box", "set", "service"];

export const STATES: [string, string][] = [
  ["Jammu & Kashmir", "01"], ["Himachal Pradesh", "02"], ["Punjab", "03"], ["Chandigarh", "04"], ["Uttarakhand", "05"], ["Haryana", "06"], ["Delhi", "07"], ["Rajasthan", "08"], ["Uttar Pradesh", "09"], ["Bihar", "10"], ["Sikkim", "11"], ["Arunachal Pradesh", "12"], ["Nagaland", "13"], ["Manipur", "14"], ["Mizoram", "15"], ["Tripura", "16"], ["Meghalaya", "17"], ["Assam", "18"], ["West Bengal", "19"], ["Jharkhand", "20"], ["Odisha", "21"], ["Chhattisgarh", "22"], ["Madhya Pradesh", "23"], ["Gujarat", "24"], ["Maharashtra", "27"], ["Andhra Pradesh", "37"], ["Karnataka", "29"], ["Goa", "30"], ["Kerala", "32"], ["Tamil Nadu", "33"], ["Telangana", "36"],
];
