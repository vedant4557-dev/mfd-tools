import type { PortfolioAnalyticsResult, PortfolioInsightData } from "@/types/portfolio.types";
import { THRESHOLDS } from "@/lib/analytics/constants";

/**
 * Generates structured insights from deterministic analytics results.
 *
 * CRITICAL: This function performs ZERO calculations of its own — every
 * number in every insight is read directly from `analytics`. The LLM layer
 * (see lib/ai/explain-portfolio.ts) only explains/prioritizes these insights
 * in natural language; it never computes or alters the metrics.
 *
 * Returns insights for ALL categories that meet their trigger condition.
 * Severity is derived deterministically from thresholds.
 */
export function generatePortfolioInsights(
  analytics: PortfolioAnalyticsResult
): PortfolioInsightData[] {
  const insights: PortfolioInsightData[] = [];

  insights.push(...concentrationInsights(analytics));
  insights.push(...allocationInsights(analytics));
  insights.push(...overlapInsights(analytics));
  insights.push(...expenseInsights(analytics));
  insights.push(...sipHealthInsights(analytics));
  insights.push(...performanceInsights(analytics));

  return insights;
}

// ---------------------------------------------------------------------------
// Concentration Risk
// ---------------------------------------------------------------------------
function concentrationInsights(a: PortfolioAnalyticsResult): PortfolioInsightData[] {
  const c = a.concentration;
  if (c.riskLevel === "low") return [];

  const severity = c.riskLevel === "high" ? "HIGH" : "MEDIUM";

  return [
    {
      severity,
      category: "CONCENTRATION_RISK",
      title:
        c.riskLevel === "high"
          ? "Portfolio is heavily concentrated in a single fund"
          : "Portfolio shows moderate concentration risk",
      description: `${c.topHoldingPct}% of the portfolio is held in ${c.topHoldingName}, and the top 3 holdings together account for ${c.top3Pct}%. A single adverse event affecting this fund/category would have an outsized impact on the overall portfolio.`,
      metrics: {
        topHoldingPct: c.topHoldingPct,
        topHoldingName: c.topHoldingName,
        top3Pct: c.top3Pct,
        top3Names: c.top3Names,
        riskScore: c.riskScore,
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Asset Allocation
// ---------------------------------------------------------------------------
function allocationInsights(a: PortfolioAnalyticsResult): PortfolioInsightData[] {
  const insights: PortfolioInsightData[] = [];
  const { equityPct, cashPct, debtPct, hybridPct, otherPct } = a.allocation;

  if (cashPct > 10) {
    insights.push({
      severity: cashPct > 25 ? "HIGH" : "MEDIUM",
      category: "ASSET_ALLOCATION",
      title: "High idle cash allocation",
      description: `${cashPct}% of the portfolio is sitting in cash/liquid instruments. Depending on the client's goals, this may represent uninvested capital that could be deployed for better long-term returns.`,
      metrics: { cashPct, equityPct, debtPct, hybridPct, otherPct },
    });
  }

  if (equityPct === 0 && a.totalValue > 0) {
    insights.push({
      severity: "MEDIUM",
      category: "ASSET_ALLOCATION",
      title: "No equity exposure",
      description: `The portfolio currently has 0% allocation to equity. For long-term goals, this may significantly limit growth potential depending on the client's risk profile and time horizon.`,
      metrics: { equityPct, debtPct, hybridPct, cashPct, otherPct },
    });
  }

  return insights;
}

// ---------------------------------------------------------------------------
// Fund Overlap
// ---------------------------------------------------------------------------
function overlapInsights(a: PortfolioAnalyticsResult): PortfolioInsightData[] {
  const o = a.overlap;
  if (o.overlappingPairs.length === 0 && o.categoriesWithMultipleFunds.length === 0) return [];

  const severity = o.overlapScore >= 40 ? "HIGH" : o.overlapScore >= 15 ? "MEDIUM" : "LOW";
  if (severity === "LOW" && o.overlappingPairs.length === 0) return [];

  const topCategory = [...o.categoriesWithMultipleFunds].sort(
    (x, y) => y.combinedPct - x.combinedPct
  )[0];

  return [
    {
      severity,
      category: "FUND_OVERLAP",
      title: "Overlapping fund exposure detected",
      description: `${o.categoriesWithMultipleFunds.length} category/categories hold multiple funds with similar strategy. The largest overlap is in "${topCategory?.category}" (${topCategory?.fundCount} funds, ${topCategory?.combinedPct}% of portfolio combined), creating redundant exposure without meaningful diversification benefit.`,
      metrics: {
        overlapScore: o.overlapScore,
        categoriesWithMultipleFunds: o.categoriesWithMultipleFunds,
        overlappingPairs: o.overlappingPairs,
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// High Expense
// ---------------------------------------------------------------------------
function expenseInsights(a: PortfolioAnalyticsResult): PortfolioInsightData[] {
  const e = a.expense;
  if (e.highCostFunds.length === 0) return [];

  const totalExtraCost = e.highCostFunds.reduce(
    (sum, f) => sum + f.annualCostEstimate * (f.differencePct / (f.differencePct + f.categoryAverage || 1)),
    0
  );

  const severity = e.highCostFunds.length >= 2 || e.portfolioWeightedExpenseRatio >= 1.5 ? "HIGH" : "MEDIUM";

  return [
    {
      severity,
      category: "HIGH_EXPENSE",
      title: `${e.highCostFunds.length} fund(s) have above-average expense ratios`,
      description: `The portfolio's weighted average expense ratio is ${e.portfolioWeightedExpenseRatio}%. ${e.highCostFunds
        .map(
          (f) =>
            `${f.schemeName} charges ${f.expenseRatio}% vs a category average of ${f.categoryAverage}%`
        )
        .join("; ")}. Switching to lower-cost alternatives in the same category could reduce annual costs without necessarily changing the investment strategy.`,
      metrics: {
        portfolioWeightedExpenseRatio: e.portfolioWeightedExpenseRatio,
        highCostFunds: e.highCostFunds,
        totalEstimatedAnnualCost: e.totalEstimatedAnnualCost,
        approxExtraAnnualCost: round2(totalExtraCost),
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// SIP Health
// ---------------------------------------------------------------------------
function sipHealthInsights(a: PortfolioAnalyticsResult): PortfolioInsightData[] {
  const s = a.sipHealth;
  if (s.atRiskSIPs.length === 0) return [];

  const severity = s.missedCount > 0 || s.stoppedCount > 0 ? "HIGH" : "MEDIUM";

  return [
    {
      severity,
      category: "SIP_HEALTH",
      title: `${s.atRiskSIPs.length} SIP(s) need attention`,
      description: `Out of the client's SIPs, ${s.activeCount} are active, ${s.pausedCount} paused, ${s.missedCount} have missed payments, and ${s.stoppedCount} have stopped. At-risk SIPs: ${s.atRiskSIPs
        .map((sip) => `${sip.schemeName} (₹${sip.amount}/month, status: ${sip.status})`)
        .join("; ")}. Following up with the client on these could prevent loss of long-term compounding and AUM attrition.`,
      metrics: {
        activeCount: s.activeCount,
        pausedCount: s.pausedCount,
        missedCount: s.missedCount,
        stoppedCount: s.stoppedCount,
        totalMonthlyAmount: s.totalMonthlyAmount,
        atRiskSIPs: s.atRiskSIPs,
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Performance
// ---------------------------------------------------------------------------
function performanceInsights(a: PortfolioAnalyticsResult): PortfolioInsightData[] {
  const p = a.performance;
  const underperforming = p.fundLevel.filter((f) => f.status === "underperforming");
  const insights: PortfolioInsightData[] = [];

  if (underperforming.length > 0) {
    const severity = underperforming.length >= 2 ? "HIGH" : "MEDIUM";
    insights.push({
      severity,
      category: "PERFORMANCE",
      title: `${underperforming.length} fund(s) underperforming their category benchmark`,
      description: `${underperforming
        .map(
          (f) =>
            `${f.schemeName} returned ${f.fundXirr}% XIRR vs a category benchmark of ${f.categoryBenchmark}% (${f.differencePct}pp difference)`
        )
        .join("; ")}. Sustained underperformance relative to category peers may warrant a review of whether these funds still fit the portfolio strategy.`,
      metrics: { underperformingFunds: underperforming },
    });
  }

  if (
    p.portfolioVsBenchmark !== null &&
    p.portfolioVsBenchmark <= THRESHOLDS.performance.underperformanceThresholdPct
  ) {
    insights.push({
      severity: "MEDIUM",
      category: "PERFORMANCE",
      title: "Overall portfolio is trailing its blended benchmark",
      description: `The portfolio's overall XIRR of ${p.portfolioXirr}% is ${Math.abs(
        p.portfolioVsBenchmark
      )}pp below its blended category benchmark of ${p.blendedBenchmark}%.`,
      metrics: {
        portfolioXirr: p.portfolioXirr,
        blendedBenchmark: p.blendedBenchmark,
        portfolioVsBenchmark: p.portfolioVsBenchmark,
      },
    });
  }

  return insights;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
