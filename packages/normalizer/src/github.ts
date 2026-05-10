/**
 * GitHub Normalizer
 */
import { RawProfile } from '@codepulse/adapters';
import { NormalizedMetricsOutput, TopicMastery } from '@codepulse/types';
import { ProfileNormalizer, NORMALIZER_VERSION } from './index';
import { getCanonicalTag } from './tag-map';

export class GitHubNormalizer implements ProfileNormalizer {
  normalize(raw: RawProfile): NormalizedMetricsOutput {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = raw.data as any;
    const repos = data.repositories?.nodes || [];

    // 1. Compute Topic Mastery (Languages + Topics) & Repo Stats
    const topics: TopicMastery = {};
    let totalStars = 0;

    for (const repo of repos) {
      if (repo.stargazerCount) totalStars += repo.stargazerCount;

      // Weight explicit repository topics
      if (repo.repositoryTopics?.nodes) {
        for (const topicNode of repo.repositoryTopics.nodes) {
          const topicName = topicNode.topic?.name?.toLowerCase();
          if (topicName) {
            const canonical = getCanonicalTag('GITHUB', topicName);
            if (canonical !== 'other') {
              topics[canonical] = Math.min((topics[canonical] || 0) + 0.1, 1.0);
            }
          }
        }
      }
    }

    const totalContributions =
      data.contributionsCollection?.contributionCalendar?.totalContributions || 0;

    // Hidden stats stored in topicMastery so the scoring engine can use them
    topics['_totalRepos'] = data.repositories?.totalCount || 0;
    topics['_totalStars'] = totalStars;
    topics['_totalContributions'] = totalContributions;

    // 2. Compute Streaks & Activity
    const weeks = data.contributionsCollection?.contributionCalendar?.weeks || [];
    const allDays: { date: string; count: number }[] = [];

    for (const week of weeks) {
      for (const day of week.contributionDays || []) {
        allDays.push({ date: day.date, count: day.contributionCount });
      }
    }

    // Sort chronologically ascending
    allDays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let activeDays90 = 0;
    let currentStreak = 0;
    let longestStreak = 0;
    let currentStreakCounter = 0;

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    for (const day of allDays) {
      const dayDate = new Date(day.date);

      // Streaks
      if (day.count > 0) {
        currentStreakCounter++;
        longestStreak = Math.max(longestStreak, currentStreakCounter);
      } else {
        currentStreakCounter = 0;
      }

      // Active Days 90
      if (dayDate >= ninetyDaysAgo && day.count > 0) {
        activeDays90++;
      }
    }

    // For current streak, if the last day or today is active, we consider currentStreak = currentStreakCounter
    // Assuming the last day in the array is today or yesterday
    currentStreak = currentStreakCounter;

    // Last active at
    let lastActiveAt: Date | null = null;
    for (let i = allDays.length - 1; i >= 0; i--) {
      const day = allDays[i];
      if (day && day.count > 0) {
        lastActiveAt = new Date(day.date);
        break;
      }
    }

    return {
      platform: 'GITHUB',
      solvedEasy: 0,
      solvedMedium: 0,
      solvedHard: 0,
      contestRating: null,
      peakRating: null,
      contestsAttended: 0,
      topicMastery: topics,
      activeDays90,
      currentStreak,
      longestStreak,
      lastActiveAt,
      badges: [],
      platformPercentile: null,
      normalizerVersion: NORMALIZER_VERSION,
    };
  }
}
