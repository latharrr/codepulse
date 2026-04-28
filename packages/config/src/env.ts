/**
 * Environment variable loader and validator.
 *
 * Uses Zod to validate all required environment variables at process startup.
 * Call `loadEnv()` once at the top of your entry point.
 * Import `env` for typed access everywhere else.
 *
 * Principle: fail fast if environment is misconfigured. Never access process.env directly.
 */
import { z } from 'zod';

const envSchema = z.object({
  // ── Node ─────────────────────────────────────────────────────
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // ── Database ─────────────────────────────────────────────────
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL URL'),

  // ── Redis ─────────────────────────────────────────────────────
  REDIS_URL: z.string().url('REDIS_URL must be a valid Redis URL'),

  // ── Auth.js ──────────────────────────────────────────────────
  AUTH_SECRET: z
    .string()
    .min(32, 'AUTH_SECRET must be at least 32 characters'),
  AUTH_GOOGLE_ID: z.string().min(1, 'AUTH_GOOGLE_ID is required'),
  AUTH_GOOGLE_SECRET: z.string().min(1, 'AUTH_GOOGLE_SECRET is required'),
  AUTH_GITHUB_ID: z.string().min(1, 'AUTH_GITHUB_ID is required'),
  AUTH_GITHUB_SECRET: z.string().min(1, 'AUTH_GITHUB_SECRET is required'),

  // ── GitHub Adapter ────────────────────────────────────────────
  GITHUB_PAT_POOL: z
    .string()
    .min(1, 'GITHUB_PAT_POOL must contain at least one PAT')
    .transform((v) => v.split(',').map((t) => t.trim()).filter(Boolean)),

  // ── Encryption ────────────────────────────────────────────────
  ENCRYPTION_KEY: z
    .string()
    .length(64, 'ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)'),

  // ── Application ───────────────────────────────────────────────
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url('NEXT_PUBLIC_APP_URL must be a valid URL')
    .default('http://localhost:3000'),
  DEFAULT_INSTITUTION_SLUG: z.string().default('lpu'),

  // ── Logging ───────────────────────────────────────────────────
  LOG_LEVEL: z
    .enum(['debug', 'info', 'warn', 'error'])
    .default('info'),

  // ── Snapshot Store ────────────────────────────────────────────
  SNAPSHOT_STORE_TYPE: z.enum(['local', 's3']).default('local'),
  SNAPSHOT_STORE_PATH: z.string().default('./snapshots'),

  // ── Worker ────────────────────────────────────────────────────
  WORKER_CONCURRENCY_GITHUB: z
    .string()
    .transform(Number)
    .default('3'),
  WORKER_CONCURRENCY_CODEFORCES: z
    .string()
    .transform(Number)
    .default('1'),
  WORKER_CONCURRENCY_LEETCODE: z
    .string()
    .transform(Number)
    .default('1'),

  // ── Feature Flags ─────────────────────────────────────────────
  FEATURE_DARK_MODE: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  FEATURE_PUBLIC_PROFILES: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

/**
 * Validates and returns the environment configuration.
 * Throws a descriptive error if any required variable is missing or malformed.
 * Call once at startup; subsequent calls return cached value.
 */
export function loadEnv(): Env {
  if (_env) return _env;

  // Simple manual .env loader for the worker process since it doesn't auto-load it
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.resolve(__dirname, '../../../.env');
    if (fs.existsSync(envPath)) {
      const envFile = fs.readFileSync(envPath, 'utf8');
      envFile.split('\n').forEach((line: string) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
          if (process.env[key] === undefined) {
            process.env[key] = value;
          }
        }
      });
    }
  } catch (e) {
    // Ignore if not found or errors reading
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.errors
      .map((e) => `  • ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(
      `❌ CodePulse environment validation failed:\n${formatted}\n\nCheck your .env file against .env.example`,
    );
  }

  _env = result.data;
  return _env;
}

/**
 * Typed accessor for environment variables.
 * Must call `loadEnv()` before first access.
 */
export function getEnv(): Env {
  if (!_env) {
    throw new Error('Environment not loaded. Call loadEnv() at startup first.');
  }
  return _env;
}
