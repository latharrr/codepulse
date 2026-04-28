/**
 * Codeforces Normalizer
 */
import { RawProfile } from '@codepulse/adapters';
import { NormalizedMetricsOutput, TopicMastery } from '@codepulse/types';
import { ProfileNormalizer, NORMALIZER_VERSION } from './index';

export class CodeforcesNormalizer implements ProfileNormalizer {
  normalize(raw: RawProfile): NormalizedMetricsOutput {
    const { info, ratingHistory, submissions } = raw.data;
    const solvedSubmissions = submissions.filter((s: any) => s.verdict === 'OK');
    const topics: TopicMastery = {};
    solvedSubmissions.forEach((s: any) => {
      s.problem.tags.forEach((tag: string) => {
        const normalizedTag = tag.toLowerCase().replace(/ /g, '-');
        topics[normalizedTag] = (topics[normalizedTag] || 0) + 1;
      });
    });

    return {
      platform: 'CODEFORCES',
      solvedEasy: solvedSubmissions.length, // Simplified
      solvedMedium: 0,
      solvedHard: 0,
      contestRating: info.rating || 0,
      peakRating: info.maxRating || 0,
      contestsAttended: ratingHistory.length,
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
