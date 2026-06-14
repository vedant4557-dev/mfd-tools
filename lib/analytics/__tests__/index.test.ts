import { runPortfolioAnalytics, calculatePortfolioScore } from "@/lib/analytics";
import type { NormalizedPortfolio, PortfolioAnalyticsResult } from "@/types/portfolio.types";

function basePortfolio(overrides: Partial<NormalizedPortfolio> = {}): NormalizedPortfolio {
  return {
    clientId: "client_1",
    casUploadId: "cas_1",
    totalValue: 100000,
    totalInvested: 90000,
    holdings: [
      {
        schemeName: "Large Cap Fund",
        category: "Equity - Large Cap",
        assetClass: "EQUITY",
        units: 100,
        currentValue: 50000,
        investedValue: 45000,
        xirr: 13,
        expenseRatio: 1.0,
      },
      {
        schemeName: "Debt Fund",
        category: "Debt - Liquid",
        assetClass: "DEBT",
        units: 100,
        currentValue: 50000,
        investedValue: 45000,
        xirr: 6.5,
        expenseRatio: 0.3,
      },
    ],
    sips: [
      { schemeName: "Large Cap Fund", amount: 5000, status: "ACTIVE", missedCount: 0 },
    ],
    ...overrides,
  };
}

describe("runPortfolioAnalytics", () => {
  it("runs all analytics modules and returns a complete result", () => {
    const result = runPortfolioAnalytics(basePortfolio());

    expect(result.totalValue).toBe(100000);
    expect(result.totalInvested).toBe(90000);
    expect(result.concentration).toBeDefined();
    expect(result.allocation).toBeDefined();
    expect(result.overlap).toBeDefined();
    expect(result.expense).toBeDefined();
    expect(result.sipHealth).toBeDefined();
    expect(result.performance).toBeDefined();

    expect(result.allocation.equityPct).toBe(50);
    expect(result.allocation.debtPct).toBe(50);
  });

  it("handles an empty portfolio without throwing", () => {
    const result = runPortfolioAnalytics(
      basePortfolio({ totalValue: 0, totalInvested: 0, holdings: [], sips: [] })
    );

    expect(result.totalValue).toBe(0);
    expect(result.concentration.riskLevel).toBe("low");
    expect(result.allocation.equityPct).toBe(0);
    expect(result.performance.portfolioXirr).toBeNull();
  });
});

describe("calculatePortfolioScore", () => {
  it("returns a score between 0 and 100", () => {
    const analytics = runPortfolioAnalytics(basePortfolio());
    const { total, breakdown } = calculatePortfolioScore(analytics);

    expect(total).toBeGreaterThanOrEqual(0);
    expect(total).toBeLessThanOrEqual(100);

    const sum =
      breakdown.concentrationScore +
      breakdown.allocationScore +
      breakdown.overlapScore +
      breakdown.expenseScore +
      breakdown.sipHealthScore +
      breakdown.performanceScore;
    expect(Math.round(sum)).toBe(total);
  });

  it("gives a high score to a well-diversified, low-cost, healthy portfolio", () => {
    const portfolio = basePortfolio({
      holdings: [
        {
          schemeName: "Large Cap A",
          category: "Equity - Large Cap",
          assetClass: "EQUITY",
          units: 100,
          currentValue: 20000,
          investedValue: 18000,
          xirr: 13,
          expenseRatio: 0.5,
        },
        {
          schemeName: "Mid Cap A",
          category: "Equity - Mid Cap",
          assetClass: "EQUITY",
          units: 100,
          currentValue: 20000,
          investedValue: 18000,
          xirr: 17,
          expenseRatio: 0.6,
        },
        {
          schemeName: "Flexi Cap A",
          category: "Equity - Flexi Cap",
          assetClass: "EQUITY",
          units: 100,
          currentValue: 20000,
          investedValue: 18000,
          xirr: 14,
          expenseRatio: 0.5,
        },
        {
          schemeName: "Debt A",
          category: "Debt - Short Duration",
          assetClass: "DEBT",
          units: 100,
          currentValue: 20000,
          investedValue: 18000,
          xirr: 7.2,
          expenseRatio: 0.3,
        },
        {
          schemeName: "Hybrid A",
          category: "Hybrid - Aggressive",
          assetClass: "HYBRID",
          units: 100,
          currentValue: 20000,
          investedValue: 18000,
          xirr: 11.2,
          expenseRatio: 0.5,
        },
      ],
      sips: [{ schemeName: "Large Cap A", amount: 5000, status: "ACTIVE", missedCount: 0 }],
    });

    const analytics = runPortfolioAnalytics(portfolio);
    const { total } = calculatePortfolioScore(analytics);

    expect(total).toBeGreaterThanOrEqual(75);
  });

  it("gives a low score to a concentrated, high-cost, overlapping, at-risk portfolio", () => {
    const portfolio = basePortfolio({
      totalValue: 100000,
      holdings: [
        {
          schemeName: "Mega Fund",
          category: "Equity - Large Cap",
          assetClass: "EQUITY",
          units: 100,
          currentValue: 80000,
          investedValue: 80000,
          xirr: 8, // underperforms benchmark 12.5 by 4.5pp
          expenseRatio: 2.2,
        },
        {
          schemeName: "Similar Fund",
          category: "Equity - Large Cap",
          assetClass: "EQUITY",
          units: 100,
          currentValue: 20000,
          investedValue: 20000,
          xirr: 8,
          expenseRatio: 2.0,
        },
      ],
      sips: [
        { schemeName: "Mega Fund", amount: 5000, status: "MISSED", missedCount: 3 },
        { schemeName: "Similar Fund", amount: 2000, status: "STOPPED", missedCount: 0 },
      ],
    });

    const analytics = runPortfolioAnalytics(portfolio);
    const { total, breakdown } = calculatePortfolioScore(analytics);

    expect(total).toBeLessThan(50);
    expect(breakdown.concentrationScore).toBeLessThan(10);
    expect(breakdown.overlapScore).toBeLessThan(10);
    expect(breakdown.expenseScore).toBeLessThan(5);
    expect(breakdown.sipHealthScore).toBe(0);
  });

  it("treats a portfolio with no SIPs as not penalized on SIP health", () => {
    const analytics: PortfolioAnalyticsResult = runPortfolioAnalytics(
      basePortfolio({ sips: [] })
    );
    const { breakdown } = calculatePortfolioScore(analytics);

    expect(breakdown.sipHealthScore).toBe(15);
  });
});
