import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { getEnv } from '@codepulse/config';
import { QUEUE_NAMES } from '@codepulse/types';

let redisConnection: Redis | null = null;
let workerQueues: {
  verifyHandle: Queue;
  fetchGithub: Queue;
  fetchCodeforces: Queue;
  fetchLeetcode: Queue;
  recomputeScore: Queue;
  recomputeRanks: Queue;
  nightlyRefresh: Queue;
} | null = null;

export function getRedisConnection() {
  if (!redisConnection) {
    const env = getEnv();
    redisConnection = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }

  return redisConnection;
}

export function getQueues() {
  if (!workerQueues) {
    const connection = getRedisConnection();
    const defaultQueueOptions = {
      connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 1000,
      },
    };

    workerQueues = {
      verifyHandle: new Queue(QUEUE_NAMES.VERIFY_HANDLE, defaultQueueOptions),
      fetchGithub: new Queue(QUEUE_NAMES.FETCH_GITHUB, defaultQueueOptions),
      fetchCodeforces: new Queue(QUEUE_NAMES.FETCH_CODEFORCES, defaultQueueOptions),
      fetchLeetcode: new Queue(QUEUE_NAMES.FETCH_LEETCODE, defaultQueueOptions),
      recomputeScore: new Queue(QUEUE_NAMES.RECOMPUTE_SCORE, defaultQueueOptions),
      recomputeRanks: new Queue(QUEUE_NAMES.RECOMPUTE_RANKS, defaultQueueOptions),
      nightlyRefresh: new Queue(QUEUE_NAMES.NIGHTLY_REFRESH, defaultQueueOptions),
    };
  }

  return workerQueues;
}

export async function closeQueues() {
  const queues = workerQueues ? Object.values(workerQueues) : [];
  await Promise.all(queues.map((queue) => queue.close()));
  workerQueues = null;

  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}
