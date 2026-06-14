import type { CASParsedData, CASSIPEntry } from "@/types/cas.types";
import type { NormalizedPortfolio } from "@/types/portfolio.types";
import { enrichFunds } from "@/lib/portfolio/enrich-fund-data";
import { extractSIPsFromTransactions } from "@/lib/portfolio/extract-sips";
import { buildNormalizedHoldings, buildNormalizedSIPs } from "@/lib/portfolio/normalize-helpers";

export { buildNormalizedHoldings, buildNormalizedSIPs } from "@/lib/portfolio/normalize-helpers";

/**
 * Full normalization pipeline:
 * 1. Enrich CAS funds with FundMaster data (category, expense ratio) — requires DB
 * 2. Derive SIPs from CAS-provided `sips`, or fall back to extraction
 *    from `transactions` if `sips` is absent
 * 3. Map into NormalizedPortfolio via pure helpers (lib/portfolio/normalize-helpers.ts)
 *
 * This is the entry point used by lib/portfolio/analyze.ts.
 */
export async function normalizeCASData(
  data: CASParsedData,
  clientId: string,
  casUploadId: string
): Promise<NormalizedPortfolio> {
  const enriched = await enrichFunds(data.funds ?? []);
  const holdings = buildNormalizedHoldings(enriched);

  let sipSource: CASSIPEntry[];
  if (data.sips && data.sips.length > 0) {
    sipSource = data.sips;
  } else if (data.transactions && data.transactions.length > 0) {
    sipSource = extractSIPsFromTransactions(data.transactions);
  } else {
    sipSource = [];
  }
  const sips = buildNormalizedSIPs(sipSource);

  const totalValue =
    data.totalValue > 0 ? data.totalValue : holdings.reduce((sum, h) => sum + h.currentValue, 0);

  const totalInvested = holdings.reduce((sum, h) => sum + h.investedValue, 0);

  return {
    clientId,
    casUploadId,
    totalValue,
    totalInvested,
    holdings,
    sips,
  };
}
