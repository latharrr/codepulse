/**
 * Queue helpers used by server actions and route handlers in the web app.
 *
 * Queues are created lazily so Next.js build/static analysis does not open a
 * Redis connection just by importing a page that references a server action.
 */
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { QUEUE_NAMES } from '@codepulse/types';

type WebQueues = {
  verifyHandle: Queue;
  fetchGithub: Queue;
  fetchCodeforces: Queue;
  fetchLeetcode: Queue;
  recomputeScore: Queue;
  recomputeRanks: Queue;
  nightlyRefresh: Queue;
};

let redisConnection: Redis | null = null;
let queueCache: WebQueues | null = null;

function getRedisConnection() {
  if (!redisConnection) {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    redisConnection = new Redis(url, {
      // BullMQ requires maxRetriesPerRequest: null on all connections.
      maxRetriesPerRequest: null,
      // Fail immediately when the connection is not ready rather than
      // silently queuing commands forever — makes errors surface quickly.
      enableOfflineQueue: false,
      // Give up connecting after 5 s so server actions don't hang.
      connectTimeout: 5000,
    });

    // Prevent unhandled 'error' events from crashing the process.
    // Errors are already surfaced when individual commands reject.
    redisConnection.on('error', (err: Error) => {
      console.error('[queues] Redis connection error:', err.message);
    });
  }

  return redisConnection;
}

export function getQueues(): WebQueues {
  if (!queueCache) {
    const defaultQueueOptions = {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 1000,
      },
    };

    queueCache = {
      verifyHandle: new Queue(QUEUE_NAMES.VERIFY_HANDLE, defaultQueueOptions),
      fetchGithub: new Queue(QUEUE_NAMES.FETCH_GITHUB, defaultQueueOptions),
      fetchCodeforces: new Queue(QUEUE_NAMES.FETCH_CODEFORCES, defaultQueueOptions),
      fetchLeetcode: new Queue(QUEUE_NAMES.FETCH_LEETCODE, defaultQueueOptions),
      recomputeScore: new Queue(QUEUE_NAMES.RECOMPUTE_SCORE, defaultQueueOptions),
      recomputeRanks: new Queue(QUEUE_NAMES.RECOMPUTE_RANKS, defaultQueueOptions),
      nightlyRefresh: new Queue(QUEUE_NAMES.NIGHTLY_REFRESH, defaultQueueOptions),
    };
  }

  return queueCache;
}

export const queues = new Proxy({} as WebQueues, {
  get(_target, property: string | symbol) {
    if (typeof property !== 'string') return undefined;
    return getQueues()[property as keyof WebQueues];
  },
});
