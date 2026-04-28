/**
 * GitHub Normalizer
 */
import { RawProfile } from '@codepulse/adapters';
import { NormalizedMetricsOutput, TopicMastery } from '@codepulse/types';
import { ProfileNormalizer, NORMALIZER_VERSION } from './index';

export class GitHubNormalizer implements ProfileNormalizer {
  normalize(raw: RawProfile): NormalizedMetricsOutput {
    const data = raw.data;
    const repos = data.repositories.nodes || [];
    
    const topics: TopicMastery = {};
    repos.forEach((repo: any) => {
      if (repo.primaryLanguage) {
        const lang = repo.primaryLanguage.name.toLowerCase();
        topics[lang] = (topics[lang] || 0) + 0.1; // Placeholder weighting
      }
    });

    const totalContributions = data.contributionsCollection?.contributionCalendar?.totalContributions || 0;
    
    return {
      platform: 'GITHUB',
      solvedEasy: 0,
      solvedMedium: 0,
      solvedHard: 0,
      contestRating: null,
      peakRating: null,
      contestsAttended: 0,
      topicMastery: topics,
      activeDays90: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveAt: new Date(),
      badges: [],
      platformPercentile: null,
      normalizerVersion: NORMALIZER_VERSION
    };
  }
}
