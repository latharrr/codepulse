/**
 * Maps platform-specific tags to canonical CodePulse taxonomy tags.
 * Helps normalize topic mastery across different platforms.
 */
import { CANONICAL_TAGS, type CanonicalTag } from '@codepulse/types';

const CANONICAL_TAG_SET = new Set<string>(CANONICAL_TAGS);

export const CODEFORCES_TAG_MAP: Record<string, CanonicalTag> = {
  dp: 'dynamic_programming',
  greedy: 'greedy',
  math: 'math',
  'data structures': 'other',
  graphs: 'graph',
  'dfs and similar': 'depth_first_search',
  'brute force': 'implementation',
  'constructive algorithms': 'implementation',
  sortings: 'sorting',
  'binary search': 'binary_search',
  'number theory': 'number_theory',
  strings: 'string',
  'two pointers': 'two_pointers',
  bitmasks: 'bit_manipulation',
  trees: 'tree',
  combinatorics: 'combinatorics',
  geometry: 'geometry',
  probabilities: 'math',
  dsu: 'union_find',
  'divide and conquer': 'divide_and_conquer',
  hashing: 'hash_table',
  'shortest paths': 'shortest_path',
  matrices: 'matrix',
  'string suffix structures': 'string',
  'graph matchings': 'graph',
  flows: 'graph',
  interactive: 'implementation',
  fft: 'math',
  games: 'other',
};

export const LEETCODE_TAG_MAP: Record<string, CanonicalTag> = {
  array: 'array',
  string: 'string',
  'hash-table': 'hash_table',
  'dynamic-programming': 'dynamic_programming',
  math: 'math',
  sorting: 'sorting',
  greedy: 'greedy',
  'depth-first-search': 'depth_first_search',
  database: 'other',
  'binary-search': 'binary_search',
  matrix: 'matrix',
  tree: 'tree',
  'breadth-first-search': 'breadth_first_search',
  'bit-manipulation': 'bit_manipulation',
  'two-pointers': 'two_pointers',
  'prefix-sum': 'prefix_sum',
  'heap-priority-queue': 'heap',
  'binary-tree': 'binary_tree',
  simulation: 'simulation',
  stack: 'stack',
  graph: 'graph',
  design: 'implementation',
  counting: 'math',
  'sliding-window': 'sliding_window',
  backtracking: 'backtracking',
  'union-find': 'union_find',
  'linked-list': 'linked_list',
  'ordered-set': 'other',
  'number-theory': 'number_theory',
  'monotonic-stack': 'monotonic_stack',
  trie: 'trie',
  'divide-and-conquer': 'divide_and_conquer',
  bitmask: 'bit_manipulation',
  queue: 'queue',
  recursion: 'recursion',
  memoization: 'dynamic_programming',
  'binary-search-tree': 'tree',
  geometry: 'geometry',
  combinatorics: 'combinatorics',
  'game-theory': 'other',
  'topological-sort': 'topological_sort',
  'shortest-path': 'shortest_path',
};

export const GITHUB_TOPIC_MAP: Record<string, CanonicalTag> = {
  algorithm: 'implementation',
  algorithms: 'implementation',
  'data-structures': 'other',
  'dynamic-programming': 'dynamic_programming',
  'competitive-programming': 'implementation',
  graph: 'graph',
  graphs: 'graph',
  tree: 'tree',
  'binary-tree': 'binary_tree',
  trie: 'trie',
  sorting: 'sorting',
  search: 'binary_search',
  'binary-search': 'binary_search',
  string: 'string',
  strings: 'string',
  math: 'math',
  matrix: 'matrix',
};

function fallbackCanonicalTag(tag: string): CanonicalTag {
  const normalizedTag = tag
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');
  return CANONICAL_TAG_SET.has(normalizedTag) ? (normalizedTag as CanonicalTag) : 'other';
}

export function getCanonicalTag(
  platform: 'CODEFORCES' | 'GITHUB' | 'LEETCODE',
  tag: string,
): CanonicalTag {
  const normalizedTag = tag.toLowerCase().trim();
  if (platform === 'CODEFORCES') {
    return CODEFORCES_TAG_MAP[normalizedTag] || fallbackCanonicalTag(normalizedTag);
  }
  if (platform === 'GITHUB') {
    return GITHUB_TOPIC_MAP[normalizedTag] || fallbackCanonicalTag(normalizedTag);
  }
  return LEETCODE_TAG_MAP[normalizedTag] || fallbackCanonicalTag(normalizedTag);
}
