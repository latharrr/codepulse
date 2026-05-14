/**
 * @codepulse/adapters
 *
 * Platform adapter interface and implementations.
 * Each adapter is an isolated module with its own rate limiting and error handling.
 *
 * @see PlatformAdapter — the interface every adapter must implement
 */

export { PlatformAdapter, RawProfile, AdapterError, AdapterHealthCheck } from './types';
export { GitHubAdapter } from './github';
export { CodeforcesAdapter } from './codeforces';
export { LeetCodeAdapter } from './leetcode';
export { bioContainsToken } from './verify';
export * from './snapshot-store';
