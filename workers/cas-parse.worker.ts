import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "@/lib/queue/connection";
import { CAS_PARSE_QUEUE, type CASParseJobData } from "@/lib/queue/cas-parse-queue";
import { prisma } from "@/lib/prisma";
import { parseCAS } from "@/lib/cas-parser";
import { analyzeAndPersistPortfolio } from "@/lib/portfolio/analyze";
import { decrypt } from "@/lib/crypto";

/**
 * Worker for the CAS parse + Portfolio Intelligence pipeline:
 * 1. Load CASUpload row (storagePath, password)
 * 2. Call Railway CAS parser (lib/cas-parser.ts) -> CASParsedData
 * 3. Persist parsedData/parsedAt on CASUpload
 * 4. Run analyzeAndPersistPortfolio (analytics + insights + score + AI explanation)
 *
 * On failure, persists parseError on CASUpload so the UI can show a
 * meaningful message and offer retry.
 */
export function createCASParseWorker(): Worker<CASParseJobData> {
  return new Worker<CASParseJobData>(
    CAS_PARSE_QUEUE,
    async (job: Job<CASParseJobData>) => {
      const { casUploadId } = job.data;
      console.log(JSON.stringify({ event: "cas_parse_start", casUploadId, jobId: job.id }));

      const casUpload = await prisma.cASUpload.findUnique({ where: { id: casUploadId } });
      if (!casUpload) {
        throw new Error(`CASUpload ${casUploadId} not found`);
      }

      try {
        const password = casUpload.passwordEncrypted
          ? decrypt(casUpload.passwordEncrypted)
          : undefined;

        const parsedData = await parseCAS({
          storagePath: casUpload.storagePath,
          password,
        });

        await prisma.cASUpload.update({
          where: { id: casUploadId },
          data: { parsedData: parsedData as object, parsedAt: new Date(), parseError: null },
        });

        await analyzeAndPersistPortfolio(casUploadId, casUpload.clientId, parsedData);

        console.log(JSON.stringify({ event: "cas_parse_complete", casUploadId, jobId: job.id }));
        return { status: "completed" };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await prisma.cASUpload.update({
          where: { id: casUploadId },
          data: { parseError: message },
        });
        console.error(JSON.stringify({ event: "cas_parse_error", casUploadId, jobId: job.id, error: message }));
        throw err;
      }
    },
    { connection: getRedisConnection(), concurrency: 3 }
  );
}

if (require.main === module) {
  const worker = createCASParseWorker();
  worker.on("failed", (job, err) => {
    console.error(JSON.stringify({ event: "cas_parse_failed", jobId: job?.id, error: String(err) }));
  });
  console.log(JSON.stringify({ event: "cas_parse_worker_started" }));
}
