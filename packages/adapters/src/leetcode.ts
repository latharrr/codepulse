/**
 * LeetCode Platform Adapter
 *
 * Fetches user profile, contest rating, and submission stats
 * using the LeetCode GraphQL API.
 */
import { 
  PlatformAdapter, 
  RawProfile, 
  AdapterError, 
  AdapterHealthCheck 
} from './types';
import { Platform } from '@codepulse/types';
import { createLogger } from '@codepulse/config';

const logger = createLogger({ module: 'adapter:leetcode' });

export class LeetCodeAdapter implements PlatformAdapter {
  readonly platform: Platform = 'LEETCODE';
  private readonly baseUrl = 'https://leetcode.com/graphql';

  async fetchProfile(handle: string): Promise<RawProfile> {
    logger.debug({ handle }, 'Fetching LeetCode profile');

    const query = `
      query($username: String!) {
        matchedUser(username: $username) {
          username
          profile {
            realName
            aboutMe
            userAvatar
            reputation
            ranking
          }
          submitStats {
            acSubmissionNum {
              difficulty
              count
              submissions
            }
          }
          languageStats: languageProblemCount {
            languageName
            problemsSolved
          }
          tagStats: tagProblemCounts {
            advanced {
              tagName
              tagSlug
              problemsSolved
            }
            intermediate {
              tagName
              tagSlug
              problemsSolved
            }
            fundamental {
              tagName
              tagSlug
              problemsSolved
            }
          }
        }
        userContestRanking(username: $username) {
          attendedContestsCount
          rating
          globalRanking
          totalParticipants
          topPercentage
        }
      }
    `;

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CodePulse-Intelligence-Platform'
        },
        body: JSON.stringify({ query, variables: { username: handle } })
      });

      const result = await response.json();

      if (result.errors) {
        throw new AdapterError(this.platform, `LeetCode Error: ${result.errors[0].message}`);
      }

      if (!result.data.matchedUser) {
        throw new AdapterError(this.platform, `User ${handle} not found`, false);
      }

      return {
        platform: this.platform,
        handle,
        data: {
          profile: result.data.matchedUser,
          contest: result.data.userContestRanking
        },
        fetchedAt: new Date()
      };
    } catch (error) {
      if (error instanceof AdapterError) throw error;
      logger.error({ error, handle }, 'Failed to fetch LeetCode profile');
      throw new AdapterError(this.platform, 'Network error or internal failure');
    }
  }

  async checkHealth(): Promise<AdapterHealthCheck> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ globalData { user { isSignedIn } } }' })
      });
      return {
        platform: this.platform,
        status: response.ok ? 'healthy' : 'degraded',
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
