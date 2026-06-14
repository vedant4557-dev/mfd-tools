import { Queue } from "bullmq";
import { getRedisConnection } from "@/lib/queue/connection";

export const FUND_MASTER_SYNC_QUEUE = "fund-master-sync";
export const FUND_MASTER_SYNC_JOB_ID = "daily-amfi-sync";

export function getFundMasterSyncQueue(): Queue {
  return new Queue(FUND_MASTER_SYNC_QUEUE, { connection: getRedisConnection() });
}

/**
 * Registers the daily repeatable job (idempotent — BullMQ dedupes by jobId
 * + repeat pattern). Call this once at worker startup.
 *
 * Runs daily at 02:00 IST (20:30 UTC previous day).
 */
export async function scheduleFundMasterSync(): Promise<void> {
  const queue = getFundMasterSyncQueue();
  await queue.add(
    FUND_MASTER_SYNC_JOB_ID,
    {},
    {
      repeat: { pattern: "30 20 * * *", tz: "UTC" }, // 02:00 IST
      jobId: FUND_MASTER_SYNC_JOB_ID,
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 50 },
    }
  );
}
