import type { AssetClass } from "@prisma/client";

/**
 * Maps raw CAS category strings to AssetClass enum.
 * CAS category strings vary by RTA (CAMS/KFin) but generally follow
 * "<AssetClass> - <Sub-category>" pattern.
 */
export function mapCategoryToAssetClass(category: string): AssetClass {
  const c = category.toLowerCase();
  if (c.includes("equity")) return "EQUITY";
  if (c.includes("debt") || c.includes("liquid") || c.includes("money market")) return "DEBT";
  if (c.includes("hybrid") || c.includes("balanced")) return "HYBRID";
  if (c.includes("cash") || c.includes("overnight")) return "CASH";
  return "OTHER";
}

/**
 * Approximate category-level XIRR benchmarks (5-yr trailing averages, indicative).
 * Used for performance comparison. These should be refreshed periodically
 * (V1: pull from a market-data source); hardcoded for V0.
 */
export const CATEGORY_BENCHMARKS: Record<string, number> = {
  "equity - large cap": 12.5,
  "equity - large & mid cap": 14.0,
  "equity - mid cap": 16.5,
  "equity - small cap": 18.0,
  "equity - flexi cap": 13.5,
  "equity - multi cap": 14.5,
  "equity - elss": 13.0,
  "equity - sectoral / thematic": 15.0,
  "equity - focused": 14.0,
  "equity - value": 13.5,
  "debt - liquid": 6.5,
  "debt - short duration": 7.0,
  "debt - medium duration": 7.5,
  "debt - corporate bond": 7.5,
  "debt - gilt": 7.0,
  "debt - dynamic bond": 7.5,
  "hybrid - aggressive": 11.0,
  "hybrid - balanced": 10.0,
  "hybrid - conservative": 8.5,
  "hybrid - multi asset": 10.5,
  "hybrid - arbitrage": 6.5,
};

export const DEFAULT_EQUITY_BENCHMARK = 13.0;
export const DEFAULT_DEBT_BENCHMARK = 7.0;
export const DEFAULT_HYBRID_BENCHMARK = 10.0;
export const DEFAULT_BENCHMARK = 10.0;

export function getCategoryBenchmark(category: string, assetClass: AssetClass): number {
  const key = category.trim().toLowerCase();
  if (CATEGORY_BENCHMARKS[key] !== undefined) return CATEGORY_BENCHMARKS[key];
  switch (assetClass) {
    case "EQUITY":
      return DEFAULT_EQUITY_BENCHMARK;
    case "DEBT":
      return DEFAULT_DEBT_BENCHMARK;
    case "HYBRID":
      return DEFAULT_HYBRID_BENCHMARK;
    default:
      return DEFAULT_BENCHMARK;
  }
}

/**
 * Approximate category-average expense ratios (regular plans, indicative).
 * Used to flag funds with above-average costs.
 */
export const CATEGORY_EXPENSE_AVERAGES: Record<string, number> = {
  "equity - large cap": 1.0,
  "equity - large & mid cap": 1.1,
  "equity - mid cap": 1.2,
  "equity - small cap": 1.3,
  "equity - flexi cap": 1.1,
  "equity - multi cap": 1.1,
  "equity - elss": 1.1,
  "equity - sectoral / thematic": 1.4,
  "equity - focused": 1.2,
  "equity - value": 1.1,
  "debt - liquid": 0.3,
  "debt - short duration": 0.5,
  "debt - medium duration": 0.6,
  "debt - corporate bond": 0.5,
  "debt - gilt": 0.5,
  "debt - dynamic bond": 0.6,
  "hybrid - aggressive": 1.0,
  "hybrid - balanced": 1.0,
  "hybrid - conservative": 0.9,
  "hybrid - multi asset": 1.0,
  "hybrid - arbitrage": 0.4,
};

export const DEFAULT_EXPENSE_AVERAGE: Record<AssetClass, number> = {
  EQUITY: 1.1,
  DEBT: 0.5,
  HYBRID: 1.0,
  CASH: 0.2,
  OTHER: 1.0,
};

export function getCategoryExpenseAverage(category: string, assetClass: AssetClass): number {
  const key = category.trim().toLowerCase();
  if (CATEGORY_EXPENSE_AVERAGES[key] !== undefined) return CATEGORY_EXPENSE_AVERAGES[key];
  return DEFAULT_EXPENSE_AVERAGE[assetClass];
}

// Thresholds used across analytics modules
export const THRESHOLDS = {
  concentration: {
    topHoldingHigh: 35, // % of portfolio in single fund => high risk
    topHoldingMedium: 25,
    top3High: 65,
    top3Medium: 50,
  },
  overlap: {
    minFundsInCategoryForOverlap: 2,
    significantOverlapPct: 15, // combined % of portfolio to flag as significant overlap
  },
  expense: {
    significantDifferencePct: 0.3, // expenseRatio - categoryAvg >= this => flag
  },
  performance: {
    underperformanceThresholdPct: -1.5, // fundXirr - benchmark <= this => underperforming
    outperformanceThresholdPct: 1.5,
  },
} as const;
