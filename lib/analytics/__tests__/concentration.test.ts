import { calculateConcentrationRisk } from "@/lib/analytics/concentration";
import type { NormalizedHolding } from "@/types/portfolio.types";

function holding(overrides: Partial<NormalizedHolding>): NormalizedHolding {
  return {
    schemeName: "Fund",
    category: "Equity - Large Cap",
    assetClass: "EQUITY",
    units: 100,
    currentValue: 10000,
    investedValue: 9000,
    ...overrides,
  };
}

describe("calculateConcentrationRisk", () => {
  it("returns zero/low for empty portfolio", () => {
    const result = calculateConcentrationRisk([], 0);
    expect(result.riskLevel).toBe("low");
    expect(result.topHoldingPct).toBe(0);
    expect(result.riskScore).toBe(0);
  });

  it("flags high risk when one fund dominates", () => {
    const holdings = [
      holding({ schemeName: "Big Fund", currentValue: 60000 }),
      holding({ schemeName: "Small Fund A", currentValue: 20000 }),
      holding({ schemeName: "Small Fund B", currentValue: 20000 }),
    ];
    const result = calculateConcentrationRisk(holdings, 100000);

    expect(result.topHoldingPct).toBe(60);
    expect(result.topHoldingName).toBe("Big Fund");
    expect(result.top3Pct).toBe(100);
    expect(result.riskLevel).toBe("high");
    expect(result.riskScore).toBeGreaterThan(50);
  });

  it("returns low risk for a well-diversified portfolio", () => {
    const holdings = Array.from({ length: 10 }, (_, i) =>
      holding({ schemeName: `Fund ${i}`, currentValue: 10000 })
    );
    const result = calculateConcentrationRisk(holdings, 100000);

    expect(result.topHoldingPct).toBe(10);
    expect(result.top3Pct).toBe(30);
    expect(result.riskLevel).toBe("low");
  });

  it("correctly identifies the top 3 holdings regardless of input order", () => {
    const holdings = [
      holding({ schemeName: "Small", currentValue: 5000 }),
      holding({ schemeName: "Medium", currentValue: 15000 }),
      holding({ schemeName: "Large", currentValue: 30000 }),
      holding({ schemeName: "Tiny", currentValue: 1000 }),
    ];
    const result = calculateConcentrationRisk(holdings, 51000);

    expect(result.topHoldingName).toBe("Large");
    expect(result.top3Names).toEqual(["Large", "Medium", "Small"]);
  });

  it("flags medium risk at the threshold boundary", () => {
    const holdings = [
      holding({ schemeName: "A", currentValue: 26000 }),
      holding({ schemeName: "B", currentValue: 19000 }),
      holding({ schemeName: "C", currentValue: 19000 }),
      holding({ schemeName: "D", currentValue: 18000 }),
      holding({ schemeName: "E", currentValue: 18000 }),
    ];
    const result = calculateConcentrationRisk(holdings, 100000);

    expect(result.topHoldingPct).toBe(26);
    expect(result.top3Pct).toBe(64); // 26 + 19 + 19 = 64 < 65 high threshold
    expect(result.riskLevel).toBe("medium"); // topHoldingPct 26 is in [25,35) medium band
  });
});
