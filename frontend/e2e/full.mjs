import { chromium } from "playwright";
import * as XLSX from "xlsx";
import fs from "node:fs";

const BASE = process.env.BASE || "http://localhost:3100";
const results = [];
const consoleErrors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(page.url() + " :: " + m.text()); });
page.on("response", (r) => { if (r.status() === 404 && !r.url().endsWith("/xyz")) consoleErrors.push("404 RESPONSE " + r.url()); });
page.on("pageerror", (e) => consoleErrors.push(page.url() + " :: PAGEERROR " + e.message));
page.on("dialog", (d) => d.accept());
ctx.on("page", (p) => p.close().catch(() => {})); // popups (wa.me, print tabs)

const T = 4000;
page.setDefaultTimeout(5000);
page.setDefaultNavigationTimeout(15000);
async function step(name, fn) {
  try { await fn(); results.push([true, name]); console.log("PASS  " + name); }
  catch (e) { await page.screenshot({ path: `e2e/_fail_${results.length}.png` }).catch(() => {}); results.push([false, name + "  →  " + String(e.message).split("\n")[0]]); console.log("FAIL  " + name + "  →  " + String(e.message).split("\n")[0]); }
}
const ok = (c, m) => { if (!c) throw new Error(m); };
const body = async () => (await page.locator("body").innerText());
const expectText = async (t, m) => { await page.waitForFunction((x) => document.body.innerText.includes(x), t, { timeout: T }).catch(() => { throw new Error(m || `missing text "${t}"`); }); };
const go = async (p) => { await page.goto(BASE + p); await page.waitForLoadState("networkidle"); };
const rowOf = (txt) => page.locator("tbody tr", { hasText: txt }).first();
const menuOf = async (txt) => { await rowOf(txt).locator("button").last().click(); };
const menuClick = async (label) => page.getByRole("button", { name: label, exact: true }).last().click();

// ---------- 1. Navigation ----------
await go("/");
await step("Dashboard loads with cards", async () => { await expectText("Total Sales"); await expectText("GST Collected"); await expectText("Recent documents"); });
const routes = [["/invoices", "Invoices"], ["/quotations", "Quotations"], ["/proforma-invoices", "Proforma Invoices"], ["/credit-notes", "Credit Notes"], ["/debit-notes", "Debit Notes"], ["/delivery-challans", "Delivery Challans"], ["/purchase-orders", "Purchase Orders"], ["/clients", "Clients"], ["/items", "Products & Services"], ["/reports", "Reports"], ["/settings", "Business Settings"]];
for (const [href, label] of routes) {
  await step(`Sidebar → ${label}`, async () => {
    await go("/");
    await page.locator("aside").getByRole("link", { name: label, exact: true }).click();
    await page.waitForURL("**" + href); await expectText(label);
  });
}
await step("Unknown slug shows 404", async () => { const r = await page.goto(BASE + "/xyz"); ok(r.status() === 404, "status " + r.status()); });

// ---------- 2. Create New menu for every type ----------
const types = ["Invoice", "Quotation", "Proforma Invoice", "Credit Note", "Debit Note", "Delivery Challan", "Purchase Order"];
for (const t of types) {
  await step(`Create New → ${t} opens editor`, async () => {
    await go("/");
    await page.getByRole("button", { name: "Create New" }).first().click();
    await page.locator("header").getByRole("button", { name: t, exact: true }).click();
    await page.waitForURL("**/edit");
    ok((await page.locator("input.dashed-input").first().inputValue()) === t, "title mismatch");
  });
}

