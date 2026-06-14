import type { NormalizedSIP, SIPHealthResult } from "@/types/portfolio.types";

/**
 * Computes SIP health summary: counts by status, total monthly committed
 * amount, and the list of SIPs considered "at risk" (missed payments,
 * paused, or stopped).
 *
 * Pure function, no I/O. Status classification (ACTIVE/PAUSED/MISSED/STOPPED)
 * is expected to already be determined upstream (cas-normalizer) from CAS
 * transaction history — this module only aggregates.
 */
export function calculateSIPHealth(sips: NormalizedSIP[]): SIPHealthResult {
  let activeCount = 0;
  let pausedCount = 0;
  let missedCount = 0;
  let stoppedCount = 0;
  let totalMonthlyAmount = 0;

  const atRiskSIPs: NormalizedSIP[] = [];

  for (const sip of sips) {
    switch (sip.status) {
      case "ACTIVE":
        activeCount += 1;
        totalMonthlyAmount += sip.amount;
        break;
      case "PAUSED":
        pausedCount += 1;
        break;
      case "MISSED":
        missedCount += 1;
        totalMonthlyAmount += sip.amount; // still counted as committed
        break;
      case "STOPPED":
        stoppedCount += 1;
        break;
    }

    if (sip.status === "MISSED" || sip.status === "PAUSED" || sip.status === "STOPPED" || sip.missedCount >= 1) {
      atRiskSIPs.push(sip);
    }
  }

  return {
    activeCount,
    pausedCount,
    missedCount,
    stoppedCount,
    totalMonthlyAmount: round2(totalMonthlyAmount),
    atRiskSIPs,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
