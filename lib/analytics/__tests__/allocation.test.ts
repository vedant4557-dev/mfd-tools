import { calculateAssetAllocation } from "@/lib/analytics/allocation";
import type { NormalizedHolding } from "@/types/portfolio.types";

function holding(assetClass: NormalizedHolding["assetClass"], currentValue: number): NormalizedHolding {
  return {
    schemeName: `${assetClass} fund`,
    category: assetClass,
    assetClass,
    units: 100,
    currentValue,
    investedValue: currentValue,
  };
}

describe("calculateAssetAllocation", () => {
  it("returns zeros for empty/zero-value portfolio", () => {
    const result = calculateAssetAllocation([], 0);
    expect(result).toEqual({ equityPct: 0, debtPct: 0, hybridPct: 0, cashPct: 0, otherPct: 0 });
  });

  it("computes correct percentages for a mixed portfolio", () => {
    const holdings = [
      holding("EQUITY", 60000),
      holding("DEBT", 30000),
      holding("HYBRID", 5000),
      holding("CASH", 5000),
    ];
    const result = calculateAssetAllocation(holdings, 100000);

    expect(result.equityPct).toBe(60);
    expect(result.debtPct).toBe(30);
    expect(result.hybridPct).toBe(5);
    expect(result.cashPct).toBe(5);
    expect(result.otherPct).toBe(0);
  });

  it("sums to ~100% across all classes including OTHER", () => {
    const holdings = [holding("EQUITY", 33333), holding("DEBT", 33333), holding("OTHER", 33334)];
    const result = calculateAssetAllocation(holdings, 100000);

    const sum = result.equityPct + result.debtPct + result.hybridPct + result.cashPct + result.otherPct;
    expect(sum).toBeCloseTo(100, 1);
  });

  it("handles single-asset-class portfolio (100% equity)", () => {
    const holdings = [holding("EQUITY", 50000)];
    const result = calculateAssetAllocation(holdings, 50000);

    expect(result.equityPct).toBe(100);
    expect(result.debtPct).toBe(0);
  });
});
