import { calculateSIPHealth } from "@/lib/analytics/sip-health";
import type { NormalizedSIP } from "@/types/portfolio.types";

function sip(overrides: Partial<NormalizedSIP>): NormalizedSIP {
  return {
    schemeName: "Fund SIP",
    amount: 5000,
    status: "ACTIVE",
    missedCount: 0,
    ...overrides,
  };
}

describe("calculateSIPHealth", () => {
  it("returns zeros for no SIPs", () => {
    const result = calculateSIPHealth([]);
    expect(result.activeCount).toBe(0);
    expect(result.atRiskSIPs).toHaveLength(0);
    expect(result.totalMonthlyAmount).toBe(0);
  });

  it("counts SIPs by status correctly", () => {
    const sips = [
      sip({ status: "ACTIVE" }),
      sip({ status: "ACTIVE" }),
      sip({ status: "PAUSED" }),
      sip({ status: "MISSED", missedCount: 2 }),
      sip({ status: "STOPPED" }),
    ];
    const result = calculateSIPHealth(sips);

    expect(result.activeCount).toBe(2);
    expect(result.pausedCount).toBe(1);
    expect(result.missedCount).toBe(1);
    expect(result.stoppedCount).toBe(1);
  });

  it("includes paused, missed, and stopped SIPs in atRiskSIPs", () => {
    const sips = [
      sip({ schemeName: "Healthy", status: "ACTIVE" }),
      sip({ schemeName: "Paused", status: "PAUSED" }),
      sip({ schemeName: "Missed", status: "MISSED", missedCount: 1 }),
      sip({ schemeName: "Stopped", status: "STOPPED" }),
    ];
    const result = calculateSIPHealth(sips);

    const atRiskNames = result.atRiskSIPs.map((s) => s.schemeName);
    expect(atRiskNames).toEqual(["Paused", "Missed", "Stopped"]);
  });

  it("flags an active SIP with missedCount >= 1 as at-risk even if status is ACTIVE", () => {
    const sips = [sip({ schemeName: "Flaky", status: "ACTIVE", missedCount: 1 })];
    const result = calculateSIPHealth(sips);

    expect(result.atRiskSIPs).toHaveLength(1);
    expect(result.atRiskSIPs[0].schemeName).toBe("Flaky");
  });

  it("sums monthly amount only for active and missed SIPs (committed amounts)", () => {
    const sips = [
      sip({ amount: 5000, status: "ACTIVE" }),
      sip({ amount: 3000, status: "MISSED" }),
      sip({ amount: 2000, status: "PAUSED" }),
      sip({ amount: 1000, status: "STOPPED" }),
    ];
    const result = calculateSIPHealth(sips);

    expect(result.totalMonthlyAmount).toBe(8000);
  });
});
