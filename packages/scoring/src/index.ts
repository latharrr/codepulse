import { NormalizedMetric, CodePulseScore } from '@codepulse/types';

export { SCORING_VERSION } from './version';

export interface ScoreEngine {
  compute(metrics: NormalizedMetric[], verificationMult?: number): CodePulseScore;
}

export * from './engine';
