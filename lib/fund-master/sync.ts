import { prisma } from "@/lib/prisma";
import { fetchAMFISchemeMaster, normalizeSchemeName, type AMFISchemeRecord } from "./amfi-client";

const BATCH_SIZE = 500;

export interface SyncResult {
  totalRecords: number;
  upserted: number;
  errors: number;
  durationMs: number;
}

/**
 * Syncs the AMFI scheme master into FundMaster. Upserts by amfiCode
 * (AMFI scheme codes are stable identifiers across NAV updates).
 *
 * Existing `expenseRatio` values are preserved on update (AMFI's NAVAll
 * doesn't include TER, so we never overwrite a previously-set value
 * with null — see updateData below).
 *
 * Run daily via workers/fund-master-sync.worker.ts.
 */
export async function syncFundMaster(): Promise<SyncResult> {
  const start = Date.now();
  const records = await fetchAMFISchemeMaster();

  let upserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map((r) => upsertRecord(r)));
    for (const result of results) {
      if (result.status === "fulfilled") upserted += 1;
      else errors += 1;
    }
  }

  return {
    totalRecords: records.length,
    upserted,
    errors,
    durationMs: Date.now() - start,
  };
}

async function upsertRecord(record: AMFISchemeRecord): Promise<void> {
  const searchName = normalizeSchemeName(record.schemeName);

  await prisma.fundMaster.upsert({
    where: { amfiCode: record.amfiCode },
    create: {
      amfiCode: record.amfiCode,
      schemeName: record.schemeName,
      isin1: record.isin1,
      isin2: record.isin2,
      amcName: record.amcName,
      category: record.category,
      assetClass: record.assetClass,
      nav: record.nav,
      navDate: record.navDate ? new Date(record.navDate) : null,
      searchName,
    },
    update: {
      schemeName: record.schemeName,
      isin1: record.isin1,
      isin2: record.isin2,
      amcName: record.amcName,
      category: record.category,
      assetClass: record.assetClass,
      nav: record.nav,
      navDate: record.navDate ? new Date(record.navDate) : null,
      searchName,
      // expenseRatio intentionally omitted — preserved from prior sync/manual entry
    },
  });
}
