import { calculatePerformance } from "@/lib/analytics/performance";
import type { NormalizedHolding } from "@/types/portfolio.types";

function holding(overrides: Partial<NormalizedHolding>): NormalizedHolding {
  return {
    schemeName: "Fund",
    category: "Equity - Large Cap", // benchmark 12.5
    assetClass: "EQUITY",
    units: 100,
    currentValue: 10000,
    investedValue: 9000,
    ...overrides,
  };
}

describe("calculatePerformance", () => {
  it("returns nulls for empty portfolio", () => {
    const result = calculatePerformance([], 0);
    expect(result.portfolioXirr).toBeNull();
    expect(result.portfolioVsBenchmark).toBeNull();
    expect(result.fundLevel).toHaveLength(0);
  });

  it("returns portfolioXirr null when no fund has xirr data", () => {
    const holdings = [holding({ xirr: undefined })];
    const result = calculatePerformance(holdings, 10000);

    expect(result.portfolioXirr).toBeNull();
    expect(result.portfolioVsBenchmark).toBeNull();
    expect(result.fundLevel[0].status).toBe("unknown");
    expect(result.blendedBenchmark).toBe(12.5);
  });

  it("flags a fund as underperforming when it trails benchmark by more than threshold", () => {
    // benchmark 12.5, fund xirr 10 -> diff -2.5 <= -1.5 threshold
    const holdings = [holding({ xirr: 10 })];
    const result = calculatePerformance(holdings, 10000);

    expect(result.fundLevel[0].status).toBe("underperforming");
    expect(result.fundLevel[0].differencePct).toBeCloseTo(-2.5, 2);
  });

  it("flags a fund as outperforming when it beats benchmark by more than threshold", () => {
    // benchmark 12.5, fund xirr 15 -> diff +2.5 >= +1.5 threshold
    const holdings = [holding({ xirr: 15 })];
    const result = calculatePerformance(holdings, 10000);

    expect(result.fundLevel[0].status).toBe("outperforming");
  });

  it("flags a fund as in-line when within threshold of benchmark", () => {
    // benchmark 12.5, fund xirr 13 -> diff +0.5, within -1.5..+1.5
    const holdings = [holding({ xirr: 13 })];
    const result = calculatePerformance(holdings, 10000);

    expect(result.fundLevel[0].status).toBe("in-line");
  });

  it("computes value-weighted portfolio XIRR and benchmark comparison", () => {
    const holdings = [
      holding({ schemeName: "A", xirr: 10, currentValue: 50000, category: "Equity - Large Cap" }), // bm 12.5
      holding({ schemeName: "B", xirr: 16, currentValue: 50000, category: "Equity - Large Cap" }), // bm 12.5
    ];
    const result = calculatePerformance(holdings, 100000);

    // weighted xirr = (10*50000 + 16*50000)/100000 = 13
    expect(result.portfolioXirr).toBeCloseTo(13, 2);
    expect(result.blendedBenchmark).toBeCloseTo(12.5, 2);
    expect(result.portfolioVsBenchmark).toBeCloseTo(0.5, 2);
  });

  it("uses default benchmark for unrecognized categories", () => {
    const holdings = [holding({ category: "Some Unknown Category", assetClass: "OTHER", xirr: 8 })];
    const result = calculatePerformance(holdings, 10000);

    expect(result.fundLevel[0].categoryBenchmark).toBe(10); // DEFAULT_BENCHMARK
  });
});
