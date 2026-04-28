import { NormalizedMetrics, CodePulseScore } from '@codepulse/types';

export { SCORING_VERSION } from './version';

export interface ScoreEngine {
  compute(metrics: NormalizedMetrics[]): CodePulseScore;
}

export * from './engine';
