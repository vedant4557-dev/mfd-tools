import { Queue } from "bullmq";
import IORedis from "ioredis";

function getRedisUrl(): string {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is not configured");
  return url;
}

let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(getRedisUrl(), { maxRetriesPerRequest: null });
  }
  return connection;
}

export const deckQueue = new Queue("deck-generation", {
  connection: { url: getRedisUrl() },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});
