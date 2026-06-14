import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

let connection: IORedis | undefined;

/**
 * Shared IORedis connection for BullMQ queues and workers.
 * BullMQ requires maxRetriesPerRequest: null on the connection.
 */
export function getRedisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
  }
  return connection;
}
