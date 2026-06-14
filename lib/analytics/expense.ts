import type {
  NormalizedHolding,
  ExpenseAnalysisResult,
  HighExpenseFund,
} from "@/types/portfolio.types";
import { getCategoryExpenseAverage, THRESHOLDS } from "./constants";

/**
 * Computes portfolio-weighted expense ratio and flags funds whose expense
 * ratio significantly exceeds their category average.
 *
 * Funds with missing expenseRatio are excluded from the weighted average
 * calculation (and cannot be flagged as high-cost).
 *
 * Pure function, no I/O.
 */
export function calculateExpenseAnalysis(
  holdings: NormalizedHolding[],
  totalValue: number
): ExpenseAnalysisResult {
  if (holdings.length === 0 || totalValue <= 0) {
    return {
      portfolioWeightedExpenseRatio: 0,
      highCostFunds: [],
      totalEstimatedAnnualCost: 0,
    };
  }

  const withExpense = holdings.filter((h) => typeof h.expenseRatio === "number");

  let weightedSum = 0;
  let weightedValue = 0;
  let totalEstimatedAnnualCost = 0;
  const highCostFunds: HighExpenseFund[] = [];

  for (const h of withExpense) {
    const er = h.expenseRatio!;
    weightedSum += er * h.currentValue;
    weightedValue += h.currentValue;

    const annualCost = (h.currentValue * er) / 100;
    totalEstimatedAnnualCost += annualCost;

    const categoryAverage = getCategoryExpenseAverage(h.category, h.assetClass);
    const differencePct = er - categoryAverage;

    if (differencePct >= THRESHOLDS.expense.significantDifferencePct) {
      highCostFunds.push({
        schemeName: h.schemeName,
        category: h.category,
        expenseRatio: round2(er),
        categoryAverage: round2(categoryAverage),
        differencePct: round2(differencePct),
        annualCostEstimate: round2(annualCost),
      });
    }
  }

  const portfolioWeightedExpenseRatio =
    weightedValue > 0 ? round2(weightedSum / weightedValue) : 0;

  // Sort high-cost funds by annual cost impact, descending
  highCostFunds.sort((a, b) => b.annualCostEstimate - a.annualCostEstimate);

  return {
    portfolioWeightedExpenseRatio,
    highCostFunds,
    totalEstimatedAnnualCost: round2(totalEstimatedAnnualCost),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
