import { createFundMasterSyncWorker } from "@/workers/fund-master-sync.worker";
import { createCASParseWorker } from "@/workers/cas-parse.worker";
import { scheduleFundMasterSync } from "@/lib/queue/fund-master-queue";

/**
 * Worker process entrypoint. Registers all BullMQ workers and schedules
 * recurring jobs. Run via `npm run worker`.
 */
async function main() {
  console.log(JSON.stringify({ event: "worker_start", message: "MFD Tools worker process starting" }));

  await scheduleFundMasterSync();

  const fundMasterWorker = createFundMasterSyncWorker();
  fundMasterWorker.on("failed", (job, err) => {
    console.error(
      JSON.stringify({ event: "fund_master_sync_failed", jobId: job?.id, error: String(err) })
    );
  });

  const casParseWorker = createCASParseWorker();
  casParseWorker.on("failed", (job, err) => {
    console.error(
      JSON.stringify({ event: "cas_parse_failed", jobId: job?.id, error: String(err) })
    );
  });

  console.log(JSON.stringify({ event: "worker_ready", workers: ["fund-master-sync", "cas-parse"] }));
}

main().catch((err) => {
  console.error(JSON.stringify({ event: "worker_fatal_error", error: String(err) }));
  process.exit(1);
});
