import type { CASFund, CASSIPEntry } from "@/types/cas.types";
import type { NormalizedHolding, NormalizedSIP } from "@/types/portfolio.types";
import { mapCategoryToAssetClass } from "@/lib/analytics/constants";
import type { SIPStatus } from "@prisma/client";

/**
 * Maps (enriched) CAS funds to NormalizedHolding. Pure function — no DB access.
 * Accepts plain CASFund[] too (enrichment fields are optional additions).
 */
export function buildNormalizedHoldings(funds: CASFund[]): NormalizedHolding[] {
  return funds.map((f) => ({
    schemeName: f.name,
    category: f.category,
    assetClass: mapCategoryToAssetClass(f.category),
    units: f.units,
    currentValue: f.currentValue,
    investedValue: f.investedValue,
    xirr: f.xirr,
    expenseRatio: f.expenseRatio,
  }));
}

/**
 * Maps CASSIPEntry[] to NormalizedSIP[]. Pure function — no DB access.
 */
export function buildNormalizedSIPs(sips: CASSIPEntry[]): NormalizedSIP[] {
  return sips.map((s) => ({
    schemeName: s.schemeName,
    amount: s.amount,
    status: (s.status ?? "ACTIVE") as SIPStatus,
    missedCount: s.missedCount ?? 0,
    lastDebitDate: s.lastDebitDate,
  }));
}
