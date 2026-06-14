import { calculateFundOverlap } from "@/lib/analytics/overlap";
import type { NormalizedHolding } from "@/types/portfolio.types";

function holding(schemeName: string, category: string, currentValue: number): NormalizedHolding {
  return {
    schemeName,
    category,
    assetClass: "EQUITY",
    units: 100,
    currentValue,
    investedValue: currentValue,
  };
}

describe("calculateFundOverlap", () => {
  it("returns zero overlap for empty portfolio", () => {
    const result = calculateFundOverlap([], 0);
    expect(result.overlapScore).toBe(0);
    expect(result.overlappingPairs).toHaveLength(0);
  });

  it("returns zero overlap when each category has only one fund", () => {
    const holdings = [
      holding("Fund A", "Equity - Large Cap", 50000),
      holding("Fund B", "Equity - Mid Cap", 30000),
      holding("Fund C", "Debt - Liquid", 20000),
    ];
    const result = calculateFundOverlap(holdings, 100000);

    expect(result.overlapScore).toBe(0);
    expect(result.categoriesWithMultipleFunds).toHaveLength(0);
    expect(result.overlappingPairs).toHaveLength(0);
  });

  it("detects overlap when multiple funds share a category", () => {
    const holdings = [
      holding("Large Cap Fund 1", "Equity - Large Cap", 30000),
      holding("Large Cap Fund 2", "Equity - Large Cap", 30000),
      holding("Debt Fund", "Debt - Liquid", 40000),
    ];
    const result = calculateFundOverlap(holdings, 100000);

    expect(result.categoriesWithMultipleFunds).toHaveLength(1);
    expect(result.categoriesWithMultipleFunds[0]).toMatchObject({
      category: "Equity - Large Cap",
      fundCount: 2,
      combinedPct: 60,
    });
    expect(result.overlapScore).toBeGreaterThan(0);
    expect(result.overlappingPairs.length).toBeGreaterThan(0);
    expect(result.overlappingPairs[0]).toMatchObject({
      fundA: "Large Cap Fund 1",
      fundB: "Large Cap Fund 2",
      category: "Equity - Large Cap",
    });
  });

  it("does not generate pairs for overlap below the significance threshold", () => {
    const holdings = [
      holding("Tiny Fund 1", "Equity - Small Cap", 5000),
      holding("Tiny Fund 2", "Equity - Small Cap", 4000),
      holding("Main Fund", "Equity - Large Cap", 91000),
    ];
    const result = calculateFundOverlap(holdings, 100000);

    // combined 9% < 15% significance threshold
    expect(result.categoriesWithMultipleFunds).toHaveLength(1);
    expect(result.overlappingPairs).toHaveLength(0);
  });

  it("caps overlap score at 100", () => {
    const holdings = Array.from({ length: 6 }, (_, i) =>
      holding(`Fund ${i}`, "Equity - Large Cap", 50000)
    );
    const result = calculateFundOverlap(holdings, 300000);

    expect(result.overlapScore).toBeLessThanOrEqual(100);
  });
});
