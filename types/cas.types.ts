export interface CASFund {
  name: string;
  category: string;
  currentValue: number;
  investedValue: number;
  xirr?: number;
  units: number;
  expenseRatio?: number;
  isin?: string;
  amfiCode?: string;
}

export interface CASSIPEntry {
  schemeName: string;
  amount: number;
  status?: "ACTIVE" | "PAUSED" | "MISSED" | "STOPPED";
  missedCount?: number;
  lastDebitDate?: string;
}

/**
 * Raw transaction-level record from CAS statement. Optional — current
 * Railway parser does not yet return this. When present, used by
 * lib/portfolio/extract-sips.ts to derive SIP records by detecting
 * recurring purchase patterns. CAS statements label SIP purchases
 * explicitly in most RTA formats (CAMS/KFin), so `type` may already
 * indicate "SIP" directly.
 */
export interface CASTransaction {
  schemeName: string;
  isin?: string;
  amfiCode?: string;
  date: string; // ISO date
  type: string; // e.g. "SIP", "Purchase", "Redemption", "Switch In/Out", "Dividend"
  amount: number;
  units?: number;
}

export interface CASParsedData {
  totalValue: number;
  xirr?: number;
  statementPeriod: string;
  funds: CASFund[];
  allocation: { equity?: number; debt?: number; hybrid?: number };
  sips?: CASSIPEntry[];
  transactions?: CASTransaction[];
}
