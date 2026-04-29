/**
 * GitHub Platform Adapter
 *
 * Fetches user profile, repository statistics, and activity metrics
 * using the GitHub GraphQL API (v4).
 *
 * verifyBioToken: checks user.bio for the verification token.
 */
import {
  PlatformAdapter,
  RawProfile,
  AdapterError,
  AdapterHealthCheck,
} from './types';
import { createLogger } from '@codepulse/config';

const logger = createLogger('adapter:github');

export class GitHubAdapter implements PlatformAdapter {
  readonly name = 'github' as const;
  readonly version = '1.0.0';

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
    const token = this.tokens[this.currentTokenIndex] as string;
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
          Authorization: `Bearer ${this.nextToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'CodePulse-Intelligence-Platform',
        },
        body: JSON.stringify({ query, variables: { login: handle } }),
      });

      if (!response.ok) {
        const text = await response.text();
        const code =
          response.status === 401 || response.status === 403
            ? 'UNAUTHORIZED'
            : 'SERVER_ERROR';
        logger.error(
          { status: response.status, text, handle },
          'GitHub API returned error status',
        );
        throw new AdapterError(
          `GitHub API error: ${response.status} ${text}`,
          code,
          response.status >= 500,
          response.status,
        );
      }

      const result = await response.json() as any;

      if (result.errors) {
        const isNotFound = result.errors.some(
          (e: any) => e.type === 'NOT_FOUND',
        );
        if (isNotFound) {
          throw new AdapterError(
            `User ${handle} not found`,
            'NOT_FOUND',
            false,
            404,
          );
        }
        throw new AdapterError(
          `GraphQL Error: ${result.errors[0].message}`,
          'SERVER_ERROR',
          true,
        );
      }

      return {
        platform: 'GITHUB',
        handle,
        data: result.data.user,
        fetchedAt: new Date(),
      };
    } catch (error: any) {
      if (error instanceof AdapterError) throw error;
      logger.error(
        { error: error.message, stack: error.stack, handle },
        'Failed to fetch GitHub profile',
      );
      throw new AdapterError(
        `Network error or internal failure: ${error.message}`,
        'NETWORK_ERROR',
        true,
      );
    }
  }

  /**
   * Checks whether the user's GitHub bio contains the verification token.
   * Returns false (never throws) if the bio cannot be fetched.
   */
  async verifyBioToken(handle: string, token: string): Promise<boolean> {
    const query = `
      query($login: String!) {
        user(login: $login) { bio }
      }
    `;
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.nextToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'CodePulse-Intelligence-Platform',
        },
        body: JSON.stringify({ query, variables: { login: handle } }),
      });
      if (!response.ok) return false;
      const result = await response.json() as any;
      const bio: string = result?.data?.user?.bio ?? '';
      return bio.includes(token);
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<AdapterHealthCheck> {
    const start = Date.now();
    try {
      const response = await fetch('https://api.github.com/rate_limit', {
        headers: {
          Authorization: `Bearer ${this.tokens[0]}`,
          'User-Agent': 'CodePulse-Intelligence-Platform',
        },
      });
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
