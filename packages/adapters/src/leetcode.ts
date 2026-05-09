/**
 * LeetCode Platform Adapter
 *
 * Fetches user profile, contest rating, and submission stats
 * using the LeetCode GraphQL API (no auth required for public data).
 *
 * verifyBioToken: checks matchedUser.profile.aboutMe for the token.
 */
import {
  PlatformAdapter,
  RawProfile,
  AdapterError,
  AdapterHealthCheck,
} from './types';
import { createLogger } from '@codepulse/config';

const logger = createLogger('adapter:leetcode');

export class LeetCodeAdapter implements PlatformAdapter {
  readonly name = 'leetcode' as const;
  readonly version = '1.0.0';

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
          'User-Agent': 'CodePulse-Intelligence-Platform',
        },
        body: JSON.stringify({ query, variables: { username: handle } }),
      });

      if (!response.ok) {
        throw new AdapterError(
          `LeetCode API HTTP error: ${response.status}`,
          'SERVER_ERROR',
          response.status >= 500,
          response.status,
        );
      }

      const result = await response.json() as { 
        data?: { 
          matchedUser?: Record<string, unknown>;
          userContestRanking?: Record<string, unknown>;
        }; 
        errors?: Array<{ message: string }>;
      };

      if (result.errors) {
        throw new AdapterError(
          `LeetCode GraphQL error: ${result.errors[0]?.message ?? 'Unknown'}`,
          'SERVER_ERROR',
          true,
        );
      }

      if (!result.data?.matchedUser) {
        throw new AdapterError(
          `User ${handle} not found on LeetCode`,
          'NOT_FOUND',
          false,
          404,
        );
      }

      return {
        platform: 'LEETCODE',
        handle,
        data: {
          profile: result.data.matchedUser,
          contest: result.data.userContestRanking,
        },
        fetchedAt: new Date(),
      };
    } catch (error: unknown) {
      if (error instanceof AdapterError) throw error;
      const msg = error instanceof Error ? error.message : String(error);
      logger.error({ error: msg, handle }, 'Failed to fetch LeetCode profile');
      throw new AdapterError(
        `Network error fetching LeetCode profile: ${msg}`,
        'NETWORK_ERROR',
        true,
      );
    }
  }

  /**
   * Checks whether the user's LeetCode "About Me" section contains the token.
   * Returns false (never throws) if the profile cannot be fetched.
   */
  async verifyBioToken(handle: string, token: string): Promise<boolean> {
    const query = `
      query($username: String!) {
        matchedUser(username: $username) {
          profile { aboutMe }
        }
      }
    `;
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CodePulse-Intelligence-Platform',
        },
        body: JSON.stringify({ query, variables: { username: handle } }),
      });
      if (!response.ok) return false;
      const result = await response.json() as { data?: { matchedUser?: { profile?: { aboutMe?: string } } } };
      const aboutMe = result?.data?.matchedUser?.profile?.aboutMe ?? '';
      return aboutMe.includes(token);
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<AdapterHealthCheck> {
    const start = Date.now();
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '{ globalData { user { isSignedIn } } }',
        }),
      });
      return {
        ok: response.ok,
        latencyMs: Date.now() - start,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        latencyMs: Date.now() - start,
        error: msg,
      };
    }
  }
}
