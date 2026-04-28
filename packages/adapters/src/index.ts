/**
 * @codepulse/adapters
 *
 * Platform adapter interface and implementations.
 * Each adapter is an isolated module with its own rate limiting and error handling.
 * Full implementations are added in Steps 3 and 4.
 *
 * @see PlatformAdapter — the interface every adapter must implement
 */

// Re-export the adapter interface (implemented in Step 3)
export { PlatformAdapter, RawProfile, AdapterError } from './types';
export { GitHubAdapter } from './github';
export { CodeforcesAdapter } from './codeforces';
export { LeetCodeAdapter } from './leetcode';
