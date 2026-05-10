import { describe, it, expect } from 'vitest';
import { CANONICAL_TAGS } from '@codepulse/types';
import { getCanonicalTag } from '../tag-map';

describe('Normalizers', () => {
  it('placeholder - normalizers exist', () => {
    expect(true).toBe(true);
  });

  it('maps platform tags into the canonical taxonomy', () => {
    const mappedTags = [
      getCanonicalTag('CODEFORCES', 'dp'),
      getCanonicalTag('CODEFORCES', 'binary search'),
      getCanonicalTag('LEETCODE', 'hash-table'),
      getCanonicalTag('LEETCODE', 'heap-priority-queue'),
      getCanonicalTag('GITHUB', 'dynamic-programming'),
    ];

    for (const tag of mappedTags) {
      expect(CANONICAL_TAGS).toContain(tag);
      expect(tag).not.toContain('-');
    }
  });

  it('does not let unknown platform tags inflate breadth', () => {
    expect(getCanonicalTag('GITHUB', 'typescript')).toBe('other');
    expect(getCanonicalTag('LEETCODE', 'made-up-tag')).toBe('other');
  });
});
