import { RawProfile } from '@codepulse/adapters';
import { NormalizedMetrics } from '@codepulse/types';

export { NORMALIZER_VERSION } from './version';

export interface ProfileNormalizer {
  normalize(raw: RawProfile): NormalizedMetrics;
}

export * from './github';
export * from './codeforces';
export * from './leetcode';
