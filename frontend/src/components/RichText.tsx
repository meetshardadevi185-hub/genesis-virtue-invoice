"use client";
import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Link2, List, ListOrdered, RemoveFormatting, Underline, Unlink } from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitize";

const FONTS = ["Arial", "Georgia", "Times New Roman", "Courier New", "Verdana", "Tahoma"];
const SIZES: [string, string][] = [["Size", ""], ["Small", "2"], ["Normal", "3"], ["Large", "4"], ["X-Large", "5"], ["Huge", "6"]];
const PX: Record<string, string> = { "1": "9px", "2": "10px", "3": "12px", "4": "14px", "5": "18px", "6": "24px", "7": "32px" };

interface Props {
  value?: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  testId?: string;
}

export default function RichText({ value, onChange, placeholder = "Description (optional)", minHeight = 56, testId = "rt" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const saved = useRef<Range | null>(null);
  const [focus, setFocus] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("https://");
  const [empty, setEmpty] = useState(!value);

  // external value -> DOM (only while the user is not typing in it)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const html = sanitizeHtml(value);
    if (document.activeElement !== el && el.innerHTML !== html) el.innerHTML = html;
    setEmpty(!el.textContent?.trim() && !el.querySelector("li"));
  }, [value]);

  const emit = () => {
    const el = ref.current!;
    // execCommand("fontSize") makes <font size=N>; turn it into px spans so the document matches the editor
    el.querySelectorAll("font[size]").forEach((f) => {
      const s = document.createElement("span");
      s.style.fontSize = PX[f.getAttribute("size") || "3"] || "12px";
      while (f.firstChild) s.appendChild(f.firstChild);
      f.replaceWith(s);
    });
    const hasText = !!el.textContent?.trim() || !!el.querySelector("li");
    setEmpty(!hasText);
    onChange(hasText ? el.innerHTML : "");
  };
  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    // fontSize via <font size=N> (converted to px in emit()); everything else as CSS spans
    document.execCommand("styleWithCSS", false, cmd === "fontSize" ? "false" : "true");
    document.execCommand(cmd, false, arg);
    emit();
  };
  // paste: keep basic formatting but run it through the same whitelist as the document renderer
  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertHTML", false, html ? sanitizeHtml(html) : sanitizeHtml(text));
    emit();
  };
  const keep = (e: React.MouseEvent) => e.preventDefault();
  const saveSel = () => {
    const s = window.getSelection();
    if (s && s.rangeCount && ref.current?.contains(s.anchorNode)) saved.current = s.getRangeAt(0).cloneRange();
  };
  const restoreSel = () => {
    const s = window.getSelection();
    if (saved.current && s) { s.removeAllRanges(); s.addRange(saved.current); }
  };

  const btn = (title: string, id: string, onClick: () => void, icon: React.ReactNode) => (
    <button type="button" title={title} aria-label={title} data-testid={`${testId}-${id}`} onMouseDown={keep} onClick={onClick} className="p-1.5 rounded hover:bg-soft text-ink">{icon}</button>
  );
  const sep = <span className="w-px h-4 bg-line mx-1" />;

  return (
    <div className={`border rounded-md bg-white ${focus ? "border-primary shadow-[0_0_0_2px_rgba(107,63,194,.12)]" : "border-line"}`}>
      <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 border-b border-line bg-faint/60 rounded-t-md">
        {btn("Bold", "bold", () => exec("bold"), <Bold size={14} />)}
        {btn("Italic", "italic", () => exec("italic"), <Italic size={14} />)}
        {btn("Underline", "underline", () => exec("underline"), <Underline size={14} />)}
        {sep}
        {btn("Bullet list", "ul", () => exec("insertUnorderedList"), <List size={14} />)}
        {btn("Numbered list", "ol", () => exec("insertOrderedList"), <ListOrdered size={14} />)}
        {sep}
        <select aria-label="Font" data-testid={`${testId}-font`} className="text-[11px] border border-line rounded px-1 py-0.5 bg-white" value="" onMouseDown={saveSel}
          onChange={(e) => { restoreSel(); if (e.target.value) exec("fontName", e.target.value); }}>
          <option value="">Font</option>
          {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select aria-label="Font size" data-testid={`${testId}-size`} className="text-[11px] border border-line rounded px-1 py-0.5 bg-white" value="" onMouseDown={saveSel}
          onChange={(e) => { restoreSel(); if (e.target.value) exec("fontSize", e.target.value); }}>
          {SIZES.map(([l, v]) => <option key={l} value={v}>{l}</option>)}
        </select>
        {sep}
        {btn("Add link", "link", () => { saveSel(); setLinkOpen((o) => !o); }, <Link2 size={14} />)}
        {btn("Remove link", "unlink", () => exec("unlink"), <Unlink size={14} />)}
        {btn("Clear formatting", "clear", () => exec("removeFormat"), <RemoveFormatting size={14} />)}
      </div>
      {linkOpen && (
        <div className="flex gap-2 p-2 border-b border-line bg-faint/40">
          <input data-testid={`${testId}-url`} className="field !py-1 text-[12px]" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" autoFocus />
          <button type="button" data-testid={`${testId}-link-ok`} className="btn btn-primary !py-1"
            onClick={() => { restoreSel(); if (/^(https?:\/\/|mailto:|tel:)/i.test(url.trim())) exec("createLink", url.trim()); setLinkOpen(false); setUrl("https://"); }}>Apply</button>
        </div>
      )}
      <div className="relative">
        {empty && <div className="absolute left-2.5 top-2 text-[12px] text-gray-400 pointer-events-none">{placeholder}</div>}
        <div ref={ref} data-testid={`${testId}-editor`} contentEditable suppressContentEditableWarning className="rt px-2.5 py-2 text-[12px] outline-none" style={{ minHeight }}
          onInput={emit} onPaste={onPaste} onFocus={() => setFocus(true)} onBlur={() => { setFocus(false); emit(); }} />
      </div>
    </div>
  );
}
