import { prisma } from "@/lib/prisma";
import { normalizeSchemeName } from "@/lib/fund-master/amfi-client";
import type { CASFund } from "@/types/cas.types";
import type { FundMaster } from "@prisma/client";

export interface EnrichedFund extends CASFund {
  matched: boolean;
  matchMethod: "isin" | "amfiCode" | "name" | "none";
}

/**
 * Enriches a list of CAS-parsed funds with category and expense ratio data
 * from FundMaster.
 *
 * Matching priority:
 * 1. amfiCode (exact, if CAS provides it)
 * 2. ISIN (exact match against isin1 or isin2, if CAS provides it)
 * 3. Normalized scheme name (exact match on searchName)
 *
 * If a fund's category is missing/empty from CAS, it's replaced with the
 * FundMaster category. If CAS *does* provide a category, it's kept as-is
 * (CAS categories are often already correct) but expenseRatio is still
 * attached from FundMaster when available.
 *
 * Unmatched funds pass through unchanged (analytics modules already handle
 * missing expenseRatio/category gracefully via category-average fallbacks).
 */
export async function enrichFunds(funds: CASFund[]): Promise<EnrichedFund[]> {
  if (funds.length === 0) return [];

  const amfiCodes = funds.map((f) => f.amfiCode).filter((c): c is string => !!c);
  const isins = funds.flatMap((f) => (f.isin ? [f.isin] : []));
  const searchNames = funds.map((f) => normalizeSchemeName(f.name));

  const [byAmfiCode, byIsin, byName] = await Promise.all([
    amfiCodes.length > 0
      ? prisma.fundMaster.findMany({ where: { amfiCode: { in: amfiCodes } } })
      : Promise.resolve([] as FundMaster[]),
    isins.length > 0
      ? prisma.fundMaster.findMany({
          where: { OR: [{ isin1: { in: isins } }, { isin2: { in: isins } }] },
        })
      : Promise.resolve([] as FundMaster[]),
    searchNames.length > 0
      ? prisma.fundMaster.findMany({ where: { searchName: { in: searchNames } } })
      : Promise.resolve([] as FundMaster[]),
  ]);

  const amfiMap = new Map(byAmfiCode.map((f: FundMaster) => [f.amfiCode, f]));
  const isinMap = new Map<string, FundMaster>();
  for (const f of byIsin) {
    if (f.isin1) isinMap.set(f.isin1, f);
    if (f.isin2) isinMap.set(f.isin2, f);
  }
  const nameMap = new Map(byName.map((f: FundMaster) => [f.searchName, f]));

  return funds.map((fund) => {
    let master: FundMaster | undefined;
    let matchMethod: EnrichedFund["matchMethod"] = "none";

    if (fund.amfiCode && amfiMap.has(fund.amfiCode)) {
      master = amfiMap.get(fund.amfiCode);
      matchMethod = "amfiCode";
    } else if (fund.isin && isinMap.has(fund.isin)) {
      master = isinMap.get(fund.isin);
      matchMethod = "isin";
    } else {
      const searchName = normalizeSchemeName(fund.name);
      if (nameMap.has(searchName)) {
        master = nameMap.get(searchName);
        matchMethod = "name";
      }
    }

    if (!master) {
      return { ...fund, matched: false, matchMethod: "none" };
    }

    return {
      ...fund,
      category: fund.category && fund.category.trim() !== "" ? fund.category : master.category,
      expenseRatio: fund.expenseRatio ?? master.expenseRatio ?? undefined,
      matched: true,
      matchMethod,
    };
  });
}
