/**
 * CodePulse Scoring Engine
 */
import { 
  NormalizedMetrics, 
  CodePulseScore, 
  ScoreComponents 
} from '@codepulse/types';
import { ScoreEngine } from './index';

export class DefaultScoreEngine implements ScoreEngine {
  compute(metrics: NormalizedMetrics[]): CodePulseScore {
    const components: ScoreComponents = {
      dsa: 0,
      contest: 0,
      consistency: 0,
      breadth: 0
    };

    if (metrics.length === 0) {
      return {
        total: 0,
        level: 1,
        components,
        computedAt: new Date()
      };
    }

    // 1. Compute DSA Score (based on problems solved)
    const totalSolved = metrics.reduce((acc, m) => acc + (m.stats.totalProblems || 0), 0);
    // Sigmoid-like scale: 0 -> 0, 500 -> 0.7, 1000 -> 0.9, 2000 -> 1.0
    components.dsa = Math.min(1, totalSolved / 1000);

    // 2. Compute Contest Score (based on ratings)
    const maxRating = Math.max(...metrics.map(m => m.points.reputation || 0), 0);
    // Scale: 0 -> 0, 1500 (Expert) -> 0.6, 2100 (Master) -> 0.9, 3000 -> 1.0
    components.contest = Math.min(1, maxRating / 2400);

    // 3. Compute Consistency Score (based on GitHub activity & total contributions)
    const totalActivity = metrics.reduce((acc, m) => acc + (m.points.activity || 0), 0);
    components.consistency = Math.min(1, totalActivity / 1000);

    // 4. Compute Breadth Score (based on unique tags/topics)
    const uniqueTopics = new Set<string>();
    metrics.forEach(m => {
      Object.keys(m.topics).forEach(t => uniqueTopics.add(t));
    });
    components.breadth = Math.min(1, uniqueTopics.size / 40);

    // Final Weighted Score
    // Weights: DSA (40%), Contest (30%), Consistency (20%), Breadth (10%)
    const total = (
      components.dsa * 0.4 +
      components.contest * 0.3 +
      components.consistency * 0.2 +
      components.breadth * 0.1
    ) * 1000;

    // Determine Level (1-10)
    const level = Math.min(10, Math.floor(total / 100) + 1);

    return {
      total: Math.round(total),
      level,
      components,
      computedAt: new Date()
    };
  }
}
