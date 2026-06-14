import { extractSIPsFromTransactions } from "@/lib/portfolio/extract-sips";
import type { CASTransaction } from "@/types/cas.types";

const ASOF = new Date("2026-06-13");

function txn(overrides: Partial<CASTransaction>): CASTransaction {
  return {
    schemeName: "Fund A",
    date: "2026-01-01",
    type: "Purchase",
    amount: 5000,
    ...overrides,
  };
}

describe("extractSIPsFromTransactions", () => {
  it("returns empty array for no transactions", () => {
    expect(extractSIPsFromTransactions([])).toEqual([]);
  });

  it("detects an active SIP from explicitly-typed SIP transactions", () => {
    const txns: CASTransaction[] = [
      txn({ date: "2026-04-05", type: "SIP", amount: 5000 }),
      txn({ date: "2026-05-05", type: "SIP", amount: 5000 }),
      txn({ date: "2026-06-05", type: "SIP", amount: 5000 }),
    ];

    const result = extractSIPsFromTransactions(txns, ASOF);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      schemeName: "Fund A",
      amount: 5000,
      status: "ACTIVE",
      missedCount: 0,
      lastDebitDate: "2026-06-05",
    });
  });

  it("detects a recurring monthly purchase pattern as SIP when not explicitly typed", () => {
    const txns: CASTransaction[] = [
      txn({ date: "2026-03-10", type: "Purchase", amount: 10000 }),
      txn({ date: "2026-04-10", type: "Purchase", amount: 10000 }),
      txn({ date: "2026-05-10", type: "Purchase", amount: 10000 }),
      txn({ date: "2026-06-10", type: "Purchase", amount: 10000 }),
    ];

    const result = extractSIPsFromTransactions(txns, ASOF);

    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(10000);
    expect(result[0].status).toBe("ACTIVE");
  });

  it("does not flag a single lump-sum purchase as a SIP", () => {
    const txns: CASTransaction[] = [txn({ date: "2026-01-15", type: "Purchase", amount: 50000 })];

    const result = extractSIPsFromTransactions(txns, ASOF);
    expect(result).toHaveLength(0);
  });

  it("does not flag two purchases as a SIP (needs 3+)", () => {
    const txns: CASTransaction[] = [
      txn({ date: "2026-05-10", type: "Purchase", amount: 10000 }),
      txn({ date: "2026-06-10", type: "Purchase", amount: 10000 }),
    ];

    const result = extractSIPsFromTransactions(txns, ASOF);
    expect(result).toHaveLength(0);
  });

  it("classifies a SIP as MISSED when last debit is 45-75 days old", () => {
    const txns: CASTransaction[] = [
      txn({ date: "2026-02-01", type: "SIP", amount: 5000 }),
      txn({ date: "2026-03-01", type: "SIP", amount: 5000 }),
      txn({ date: "2026-04-01", type: "SIP", amount: 5000 }),
      // last debit ~73 days before ASOF (2026-06-13)
    ];

    const result = extractSIPsFromTransactions(txns, ASOF);

    expect(result[0].status).toBe("MISSED");
    expect(result[0].missedCount).toBeGreaterThanOrEqual(1);
  });

  it("classifies a SIP as STOPPED when last debit is more than 75 days old", () => {
    const txns: CASTransaction[] = [
      txn({ date: "2025-12-01", type: "SIP", amount: 5000 }),
      txn({ date: "2026-01-01", type: "SIP", amount: 5000 }),
      txn({ date: "2026-02-01", type: "SIP", amount: 5000 }),
    ];

    const result = extractSIPsFromTransactions(txns, ASOF);

    expect(result[0].status).toBe("STOPPED");
    expect(result[0].missedCount).toBe(0);
  });

  it("handles multiple schemes independently", () => {
    const txns: CASTransaction[] = [
      txn({ schemeName: "Fund A", date: "2026-04-01", type: "SIP", amount: 5000 }),
      txn({ schemeName: "Fund A", date: "2026-05-01", type: "SIP", amount: 5000 }),
      txn({ schemeName: "Fund A", date: "2026-06-01", type: "SIP", amount: 5000 }),
      txn({ schemeName: "Fund B", date: "2026-04-02", type: "SIP", amount: 2000 }),
      txn({ schemeName: "Fund B", date: "2026-05-02", type: "SIP", amount: 2000 }),
      txn({ schemeName: "Fund B", date: "2026-06-02", type: "SIP", amount: 2000 }),
    ];

    const result = extractSIPsFromTransactions(txns, ASOF);

    expect(result).toHaveLength(2);
    const fundA = result.find((r) => r.schemeName === "Fund A");
    const fundB = result.find((r) => r.schemeName === "Fund B");
    expect(fundA?.amount).toBe(5000);
    expect(fundB?.amount).toBe(2000);
  });

  it("ignores redemptions and switches when detecting SIPs", () => {
    const txns: CASTransaction[] = [
      txn({ date: "2026-04-01", type: "SIP", amount: 5000 }),
      txn({ date: "2026-05-01", type: "SIP", amount: 5000 }),
      txn({ date: "2026-06-01", type: "SIP", amount: 5000 }),
      txn({ date: "2026-06-05", type: "Redemption", amount: 100000 }),
    ];

    const result = extractSIPsFromTransactions(txns, ASOF);

    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(5000);
  });

  it("uses the most common amount when SIP amount has changed (e.g. step-up)", () => {
    const txns: CASTransaction[] = [
      txn({ date: "2026-02-01", type: "SIP", amount: 5000 }),
      txn({ date: "2026-03-01", type: "SIP", amount: 5000 }),
      txn({ date: "2026-04-01", type: "SIP", amount: 5000 }),
      txn({ date: "2026-05-01", type: "SIP", amount: 6000 }),
      txn({ date: "2026-06-01", type: "SIP", amount: 6000 }),
    ];

    const result = extractSIPsFromTransactions(txns, ASOF);
    // 5000 appears 3 times, 6000 appears 2 times -> most common is 5000
    expect(result[0].amount).toBe(5000);
  });
});
