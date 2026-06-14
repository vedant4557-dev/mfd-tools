import type { CASTransaction, CASSIPEntry } from "@/types/cas.types";

const SIP_TYPE_PATTERN = /sip/i;
const PURCHASE_TYPE_PATTERN = /purchase/i;

// A SIP is considered "missed" if the gap since the last debit exceeds
// this many days beyond the expected monthly cadence (30 days).
const MISSED_THRESHOLD_DAYS = 45;
const STOPPED_THRESHOLD_DAYS = 75;

interface SchemeTxnGroup {
  schemeName: string;
  txns: CASTransaction[];
}

/**
 * Derives SIP records from raw CAS transactions.
 *
 * Detection strategy (in priority order):
 * 1. Transactions explicitly typed "SIP" (most CAMS/KFin statements tag these).
 * 2. Fallback: recurring "Purchase" transactions of the same scheme with
 *    similar amounts (within 5%) on a roughly monthly cadence (3+ occurrences).
 *
 * For each detected SIP series, the most recent transaction date is compared
 * to "today" to classify status:
 *  - gap <= 45 days: ACTIVE
 *  - 45 < gap <= 75 days: MISSED (missedCount = floor(gap/30) - 1)
 *  - gap > 75 days: STOPPED
 *
 * Returns [] if no transactions provided — callers should treat this as
 * "SIP data unavailable" rather than "client has zero SIPs" when
 * `transactions` itself is undefined (see normalize.ts).
 */
export function extractSIPsFromTransactions(
  transactions: CASTransaction[],
  asOf: Date = new Date()
): CASSIPEntry[] {
  if (!transactions || transactions.length === 0) return [];

  const bySchemе = groupBySchemeName(transactions);
  const results: CASSIPEntry[] = [];

  for (const group of bySchemе) {
    const explicitSIPs = group.txns.filter((t) => SIP_TYPE_PATTERN.test(t.type));
    const series = explicitSIPs.length >= 2 ? explicitSIPs : detectRecurringPurchases(group.txns);

    if (series.length === 0) continue;

    const sorted = [...series].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latest = sorted[sorted.length - 1];
    const amount = mostCommonAmount(sorted);

    const gapDays = daysBetween(new Date(latest.date), asOf);

    let status: CASSIPEntry["status"];
    let missedCount = 0;

    if (gapDays <= MISSED_THRESHOLD_DAYS) {
      status = "ACTIVE";
    } else if (gapDays <= STOPPED_THRESHOLD_DAYS) {
      status = "MISSED";
      missedCount = Math.max(1, Math.floor(gapDays / 30) - 1);
    } else {
      status = "STOPPED";
    }

    results.push({
      schemeName: group.schemeName,
      amount,
      status,
      missedCount,
      lastDebitDate: latest.date,
    });
  }

  return results;
}

function groupBySchemeName(transactions: CASTransaction[]): SchemeTxnGroup[] {
  const map = new Map<string, CASTransaction[]>();
  for (const t of transactions) {
    const key = t.schemeName.trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return Array.from(map.entries()).map(([schemeName, txns]) => ({ schemeName, txns }));
}

/**
 * Detects recurring monthly purchases: 3+ "Purchase" transactions with
 * amounts within 5% of each other, spaced ~25-35 days apart.
 */
function detectRecurringPurchases(txns: CASTransaction[]): CASTransaction[] {
  const purchases = txns
    .filter((t) => PURCHASE_TYPE_PATTERN.test(t.type))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (purchases.length < 3) return [];

  // Group consecutive purchases with similar amounts and ~monthly spacing
  const groups: CASTransaction[][] = [];
  let current: CASTransaction[] = [purchases[0]];

  for (let i = 1; i < purchases.length; i++) {
    const prev = current[current.length - 1];
    const curr = purchases[i];
    const gapDays = daysBetween(new Date(prev.date), new Date(curr.date));
    const amountDiffPct = Math.abs(curr.amount - prev.amount) / prev.amount;

    if (gapDays >= 20 && gapDays <= 40 && amountDiffPct <= 0.05) {
      current.push(curr);
    } else {
      groups.push(current);
      current = [curr];
    }
  }
  groups.push(current);

  const largestGroup = groups.sort((a, b) => b.length - a.length)[0];
  return largestGroup.length >= 3 ? largestGroup : [];
}

function mostCommonAmount(txns: CASTransaction[]): number {
  const counts = new Map<number, number>();
  for (const t of txns) {
    const rounded = Math.round(t.amount);
    counts.set(rounded, (counts.get(rounded) ?? 0) + 1);
  }
  let best = txns[txns.length - 1].amount;
  let bestCount = 0;
  for (const [amount, count] of Array.from(counts.entries())) {
    if (count > bestCount) {
      bestCount = count;
      best = amount;
    }
  }
  return best;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}
