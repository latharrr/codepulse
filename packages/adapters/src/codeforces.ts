/**
 * Codeforces Platform Adapter
 *
 * Fetches user profile, rating history, and recent submissions
 * using the Codeforces REST API.
 */
import { 
  PlatformAdapter, 
  RawProfile, 
  AdapterError, 
  AdapterHealthCheck 
} from './types';
import { Platform } from '@codepulse/types';
import { createLogger } from '@codepulse/config';

const logger = createLogger({ module: 'adapter:codeforces' });

export class CodeforcesAdapter implements PlatformAdapter {
  readonly platform: Platform = 'CODEFORCES';
  private readonly baseUrl = 'https://codeforces.com/api';

  async fetchProfile(handle: string): Promise<RawProfile> {
    logger.debug({ handle }, 'Fetching Codeforces profile');

    try {
      // 1. Fetch User Info
      const userInfoResponse = await fetch(`${this.baseUrl}/user.info?handles=${handle}`);
      const userInfoResult = await userInfoResponse.json();

      if (userInfoResult.status !== 'OK') {
        if (userInfoResult.comment?.includes('not found')) {
          throw new AdapterError(this.platform, `User ${handle} not found`, false);
        }
        throw new AdapterError(this.platform, `Codeforces Error: ${userInfoResult.comment}`);
      }

      // 2. Fetch Rating History
      const ratingResponse = await fetch(`${this.baseUrl}/user.rating?handle=${handle}`);
      const ratingResult = await ratingResponse.json();

      // 3. Fetch Recent Submissions (Status)
      const statusResponse = await fetch(`${this.baseUrl}/user.status?handle=${handle}&from=1&count=100`);
      const statusResult = await statusResponse.json();

      return {
        platform: this.platform,
        handle,
        data: {
          info: userInfoResult.result[0],
          ratingHistory: ratingResult.status === 'OK' ? ratingResult.result : [],
          submissions: statusResult.status === 'OK' ? statusResult.result : []
        },
        fetchedAt: new Date()
      };
    } catch (error) {
      if (error instanceof AdapterError) throw error;
      logger.error({ error, handle }, 'Failed to fetch Codeforces profile');
      throw new AdapterError(this.platform, 'Network error or internal failure');
    }
  }

  async checkHealth(): Promise<AdapterHealthCheck> {
    try {
      const response = await fetch(`${this.baseUrl}/user.info?handles=Tourist`);
      const status = response.ok ? 'healthy' : 'degraded';
      return {
        platform: this.platform,
        status,
        latencyMs: 0
      };
    } catch (error) {
      return {
        platform: this.platform,
        status: 'unhealthy',
        latencyMs: 0,
        error: 'Connection failed'
      };
    }
  }
}
