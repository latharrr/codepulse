/**
 * Codeforces Normalizer
 */
import { RawProfile } from '@codepulse/adapters';
import { NormalizedMetricsOutput, TopicMastery } from '@codepulse/types';
import { ProfileNormalizer, NORMALIZER_VERSION } from './index';
import { getCanonicalTag } from './tag-map';

export class CodeforcesNormalizer implements ProfileNormalizer {
  normalize(raw: RawProfile): NormalizedMetricsOutput {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { info, ratingHistory, submissions } = raw.data as any;

    const nowSecs = Date.now() / 1000;
    const ninetyDaysSecs = 90 * 24 * 60 * 60;

    const activeDays = new Set<string>();
    const activeDays90Set = new Set<string>();

    (submissions as any[]).forEach((s) => {
      const date = new Date(s.creationTimeSeconds * 1000).toISOString().split('T')[0]!;
      activeDays.add(date);

      if (nowSecs - s.creationTimeSeconds <= ninetyDaysSecs) {
        activeDays90Set.add(date);
      }
    });

    const activeDays90 = activeDays90Set.size;
    const sortedDays = Array.from(activeDays).sort();

    let currentStreak = 0;
    let longestStreak = 0;
    let currentStreakCounter = 0;

    for (let i = 0; i < sortedDays.length; i++) {
      if (i === 0) {
        currentStreakCounter = 1;
      } else {
        const diff =
          (new Date(sortedDays[i]!).getTime() - new Date(sortedDays[i - 1]!).getTime()) /
          (1000 * 60 * 60 * 24);
        if (Math.round(diff) === 1) {
          currentStreakCounter++;
        } else {
          currentStreakCounter = 1;
        }
      }
      longestStreak = Math.max(longestStreak, currentStreakCounter);
    }

    if (sortedDays.length > 0) {
      const lastDayStr = sortedDays[sortedDays.length - 1]!;
      const diff =
        (new Date().getTime() - new Date(lastDayStr).getTime()) / (1000 * 60 * 60 * 24);
      if (diff <= 2) {
        currentStreak = currentStreakCounter;
      }
    }

    const lastActiveAt =
      sortedDays.length > 0 ? new Date(sortedDays[sortedDays.length - 1]!) : null;

    const solvedSubmissions = (submissions as any[]).filter((s) => s.verdict === 'OK');
    const uniqueProblems = new Map<string, any>();

    solvedSubmissions.forEach((s) => {
      const prob = s.problem;
      const id = `${prob.contestId}-${prob.index}`;
      if (!uniqueProblems.has(id)) {
        uniqueProblems.set(id, prob);
      }
    });

    let solvedEasy = 0;
    let solvedMedium = 0;
    let solvedHard = 0;
    const topics: TopicMastery = {};

    Array.from(uniqueProblems.values()).forEach((p) => {
      const rating = p.rating;
      if (!rating) {
        solvedEasy++;
      } else if (rating < 1400) {
        solvedEasy++;
      } else if (rating <= 1900) {
        solvedMedium++;
      } else {
        solvedHard++;
      }

      if (p.tags) {
        p.tags.forEach((tag: string) => {
          const canonical = getCanonicalTag('CODEFORCES', tag);
          topics[canonical] = Math.min((topics[canonical] || 0) + 0.05, 1.0);
        });
      }
    });

    return {
      platform: 'CODEFORCES',
      solvedEasy,
      solvedMedium,
      solvedHard,
      // Use ?? so a genuine rating of 0 (impossible on CF, but defensive)
      // is preserved, and a missing/undefined rating becomes null rather
      // than being misrepresented as "rated 0".
      contestRating: info.rating ?? null,
      peakRating: info.maxRating ?? null,
      contestsAttended: ratingHistory.length,
      topicMastery: topics,
      activeDays90,
      currentStreak,
      longestStreak,
      lastActiveAt,
      badges: [],
      platformPercentile: null,
      normalizerVersion: NORMALIZER_VERSION,
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }
}
