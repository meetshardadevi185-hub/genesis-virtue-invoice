"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useStore } from "@/lib/store";
import { fmtNum } from "@/lib/calc";
import type { CatalogItem } from "@/lib/types";

interface Props {
  value: string;
  onType: (v: string) => void;
  onPick: (i: CatalogItem) => void;
}

export default function ItemPicker({ value, onType, onPick }: Props) {
  const items = useStore((s) => s.items);
  const [open, setOpen] = useState(false);
  const q = value.trim().toLowerCase();
  const list = items.filter((i) => !q || i.name.toLowerCase().includes(q));
  return (
    <div className="relative">
      <input className="field pr-7" placeholder="Item name" value={value} data-testid="item-name"
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          const v = e.target.value;
          const hit = items.find((i) => i.name === v);
          if (hit) onPick(hit); else onType(v);
          setOpen(true);
        }} />
      <ChevronDown size={14} className="absolute right-2 top-3 text-muted pointer-events-none" />
      {open && (
        <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-line rounded-md shadow-xl max-h-56 overflow-y-auto" data-testid="item-dropdown">
          {list.length === 0 && <div className="px-3 py-2 text-[12px] text-muted">No saved items{q ? " match" : ""}. Type a name and use “Save item”.</div>}
          {list.map((i) => (
            <button key={i.id} type="button" data-testid="item-option" onMouseDown={(e) => { e.preventDefault(); onPick(i); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-faint flex justify-between gap-3 text-[12px]">
              <span className="font-medium">{i.name}</span><span className="text-muted">₹{fmtNum(i.rate)} · {i.gstRate}%</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
