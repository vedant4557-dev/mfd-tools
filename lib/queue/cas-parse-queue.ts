import { Queue } from "bullmq";
import { getRedisConnection } from "@/lib/queue/connection";

export const CAS_PARSE_QUEUE = "cas-parse";

export interface CASParseJobData {
  casUploadId: string;
}

export function getCASParseQueue(): Queue<CASParseJobData> {
  return new Queue<CASParseJobData>(CAS_PARSE_QUEUE, { connection: getRedisConnection() });
}

/**
 * Enqueues a CAS parse + portfolio analysis job for the given upload.
 * jobId = casUploadId ensures idempotency — re-enqueueing the same upload
 * (e.g. user double-clicks "analyze") replaces rather than duplicates.
 */
export async function enqueueCASParse(casUploadId: string): Promise<string> {
  const queue = getCASParseQueue();
  const job = await queue.add(
    "parse-and-analyze",
    { casUploadId },
    {
      jobId: casUploadId,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
      attempts: 2,
      backoff: { type: "exponential", delay: 5000 },
    }
  );
  return job.id!;
}
