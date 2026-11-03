const ALLOWED = new Set(["B", "STRONG", "I", "EM", "U", "S", "STRIKE", "UL", "OL", "LI", "A", "BR", "P", "DIV", "SPAN", "H1", "H2", "H3", "BLOCKQUOTE"]);
const FONT_PX: Record<string, string> = { "1": "9px", "2": "10px", "3": "12px", "4": "14px", "5": "18px", "6": "24px", "7": "32px" };
const SIZE_KW: Record<string, string> = { "xx-small": "9px", "x-small": "10px", small: "12px", medium: "12px", large: "14px", "x-large": "18px", "xx-large": "24px", "xxx-large": "32px" };
const STYLE_OK = ["font-family", "font-size", "color", "text-align", "font-weight", "font-style", "text-decoration"];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Plain text (legacy descriptions) -> HTML; real HTML -> whitelisted HTML. */
export function sanitizeHtml(input?: string): string {
  if (!input) return "";
  if (!/<[a-z][\s\S]*>/i.test(input)) return esc(input).replace(/\n/g, "<br>");
  if (typeof DOMParser === "undefined") return esc(input.replace(/<[^>]*>/g, " "));
  const doc = new DOMParser().parseFromString(`<div>${input}</div>`, "text/html");
  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      if (child.tagName === "FONT") {
        const span = doc.createElement("span");
        const size = child.getAttribute("size");
        const face = child.getAttribute("face");
        const color = child.getAttribute("color");
        const st: string[] = [];
        if (size && FONT_PX[size]) st.push(`font-size:${FONT_PX[size]}`);
        if (face) st.push(`font-family:${face}`);
        if (color) st.push(`color:${color}`);
        if (st.length) span.setAttribute("style", st.join(";"));
        while (child.firstChild) span.appendChild(child.firstChild);
        child.replaceWith(span);
        walk(span);
        continue;
      }
      if (!ALLOWED.has(child.tagName)) {
        if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED"].includes(child.tagName)) { child.remove(); continue; }
        while (child.firstChild) child.parentNode!.insertBefore(child.firstChild, child);
        child.remove();
        continue;
      }
      for (const a of Array.from(child.attributes)) {
        if (child.tagName === "A" && a.name === "href") {
          if (!/^(https?:|mailto:|tel:)/i.test(a.value.trim())) child.removeAttribute("href");
        } else if (a.name === "style") {
          const kept = a.value.split(";").map((d) => d.trim()).filter((d) => STYLE_OK.includes(d.split(":")[0].trim().toLowerCase()) && !/url\(|expression/i.test(d));
          const fixed = kept.map((d) => { const [k, v] = d.split(":").map((x) => x.trim()); return k.toLowerCase() === "font-size" && SIZE_KW[v.toLowerCase()] ? `font-size:${SIZE_KW[v.toLowerCase()]}` : d; });
          if (fixed.length) child.setAttribute("style", fixed.join(";"));
          else child.removeAttribute("style");
        } else child.removeAttribute(a.name);
      }
      if (child.tagName === "A") { child.setAttribute("target", "_blank"); child.setAttribute("rel", "noopener noreferrer"); }
      walk(child);
    }
  };
  walk(doc.body.firstElementChild!);
  return doc.body.firstElementChild!.innerHTML;
}

export const stripHtml = (s?: string) => (s ?? "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
