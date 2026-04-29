/**
 * BullMQ Worker entry point — CodePulse Phase 1 MVP
 *
 * Starts all queue workers:
 * - verify-handle    (high priority)
 * - fetch:github     (normal)
 * - fetch:codeforces (normal)
 * - fetch:leetcode   (normal)
 * - recompute-score  (low)
 *
 * Each worker is independent — a crash in one does NOT affect others.
 * All workers share a single Redis connection pool.
 */
import { Worker, Queue } from 'bullmq';
import { createLogger, loadEnv } from '@codepulse/config';
import { QUEUE_NAMES } from '@codepulse/types';

import Redis from 'ioredis';

// Validate environment at startup — fail fast
const env = loadEnv();

import { fetchGithubProcessor } from './processors/github';
import { fetchCodeforcesProcessor } from './processors/codeforces';
import { fetchLeetcodeProcessor } from './processors/leetcode';
import { recomputeScoreProcessor } from './processors/scoring';

const logger = createLogger('worker:main');

const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

logger.info({ queues: Object.values(QUEUE_NAMES) }, 'Starting CodePulse workers...');

// ── Queue definitions (for enqueuing from other services) ─────
export const queues = {
  verifyHandle: new Queue(QUEUE_NAMES.VERIFY_HANDLE, { connection: redisConnection }),
  fetchGithub: new Queue(QUEUE_NAMES.FETCH_GITHUB, { connection: redisConnection }),
  fetchCodeforces: new Queue(QUEUE_NAMES.FETCH_CODEFORCES, { connection: redisConnection }),
  fetchLeetcode: new Queue(QUEUE_NAMES.FETCH_LEETCODE, { connection: redisConnection }),
  recomputeScore: new Queue(QUEUE_NAMES.RECOMPUTE_SCORE, { connection: redisConnection }),
};

// ── Workers ────────────────────────────────────────────────────

/**
 * Verify Handle Worker (Step 3)
 * Checks platform bio for verification token.
 */
const verifyHandleWorker = new Worker(
  QUEUE_NAMES.VERIFY_HANDLE,
  async (job) => {
    logger.info({ jobId: job.id, data: job.data }, 'Processing verify-handle job');
    // Placeholder for actual bio-token check in Step 3
    return { success: true }; 
  },
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

/**
 * Fetch GitHub Worker
 */
const fetchGithubWorker = new Worker(
  QUEUE_NAMES.FETCH_GITHUB,
  fetchGithubProcessor,
  {
    connection: redisConnection,
    concurrency: env.WORKER_CONCURRENCY_GITHUB,
  },
);

/**
 * Fetch Codeforces Worker
 */
const fetchCodeforcesWorker = new Worker(
  QUEUE_NAMES.FETCH_CODEFORCES,
  fetchCodeforcesProcessor,
  {
    connection: redisConnection,
    concurrency: env.WORKER_CONCURRENCY_CODEFORCES,
  },
);

/**
 * Fetch LeetCode Worker
 */
const fetchLeetcodeWorker = new Worker(
  QUEUE_NAMES.FETCH_LEETCODE,
  fetchLeetcodeProcessor,
  {
    connection: redisConnection,
    concurrency: env.WORKER_CONCURRENCY_LEETCODE,
  },
);

/**
 * Recompute Score Worker
 */
const recomputeScoreWorker = new Worker(
  QUEUE_NAMES.RECOMPUTE_SCORE,
  recomputeScoreProcessor,
  {
    connection: redisConnection,
    concurrency: 2,
  },
);

// ── Error handlers (graceful degradation) ─────────────────────

const allWorkers = [
  verifyHandleWorker,
  fetchGithubWorker,
  fetchCodeforcesWorker,
  fetchLeetcodeWorker,
  recomputeScoreWorker,
];

for (const worker of allWorkers) {
  worker.on('completed', (job) => {
    logger.info({ queue: worker.name, jobId: job.id }, 'Job completed');
  });

  worker.on('failed', (job, error) => {
    logger.error(
      { queue: worker.name, jobId: job?.id, error: error.message },
      'Job failed',
    );
  });

  worker.on('error', (error) => {
    // Worker-level error (connection issue etc.) — logged but doesn't crash process
    logger.error({ queue: worker.name, error: error.message }, 'Worker error');
  });
}

// ── Graceful shutdown ──────────────────────────────────────────

async function shutdown() {
  logger.info('Shutting down workers...');
  await Promise.all(allWorkers.map((w) => w.close()));
  logger.info('All workers stopped. Goodbye.');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

logger.info(
  {
    workerCount: allWorkers.length,
    queues: allWorkers.map((w) => w.name),
  },
  'All workers started and listening.',
);
