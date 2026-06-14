import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "@/lib/queue/connection";
import { FUND_MASTER_SYNC_QUEUE } from "@/lib/queue/fund-master-queue";
import { syncFundMaster } from "@/lib/fund-master/sync";

/**
 * Worker for the daily AMFI Fund Master sync job. Downloads NAVAll.txt,
 * upserts FundMaster rows (category + ISIN/AMFI-code matching keys for
 * enrichment — see lib/portfolio/enrich-fund-data.ts).
 *
 * Failure here is non-critical to the main app: enrichment falls back to
 * CAS-provided category and category-average expense ratios (see
 * lib/analytics/constants.ts) if FundMaster has no match.
 */
export function createFundMasterSyncWorker(): Worker {
  return new Worker(
    FUND_MASTER_SYNC_QUEUE,
    async (job: Job) => {
      console.log(JSON.stringify({ event: "fund_master_sync_start", jobId: job.id }));
      const result = await syncFundMaster();
      console.log(JSON.stringify({ event: "fund_master_sync_complete", ...result }));
      return result;
    },
    { connection: getRedisConnection() }
  );
}

if (require.main === module) {
  const worker = createFundMasterSyncWorker();
  worker.on("failed", (job, err) => {
    console.error(JSON.stringify({ event: "fund_master_sync_failed", jobId: job?.id, error: String(err) }));
  });
  console.log(JSON.stringify({ event: "fund_master_sync_worker_started" }));
}
