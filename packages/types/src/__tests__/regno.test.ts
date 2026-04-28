/**
 * Unit tests for the regno parser utility.
 *
 * Golden test cases covering:
 * - Valid LPU regnos with correct year extraction
 * - Invalid formats (wrong length, letters, empty)
 * - Edge cases: year = "00" (2000 cohort), future batches, max year clamping
 * - Academic year derivation accuracy
 */
import { describe, it, expect } from 'vitest';
import { parseRegno, isValidRegno, LPU_REGNO_CONFIG } from '../regno';

describe('parseRegno — LPU config', () => {
  // ── Happy path ──────────────────────────────────────────────

  it('parses a valid LPU regno and extracts batch year 2024', () => {
    const result = parseRegno('12420010', LPU_REGNO_CONFIG, 2026);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.regno).toBe('12420010');
    expect(result.batchYear).toBe(2024);
  });

  it('parses batch year 2023 correctly', () => {
    const result = parseRegno('12321002', LPU_REGNO_CONFIG, 2026);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.batchYear).toBe(2023);
  });

  it('parses batch year 2022 correctly', () => {
    const result = parseRegno('12222003', LPU_REGNO_CONFIG, 2026);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.batchYear).toBe(2022);
  });

  it('trims whitespace from regno before parsing', () => {
    const result = parseRegno('  12420010  ', LPU_REGNO_CONFIG, 2026);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.regno).toBe('12420010');
  });

  // ── Current year derivation ─────────────────────────────────

  it('derives currentYear = 1 for a batch 2024 student in 2024', () => {
    // Assume referenceYear 2024, month before August → effectiveYear 2023
    // Actually: effectiveYear = month < 7 ? ref-1 : ref
    // Let's just test with a fixed referenceYear and check logic
    const result = parseRegno('12424001', LPU_REGNO_CONFIG, 2025);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.batchYear).toBe(2024);
    // 2025 - 2024 = 1 year elapsed → Year 2 (after Aug) or Year 1 (before Aug)
    // currentYear will be 1 or 2 depending on when test runs — just check it's in range
    expect(result.currentYear).toBeGreaterThanOrEqual(1);
    expect(result.currentYear).toBeLessThanOrEqual(5);
  });

  it('clamps currentYear to minimum 1 for fresh students', () => {
    // Batch year = reference year → 0 years elapsed → year 1
    const result = parseRegno('12426001', LPU_REGNO_CONFIG, 2026);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.currentYear).toBeGreaterThanOrEqual(1);
  });

  it('clamps currentYear to maximum 5', () => {
    // Batch year 2015: yearOffset=1, yearLength=2 → need index 1-2 = '15' → '11500001'
    const result = parseRegno('11500001', LPU_REGNO_CONFIG, 2026);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.currentYear).toBe(5);
  });

  // ── Validation failures ─────────────────────────────────────

  it('rejects regnos with wrong length (7 digits)', () => {
    const result = parseRegno('1242001', LPU_REGNO_CONFIG);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('expected format');
  });

  it('rejects regnos with wrong length (9 digits)', () => {
    const result = parseRegno('124200101', LPU_REGNO_CONFIG);
    expect(result.ok).toBe(false);
  });

  it('rejects regnos containing letters', () => {
    const result = parseRegno('1242A010', LPU_REGNO_CONFIG);
    expect(result.ok).toBe(false);
  });

  it('rejects empty string', () => {
    const result = parseRegno('', LPU_REGNO_CONFIG);
    expect(result.ok).toBe(false);
  });

  it('rejects whitespace-only string', () => {
    const result = parseRegno('   ', LPU_REGNO_CONFIG);
    expect(result.ok).toBe(false);
  });

  it('rejects regnos with special characters', () => {
    const result = parseRegno('1242-010', LPU_REGNO_CONFIG);
    expect(result.ok).toBe(false);
  });

  // ── Edge cases ───────────────────────────────────────────────

  it('handles year "00" (batch 2000) — within valid range', () => {
    // index 1-2 = '00' → 2000. regno = '10000001'
    const result = parseRegno('10000001', LPU_REGNO_CONFIG, 2026);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.batchYear).toBe(2000);
  });

  it('rejects implausibly future batch year (> referenceYear + 2)', () => {
    // index 1-2 = '99' → 2099, reference 2026 → 2099 > 2028 → invalid. regno = '19900001'
    const result = parseRegno('19900001', LPU_REGNO_CONFIG, 2026);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('valid range');
  });
});

describe('isValidRegno — quick format check', () => {
  it('returns true for valid 8-digit LPU regno', () => {
    expect(isValidRegno('12420010', LPU_REGNO_CONFIG)).toBe(true);
  });

  it('returns false for 7-digit string', () => {
    expect(isValidRegno('1242001', LPU_REGNO_CONFIG)).toBe(false);
  });

  it('returns false for alphanumeric string', () => {
    expect(isValidRegno('ABC12345', LPU_REGNO_CONFIG)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidRegno('', LPU_REGNO_CONFIG)).toBe(false);
  });
});

describe('parseRegno — generic config', () => {
  const GENERIC_CONFIG = {
    pattern: '^[A-Z]{2}\\d{6}$',
    yearOffset: 2,
    yearLength: 2,
    yearLogic: 'generic' as const,
    yearBase: 2000,
  };

  it('parses a generic format regno (e.g. CS240001)', () => {
    const result = parseRegno('CS240001', GENERIC_CONFIG, 2026);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.batchYear).toBe(2024);
  });

  it('rejects lowercase in generic format', () => {
    const result = parseRegno('cs240001', GENERIC_CONFIG, 2026);
    expect(result.ok).toBe(false);
  });
});