await step("Create New + leaving does NOT leave empty drafts", async () => { await go("/invoices"); await expectText("1 of 1 shown"); });
// ---------- 3. Editor math ----------
await go("/quotations");
await page.getByRole("button", { name: /Create New Quotation/ }).click();
await page.waitForURL("**/edit");
const editUrl = page.url();
await step("Editor: select client", async () => {
  await page.locator("select", { has: page.locator("option", { hasText: "Select a client" }) }).selectOption({ label: "Dr Bhawna Bhardwaj" });
  await expectText("Dr Bhawna Bhardwaj");
});
await page.getByText("⊕ Add New Line").click();
const row = page.locator("div.items-start.py-2").first();
await step("Editor: line math 2 x 12000 @ 5% → CGST 600 / SGST 600 / total 25,200", async () => {
  await row.locator('input[placeholder="Item name"]').fill("Custom Service");
  const nums = row.locator('input[type=number]');
  await nums.nth(0).fill("5"); await nums.nth(1).fill("2"); await nums.nth(2).fill("12000");
  const t = await row.innerText();
  ok(t.includes("24,000.00"), "amount: " + t); ok(t.includes("₹600.00"), "cgst/sgst: " + t); ok(t.includes("25,200.00"), "line total: " + t);
  ok((await body()).includes("₹25,200.00"), "grand total");
});
await step("Editor: GST accepts custom decimal 7.5%", async () => {
  await row.locator('input[type=number]').nth(0).fill("7.5");
  const t = await row.innerText(); ok(t.includes("₹900.00"), t); ok(t.includes("25,800.00"), t);
  await row.locator('input[type=number]').nth(0).fill("5");
});
await step("Editor: CGST and SGST are separate columns in header", async () => { const h = await page.locator("div.bg-primary.rounded-md").first().innerText(); ok(/CGST/.test(h) && /SGST/.test(h) && /Total/.test(h), h); });
await step("Editor: catalog item auto-fills rate/GST", async () => {
  await page.getByText("⊕ Add New Line").click();
  const r2 = page.locator("div.items-start.py-2").nth(1);
  await r2.locator('input[placeholder="Item name"]').fill("AI SEO");
  ok((await r2.locator('input[type=number]').nth(2).inputValue()) === "4100", "rate not auto-filled");
  ok((await r2.locator('input[type=number]').nth(0).inputValue()) === "18", "gst not auto-filled");
});
await step("Editor: delete line", async () => { await page.locator("div.items-start.py-2").nth(1).locator("button").last().click(); ok((await page.locator("div.items-start.py-2").count()) === 1, "line not removed"); });
await step("Editor: discount % reduces total", async () => {
  await page.getByText(/Add Discounts/).click();
  await page.locator('label:has-text("%") input').first().fill("10");
  await expectText("₹22,680.00"); // (24000-2400)*1.05
  await page.locator('label:has-text("%") input').first().fill("0");
});
await step("Editor: additional charge adds to total", async () => {
  await page.getByText(/Add Additional Charges/).click();
  const amt = page.locator('input.dashed-input.w-20').first(); await amt.fill("500");
  await expectText("₹25,700.00");
});
await step("Editor: advance payment shows amount due", async () => {
  await page.locator('input.dashed-input.w-20').last().fill("1000"); await expectText("Amount due"); await expectText("₹24,700.00");
  await page.locator('input.dashed-input.w-20').last().fill("0");
});
await step("Editor: other-state client switches to IGST", async () => {
  await page.locator("main").getByRole("button", { name: "New", exact: true }).click();
  const M = page.locator(".card.w-full");
  await M.locator('input.field').first().fill("Mumbai Client Pvt Ltd");
  await M.locator("select.field").selectOption({ label: "Maharashtra (27)" });
  await M.getByRole("button", { name: "Save", exact: true }).click();
  await expectText("IGST"); const h = await page.locator("div.bg-primary.rounded-md").first().innerText(); ok(/IGST/.test(h) && !/CGST/.test(h), h);
});
await step("Editor: add due date toggles field", async () => { await page.getByText("Add due date").click(); await page.locator('input[type=date]').nth(1).waitFor({ timeout: T }); });
await step("Editor: UPI ID field editable", async () => { const u = page.locator('input[placeholder*="7706030003"]'); await u.fill("test@upi"); ok((await u.inputValue()) === "test@upi", "upi"); });
await step("Editor: Add New bank account via modal", async () => {
  await page.getByRole("button", { name: /Add New/ }).last().click();
  await expectText("Add Bank Account / UPI");
  const f = page.locator(".card.w-full input.field");
  await f.nth(0).fill("Genesis Virtue LLP"); await f.nth(1).fill("ICICI Bank"); await f.nth(3).fill("1234567890"); await f.nth(4).fill("ICIC0000001"); await f.nth(5).fill("gv@icici");
  await page.locator(".card.w-full").getByRole("button", { name: "Save", exact: true }).click();
  await expectText("ICICI Bank");
});
await step("Editor: bank toggle hides details", async () => { await page.locator("button.rounded-full.relative").click(); ok(!(await body()).includes("Select another"), ""); await page.locator("button.rounded-full.relative").click(); });
await step("Editor: Save shows confirmation and gets a real URL", async () => { await page.getByRole("button", { name: "Save", exact: true }).first().click(); await expectText("Saved ✓"); await page.waitForURL((u) => !u.pathname.includes("/new/")); });
await step("Editor: Save & Preview opens view with totals", async () => {
  await page.getByRole("button", { name: /Save & Preview/ }).click(); await page.waitForURL(/\/quotations\/[^/]+$/);
  await expectText("Quotation From"); await expectText("Mumbai Client Pvt Ltd"); await expectText("Maharashtra (27)");
});
await step("View: preview shows IGST + words", async () => { const b = await body(); ok(b.includes("IGST") && b.includes("Total (in words)"), "preview"); });
await step("View: Edit button returns to editor", async () => { await page.getByRole("link", { name: /Edit/ }).click(); await page.waitForURL("**/edit"); });

