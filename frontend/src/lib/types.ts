export type DocType =
  | "invoice"
  | "quotation"
  | "proforma"
  | "credit-note"
  | "debit-note"
  | "challan"
  | "purchase-order";

export type DocStatus = "Draft" | "Sent" | "Unpaid" | "Paid" | "Partially Paid" | "Cancelled" | "Pending Approval";

export interface Party {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address: string;
  city?: string;
  state: string;
  stateCode: string;
  country: string;
  pincode?: string;
  gstin?: string;
  pan?: string;
}

export interface Business extends Party {
  logo?: string;
  tagline?: string;
}

export interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  accountType: string;
  bank: string;
  upi?: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  hsn?: string;
  unit: string;
  rate: number;
  gstRate: number;
}

export interface LineItem {
  id: string;
  name: string;
  description?: string;
  hsn?: string;
  gstRate: number;
  quantity: number;
  unit: string;
  rate: number;
  discountPct?: number;
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  mode: string;
  note?: string;
}

export interface Charge {
  id: string;
  label: string;
  amount: number;
}

export interface DocumentData {
  id: string;
  type: DocType;
  title: string;
  subtitle?: string;
  number: string;
  date: string; // yyyy-MM-dd
  dueDate?: string;
  businessId: string;
  clientId: string;
  bankId?: string;
  upiId?: string;
  showBank: boolean;
  items: LineItem[];
  discountPct: number;
  discountFlat: number;
  charges: Charge[];
  advance: number;
  paid: number;
  payments?: Payment[];
  currency: string;
  summariseQty: boolean;
  notes?: string;
  terms?: string;
  status: DocStatus;
  emailSent?: boolean;
  whatsappSent?: boolean;
  linkedFrom?: string;
  createdAt: string;
}

export interface Totals {
  subtotal: number;
  discount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  charges: number;
  totalQty: number;
  total: number;
  advance: number;
  due: number;
  intra: boolean;
}
