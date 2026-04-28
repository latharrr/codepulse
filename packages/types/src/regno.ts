/**
 * Registration Number Parser
 *
 * Parses university registration numbers according to institution-specific
 * configuration stored in `institutions.regnoConfig`.
 *
 * For LPU (Phase 1):
 *   Format: 8 digits, e.g. "12420010"
 *   Year logic: chars at index 2-3 → "24" → batch year 2024
 *   Current year derivation: based on current calendar year vs batch year
 *
 * Phase 2: This will be driven entirely by the DB regnoConfig JSON,
 * supporting multiple institutions with different formats.
 */

import { z } from 'zod';

// ── Config schema (mirrors DB institution.regnoConfig) ────────

export const RegnoConfigSchema = z.object({
  /** Regex pattern string the regno must match */
  pattern: z.string(),
  /** 0-based index where the year substring starts */
  yearOffset: z.number().int().min(0),
  /** Number of chars in the year substring */
  yearLength: z.number().int().min(2).max(4),
  /** Institution-specific year logic identifier */
  yearLogic: z.enum(['lpu', 'generic']),
  /** The century base to add (e.g. 2000 → "24" becomes 2024) */
  yearBase: z.number().int(),
});

export type RegnoConfig = z.infer<typeof RegnoConfigSchema>;

// ── LPU default config ────────────────────────────────────────

export const LPU_REGNO_CONFIG: RegnoConfig = {
  // LPU format: 12420010
  // Index:       01234567
  // Year chars:   ^^  → index 1-2 = '24' → batch year 2024
  pattern: '^\\d{8}$',
  yearOffset: 1,
  yearLength: 2,
  yearLogic: 'lpu',
  yearBase: 2000,
};

// ── Result types ──────────────────────────────────────────────

export interface RegnoParseSuccess {
  ok: true;
  regno: string;
  batchYear: number;
  /** Derived current academic year (1–4) based on current calendar year */
  currentYear: number;
}

export interface RegnoParseFailure {
  ok: false;
  error: string;
}

export type RegnoParseResult = RegnoParseSuccess | RegnoParseFailure;

// ── Parser ────────────────────────────────────────────────────

/**
 * Parses a registration number using the given institution config.
 *
 * @param regno - The raw registration number string (will be trimmed)
 * @param config - Institution-specific parsing config
 * @param referenceYear - Calendar year to use for currentYear derivation (defaults to now)
 * @returns A discriminated union parse result
 */
export function parseRegno(
  regno: string,
  config: RegnoConfig,
  referenceYear: number = new Date().getFullYear(),
): RegnoParseResult {
  const trimmed = regno.trim();

  // ── Step 1: Pattern validation ──────────────────────────────
  let pattern: RegExp;
  try {
    pattern = new RegExp(config.pattern);
  } catch {
    return { ok: false, error: 'Invalid pattern configuration' };
  }

  if (!pattern.test(trimmed)) {
    return {
      ok: false,
      error: `Registration number does not match the expected format (pattern: ${config.pattern})`,
    };
  }

  // ── Step 2: Extract year substring ─────────────────────────
  const yearSubstr = trimmed.slice(
    config.yearOffset,
    config.yearOffset + config.yearLength,
  );

  const yearDigits = parseInt(yearSubstr, 10);
  if (isNaN(yearDigits)) {
    return {
      ok: false,
      error: `Could not extract year from registration number at offset ${config.yearOffset}`,
    };
  }

  // ── Step 3: Derive batch year ───────────────────────────────
  const batchYear = config.yearBase + yearDigits;

  // Sanity check: batch year should be within a reasonable range
  if (batchYear < 2000 || batchYear > referenceYear + 2) {
    return {
      ok: false,
      error: `Derived batch year ${batchYear} is outside the valid range`,
    };
  }

  // ── Step 4: Derive current academic year ────────────────────
  // Academic year starts in August; a student enrolled in 2024:
  //   2024-25 → Year 1, 2025-26 → Year 2, etc.
  // If we're before August, subtract 1 from the year delta.
  const now = new Date();
  const effectiveYear =
    now.getMonth() >= 7 ? referenceYear : referenceYear - 1;
  const yearsElapsed = effectiveYear - batchYear;
  const currentYear = Math.max(1, Math.min(5, yearsElapsed + 1));

  return {
    ok: true,
    regno: trimmed,
    batchYear,
    currentYear,
  };
}

/**
 * Quick boolean check — validates regno format only (no year extraction).
 * Useful for client-side form validation before full parsing.
 */
export function isValidRegno(regno: string, config: RegnoConfig): boolean {
  try {
    return new RegExp(config.pattern).test(regno.trim());
  } catch {
    return false;
  }
}