// ---------- 4. Invoice list: filters / export / actions ----------
await go("/invoices");
// create extra invoices through the UI-less store seed: use editor quickly
async function makeInvoice(client, qty, rate) {
  await page.getByRole("button", { name: /Create New Invoice/ }).click(); await page.waitForURL("**/edit");
  await page.locator("select", { has: page.locator("option", { hasText: "Select a client" }) }).selectOption({ label: client });
  await page.getByText("⊕ Add New Line").click();
  const r = page.locator("div.items-start.py-2").first();
  await r.locator('input[placeholder="Item name"]').fill("Work");
  const n = r.locator('input[type=number]'); await n.nth(0).fill("18"); await n.nth(1).fill(String(qty)); await n.nth(2).fill(String(rate));
  await page.getByRole("button", { name: /Save & Preview/ }).click(); await page.waitForURL(/\/invoices\/[^/]+$/); await expectText("Billed By");
  const num = (await body()).match(/GVL\/2627\/\d+/)?.[0];
  await go("/invoices"); return num;
}
let invA, invB;
await step("Create 2 more invoices via UI", async () => { invA = await makeInvoice("Dr Bhawna Bhardwaj", 1, 10000); invB = await makeInvoice("Dr Bhawna Bhardwaj", 3, 5000); ok(invA && invB, "numbers " + invA + invB); ok(invA !== invB, "numbers not unique"); });
await step("Invoice numbers auto-increment (17,18)", async () => ok(invA === "GVL/2627/17" && invB === "GVL/2627/18", `${invA} ${invB}`));
await step("List shows 3 invoices; counter text", async () => { await expectText("3 of 3 shown"); });
await step("Filter: Client", async () => { await page.locator('label:has-text("Client") select').selectOption({ label: "Sampoorna heart and healthcare private limited" }); await expectText("1 of 3 shown"); await page.getByRole("button", { name: /Clear/ }).click(); await expectText("3 of 3 shown"); });
await step("Filter: Invoice number", async () => { await page.locator('label:has-text("Invoice No") input').fill("17"); await expectText("1 of 3 shown"); ok((await body()).includes("GVL/2627/17"), ""); await page.getByRole("button", { name: /Clear/ }).click(); });
await step("Filter: Date range (excludes Nov 2026 seed)", async () => { const today = new Date().toISOString().slice(0, 10); await page.locator('label:has-text("From") input').fill(today); await page.locator('label:has-text("To") input').fill(today); await expectText("2 of 3 shown"); await page.getByRole("button", { name: /Clear/ }).click(); });
await step("Filter: Min/Max amount", async () => { await page.locator('label:has-text("Min") input').fill("40000"); await expectText("1 of 3 shown"); ok((await body()).includes("50,976.00"), ""); await page.getByRole("button", { name: /Clear/ }).click(); await page.locator('label:has-text("Max") input').fill("20000"); await expectText("2 of 3 shown"); await page.getByRole("button", { name: /Clear/ }).click(); });
await step("Filter: Search box", async () => { await page.getByPlaceholder(/Search invoices/).fill("Sampoorna"); await expectText("1 of 3 shown"); await page.getByRole("button", { name: /Clear/ }).click(); });
await step("Filter: no match shows empty state", async () => { await page.getByPlaceholder(/Search invoices/).fill("zzzzzz"); await expectText("No invoices found"); await page.getByRole("button", { name: /Clear/ }).click(); });
await step("Export Excel downloads real .xlsx with correct data", async () => {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Export Excel/ }).click()]);
  const path = "e2e/_out_invoices.xlsx"; await dl.saveAs(path);
  const wb = XLSX.read(fs.readFileSync(path)); const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  ok(rows.length === 3, "rows " + rows.length);
  const seed = rows.find((r) => r["Invoice No"] === "GVL/2627/16"); ok(seed && seed.Total === 50976 && seed.CGST === 3888 && seed.SGST === 3888, JSON.stringify(seed));
});
await step("Export Excel respects active filter", async () => {
  await page.locator('label:has-text("Invoice No") input').fill("17");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Export Excel/ }).click()]);
  await dl.saveAs("e2e/_out_f.xlsx"); const wb = XLSX.read(fs.readFileSync("e2e/_out_f.xlsx")); const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  ok(rows.length === 1 && rows[0]["Invoice No"] === "GVL/2627/17", JSON.stringify(rows)); await page.getByRole("button", { name: /Clear/ }).click();
});
await step("Status tabs filter (Draft/Sent)", async () => {
  await page.getByRole("button", { name: "Draft", exact: true }).click(); await expectText("2 of 3 shown");
  await page.getByRole("button", { name: "Sent", exact: true }).click(); await expectText("1 of 3 shown"); await page.getByRole("button", { name: "All", exact: true }).click();
});

