import { buildNormalizedHoldings, buildNormalizedSIPs } from "@/lib/portfolio/normalize-helpers";
import type { CASFund, CASSIPEntry } from "@/types/cas.types";

describe("buildNormalizedHoldings", () => {
  it("maps funds into NormalizedHolding with correct assetClass mapping", () => {
    const funds: CASFund[] = [
      {
        name: "Some Large Cap Fund",
        category: "Equity - Large Cap",
        currentValue: 60000,
        investedValue: 50000,
        units: 100,
        xirr: 13,
        expenseRatio: 1.0,
      },
      {
        name: "Some Liquid Fund",
        category: "Debt - Liquid",
        currentValue: 40000,
        investedValue: 39000,
        units: 200,
      },
    ];

    const result = buildNormalizedHoldings(funds);

    expect(result).toHaveLength(2);
    expect(result[0].assetClass).toBe("EQUITY");
    expect(result[1].assetClass).toBe("DEBT");
    expect(result[1].xirr).toBeUndefined();
    expect(result[1].expenseRatio).toBeUndefined();
  });

  it("maps unrecognized category strings to OTHER", () => {
    const funds: CASFund[] = [
      {
        name: "Weird Fund",
        category: "Real Estate Income Trust",
        currentValue: 10000,
        investedValue: 10000,
        units: 5,
      },
    ];

    const result = buildNormalizedHoldings(funds);
    expect(result[0].assetClass).toBe("OTHER");
  });

  it("returns empty array for empty input", () => {
    expect(buildNormalizedHoldings([])).toEqual([]);
  });
});

describe("buildNormalizedSIPs", () => {
  it("normalizes SIP entries with status defaults", () => {
    const sips: CASSIPEntry[] = [
      { schemeName: "Fund A", amount: 5000 },
      { schemeName: "Fund B", amount: 2000, status: "MISSED", missedCount: 2 },
    ];

    const result = buildNormalizedSIPs(sips);

    expect(result[0].status).toBe("ACTIVE");
    expect(result[0].missedCount).toBe(0);
    expect(result[1].status).toBe("MISSED");
    expect(result[1].missedCount).toBe(2);
  });

  it("returns empty array for empty input", () => {
    expect(buildNormalizedSIPs([])).toEqual([]);
  });
});
