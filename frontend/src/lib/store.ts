"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import { format } from "date-fns";
import type { BankAccount, Business, CatalogItem, DocType, DocumentData, Party } from "./types";
import { DOC_CONFIG } from "./config";

const seedBusiness: Business = {
  id: "biz1",
  name: "Genesis Virtue LLP",
  address: "F-73, Ankur Enclave, Karawal Nagar",
  city: "New Delhi",
  state: "Delhi",
  stateCode: "07",
  country: "India",
  pincode: "110094",
  gstin: "07ABAFG4784E1ZF",
  pan: "ABAFG4784E",
  tagline: "Social Media | Website Development | SEO | Google & Facebook Ads",
};

const seedBank: BankAccount = {
  id: "bank1",
  accountName: "Genesis Virtue LLP",
  accountNumber: "50200091438681",
  ifsc: "HDFC0000003",
  accountType: "Current",
  bank: "HDFC Bank",
  upi: "7706030003@hdfc",
};

const seedClients: Party[] = [
  { id: "c1", name: "Sampoorna heart and healthcare private limited", address: "C-2/41 A, Service Lane, Yamuna Vihar, Delhi", city: "New Delhi", state: "Delhi", stateCode: "07", country: "India", pincode: "110094" },
  { id: "c2", name: "Dr Bhawna Bhardwaj", address: "", state: "Delhi", stateCode: "07", country: "India" },
];

const seedItems: CatalogItem[] = [
  { id: "i1", name: "AI SEO", unit: "months", rate: 4100, gstRate: 18, hsn: "998313" },
  { id: "i2", name: "Website SEO", unit: "months", rate: 3100, gstRate: 18, hsn: "998313" },
  { id: "i3", name: "Website Development", unit: "service", rate: 25000, gstRate: 18, hsn: "998314" },
];

const seedInvoice: DocumentData = {
  id: "d1", type: "invoice", title: "Invoice", number: "GVL/2627/16", date: "2026-11-02", dueDate: "2026-11-05",
  businessId: "biz1", clientId: "c1", bankId: "bank1", showBank: true,
  items: [
    { id: "l1", name: "AI SEO", description: "Period of Nov till April 2027", gstRate: 18, quantity: 6, unit: "months", rate: 4100 },
    { id: "l2", name: "Website SEO", description: "Period of Nov till April 2027", gstRate: 18, quantity: 6, unit: "months", rate: 3100 },
  ],
  discountPct: 0, discountFlat: 0, charges: [], advance: 0, paid: 0, currency: "INR", summariseQty: true,
  status: "Sent", createdAt: new Date().toISOString(),
};

interface State {
  docs: DocumentData[];
  businesses: Business[];
  banks: BankAccount[];
  clients: Party[];
  items: CatalogItem[];
  activeBusinessId: string;
  getDoc: (id: string) => DocumentData | undefined;
  saveDoc: (d: DocumentData) => void;
  deleteDoc: (id: string) => void;
  patchDoc: (id: string, p: Partial<DocumentData>) => void;
  newDoc: (type: DocType) => DocumentData;
  duplicateDoc: (id: string) => DocumentData | undefined;
  convertDoc: (id: string, to: DocType) => DocumentData | undefined;
  nextNumber: (type: DocType) => string;
  saveClient: (c: Party) => void;
  deleteClient: (id: string) => void;
  saveItem: (i: CatalogItem) => void;
  deleteItem: (id: string) => void;
  saveBusiness: (b: Business) => void;
  saveBank: (b: BankAccount) => void;
  deleteBank: (id: string) => void;
}

const upsert = <T extends { id: string }>(arr: T[], x: T) =>
  arr.some((a) => a.id === x.id) ? arr.map((a) => (a.id === x.id ? x : a)) : [x, ...arr];

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      docs: [seedInvoice],
      businesses: [seedBusiness],
      banks: [seedBank],
      clients: seedClients,
      items: seedItems,
      activeBusinessId: "biz1",
      getDoc: (id) => get().docs.find((d) => d.id === id),
      saveDoc: (d) => set((s) => ({ docs: upsert(s.docs, d) })),
      deleteDoc: (id) => set((s) => ({ docs: s.docs.filter((d) => d.id !== id) })),
      patchDoc: (id, p) => set((s) => ({ docs: s.docs.map((d) => (d.id === id ? { ...d, ...p } : d)) })),
      nextNumber: (type) => {
        const cfg = DOC_CONFIG[type];
        const nums = get().docs.filter((d) => d.type === type).map((d) => parseInt(d.number.split("/").pop() || "0", 10)).filter((n) => !isNaN(n));
        return cfg.prefix + ((nums.length ? Math.max(...nums) : 0) + 1);
      },
      newDoc: (type) => {
        const s = get();
        const cfg = DOC_CONFIG[type];
        return {
          id: nanoid(10), type, title: cfg.label, number: s.nextNumber(type), date: format(new Date(), "yyyy-MM-dd"),
          businessId: s.activeBusinessId, clientId: "", bankId: s.banks[0]?.id, showBank: true,
          items: [], discountPct: 0, discountFlat: 0, charges: [], advance: 0, paid: 0, currency: "INR", summariseQty: true,
          status: "Draft", createdAt: new Date().toISOString(),
        };
      },
      duplicateDoc: (id) => {
        const d = get().getDoc(id);
        if (!d) return;
        const copy: DocumentData = { ...d, id: nanoid(10), number: get().nextNumber(d.type), status: "Draft", paid: 0, createdAt: new Date().toISOString(), items: d.items.map((i) => ({ ...i, id: nanoid(6) })) };
        get().saveDoc(copy);
        return copy;
      },
      convertDoc: (id, to) => {
        const d = get().getDoc(id);
        if (!d) return;
        const copy: DocumentData = { ...d, id: nanoid(10), type: to, title: DOC_CONFIG[to].label, number: get().nextNumber(to), status: "Draft", paid: 0, linkedFrom: d.id, createdAt: new Date().toISOString(), items: d.items.map((i) => ({ ...i, id: nanoid(6) })) };
        get().saveDoc(copy);
        return copy;
      },
      saveClient: (c) => set((s) => ({ clients: upsert(s.clients, c) })),
      deleteClient: (id) => set((s) => ({ clients: s.clients.filter((c) => c.id !== id) })),
      saveItem: (i) => set((s) => ({ items: upsert(s.items, i) })),
      deleteItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      saveBusiness: (b) => set((s) => ({ businesses: upsert(s.businesses, b) })),
      saveBank: (b) => set((s) => ({ banks: upsert(s.banks, b) })),
      deleteBank: (id) => set((s) => ({ banks: s.banks.filter((b) => b.id !== id) })),
    }),
    { name: "genesis-invoice-store-v1" }
  )
);

import { useEffect, useState } from "react";
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}