// ---------- 5. Payment flow ----------
const SEED = "GVL/2627/16"; // total 50,976
await step("Payment: partial payment → Partially Paid, due updated", async () => {
  await menuOf(SEED); await menuClick("Record Payment"); await expectText("Record Payment —");
  await page.getByTestId("pay-amount").fill("20000"); await page.getByTestId("pay-add").click();
  await expectText("Partially Paid"); ok((await page.getByTestId("pay-due").innerText()).includes("30,976.00"), await page.getByTestId("pay-due").innerText());
  ok((await page.getByTestId("pay-received").innerText()).includes("20,000.00"), "received");
});
await step("Payment: over-payment is rejected", async () => { await page.getByTestId("pay-amount").fill("99999"); await page.getByTestId("pay-add").click(); await expectText("cannot exceed"); });
await step("Payment: zero/empty rejected", async () => { await page.getByTestId("pay-amount").fill("0"); await page.getByTestId("pay-add").click(); await expectText("greater than 0"); });
await step("Payment: second payment of remaining → Paid", async () => { await page.getByTestId("pay-full").click(); await expectText("Paid"); ok((await page.getByTestId("pay-status").innerText()) === "Paid", "status"); ok((await page.getByTestId("pay-due").innerText()).includes("0.00"), "due"); });
await step("Payment: delete a payment reverts to Partially Paid", async () => { await page.getByLabel("Delete payment").last().click(); ok((await page.getByTestId("pay-status").innerText()) === "Partially Paid", await page.getByTestId("pay-status").innerText()); });
await step("Payment: Mark as Unpaid clears payments", async () => { await page.getByTestId("pay-unpaid").click(); ok((await page.getByTestId("pay-status").innerText()) === "Unpaid", "status"); ok((await page.getByTestId("pay-received").innerText()).includes("0.00"), "recv"); await page.getByRole("button", { name: "Done" }).click(); });
await step("List: Unpaid tab shows the invoice with full due", async () => { await page.getByRole("button", { name: "Unpaid", exact: true }).click(); await expectText("1 of 3 shown"); ok((await rowOf(SEED).getByTestId("due-cell").innerText()).includes("50,976.00"), "due"); await page.getByRole("button", { name: "All", exact: true }).click(); });
await step("Menu: Mark Paid (full) → Paid, due 0", async () => { await menuOf(SEED); await menuClick("Mark Paid"); await expectText("Marked as paid"); ok((await rowOf(SEED).innerText()).includes("Paid"), "status"); ok((await rowOf(SEED).getByTestId("due-cell").innerText()).includes("₹0.00"), "due"); });
await step("Paid tab filter works", async () => { await page.getByRole("button", { name: "Paid", exact: true }).click(); await expectText("1 of 3 shown"); await page.getByRole("button", { name: "All", exact: true }).click(); });
await step("Menu: Mark Unpaid", async () => { await menuOf(SEED); await menuClick("Mark Unpaid"); await expectText("Marked as unpaid"); ok((await rowOf(SEED).innerText()).includes("Unpaid"), "status"); });
await step("Summary cards: Received/Pending consistent", async () => { await menuOf(SEED); await menuClick("Record Payment"); await page.getByTestId("pay-amount").fill("10000"); await page.getByTestId("pay-add").click(); await page.getByRole("button", { name: "Done" }).click(); const b = await body(); ok(b.includes("₹10,000.00"), "received card"); });
await step("View page: Record Payment button + status badge", async () => {
  await rowOf(SEED).getByRole("link", { name: SEED }).click(); await page.waitForURL(/\/invoices\/[^/]+$/); await expectText("Billed By");
  ok((await page.getByTestId("view-status").innerText()) === "Partially Paid", "badge"); await page.getByTestId("view-record-payment").click(); await page.getByTestId("pay-full").click();
  await page.getByRole("button", { name: "Done" }).click(); ok((await page.getByTestId("view-status").innerText()) === "Paid", "badge2");
  ok((await body()).includes("Paid"), "preview"); ok(!(await body()).includes("Scan to pay via UPI"), "QR should be hidden when fully paid");
});
await step("Dashboard reflects received money", async () => { await go("/"); await expectText("Received"); const b = await body(); ok(b.includes("₹50,976.00"), "received on dashboard: " + b.slice(0, 300)); });

// ---------- 6. Other list actions ----------
await go("/invoices");
await step("Menu: Duplicate", async () => { await menuOf(SEED); await menuClick("Duplicate"); await expectText("4 of 4 shown"); });
await step("Menu: Send for Approval", async () => { await menuOf(invA); await menuClick("Send for Approval"); await expectText("Pending Approval"); });
await step("Menu: Copy link", async () => { await ctx.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {}); await menuOf(invA); await menuClick("Copy Invoice link"); await expectText("Link copied"); });
await step("Menu: Download opens print view (popup)", async () => { const [pop] = await Promise.all([ctx.waitForEvent("page"), (async () => { await menuOf(invA); await menuClick("Download"); })()]); ok(pop.url().includes("print=1"), pop.url()); });
await step("Menu: Send Whatsapp marks sent", async () => { await menuOf(invB); await menuClick("Send Whatsapp"); await page.waitForTimeout(300); ok((await rowOf(invB).innerText()).includes("Sent"), "not marked sent"); });
await step("Menu: Send Email marks sent", async () => { await go("/invoices"); await menuOf(invA); await menuClick("Send Email").catch(() => {}); await page.waitForTimeout(500); await go("/invoices"); ok((await rowOf(invA).innerText()).match(/Sent/), "not marked sent"); });
await step("Menu: Reminder items present", async () => { await menuOf(invB); const b = await body(); ok(b.includes("Send Reminder By Email") && b.includes("Send Reminder By Whatsapp"), "missing"); await page.keyboard.press("Escape"); await page.mouse.click(5, 5); });
const conv = [["Create Credit Note", "/credit-notes"], ["Create Debit Note", "/debit-notes"], ["Convert to Purchase Order", "/purchase-orders"], ["Generate Delivery Challan", "/delivery-challans"], ["Convert to New Document", "/proforma-invoices"]];
for (const [label, dest] of conv) {
  await step(`Menu: ${label} → creates doc with items`, async () => {
    await go("/invoices"); await menuOf(SEED); await menuClick(label); await page.waitForURL("**/edit"); ok(page.url().includes(dest), page.url());
    await page.locator("div.items-start.py-2").first().waitFor(); ok((await page.locator("div.items-start.py-2").count()) === 2, "items not copied");
  });
}
await step("Convert Quotation → Invoice", async () => {
  await go("/quotations"); const r = page.locator("tbody tr").first(); await r.locator("button").last().click(); await menuClick("Convert to Invoice"); await page.waitForURL("**/edit"); ok(page.url().includes("/invoices/"), page.url());
});
await step("Menu: Cancel → Cancelled status", async () => { await go("/invoices"); await menuOf(invB); await menuClick("Cancel"); await expectText("Cancelled"); ok((await rowOf(invB).innerText()).includes("Cancelled"), ""); });
await step("Cancelled doc is not overwritten by payments", async () => { await menuOf(invB); await menuClick("Record Payment"); await page.getByTestId("pay-amount").fill("100"); await page.getByTestId("pay-add").click(); ok((await page.getByTestId("pay-status").innerText()) === "Cancelled", await page.getByTestId("pay-status").innerText()); await page.getByRole("button", { name: "Done" }).click(); });
await step("Menu: Delete removes row", async () => { const before = await page.locator("tbody tr").count(); await menuOf(invB); await menuClick("Delete"); await page.waitForTimeout(300); ok((await page.locator("tbody tr").count()) === before - 1, "not deleted"); });
await step("Row eye/pencil icons navigate", async () => { await go("/invoices"); await rowOf(SEED).locator("a").nth(1).click(); await expectText("Billed By"); await go("/invoices"); await rowOf(SEED).locator("a").nth(2).click(); await expectText("Show Bank Account Details"); });
await step("Quotation list has no payment column/actions", async () => { await go("/quotations"); const b = await body(); ok(!b.includes("Record Payment"), "unexpected"); const h = await page.locator("thead").innerText(); ok(!/Due\b/.test(h.replace("Valid Till", "")), h); });


