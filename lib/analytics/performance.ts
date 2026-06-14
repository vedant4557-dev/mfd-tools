import type {
  NormalizedHolding,
  PerformanceResult,
  FundPerformanceEntry,
} from "@/types/portfolio.types";
import { getCategoryBenchmark, THRESHOLDS } from "./constants";

/**
 * Computes performance comparison: portfolio XIRR vs a value-weighted
 * blended category benchmark, and per-fund XIRR vs its category benchmark.
 *
 * portfolioXirr is taken as a value-weighted average of fund-level XIRRs
 * where available (CAS-provided fund.xirr). If no fund has an XIRR, returns
 * null rather than fabricating a number.
 *
 * Pure function, no I/O, no LLM calls.
 */
export function calculatePerformance(
  holdings: NormalizedHolding[],
  totalValue: number
): PerformanceResult {
  if (holdings.length === 0 || totalValue <= 0) {
    return { portfolioXirr: null, blendedBenchmark: 0, portfolioVsBenchmark: null, fundLevel: [] };
  }

  let weightedXirrSum = 0;
  let weightedXirrValue = 0;
  let weightedBenchmarkSum = 0;

  const fundLevel: FundPerformanceEntry[] = [];

  for (const h of holdings) {
    const benchmark = getCategoryBenchmark(h.category, h.assetClass);
    weightedBenchmarkSum += benchmark * h.currentValue;

    let status: FundPerformanceEntry["status"] = "unknown";
    let differencePct: number | null = null;

    if (typeof h.xirr === "number") {
      weightedXirrSum += h.xirr * h.currentValue;
      weightedXirrValue += h.currentValue;

      differencePct = round2(h.xirr - benchmark);
      if (differencePct <= THRESHOLDS.performance.underperformanceThresholdPct) {
        status = "underperforming";
      } else if (differencePct >= THRESHOLDS.performance.outperformanceThresholdPct) {
        status = "outperforming";
      } else {
        status = "in-line";
      }
    }

    fundLevel.push({
      schemeName: h.schemeName,
      category: h.category,
      fundXirr: typeof h.xirr === "number" ? round2(h.xirr) : null,
      categoryBenchmark: round2(benchmark),
      differencePct,
      status,
    });
  }

  const blendedBenchmark = round2(weightedBenchmarkSum / totalValue);
  const portfolioXirr = weightedXirrValue > 0 ? round2(weightedXirrSum / weightedXirrValue) : null;
  const portfolioVsBenchmark =
    portfolioXirr !== null ? round2(portfolioXirr - blendedBenchmark) : null;

  return {
    portfolioXirr,
    blendedBenchmark,
    portfolioVsBenchmark,
    fundLevel,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
