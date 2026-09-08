export interface CashflowData {
  buckets: Record<string, [string, number][]>;
  window: { d30: number; d180: number };
  ladder: [string, number, number][];
  split: [string, number, string][];
  rows: [string, number, number, number, number][];
}

export interface CollectionRow {
  buyer: string;
  unit_no: string;
  amount: number | string;
  days_due: number;
  stage: string;
  action: string | null;
}

export interface EscrowQueueRow {
  reference: string;
  amount: number | string;
  bank: boolean;
  system_side: boolean;
  received_at: string | Date;
}

export interface DrawdownRow {
  ref: string;
  milestone: string;
  amount: number | string;
  cert: string;
  rera: string;
  status: string;
}

export interface InvoiceRow {
  no: string;
  buyer: string;
  unit_no: string;
  milestone: string;
  due: string | Date;
  amount: number | string;
  paid: boolean | number;
}

export interface FinanceData {
  collections: CollectionRow[];
  escrow: { queue: EscrowQueueRow[]; drawdowns: DrawdownRow[] };
  invoices: InvoiceRow[];
}