// ---------- 6b. Rich text, reusable items, QR ----------
await go("/invoices");
await page.getByRole("button", { name: /Create New Invoice/ }).click(); await page.waitForURL("**/edit");
await page.locator("select", { has: page.locator("option", { hasText: "Select a client" }) }).selectOption({ label: "Dr Bhawna Bhardwaj" });
await page.getByText("⊕ Add New Line").click();
const rt = page.getByTestId("rt-0-editor");
const selectAll = async (loc) => { await loc.click(); await page.keyboard.press("Control+A"); };
await step("Rich text: toolbar has bold/italic/underline/lists/font/size/link/clear", async () => {
  for (const id of ["bold", "italic", "underline", "ul", "ol", "font", "size", "link", "unlink", "clear"]) ok(await page.getByTestId("rt-0-" + id).count() === 1, "missing " + id);
});
await step("Rich text: bold + italic + underline", async () => {
  await rt.click(); await page.keyboard.type("Hello World");
  await selectAll(rt); await page.getByTestId("rt-0-bold").click(); await page.getByTestId("rt-0-italic").click(); await page.getByTestId("rt-0-underline").click();
  const h = await rt.innerHTML(); ok(/<b>|font-weight: ?bold|<strong>/.test(h), "bold: " + h); ok(/<i>|font-style: ?italic|<em>/.test(h), "italic: " + h); ok(/<u>|underline/.test(h), "underline: " + h);
});
await step("Rich text: bullet list", async () => {
  await rt.click(); await page.keyboard.press("Control+End"); await page.keyboard.press("Enter"); await page.getByTestId("rt-0-ul").click();
  await page.keyboard.type("Point one"); await page.keyboard.press("Enter"); await page.keyboard.type("Point two");
  ok((await rt.locator("ul li").count()) === 2, await rt.innerHTML());
});
await step("Rich text: numbered list", async () => {
  await page.keyboard.press("Enter"); await page.keyboard.press("Enter"); await page.getByTestId("rt-0-ol").click(); await page.keyboard.type("Step A"); await page.keyboard.press("Enter"); await page.keyboard.type("Step B");
  ok((await rt.locator("ol li").count()) === 2, await rt.innerHTML());
});
await step("Rich text: font family + size", async () => {
  await page.keyboard.press("Enter"); await page.keyboard.press("Enter"); await page.keyboard.type("Styled text");
  await page.keyboard.press("Shift+Home");
  await page.getByTestId("rt-0-font").selectOption("Georgia"); await rt.click(); await page.keyboard.press("Control+A");
  await page.getByTestId("rt-0-size").selectOption({ label: "Huge" });
  const h = await rt.innerHTML(); ok(/Georgia/.test(h), "font: " + h); ok(/font-size: ?24px/.test(h), "size: " + h);
});
await step("Rich text: add link", async () => {
  await rt.click(); await page.keyboard.press("Control+A"); await page.getByTestId("rt-0-link").click();
  await page.getByTestId("rt-0-url").fill("https://genesisvirtue.com"); await page.getByTestId("rt-0-link-ok").click();
  ok((await rt.locator('a[href="https://genesisvirtue.com"]').count()) >= 1, await rt.innerHTML());
});
await step("Rich text: javascript: link is refused", async () => {
  await rt.click(); await page.keyboard.press("Control+A"); await page.getByTestId("rt-0-link").click();
  await page.getByTestId("rt-0-url").fill("javascript:alert(1)"); await page.getByTestId("rt-0-link-ok").click();
  ok((await rt.locator('a[href^="javascript"]').count()) === 0, "js link accepted");
});
await step("Rich text: remove link + clear formatting", async () => {
  await rt.click(); await page.keyboard.press("Control+A"); await page.getByTestId("rt-0-unlink").click(); ok((await rt.locator("a").count()) === 0, "link remains");
  await page.getByTestId("rt-0-clear").click(); const h = await rt.innerHTML(); ok(!/Georgia|font-size/.test(h), "formatting remains: " + h);
});
await step("Rich text: placeholder hides when typing, returns when empty", async () => {
  await rt.click(); await page.keyboard.press("Control+A"); await page.keyboard.press("Delete");
  await expectText("Description (optional)");
  await page.keyboard.type("x"); ok(!(await page.locator("div.pointer-events-none", { hasText: "Description (optional)" }).count()), "placeholder still shown");
  await page.keyboard.press("Backspace");
});
await step("Rich text: description renders in the document with formatting", async () => {
  await rt.click(); await page.keyboard.press("Control+A"); await page.keyboard.press("Delete");
  await page.keyboard.type("Intro"); await page.keyboard.press("Enter"); await page.getByTestId("rt-0-ul").click(); await page.keyboard.type("Alpha"); await page.keyboard.press("Enter"); await page.keyboard.type("Beta");
  await page.keyboard.press("Control+A"); await page.getByTestId("rt-0-bold").click();
  await page.getByTestId("item-name").first().fill("Rich Service");
  const n = page.locator("div.items-start.py-2").first().locator("input[type=number]"); await n.nth(1).fill("1"); await n.nth(2).fill("1000");
  await page.getByRole("button", { name: /Save & Preview/ }).click(); await page.waitForURL(/\/invoices\/[^/]+$/); await expectText("Billed By");
  const d = page.getByTestId("doc-desc").first(); ok((await d.locator("ul li").count()) === 2, await d.innerHTML()); ok(/<b>|<strong>|font-weight/.test(await d.innerHTML()), "bold lost: " + await d.innerHTML());
});
await step("Rich text: survives reload (persisted as HTML)", async () => { await page.reload(); await expectText("Billed By"); ok((await page.getByTestId("doc-desc").first().locator("li").count()) === 2, "lost on reload"); });
await step("Security: script / onerror / javascript: HTML in description is stripped", async () => {
  await expectText("Billed By");
  await page.evaluate(() => { const k = "genesis-invoice-store-v1"; const st = JSON.parse(localStorage.getItem(k)); const d = st.state.docs.find((x) => x.items.some((i) => i.name === "Rich Service")); d.items[0].description = '<img src=x onerror="window.__xss=1"><script>window.__xss=2<\/script><a href="javascript:window.__xss=3">bad</a><b onclick="window.__xss=4">ok</b>'; d.notes = '<iframe src="javascript:window.__xss=5"></iframe>safe note'; localStorage.setItem(k, JSON.stringify(st)); });
  await page.reload(); await expectText("Billed By");
  const d = page.getByTestId("doc-desc").first(); const h = await d.innerHTML();
  ok(!/<img|<script|<iframe|onerror|onclick|javascript:/i.test(h), "unsafe html survived: " + h); ok(/ok/.test(h), "safe text lost");
  ok((await page.evaluate(() => window.__xss)) === undefined, "script executed in document!");
  await page.getByRole("link", { name: /Edit/ }).click(); await expectText("Show Bank Account Details"); await page.waitForTimeout(300);
  ok((await page.evaluate(() => window.__xss)) === undefined, "script executed in editor!");
  ok(!/<img|<script|onerror/i.test(await page.getByTestId("rt-0-editor").innerHTML()), "unsafe html loaded into editor");
  await page.goBack(); await expectText("Billed By");
});
await step("Legacy plain-text description (with line breaks) still renders", async () => {
  await page.evaluate(() => { const k = "genesis-invoice-store-v1"; const st = JSON.parse(localStorage.getItem(k)); const d = st.state.docs.find((x) => x.items.some((i) => i.name === "Rich Service")); d.items[0].description = "Line1\nLine2 <not-a-tag>"; localStorage.setItem(k, JSON.stringify(st)); });
  await page.reload(); await expectText("Billed By"); const t = await page.getByTestId("doc-desc").first().innerText(); ok(t.includes("Line1") && t.includes("Line2"), t);
});
await step("Terms & Notes use the rich editor and render in document", async () => {
  await page.getByRole("link", { name: /Edit/ }).click(); await expectText("Show Bank Account Details");
  await page.getByTestId("rt-terms-editor").click(); await page.keyboard.type("Pay within 5 days"); await page.keyboard.press("Control+A"); await page.getByTestId("rt-terms-bold").click();
  await page.getByTestId("rt-notes-editor").click(); await page.keyboard.type("Thank you");
  await page.getByRole("button", { name: /Save & Preview/ }).click(); await page.waitForURL(/\/invoices\/[^/]+$/); await expectText("Terms and Conditions"); await expectText("Pay within 5 days"); await expectText("Additional Notes"); await expectText("Thank you");
});
await step("Reusable item: 'Save item for reuse' stores name, rate, GST, description", async () => {
  await go("/invoices"); await page.getByRole("button", { name: /Create New Invoice/ }).click(); await page.waitForURL("**/edit");
  await page.getByText("⊕ Add New Line").click();
  await page.getByTestId("item-name").first().fill("Monthly Retainer");
  const n = page.locator("div.items-start.py-2").first().locator("input[type=number]"); await n.nth(0).fill("12"); await n.nth(2).fill("7777");
  await page.getByTestId("rt-0-editor").click(); await page.keyboard.type("Covers SEO + reporting"); await page.keyboard.press("Control+A"); await page.getByTestId("rt-0-bold").click();
  await page.getByTestId("save-item").first().click(); await expectText("Saved to items");
});
await step("Reusable item: appears on Items page with description", async () => { await go("/items"); await expectText("Monthly Retainer"); await expectText("Covers SEO + reporting"); await expectText("₹7,777.00"); });
await step("Reusable item: pick from dropdown in a different document (quotation)", async () => {
  await go("/quotations"); await page.getByRole("button", { name: /Create New Quotation/ }).click(); await page.waitForURL("**/edit"); await page.getByText("⊕ Add New Line").click();
  await page.getByTestId("item-name").first().click(); await page.getByTestId("item-option").filter({ hasText: "Monthly Retainer" }).click();
  const row = page.locator("div.items-start.py-2").first(); const n = row.locator("input[type=number]");
  ok((await n.nth(2).inputValue()) === "7777", "rate"); ok((await n.nth(0).inputValue()) === "12", "gst");
  ok((await page.getByTestId("item-name").first().inputValue()) === "Monthly Retainer", "name");
  ok(/Covers SEO/.test(await page.getByTestId("rt-0-editor").innerText()), "description not filled"); ok(/<b>|<strong>|font-weight/.test(await page.getByTestId("rt-0-editor").innerHTML()), "bold lost");
});
await step("Reusable item: dropdown filters as you type + empty hint", async () => {
  await page.getByTestId("item-name").first().fill("Monthly"); ok((await page.getByTestId("item-option").count()) === 1, "filter"); await page.getByTestId("item-name").first().fill("zzzz"); await expectText("No saved items match");
});
await step("Reusable item: editing a saved item updates (not duplicates)", async () => {
  await page.getByTestId("item-name").first().fill("Monthly Retainer"); // exact match auto-fills
  const n = page.locator("div.items-start.py-2").first().locator("input[type=number]"); await n.nth(2).fill("9000");
  await expectText("Update saved item"); await page.getByTestId("save-item").first().click(); await go("/items");
  const body_ = await body(); ok((body_.match(/Monthly Retainer/g) || []).length === 1, "duplicated"); ok(body_.includes("₹9,000.00"), "not updated");
});
await step("Items page: rich-text description editor works", async () => {
  await page.getByRole("button", { name: /Add Item/ }).click(); await page.locator(".card.w-full input.field").first().fill("Rich Catalog Item");
  await page.getByTestId("rt-item-editor").click(); await page.keyboard.type("Catalog desc"); await page.getByTestId("rt-item-bold").click();
  await page.getByRole("button", { name: "Save", exact: true }).click(); await expectText("Rich Catalog Item"); await expectText("Catalog desc");
});
await step("QR: encodes UPI link with DUE amount, shrinks after part-payment, hides when paid", async () => {
  await go("/invoices"); await rowOf("GVL/2627/16").getByRole("link", { name: "GVL/2627/16" }).click(); await expectText("Billed By");
  await page.getByTestId("view-record-payment").click(); await page.getByTestId("pay-unpaid").click(); await page.getByRole("button", { name: "Done" }).click();
  const amt = async () => { const u = await page.getByTestId("upi-qr").getAttribute("data-upi"); return { u, am: parseFloat(new URLSearchParams(u.split("?")[1]).get("am")) }; };
  let q = await amt(); ok(q.u.startsWith("upi://pay?pa=7706030003@hdfc"), q.u); ok(q.u.includes("cu=INR") && q.u.includes("tn=GVL%2F2627%2F16"), q.u); ok(q.am === 50976, "am=" + q.am);
  await page.getByTestId("view-record-payment").click(); await page.getByTestId("pay-amount").fill("20000"); await page.getByTestId("pay-add").click(); await page.getByRole("button", { name: "Done" }).click();
  q = await amt(); ok(q.am === 30976, "after partial am=" + q.am);
  await page.getByTestId("view-record-payment").click(); await page.getByTestId("pay-full").click(); await page.getByRole("button", { name: "Done" }).click();
  ok((await page.getByTestId("upi-qr").count()) === 0, "QR still visible when paid");
});

