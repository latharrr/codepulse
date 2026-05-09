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
import { Worker } from 'bullmq';
import { createLogger, loadEnv } from '@codepulse/config';
import { QUEUE_NAMES } from '@codepulse/types';

// Validate environment at startup — fail fast
const env = loadEnv();

import { fetchGithubProcessor } from './processors/github';
import { fetchCodeforcesProcessor } from './processors/codeforces';
import { fetchLeetcodeProcessor } from './processors/leetcode';
import { recomputeScoreProcessor } from './processors/scoring';
import { recomputeRanksProcessor } from './processors/recomputeRanks';
import { verifyHandleProcessor } from './processors/verifyHandle';
import { nightlyRefreshProcessor } from './processors/nightlyRefresh';
import { closeQueues, getQueues, getRedisConnection } from './queues';

const logger = createLogger('worker:main');

const redisConnection = getRedisConnection();

logger.info({ queues: Object.values(QUEUE_NAMES) }, 'Starting CodePulse workers...');

// ── Queue definitions (for enqueuing from other services) ─────
const queues = getQueues();

// ── Workers ────────────────────────────────────────────────────

/**
 * Verify Handle Worker (Step 3)
 * Checks platform bio for verification token.
 */
const verifyHandleWorker = new Worker(QUEUE_NAMES.VERIFY_HANDLE, verifyHandleProcessor, {
  connection: redisConnection,
  concurrency: 5,
});

/**
 * Fetch GitHub Worker
 */
const fetchGithubWorker = new Worker(QUEUE_NAMES.FETCH_GITHUB, fetchGithubProcessor, {
  connection: redisConnection,
  concurrency: env.WORKER_CONCURRENCY_GITHUB,
});

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

/**
 * Recompute Ranks Worker
 */
const recomputeRanksWorker = new Worker(
  QUEUE_NAMES.RECOMPUTE_RANKS,
  recomputeRanksProcessor,
  {
    connection: redisConnection,
    concurrency: 1, // Global operation, must be single-threaded
  },
);

/**
 * Nightly Refresh Worker
 */
const nightlyRefreshWorker = new Worker(
  QUEUE_NAMES.NIGHTLY_REFRESH,
  nightlyRefreshProcessor,
  {
    connection: redisConnection,
    concurrency: 1,
  },
);

// ── Error handlers (graceful degradation) ─────────────────────

const allWorkers = [
  verifyHandleWorker,
  fetchGithubWorker,
  fetchCodeforcesWorker,
  fetchLeetcodeWorker,
  recomputeScoreWorker,
  recomputeRanksWorker,
  nightlyRefreshWorker,
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

// ── Setup Repeatable Jobs ──────────────────────────────────────

async function setupRepeatableJobs() {
  await queues.nightlyRefresh.add(
    'nightly-trigger',
    {},
    {
      repeat: {
        pattern: '0 0 * * *', // Every midnight
      },
    },
  );
  logger.info('Scheduled nightly refresh repeatable job');
}

setupRepeatableJobs().catch((err) => {
  logger.error({ error: err.message }, 'Failed to setup repeatable jobs');
});

// ── Graceful shutdown ──────────────────────────────────────────

async function shutdown() {
  logger.info('Shutting down workers...');
  await Promise.all(allWorkers.map((w) => w.close()));
  await closeQueues();
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
