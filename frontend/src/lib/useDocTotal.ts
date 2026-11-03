"use client";
import { useStore } from "./store";
import { computeTotals } from "./calc";
import type { DocumentData } from "./types";

export function useDocTotal() {
  const businesses = useStore((s) => s.businesses);
  const clients = useStore((s) => s.clients);
  return (d: DocumentData) => {
    const biz = businesses.find((b) => b.id === d.businessId);
    const c = clients.find((x) => x.id === d.clientId);
    return computeTotals(d, !c || !biz || c.stateCode === biz.stateCode);
  };
}