// ---------- 7. Clients ----------
await go("/clients");
await step("Clients: add", async () => { await page.getByRole("button", { name: /Add Client/ }).click(); await page.locator(".card.w-full input.field").first().fill("Test Client One"); await page.locator(".card.w-full input.field").nth(1).fill("t@x.com"); await page.getByRole("button", { name: "Save", exact: true }).click(); await expectText("Test Client One"); });
await step("Clients: Save disabled without name", async () => { await page.getByRole("button", { name: /Add Client/ }).click(); ok(await page.getByRole("button", { name: "Save", exact: true }).isDisabled(), "enabled"); await page.getByRole("button", { name: "Cancel" }).click(); });
await step("Clients: edit", async () => { await rowOf("Test Client One").locator("button").first().click(); await page.locator(".card.w-full input.field").first().fill("Test Client Edited"); await page.getByRole("button", { name: "Save", exact: true }).click(); await expectText("Test Client Edited"); });
await step("Clients: persists after reload", async () => { await page.reload(); await expectText("Test Client Edited"); });
await step("Clients: delete", async () => { await rowOf("Test Client Edited").locator("button").last().click(); await page.waitForTimeout(300); ok(!(await body()).includes("Test Client Edited"), ""); });

// ---------- 8. Items ----------
await go("/items");
await step("Items: add", async () => { await page.getByRole("button", { name: /Add Item/ }).click(); const f = page.locator(".card.w-full input.field"); await f.nth(0).fill("Logo Design"); await f.nth(2).fill("3000"); await page.getByRole("button", { name: "Save", exact: true }).click(); await expectText("Logo Design"); await expectText("₹3,000.00"); });
await step("Items: edit", async () => { await rowOf("Logo Design").locator("button").first().click(); await page.locator(".card.w-full input.field").nth(0).fill("Logo Design Pro"); await page.getByRole("button", { name: "Save", exact: true }).click(); await expectText("Logo Design Pro"); });
await step("Items: new item shows in editor catalog", async () => { await go("/invoices"); await page.getByRole("button", { name: /Create New Invoice/ }).click(); await page.waitForURL("**/edit"); await page.getByText("⊕ Add New Line").click(); await page.getByTestId("item-name").first().click(); await page.getByTestId("item-dropdown").waitFor(); ok((await page.getByTestId("item-option").filter({ hasText: "Logo Design Pro" }).count()) === 1, "missing in dropdown"); });
await step("Items: delete", async () => { await go("/items"); await rowOf("Logo Design Pro").locator("button").last().click(); await page.waitForTimeout(300); ok(!(await body()).includes("Logo Design Pro"), ""); });

