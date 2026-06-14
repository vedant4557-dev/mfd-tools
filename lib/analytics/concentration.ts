import type { NormalizedHolding, ConcentrationRiskResult } from "@/types/portfolio.types";
import { THRESHOLDS } from "./constants";

/**
 * Computes concentration risk metrics for a portfolio.
 *
 * Risk score (0-100) is a weighted combination of:
 * - top single holding % (weight 0.6)
 * - top 3 holdings combined % (weight 0.4)
 * normalized against thresholds where 100% concentration => score 100.
 *
 * Pure function, no I/O, no LLM calls.
 */
export function calculateConcentrationRisk(
  holdings: NormalizedHolding[],
  totalValue: number
): ConcentrationRiskResult {
  if (holdings.length === 0 || totalValue <= 0) {
    return {
      topHoldingPct: 0,
      topHoldingName: "",
      top3Pct: 0,
      top3Names: [],
      riskScore: 0,
      riskLevel: "low",
    };
  }

  const sorted = [...holdings].sort((a, b) => b.currentValue - a.currentValue);

  const topHolding = sorted[0];
  const topHoldingPct = (topHolding.currentValue / totalValue) * 100;

  const top3 = sorted.slice(0, 3);
  const top3Value = top3.reduce((sum, h) => sum + h.currentValue, 0);
  const top3Pct = (top3Value / totalValue) * 100;

  // Score: scale topHoldingPct against a 50%-is-maximally-risky baseline,
  // and top3Pct against a 90%-is-maximally-risky baseline.
  const topHoldingScore = Math.min(100, (topHoldingPct / 50) * 100);
  const top3Score = Math.min(100, (top3Pct / 90) * 100);

  const riskScore = Math.round(topHoldingScore * 0.6 + top3Score * 0.4);

  let riskLevel: ConcentrationRiskResult["riskLevel"] = "low";
  if (
    topHoldingPct >= THRESHOLDS.concentration.topHoldingHigh ||
    top3Pct >= THRESHOLDS.concentration.top3High
  ) {
    riskLevel = "high";
  } else if (
    topHoldingPct >= THRESHOLDS.concentration.topHoldingMedium ||
    top3Pct >= THRESHOLDS.concentration.top3Medium
  ) {
    riskLevel = "medium";
  }

  return {
    topHoldingPct: round2(topHoldingPct),
    topHoldingName: topHolding.schemeName,
    top3Pct: round2(top3Pct),
    top3Names: top3.map((h) => h.schemeName),
    riskScore,
    riskLevel,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
