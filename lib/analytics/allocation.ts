import type { NormalizedHolding, AssetAllocationResult } from "@/types/portfolio.types";
import type { AssetClass } from "@prisma/client";

/**
 * Computes asset allocation breakdown by current value.
 * Pure function — sums currentValue per assetClass and divides by total.
 */
export function calculateAssetAllocation(
  holdings: NormalizedHolding[],
  totalValue: number
): AssetAllocationResult {
  if (totalValue <= 0) {
    return { equityPct: 0, debtPct: 0, hybridPct: 0, cashPct: 0, otherPct: 0 };
  }

  const totals: Record<AssetClass, number> = { EQUITY: 0, DEBT: 0, HYBRID: 0, CASH: 0, OTHER: 0 };

  for (const h of holdings) {
    totals[h.assetClass] += h.currentValue;
  }

  const pct = (v: number) => Math.round((v / totalValue) * 10000) / 100; // 2 decimals

  return {
    equityPct: pct(totals.EQUITY),
    debtPct: pct(totals.DEBT),
    hybridPct: pct(totals.HYBRID),
    cashPct: pct(totals.CASH),
    otherPct: pct(totals.OTHER),
  };
}
