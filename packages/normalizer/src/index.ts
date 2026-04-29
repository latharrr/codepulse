import { RawProfile } from '@codepulse/adapters';
import { NormalizedMetricsOutput } from '@codepulse/types';

export { NORMALIZER_VERSION } from './version';

export interface ProfileNormalizer {
  normalize(raw: RawProfile): NormalizedMetricsOutput;
}

export * from './github';
export * from './codeforces';
export * from './leetcode';
