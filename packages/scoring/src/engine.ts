/**
 * CodePulse Scoring Engine — Phase 1 MVP
 *
 * Computes a 0–100 score from normalized metrics across all platforms.
 *
 * Components (all 0..1 before weighting):
 *   dsa         — weighted problem count, sigmoid-scaled, cap 2000 pts
 *   contest     — best normalized contest rating (CF or LC)
 *   consistency — average active days in last 90 days across platforms
 *   breadth     — unique canonical topics touched / 40
 *   build       — GitHub-specific: repos + stars, log-scaled
 *   recency     — exponential decay from last active date
 *
 * Weights: dsa=0.35, contest=0.25, consistency=0.15, breadth=0.10, build=0.10, recency=0.05
 */
import { NormalizedMetric, CodePulseScore, ScoreComponents } from '@codepulse/types';
import { ScoreEngine } from './index';
import { SCORING_VERSION } from './version';

/** Sigmoid-like function that maps [0, cap] → [0, 1] */
function sigmoidScale(value: number, cap: number): number {
  if (cap <= 0) return 0;
  // Logistic-inspired: 1 / (1 + exp(-k*(x - x0))) shifted so 0→0 and cap→~1
  // Simpler: tanh-based. tanh(2 * value / cap) gives 0→0, cap→0.96, 2*cap→~0.999
  return Math.min(1, Math.tanh((2 * value) / cap));
}

/** Clamp a number to [min, max] */
function clamp(val: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, val));
}

export class DefaultScoreEngine implements ScoreEngine {
  compute(metrics: NormalizedMetric[], verificationMult = 1): CodePulseScore {
    const now = new Date();

    if (metrics.length === 0) {
      return this.zeroScore(verificationMult, now);
    }

    // ── 1. DSA Component ──────────────────────────────────────
    // Weighted solve count: easy×1 + medium×3 + hard×7
    // Cap at 2000 weighted points → 1.0
    const totalWeighted = metrics.reduce((acc, m) => {
      return acc + m.solvedEasy + m.solvedMedium * 3 + m.solvedHard * 7;
    }, 0);
    const dsa = sigmoidScale(totalWeighted, 2000);

    // ── 2. Contest Component ──────────────────────────────────
    // Max normalized rating across CF and LC (platforms with ratings)
    let contest = 0;
    for (const m of metrics) {
      if (!m.contestRating) continue;
      let normalized = 0;
      if (m.platform === 'CODEFORCES') {
        // CF rating: 800 (newbie) → 3200+ (legendary grandmaster). Normalize [800,3200] → [0,1]
        normalized = clamp((m.contestRating - 800) / 2400);
      } else if (m.platform === 'LEETCODE') {
        // LC rating: 1200 (start) → 3200+ (top). Normalize [1200,3200] → [0,1]
        normalized = clamp((m.contestRating - 1200) / 2000);
      }
      if (normalized > contest) contest = normalized;
    }

    // ── 3. Consistency Component ──────────────────────────────
    // Average (activeDays90 / 90) across platforms that have been fetched
    const activePlatforms = metrics.filter((m) => m.activeDays90 > 0);
    const consistency =
      activePlatforms.length > 0
        ? clamp(
            activePlatforms.reduce((acc, m) => acc + m.activeDays90 / 90, 0) /
              metrics.length,
          )
        : 0;

    // ── 4. Breadth Component ──────────────────────────────────
    // Unique canonical tags touched / 40
    const uniqueTags = new Set<string>();
    for (const m of metrics) {
      for (const tag of Object.keys(m.topicMastery as Record<string, number>)) {
        // Skip internal keys that start with _ (used by GitHub normalizer)
        if (!tag.startsWith('_')) uniqueTags.add(tag);
      }
    }
    const breadth = clamp(uniqueTags.size / 40);

    // ── 5. Build Component ────────────────────────────────────
    // GitHub-specific. If no GitHub metric → 0.
    let build = 0;
    const ghMetric = metrics.find((m) => m.platform === 'GITHUB');
    if (ghMetric) {
      const tm = ghMetric.topicMastery as Record<string, number>;
      const totalRepos = tm['_totalRepos'] ?? 0;
      const totalStars = tm['_totalStars'] ?? 0;
      // log-scale: log(1 + repos + stars*2) / log(200) → ~1.0 at 200 repos+stars
      build = clamp(
        Math.log(1 + totalRepos + totalStars * 2) / Math.log(200),
      );
    }

    // ── 6. Recency Component ──────────────────────────────────
    // exp(-daysSinceLastActive / 30) — decays from 1.0 to ~0.05 over 90 days
    let recency = 0;
    const lastDates = metrics
      .map((m) => m.lastActiveAt)
      .filter(Boolean) as Date[];
    if (lastDates.length > 0) {
      const mostRecent = new Date(
        Math.max(...lastDates.map((d) => d.getTime())),
      );
      const daysSince =
        (now.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24);
      recency = clamp(Math.exp(-daysSince / 30));
    }

    const components: ScoreComponents = {
      dsa,
      contest,
      consistency,
      breadth,
      build,
      recency,
    };

    // ── Weighted sum ──────────────────────────────────────────
    const raw =
      dsa * 0.35 +
      contest * 0.25 +
      consistency * 0.15 +
      breadth * 0.10 +
      build * 0.10 +
      recency * 0.05;

    // Apply verificationMult (floor 0.5) and scale to 100
    const mult = Math.max(0.5, Math.min(1, verificationMult));
    const total = Math.round(clamp(raw * mult, 0, 1) * 10000) / 100; // 2 decimals

    return {
      total,
      components,
      verificationMult: mult,
      recencyDecay: recency,
      scoringVersion: SCORING_VERSION,
      computedAt: now,
    };
  }

  private zeroScore(verificationMult: number, computedAt: Date): CodePulseScore {
    return {
      total: 0,
      components: {
        dsa: 0,
        contest: 0,
        consistency: 0,
        breadth: 0,
        build: 0,
        recency: 0,
      },
      verificationMult: Math.max(0.5, Math.min(1, verificationMult)),
      recencyDecay: 0,
      scoringVersion: SCORING_VERSION,
      computedAt,
    };
  }
}
