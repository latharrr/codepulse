/**
 * PlatformAdapter interface — every platform adapter must implement this.
 *
 * Principle: graceful degradation. A broken adapter must never crash the system
 * or block other adapters. All errors are caught at the worker level.
 */

/** Raw API response — platform-specific, stored to SnapshotStore before parsing */
export type RawProfile = Record<string, unknown>;

/** Health check result for the /api/admin/health endpoint */
export interface AdapterHealthCheck {
  ok: boolean;
  latencyMs: number;
  error?: string | undefined;
}

/**
 * Platform adapter interface.
 * All methods must be safe to call concurrently and must not share mutable state.
 */
export interface PlatformAdapter {
  /** Platform identifier — matches the Platform enum in @codepulse/types */
  readonly name: 'github' | 'codeforces' | 'leetcode';
  /** Semver string — bumped when scraping logic changes, triggers snapshot replay */
  readonly version: string;

  /**
   * Fetch raw profile data from the platform API.
   * @throws {AdapterError} on rate limit, network, or API error
   */
  fetchProfile(handle: string): Promise<RawProfile>;

  /**
   * Check if the platform bio / profile field contains the verification token.
   * Returns false (not throw) if the bio cannot be fetched.
   * Platform-specific field used:
   *   - GitHub:      user.bio
   *   - Codeforces:  user.info[0].firstName  (student sets temporarily)
   *   - LeetCode:    matchedUser.profile.aboutMe
   */
  verifyBioToken(handle: string, token: string): Promise<boolean>;

  /** Ping the platform API and measure latency */
  healthCheck(): Promise<AdapterHealthCheck>;
}

/**
 * Structured adapter error — all adapter errors must use this type.
 * Workers use the code to decide retry vs. dead-letter behavior.
 */
export class AdapterError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'RATE_LIMITED'
      | 'NOT_FOUND'
      | 'UNAUTHORIZED'
      | 'SERVER_ERROR'
      | 'NETWORK_ERROR'
      | 'PARSE_ERROR',
    public readonly retryable: boolean,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'AdapterError';
  }
}