// ---------- 9. Reports ----------
await go("/reports");
for (const tab of ["GST Report", "TDS Report", "Sales by Client", "Line Items Report"]) {
  await step(`Reports: ${tab} renders`, async () => { await page.getByRole("button", { name: tab, exact: true }).click(); await page.waitForTimeout(150); ok((await page.locator("thead th").count()) >= 3, "no headers"); });
}
await step("Reports: GST rows + filter + excel", async () => {
  await page.getByRole("button", { name: "GST Report", exact: true }).click();
  const total = await page.locator("tbody tr").count(); ok(total >= 2, "rows " + total);
  await page.locator('label:has-text("Client") select').selectOption({ label: "Sampoorna heart and healthcare private limited" });
  const filt = await page.locator("tbody tr").count(); ok(filt < total && filt >= 1, `filter ${filt}/${total}`);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Export Excel/ }).click()]);
  await dl.saveAs("e2e/_out_r.xlsx"); const wb = XLSX.read(fs.readFileSync("e2e/_out_r.xlsx")); const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  ok(rows.length === filt && typeof rows[0].Total === "number", JSON.stringify(rows[0]));
});
await step("Reports: invoice-no filter", async () => { await page.locator('label:has-text("Invoice No") input').fill("zzz"); await expectText("No data"); });

