/**
 * Web Client Queue definitions
 * Used to enqueue jobs from the web app.
 */
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { QUEUE_NAMES } from '@codepulse/types';

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const queues = {
  verifyHandle: new Queue(QUEUE_NAMES.VERIFY_HANDLE, { connection: redisConnection }),
  fetchGithub: new Queue(QUEUE_NAMES.FETCH_GITHUB, { connection: redisConnection }),
  fetchCodeforces: new Queue(QUEUE_NAMES.FETCH_CODEFORCES, { connection: redisConnection }),
  fetchLeetcode: new Queue(QUEUE_NAMES.FETCH_LEETCODE, { connection: redisConnection }),
  recomputeScore: new Queue(QUEUE_NAMES.RECOMPUTE_SCORE, { connection: redisConnection }),
};
