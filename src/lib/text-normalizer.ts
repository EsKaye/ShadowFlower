/**
 * Text normalization layer for moderation scanning
 * Normalizes text consistently before rule matching
 */

/**
 * Normalize text for rule matching
 * - Lowercase
 * - Trim whitespace
 * - Collapse repeated whitespace
 * - Optionally strip punctuation
 */
export function normalizeText(text: string, stripPunctuation: boolean = false): string {
  let normalized = text;

  // Lowercase
  normalized = normalized.toLowerCase();

  // Trim
  normalized = normalized.trim();

  // Collapse repeated whitespace
  normalized = normalized.replace(/\s+/g, ' ');

  // Optionally strip punctuation (preserve basic structure for phrase matching)
  if (stripPunctuation) {
    // Remove punctuation but preserve word boundaries
    normalized = normalized.replace(/[^\w\s]/g, '');
  }

  return normalized;
}

/**
 * Normalize text for exact matching (no punctuation stripping)
 */
export function normalizeForExactMatch(text: string): string {
  return normalizeText(text, false);
}

/**
 * Normalize text for phrase matching (no punctuation stripping)
 */
export function normalizeForPhraseMatch(text: string): string {
  return normalizeText(text, false);
}

/**
 * Normalize text for normalized matching (with punctuation stripping)
 */
export function normalizeForNormalizedMatch(text: string): string {
  return normalizeText(text, true);
}
