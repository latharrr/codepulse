/**
 * Codeforces Platform Adapter
 *
 * Fetches user profile, rating history, and recent submissions
 * using the Codeforces REST API (no auth required for public data).
 *
 * verifyBioToken: checks user.info[0].firstName for the token.
 * Students must temporarily set their CF firstName to the token, then revert.
 */
import {
  PlatformAdapter,
  RawProfile,
  AdapterError,
  AdapterHealthCheck,
} from './types';
import { createLogger } from '@codepulse/config';

const logger = createLogger('adapter:codeforces');

export class CodeforcesAdapter implements PlatformAdapter {
  readonly name = 'codeforces' as const;
  readonly version = '1.0.0';

  private readonly baseUrl = 'https://codeforces.com/api';

  async fetchProfile(handle: string): Promise<RawProfile> {
    logger.debug({ handle }, 'Fetching Codeforces profile');

    try {
      // 1. Fetch User Info
      const userInfoResponse = await fetch(
        `${this.baseUrl}/user.info?handles=${handle}`,
      );
      const userInfoResult = await userInfoResponse.json() as any;

      if (userInfoResult.status !== 'OK') {
        if (userInfoResult.comment?.includes('not found')) {
          throw new AdapterError(
            `User ${handle} not found on Codeforces`,
            'NOT_FOUND',
            false,
            404,
          );
        }
        throw new AdapterError(
          `Codeforces API error: ${userInfoResult.comment}`,
          'SERVER_ERROR',
          true,
        );
      }

      // 2. Fetch Rating History
      const ratingResponse = await fetch(
        `${this.baseUrl}/user.rating?handle=${handle}`,
      );
      const ratingResult = await ratingResponse.json() as any;

      // 3. Fetch Recent Submissions (up to 10,000)
      const statusResponse = await fetch(
        `${this.baseUrl}/user.status?handle=${handle}&from=1&count=10000`,
      );
      const statusResult = await statusResponse.json() as any;

      return {
        platform: 'CODEFORCES',
        handle,
        data: {
          info: userInfoResult.result[0],
          ratingHistory: ratingResult.status === 'OK' ? ratingResult.result : [],
          submissions: statusResult.status === 'OK' ? statusResult.result : [],
        },
        fetchedAt: new Date(),
      };
    } catch (error: any) {
      if (error instanceof AdapterError) throw error;
      logger.error({ error: error.message, handle }, 'Failed to fetch Codeforces profile');
      throw new AdapterError(
        `Network error fetching Codeforces profile: ${error.message}`,
        'NETWORK_ERROR',
        true,
      );
    }
  }

  /**
   * Checks whether the user's Codeforces firstName contains the verification token.
   *
   * IMPORTANT: Codeforces has no public bio field. Students must:
   *   1. Go to codeforces.com/settings/general
   *   2. Set their "First name" to the verification token (e.g. "cp-abc123-lpu")
   *   3. Click "Verify" in CodePulse within a few minutes
   *   4. Revert their first name after verification succeeds
   *
   * Returns false (never throws) if the user info cannot be fetched.
   */
  async verifyBioToken(handle: string, token: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/user.info?handles=${handle}`,
      );
      if (!response.ok) return false;
      const result = await response.json() as any;
      if (result.status !== 'OK') return false;
      const firstName: string = result.result[0]?.firstName ?? '';
      return firstName.includes(token);
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<AdapterHealthCheck> {
    const start = Date.now();
    try {
      const response = await fetch(
        `${this.baseUrl}/user.info?handles=tourist`,
      );
      return {
        ok: response.ok,
        latencyMs: Date.now() - start,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error: any) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        error: error.message,
      };
    }
  }
}
