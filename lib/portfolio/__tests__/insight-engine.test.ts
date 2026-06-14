import { generatePortfolioInsights } from "@/lib/portfolio/insight-engine";
import { runPortfolioAnalytics } from "@/lib/analytics";
import type { NormalizedPortfolio } from "@/types/portfolio.types";

function portfolio(overrides: Partial<NormalizedPortfolio> = {}): NormalizedPortfolio {
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
    sips: [{ schemeName: "Large Cap Fund", amount: 5000, status: "ACTIVE", missedCount: 0 }],
    ...overrides,
  };
}

describe("generatePortfolioInsights", () => {
  it("returns no insights for a healthy, balanced portfolio", () => {
    const healthy = portfolio({
      holdings: [
        {
          schemeName: "Large Cap A",
          category: "Equity - Large Cap",
          assetClass: "EQUITY",
          units: 100,
          currentValue: 15000,
          investedValue: 13500,
          xirr: 13,
          expenseRatio: 0.9,
        },
        {
          schemeName: "Mid Cap A",
          category: "Equity - Mid Cap",
          assetClass: "EQUITY",
          units: 100,
          currentValue: 15000,
          investedValue: 13500,
          xirr: 16.5,
          expenseRatio: 1.1,
        },
        {
          schemeName: "Flexi Cap A",
          category: "Equity - Flexi Cap",
          assetClass: "EQUITY",
          units: 100,
          currentValue: 15000,
          investedValue: 13500,
          xirr: 13.5,
          expenseRatio: 1.0,
        },
        {
          schemeName: "Value Fund A",
          category: "Equity - Value",
          assetClass: "EQUITY",
          units: 100,
          currentValue: 14000,
          investedValue: 12500,
          xirr: 13.5,
          expenseRatio: 1.0,
        },
        {
          schemeName: "Debt A",
          category: "Debt - Short Duration",
          assetClass: "DEBT",
          units: 100,
          currentValue: 14000,
          investedValue: 12500,
          xirr: 7,
          expenseRatio: 0.5,
        },
        {
          schemeName: "Hybrid A",
          category: "Hybrid - Aggressive",
          assetClass: "HYBRID",
          units: 100,
          currentValue: 14000,
          investedValue: 12500,
          xirr: 11,
          expenseRatio: 0.9,
        },
        {
          schemeName: "Gilt A",
          category: "Debt - Gilt",
          assetClass: "DEBT",
          units: 100,
          currentValue: 13000,
          investedValue: 11500,
          xirr: 7,
          expenseRatio: 0.5,
        },
      ],
      sips: [{ schemeName: "Large Cap A", amount: 5000, status: "ACTIVE", missedCount: 0 }],
      totalValue: 100000,
    });

    const analytics = runPortfolioAnalytics(healthy);
    const insights = generatePortfolioInsights(analytics);

    expect(insights).toHaveLength(0);
  });

  it("generates a CONCENTRATION_RISK insight when a single fund dominates", () => {
    const p = portfolio({
      holdings: [
        {
          schemeName: "Dominant Fund",
          category: "Equity - Large Cap",
          assetClass: "EQUITY",
          units: 100,
          currentValue: 80000,
          investedValue: 70000,
          xirr: 13,
          expenseRatio: 1.0,
        },
        {
          schemeName: "Small Fund",
          category: "Debt - Liquid",
          assetClass: "DEBT",
          units: 100,
          currentValue: 20000,
          investedValue: 18000,
          xirr: 6.5,
          expenseRatio: 0.3,
        },
      ],
      totalValue: 100000,
    });

    const analytics = runPortfolioAnalytics(p);
    const insights = generatePortfolioInsights(analytics);

    const concentration = insights.find((i) => i.category === "CONCENTRATION_RISK");
    expect(concentration).toBeDefined();
    expect(concentration!.severity).toBe("HIGH");
    expect(concentration!.metrics.topHoldingPct).toBe(80);
    expect(concentration!.metrics.topHoldingName).toBe("Dominant Fund");
  });

  it("generates an ASSET_ALLOCATION insight for high cash allocation", () => {
    const p = portfolio({
      holdings: [
        {
          schemeName: "Equity Fund",
          category: "Equity - Large Cap",
          assetClass: "EQUITY",
          units: 100,
          currentValue: 60000,
          investedValue: 55000,
          xirr: 13,
          expenseRatio: 1.0,
        },
        {
          schemeName: "Cash Holding",
          category: "Cash",
          assetClass: "CASH",
          units: 100,
          currentValue: 40000,
          investedValue: 40000,
        },
      ],
      totalValue: 100000,
    });

    const analytics = runPortfolioAnalytics(p);
    const insights = generatePortfolioInsights(analytics);

    const allocation = insights.find((i) => i.category === "ASSET_ALLOCATION");
    expect(allocation).toBeDefined();
    expect(allocation!.severity).toBe("HIGH"); // cashPct 40 > 25
    expect(allocation!.metrics.cashPct).toBe(40);
  });

  it("generates a FUND_OVERLAP insight when categories have significant combined exposure", () => {
    const p = portfolio({
      holdings: [
        {
          schemeName: "Large Cap A",
          category: "Equity - Large Cap",
          assetClass: "EQUITY",
          units: 100,
          currentValue: 40000,
          investedValue: 35000,
          xirr: 13,
          expenseRatio: 1.0,
        },
        {
          schemeName: "Large Cap B",
          category: "Equity - Large Cap",
          assetClass: "EQUITY",
          units: 100,
          currentValue: 40000,
          investedValue: 35000,
          xirr: 13,
          expenseRatio: 1.0,
        },
        {
          schemeName: "Debt Fund",
          category: "Debt - Liquid",
          assetClass: "DEBT",
          units: 100,
          currentValue: 20000,
          investedValue: 18000,
          xirr: 6.5,
          expenseRatio: 0.3,
        },
      ],
      totalValue: 100000,
    });

    const analytics = runPortfolioAnalytics(p);
    const insights = generatePortfolioInsights(analytics);

    const overlap = insights.find((i) => i.category === "FUND_OVERLAP");
    expect(overlap).toBeDefined();
    expect(overlap!.metrics.categoriesWithMultipleFunds).toHaveLength(1);
  });

  it("generates a HIGH_EXPENSE insight when a fund's expense ratio exceeds category average", () => {
    const p = portfolio({
      holdings: [
        {
          schemeName: "Expensive Fund",
          category: "Equity - Large Cap", // avg 1.0
          assetClass: "EQUITY",
          units: 100,
          currentValue: 50000,
          investedValue: 45000,
          xirr: 13,
          expenseRatio: 1.8,
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
      totalValue: 100000,
    });

    const analytics = runPortfolioAnalytics(p);
    const insights = generatePortfolioInsights(analytics);

    const expense = insights.find((i) => i.category === "HIGH_EXPENSE");
    expect(expense).toBeDefined();
    const highCostFunds = expense!.metrics.highCostFunds as Array<{ schemeName: string }>;
    expect(highCostFunds[0].schemeName).toBe("Expensive Fund");
  });

  it("generates a SIP_HEALTH insight when SIPs are missed or stopped", () => {
    const p = portfolio({
      sips: [
        { schemeName: "Large Cap Fund", amount: 5000, status: "MISSED", missedCount: 2 },
        { schemeName: "Debt Fund", amount: 2000, status: "ACTIVE", missedCount: 0 },
      ],
    });

    const analytics = runPortfolioAnalytics(p);
    const insights = generatePortfolioInsights(analytics);

    const sipHealth = insights.find((i) => i.category === "SIP_HEALTH");
    expect(sipHealth).toBeDefined();
    expect(sipHealth!.severity).toBe("HIGH");
    expect(sipHealth!.metrics.missedCount).toBe(1);
  });

  it("generates a PERFORMANCE insight when a fund underperforms its benchmark", () => {
    const p = portfolio({
      holdings: [
        {
          schemeName: "Underperformer",
          category: "Equity - Large Cap", // benchmark 12.5
          assetClass: "EQUITY",
          units: 100,
          currentValue: 50000,
          investedValue: 50000,
          xirr: 9, // diff -3.5
          expenseRatio: 1.0,
        },
        {
          schemeName: "Debt Fund",
          category: "Debt - Liquid",
          assetClass: "DEBT",
          units: 100,
          currentValue: 50000,
          investedValue: 50000,
          xirr: 6.5,
          expenseRatio: 0.3,
        },
      ],
      totalValue: 100000,
    });

    const analytics = runPortfolioAnalytics(p);
    const insights = generatePortfolioInsights(analytics);

    const performance = insights.find((i) => i.category === "PERFORMANCE");
    expect(performance).toBeDefined();
    const underperforming = performance!.metrics.underperformingFunds as Array<{ schemeName: string }>;
    expect(underperforming[0].schemeName).toBe("Underperformer");
  });

  it("never includes numbers in insight metrics that are not present in analytics output", () => {
    const p = portfolio({
      holdings: [
        {
          schemeName: "Dominant Fund",
          category: "Equity - Large Cap",
          assetClass: "EQUITY",
          units: 100,
          currentValue: 90000,
          investedValue: 80000,
          xirr: 13,
          expenseRatio: 1.0,
        },
        {
          schemeName: "Small Fund",
          category: "Debt - Liquid",
          assetClass: "DEBT",
          units: 100,
          currentValue: 10000,
          investedValue: 9000,
          xirr: 6.5,
          expenseRatio: 0.3,
        },
      ],
      totalValue: 100000,
    });

    const analytics = runPortfolioAnalytics(p);
    const insights = generatePortfolioInsights(analytics);
    const concentration = insights.find((i) => i.category === "CONCENTRATION_RISK")!;

    // metrics.topHoldingPct must exactly equal analytics.concentration.topHoldingPct
    expect(concentration.metrics.topHoldingPct).toBe(analytics.concentration.topHoldingPct);
    expect(concentration.metrics.riskScore).toBe(analytics.concentration.riskScore);
  });
});
