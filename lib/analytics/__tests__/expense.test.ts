import { calculateExpenseAnalysis } from "@/lib/analytics/expense";
import type { NormalizedHolding } from "@/types/portfolio.types";

function holding(overrides: Partial<NormalizedHolding>): NormalizedHolding {
  return {
    schemeName: "Fund",
    category: "Equity - Large Cap", // category avg 1.0%
    assetClass: "EQUITY",
    units: 100,
    currentValue: 10000,
    investedValue: 10000,
    ...overrides,
  };
}

describe("calculateExpenseAnalysis", () => {
  it("returns zeros for empty portfolio", () => {
    const result = calculateExpenseAnalysis([], 0);
    expect(result.portfolioWeightedExpenseRatio).toBe(0);
    expect(result.highCostFunds).toHaveLength(0);
  });

  it("flags a fund with expense ratio significantly above category average", () => {
    const holdings = [
      holding({ schemeName: "Expensive Fund", expenseRatio: 1.8, currentValue: 50000 }),
      holding({ schemeName: "Normal Fund", expenseRatio: 1.0, currentValue: 50000 }),
    ];
    const result = calculateExpenseAnalysis(holdings, 100000);

    expect(result.highCostFunds).toHaveLength(1);
    expect(result.highCostFunds[0].schemeName).toBe("Expensive Fund");
    expect(result.highCostFunds[0].categoryAverage).toBe(1.0);
    expect(result.highCostFunds[0].differencePct).toBeCloseTo(0.8, 5);
    expect(result.highCostFunds[0].annualCostEstimate).toBeCloseTo(900, 2); // 50000 * 1.8%
  });

  it("does not flag funds within the significance threshold of category average", () => {
    const holdings = [holding({ expenseRatio: 1.1, currentValue: 50000 })]; // diff = 0.1 < 0.3 threshold
    const result = calculateExpenseAnalysis(holdings, 50000);

    expect(result.highCostFunds).toHaveLength(0);
  });

  it("excludes funds with missing expense ratio from weighted average", () => {
    const holdings = [
      holding({ schemeName: "Has ER", expenseRatio: 1.0, currentValue: 50000 }),
      holding({ schemeName: "No ER", expenseRatio: undefined, currentValue: 50000 }),
    ];
    const result = calculateExpenseAnalysis(holdings, 100000);

    expect(result.portfolioWeightedExpenseRatio).toBe(1.0);
  });

  it("computes a value-weighted average expense ratio", () => {
    const holdings = [
      holding({ schemeName: "A", expenseRatio: 2.0, currentValue: 75000 }),
      holding({ schemeName: "B", expenseRatio: 0.5, currentValue: 25000 }),
    ];
    const result = calculateExpenseAnalysis(holdings, 100000);

    // (2.0*75000 + 0.5*25000) / 100000 = 1.625
    expect(result.portfolioWeightedExpenseRatio).toBeCloseTo(1.625, 2);
  });

  it("sorts high-cost funds by annual cost impact descending", () => {
    const holdings = [
      holding({ schemeName: "Small but expensive", expenseRatio: 2.0, currentValue: 10000 }),
      holding({ schemeName: "Large and expensive", expenseRatio: 1.5, currentValue: 90000 }),
    ];
    const result = calculateExpenseAnalysis(holdings, 100000);

    expect(result.highCostFunds[0].schemeName).toBe("Large and expensive");
  });
});