// ---------- 10. Settings ----------
await go("/settings");
await step("Settings: save + persists + reflects in preview", async () => {
  const g = page.locator('label:has-text("GSTIN") input'); await g.fill("07ZZZZZ9999Z1Z9");
  await page.getByRole("button", { name: /Save settings/ }).click(); await expectText("Saved ✓"); await page.reload(); ok((await page.locator('label:has-text("GSTIN") input').inputValue()) === "07ZZZZZ9999Z1Z9", "not persisted");
  await go("/invoices"); await page.locator("tbody tr a").first().click(); await expectText("07ZZZZZ9999Z1Z9");
});

// ---------- 11. Preview content for seed invoice ----------
await go("/invoices");
await step("Preview: seed invoice matches reference PDF", async () => {
  await rowOf(SEED).getByRole("link", { name: SEED }).click(); await page.waitForURL(/\/invoices\/[^/]+$/); await expectText("Billed By");
  await page.getByTestId("view-record-payment").click(); await page.getByTestId("pay-unpaid").click(); await page.getByRole("button", { name: "Done" }).click();
  const b = await body();
  for (const t of ["GVL/2627/16", "Nov 02, 2026", "Nov 05, 2026", "AI SEO", "Website SEO", "₹29,028.00", "₹21,948.00", "₹43,200.00", "₹50,976.00", "₹3,888.00", "FIFTY THOUSAND NINE HUNDRED SEVENTY SIX RUPEES ONLY", "50200091438681", "HDFC0000003", "Scan to pay via UPI", "Delhi (07)"]) ok(b.includes(t), "missing " + t);
  ok((await page.locator(".doc-page svg").count()) >= 2, "QR missing");
});

await browser.close();
const pass = results.filter((r) => r[0]).length;
console.log("\n===== RESULTS =====");
for (const [p, n] of results) console.log((p ? "PASS  " : "FAIL  ") + n);
console.log(`\n${pass}/${results.length} passed`);
const uniq = [...new Set(consoleErrors)];
console.log(`Console errors: ${uniq.length}`); uniq.slice(0, 10).forEach((e) => console.log("  " + e.slice(0, 220)));
