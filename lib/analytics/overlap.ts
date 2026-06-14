import type {
  NormalizedHolding,
  FundOverlapResult,
  FundOverlapPair,
} from "@/types/portfolio.types";
import { THRESHOLDS } from "./constants";

/**
 * Detects fund overlap by grouping holdings by category. Funds in the same
 * category represent redundant exposure (style/strategy duplication) even
 * though they are technically different schemes.
 *
 * V0 heuristic: category-level overlap (same category = "overlapping").
 * V1 could extend to actual portfolio-holding-level overlap via stock-level
 * data, which requires fund factsheet data not available from CAS alone.
 *
 * Pure function, no I/O.
 */
export function calculateFundOverlap(
  holdings: NormalizedHolding[],
  totalValue: number
): FundOverlapResult {
  if (holdings.length === 0 || totalValue <= 0) {
    return { overlapScore: 0, overlappingPairs: [], categoriesWithMultipleFunds: [] };
  }

  // Group by category
  const byCategory = new Map<string, NormalizedHolding[]>();
  for (const h of holdings) {
    const key = h.category.trim();
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(h);
  }

  const categoriesWithMultipleFunds: FundOverlapResult["categoriesWithMultipleFunds"] = [];
  const overlappingPairs: FundOverlapPair[] = [];

  let totalOverlapValue = 0;

  for (const [category, funds] of Array.from(byCategory.entries())) {
    if (funds.length < THRESHOLDS.overlap.minFundsInCategoryForOverlap) continue;

    const combinedValue = funds.reduce((sum: number, f: NormalizedHolding) => sum + f.currentValue, 0);
    const combinedPct = (combinedValue / totalValue) * 100;

    categoriesWithMultipleFunds.push({
      category,
      fundCount: funds.length,
      combinedPct: round2(combinedPct),
    });

    // Every fund beyond the largest in this category counts as "overlapping value"
    const sorted = [...funds].sort((a, b) => b.currentValue - a.currentValue);
    for (let i = 1; i < sorted.length; i++) {
      totalOverlapValue += sorted[i].currentValue;
    }

    // Generate pairwise overlap entries (largest pair per category for readability)
    if (combinedPct >= THRESHOLDS.overlap.significantOverlapPct) {
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          overlappingPairs.push({
            fundA: sorted[i].schemeName,
            fundB: sorted[j].schemeName,
            category,
            combinedValue: round2(sorted[i].currentValue + sorted[j].currentValue),
            combinedPctOfPortfolio: round2(
              ((sorted[i].currentValue + sorted[j].currentValue) / totalValue) * 100
            ),
          });
        }
      }
    }
  }

  // Overlap score: % of portfolio value sitting in "redundant" (non-primary)
  // holdings within categories that have multiple funds, scaled to 0-100.
  const overlapScore = Math.min(100, Math.round((totalOverlapValue / totalValue) * 100 * 2));

  return {
    overlapScore,
    overlappingPairs,
    categoriesWithMultipleFunds,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
