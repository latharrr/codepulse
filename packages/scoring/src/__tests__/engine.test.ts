import { describe, it, expect } from 'vitest';
import { DefaultScoreEngine } from '../engine';

describe('DefaultScoreEngine', () => {
  it('returns 0 for empty metrics', () => {
    const engine = new DefaultScoreEngine();
    const result = engine.compute([]);
    expect(result.total).toBe(0);
  });

  it('returns a number between 0 and 100 for valid metrics', () => {
    const engine = new DefaultScoreEngine();
    const result = engine.compute([
      {
        id: 'test-id',
        userId: 'user-id',
        platform: 'LEETCODE',
        solvedEasy: 50,
        solvedMedium: 30,
        solvedHard: 10,
        contestRating: 1600,
        peakRating: 1700,
        contestsAttended: 5,
        topicMastery: { 'dynamic_programming': 0.6, 'graph': 0.4 },
        activeDays90: 45,
        currentStreak: 7,
        longestStreak: 20,
        lastActiveAt: new Date(),
        badges: [],
        platformPercentile: null,
        normalizerVersion: '1.0.0',
        computedAt: new Date(),
      },
    ]);
    expect(result.total).toBeGreaterThan(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });
});
