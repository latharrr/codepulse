/**
 * Feature flags for CodePulse.
 *
 * In Phase 1 MVP, flags are simple env-driven booleans.
 * Phase 2 will replace this with a LaunchDarkly or Unleash integration
 * behind the same interface — no callsite changes required.
 */

export interface FeatureFlags {
  /** Enable dark mode toggle in the UI */
  darkMode: boolean;
  /** Allow students to have public profiles viewable without login */
  publicProfiles: boolean;
}

/** Returns the current feature flag state. Reads from environment each call. */
export function getFlags(): FeatureFlags {
  return {
    darkMode: process.env.FEATURE_DARK_MODE === 'true',
    publicProfiles: process.env.FEATURE_PUBLIC_PROFILES === 'true',
  };
}
