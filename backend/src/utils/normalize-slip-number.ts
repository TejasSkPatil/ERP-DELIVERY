/**
 * normalize-slip-number.ts
 *
 * Dedicated utility for receipt and delivery slip number normalization and comparison.
 *
 * Documented Normalization Rules:
 * 1. Whitespace: Leading and trailing whitespace is trimmed.
 * 2. Prefix #: An optional leading '#' (or multiple leading '#') is removed.
 *    Example: "#REC-1001" -> "REC-1001", "  #98765  " -> "98765".
 * 3. Case Policy: Receipt numbers are treated as case-insensitive alphanumeric identifiers.
 *    All letters are canonicalized to UPPERCASE to guarantee deterministic database indexing
 *    and consistent comparison between user input and OCR scanner output.
 *    Example: "rec-2026-01" -> "REC-2026-01".
 * 4. Character Preservation: Leading zeros and meaningful internal characters (digits, letters,
 *    hyphens, slashes, underscores, internal periods) are STRICTLY preserved.
 *    Example: "004520" remains "004520", "REC-01/B" remains "REC-01/B".
 * 5. Punctuation Cleanup: Trailing punctuation common from OCR text recognition artifacts
 *    (e.g. trailing '.', ',', ':', ';') is trimmed from the end.
 *    Example: "10245." -> "10245".
 * 6. Validation & Rejection:
 *    - Rejects null, undefined, non-string, or empty/whitespace-only input.
 *    - Rejects strings containing only symbols (e.g. "#", "???", "!").
 *    - Must have at least 2 alphanumeric/valid characters and at most 50 characters.
 * 7. Non-Equivalence Policy:
 *    - Distinct internal characters are NEVER assumed equivalent (e.g. "REC-100" != "REC100").
 *    - Two receipt numbers are only equivalent if their normalized canonical forms match exactly.
 */

export const SLIP_NUMBER_REGEX = /^[A-Z0-9][A-Z0-9\-_/.]{0,49}$/;

/**
 * Normalizes a raw receipt or slip number into canonical uppercase format.
 *
 * @param raw Input receipt number from user input or OCR text
 * @returns Canonical uppercase receipt number, or null if invalid/empty
 */
export function normalizeSlipNumber(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') {
    return null;
  }

  let cleaned = raw.trim();
  if (!cleaned) {
    return null;
  }

  // Strip leading '#' symbols (e.g. "#10042" or "##REC-01")
  cleaned = cleaned.replace(/^#+/, '').trim();

  // Strip trailing punctuation common in OCR captures (e.g. "REC-1001.")
  cleaned = cleaned.replace(/[.,;:]+$/, '').trim();

  if (!cleaned) {
    return null;
  }

  // Apply canonical case policy (UPPERCASE)
  cleaned = cleaned.toUpperCase();

  // Validate format and character boundaries
  if (!SLIP_NUMBER_REGEX.test(cleaned)) {
    return null;
  }

  return cleaned;
}

/**
 * Checks if two receipt numbers are equivalent according to canonical normalization rules.
 *
 * @param a First receipt number (e.g. submitted by client)
 * @param b Second receipt number (e.g. extracted by OCR)
 * @returns True if both are valid and produce identical canonical representations
 */
export function areSlipNumbersEqual(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const normA = normalizeSlipNumber(a);
  const normB = normalizeSlipNumber(b);

  if (normA === null || normB === null) {
    return false;
  }

  return normA === normB;
}

// Backward-compatible alias for existing service usage
export const normalizeReceiptNo = normalizeSlipNumber;

export default {
  normalizeSlipNumber,
  normalizeReceiptNo,
  areSlipNumbersEqual,
  SLIP_NUMBER_REGEX,
};
