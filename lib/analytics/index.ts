import type {
  NormalizedPortfolio,
  PortfolioAnalyticsResult,
  PortfolioScoreBreakdown,
} from "@/types/portfolio.types";
import { calculateConcentrationRisk } from "./concentration";
import { calculateAssetAllocation } from "./allocation";
import { calculateFundOverlap } from "./overlap";
import { calculateExpenseAnalysis } from "./expense";
import { calculateSIPHealth } from "./sip-health";
import { calculatePerformance } from "./performance";

export * from "./concentration";
export * from "./allocation";
export * from "./overlap";
export * from "./expense";
export * from "./sip-health";
export * from "./performance";
export * from "./constants";

/**
 * Runs all deterministic analytics modules over a normalized portfolio.
 * This is the single entry point used by both the upload pipeline
 * (to persist Holding/SIPRecord + run the Insight Engine) and the
 * Portfolio Analyst API route.
 */
export function runPortfolioAnalytics(portfolio: NormalizedPortfolio): PortfolioAnalyticsResult {
  const { holdings, sips, totalValue, totalInvested } = portfolio;

  return {
    totalValue,
    totalInvested,
    concentration: calculateConcentrationRisk(holdings, totalValue),
    allocation: calculateAssetAllocation(holdings, totalValue),
    overlap: calculateFundOverlap(holdings, totalValue),
    expense: calculateExpenseAnalysis(holdings, totalValue),
    sipHealth: calculateSIPHealth(sips),
    performance: calculatePerformance(holdings, totalValue),
  };
}

/**
 * Computes the overall Portfolio Score (0-100) from analytics results.
 *
 * Weighting (sums to 100):
 * - Concentration risk:   25 pts (lower risk score => higher points)
 * - Asset allocation:      20 pts (penalize extreme cash drag / 0% equity for long-term)
 * - Fund overlap:          15 pts (lower overlap score => higher points)
 * - Expense efficiency:    15 pts (lower weighted expense ratio => higher points)
 * - SIP health:            15 pts (active vs at-risk ratio)
 * - Performance:           10 pts (vs blended benchmark)
 *
 * This is a deterministic scoring function — no LLM involvement.
 * Returns both the total score and the per-category breakdown so the
 * UI and AI explanation layer can reference exactly how the score was derived.
 */
export function calculatePortfolioScore(analytics: PortfolioAnalyticsResult): {
  total: number;
  breakdown: PortfolioScoreBreakdown;
} {
  // 1. Concentration (25 pts): riskScore 0 (best) -> 100 (worst)
  const concentrationScore = round1(25 * (1 - analytics.concentration.riskScore / 100));

  // 2. Allocation (20 pts): penalize cash drag beyond 10% and zero-equity portfolios
  const { equityPct, cashPct, otherPct } = analytics.allocation;
  let allocationScore = 20;
  if (cashPct > 10) {
    allocationScore -= Math.min(10, (cashPct - 10) * 0.5);
  }
  if (equityPct === 0) {
    allocationScore -= 5;
  }
  if (otherPct > 5) {
    allocationScore -= Math.min(5, otherPct * 0.5);
  }
  allocationScore = clamp(allocationScore, 0, 20);

  // 3. Overlap (15 pts): overlapScore 0 (best) -> 100 (worst)
  const overlapScore = round1(15 * (1 - analytics.overlap.overlapScore / 100));

  // 4. Expense efficiency (15 pts): weighted expense ratio vs a 0.5%-2.0% band
  // 0.5% or below => full marks, 2.0% or above => 0 marks
  const wer = analytics.expense.portfolioWeightedExpenseRatio;
  const expenseScore = round1(clamp(15 * (1 - (wer - 0.5) / 1.5), 0, 15));

  // 5. SIP health (15 pts): proportion of SIPs that are active & healthy
  const { activeCount, pausedCount, missedCount, stoppedCount, atRiskSIPs } = analytics.sipHealth;
  const totalSIPs = activeCount + pausedCount + missedCount + stoppedCount;
  let sipHealthScore: number;
  if (totalSIPs === 0) {
    sipHealthScore = 15; // no SIPs => not penalized (lump-sum-only portfolio)
  } else {
    const healthyRatio = (totalSIPs - atRiskSIPs.length) / totalSIPs;
    sipHealthScore = round1(15 * healthyRatio);
  }

  // 6. Performance (10 pts): portfolioVsBenchmark mapped from -5pp..+5pp => 0..10
  const diff = analytics.performance.portfolioVsBenchmark;
  let performanceScore: number;
  if (diff === null) {
    performanceScore = 5; // unknown => neutral midpoint
  } else {
    performanceScore = round1(clamp(5 + diff, 0, 10));
  }

  const breakdown: PortfolioScoreBreakdown = {
    concentrationScore,
    allocationScore: round1(allocationScore),
    overlapScore,
    expenseScore,
    sipHealthScore,
    performanceScore,
  };

  const total = Math.round(
    breakdown.concentrationScore +
      breakdown.allocationScore +
      breakdown.overlapScore +
      breakdown.expenseScore +
      breakdown.sipHealthScore +
      breakdown.performanceScore
  );

  return { total: clamp(total, 0, 100), breakdown };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
