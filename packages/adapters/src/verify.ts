/**
 * Shared verification-token matcher used by every PlatformAdapter.
 *
 * Three properties matter:
 *  1. An empty/whitespace token must NEVER match — Codeforces returns
 *     `firstName: ''` for users with no first name set, and `''.includes('')`
 *     is true, which previously auto-verified every CF handle.
 *  2. Match must be case-insensitive — students copy-paste tokens through
 *     bio editors that sometimes title-case the leading letter.
 *  3. Match must be at least minTokenLength characters to make accidental
 *     substring collisions implausible (our tokens are 19+ chars).
 */
export function bioContainsToken(
  bio: string | null | undefined,
  token: string | null | undefined,
  minTokenLength = 8,
): boolean {
  if (!bio || !token) return false;
  const normalizedToken = token.trim().toLowerCase();
  if (normalizedToken.length < minTokenLength) return false;
  return bio.toLowerCase().includes(normalizedToken);
}
