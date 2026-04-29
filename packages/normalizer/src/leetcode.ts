/**
 * LeetCode Normalizer
 */
import { RawProfile } from '@codepulse/adapters';
import { NormalizedMetricsOutput, TopicMastery } from '@codepulse/types';
import { ProfileNormalizer, NORMALIZER_VERSION } from './index';
import { getCanonicalTag } from './tag-map';

export class LeetCodeNormalizer implements ProfileNormalizer {
  normalize(raw: RawProfile): NormalizedMetricsOutput {
    const { profile, contest } = raw.data;
    const submitStats = profile.submitStats?.acSubmissionNum || [];
    
    const topics: TopicMastery = {};
    const tags = profile.tagStats || { advanced: [], intermediate: [], fundamental: [] };
    
    const allTags = [
      ...(tags.advanced || []), 
      ...(tags.intermediate || []), 
      ...(tags.fundamental || [])
    ];

    allTags.forEach((tag: any) => {
      const canonical = getCanonicalTag('LEETCODE', tag.tagSlug);
      // Rough estimation: 20 problems for mastery 1.0
      topics[canonical] = Math.min((topics[canonical] || 0) + (tag.problemsSolved * 0.05), 1.0);
    });

    const solvedEasy = submitStats.find((s: any) => s.difficulty === 'Easy')?.count || 0;
    const solvedMedium = submitStats.find((s: any) => s.difficulty === 'Medium')?.count || 0;
    const solvedHard = submitStats.find((s: any) => s.difficulty === 'Hard')?.count || 0;

    return {
      platform: 'LEETCODE',
      solvedEasy,
      solvedMedium,
      solvedHard,
      contestRating: contest?.rating ? Math.round(contest.rating) : null,
      peakRating: null, // LeetCode GraphQL doesn't easily give peak in this query
      contestsAttended: contest?.attendedContestsCount || 0,
      topicMastery: topics,
      activeDays90: 0, // Documented limitation: LeetCode GraphQL doesn't give calendar in this query
      currentStreak: 0,
      longestStreak: 0,
      lastActiveAt: new Date(),
      badges: [],
      platformPercentile: contest?.topPercentage || null,
      normalizerVersion: NORMALIZER_VERSION
    };
  }
}
