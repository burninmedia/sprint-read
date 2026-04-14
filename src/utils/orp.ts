/**
 * Calculate the Optimal Recognition Point (ORP) index for a word.
 * The ORP is the letter that should be highlighted and centered,
 * allowing the eye to recognize the entire word without moving.
 *
 * Follows the Spritz/RSVP spec exactly:
 *   length 0–1  → 1st letter (index 0)
 *   length 2–5  → 2nd letter (index 1)
 *   length 6–9  → 3rd letter (index 2)
 *   length 10–13 → 4th letter (index 3)
 *   length >13  → 5th letter (index 4)
 */
export function getOrpIndex(word: string): number {
  const len = word.length
  if (len <= 1)  return 0
  if (len <= 5)  return 1
  if (len <= 9)  return 2
  if (len <= 13) return 3
  return 4
}

/**
 * Split a word into three parts for ORP display:
 * - before: characters before ORP letter
 * - orp: the ORP letter itself (highlighted)
 * - after: characters after ORP letter
 */
export function splitWordAtOrp(word: string): { before: string; orp: string; after: string } {
  const idx = getOrpIndex(word)
  return {
    before: word.slice(0, idx),
    orp: word[idx] ?? '',
    after: word.slice(idx + 1),
  }
}
