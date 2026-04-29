/**
 * Maps platform-specific tags to canonical CodePulse taxonomy tags.
 * Helps normalize topic mastery across different platforms.
 */

export const CODEFORCES_TAG_MAP: Record<string, string> = {
  'dp': 'dynamic-programming',
  'greedy': 'greedy',
  'math': 'math',
  'data structures': 'data-structures',
  'graphs': 'graphs',
  'dfs and similar': 'dfs',
  'brute force': 'brute-force',
  'constructive algorithms': 'constructive',
  'sortings': 'sorting',
  'binary search': 'binary-search',
  'number theory': 'number-theory',
  'strings': 'strings',
  'two pointers': 'two-pointers',
  'bitmasks': 'bit-manipulation',
  'trees': 'trees',
  'combinatorics': 'combinatorics',
  'geometry': 'geometry',
  'probabilities': 'probability',
  'dsu': 'dsu',
  'divide and conquer': 'divide-and-conquer',
  'hashing': 'hashing',
  'shortest paths': 'shortest-paths',
  'matrices': 'matrices',
  'string suffix structures': 'advanced-strings',
  'graph matchings': 'advanced-graphs',
  'flows': 'advanced-graphs',
  'interactive': 'interactive',
  'fft': 'math',
  'games': 'game-theory',
};

export const LEETCODE_TAG_MAP: Record<string, string> = {
  'array': 'arrays',
  'string': 'strings',
  'hash-table': 'hashing',
  'dynamic-programming': 'dynamic-programming',
  'math': 'math',
  'sorting': 'sorting',
  'greedy': 'greedy',
  'depth-first-search': 'dfs',
  'database': 'database',
  'binary-search': 'binary-search',
  'matrix': 'matrices',
  'tree': 'trees',
  'breadth-first-search': 'bfs',
  'bit-manipulation': 'bit-manipulation',
  'two-pointers': 'two-pointers',
  'prefix-sum': 'prefix-sum',
  'heap-priority-queue': 'heaps',
  'binary-tree': 'trees',
  'simulation': 'simulation',
  'stack': 'stacks',
  'graph': 'graphs',
  'design': 'design',
  'counting': 'math',
  'sliding-window': 'sliding-window',
  'backtracking': 'backtracking',
  'union-find': 'dsu',
  'linked-list': 'linked-lists',
  'ordered-set': 'data-structures',
  'number-theory': 'number-theory',
  'monotonic-stack': 'stacks',
  'trie': 'advanced-strings',
  'divide-and-conquer': 'divide-and-conquer',
  'bitmask': 'bit-manipulation',
  'queue': 'queues',
  'recursion': 'recursion',
  'memoization': 'dynamic-programming',
  'binary-search-tree': 'trees',
  'geometry': 'geometry',
  'combinatorics': 'combinatorics',
  'game-theory': 'game-theory',
  'topological-sort': 'graphs',
  'shortest-path': 'shortest-paths',
};

export function getCanonicalTag(platform: 'CODEFORCES' | 'LEETCODE', tag: string): string {
  const normalizedTag = tag.toLowerCase().trim();
  if (platform === 'CODEFORCES') {
    return CODEFORCES_TAG_MAP[normalizedTag] || normalizedTag.replace(/\s+/g, '-');
  }
  return LEETCODE_TAG_MAP[normalizedTag] || normalizedTag.replace(/\s+/g, '-');
}
