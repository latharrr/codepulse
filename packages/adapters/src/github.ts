/**
 * GitHub Platform Adapter
 *
 * Fetches user profile, repository statistics, and activity metrics
 * using the GitHub GraphQL API (v4).
 */
import { 
  PlatformAdapter, 
  RawProfile, 
  AdapterError, 
  AdapterHealthCheck 
} from './types';
import { Platform } from '@codepulse/types';
import { createLogger } from '@codepulse/config';

const logger = createLogger({ module: 'adapter:github' });

export class GitHubAdapter implements PlatformAdapter {
  readonly platform: Platform = 'GITHUB';
  private readonly baseUrl = 'https://api.github.com/graphql';
  private tokens: string[];
  private currentTokenIndex = 0;

  constructor(tokens: string[]) {
    if (tokens.length === 0) {
      throw new Error('GitHubAdapter requires at least one PAT token');
    }
    this.tokens = tokens;
  }

  private get nextToken(): string {
    const token = this.tokens[this.currentTokenIndex];
    this.currentTokenIndex = (this.currentTokenIndex + 1) % this.tokens.length;
    return token;
  }

  async fetchProfile(handle: string): Promise<RawProfile> {
    logger.debug({ handle }, 'Fetching GitHub profile');

    const query = `
      query($login: String!) {
        user(login: $login) {
          login
          name
          avatarUrl
          bio
          company
          location
          websiteUrl
          twitterUsername
          createdAt
          followers { totalCount }
          following { totalCount }
          repositories(first: 100, ownerAffiliations: OWNER, orderBy: {field: UPDATED_AT, direction: DESC}) {
            totalCount
            nodes {
              name
              description
              isPrivate
              stargazerCount
              forkCount
              primaryLanguage { name }
              languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
                edges {
                  size
                  node { name }
                }
              }
              repositoryTopics(first: 10) {
                nodes {
                  topic { name }
                }
              }
              updatedAt
            }
          }
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                }
              }
            }
          }
        }
      }
    `;

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.nextToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'CodePulse-Intelligence-Platform'
        },
        body: JSON.stringify({ query, variables: { login: handle } })
      });

      if (!response.ok) {
        const text = await response.text();
        const code = response.status === 401 || response.status === 403 ? 'UNAUTHORIZED' : 'SERVER_ERROR';
        logger.error({ status: response.status, text, handle }, 'GitHub API returned error status');
        throw new AdapterError(`GitHub API error: ${response.status} ${text}`, code, response.status >= 500, response.status);
      }

      const result = await response.json();

      if (result.errors) {
        const isNotFound = result.errors.some((e: any) => e.type === 'NOT_FOUND');
        if (isNotFound) {
          throw new AdapterError(`User ${handle} not found`, 'NOT_FOUND', false, 404);
        }
        throw new AdapterError(`GraphQL Error: ${result.errors[0].message}`, 'SERVER_ERROR', true);
      }

      return {
        platform: this.platform,
        handle,
        data: result.data.user,
        fetchedAt: new Date()
      };
    } catch (error: any) {
      if (error instanceof AdapterError) throw error;
      logger.error({ error: error.message, stack: error.stack, handle }, 'Failed to fetch GitHub profile');
      throw new AdapterError(`Network error or internal failure: ${error.message}`, 'NETWORK_ERROR', true);
    }
  }

  async checkHealth(): Promise<AdapterHealthCheck> {
    try {
      // Simple rate limit check
      const response = await fetch('https://api.github.com/rate_limit', {
        headers: {
          'Authorization': `Bearer ${this.tokens[0]}`,
          'User-Agent': 'CodePulse-Intelligence-Platform'
        }
      });
      
      const status = response.ok ? 'healthy' : 'degraded';
      return {
        platform: this.platform,
        status,
        latencyMs: 0, // Placeholder
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
