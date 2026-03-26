/**
 * Calculate the Optimal Recognition Point (ORP) index for a word.
 * The ORP is the letter that should be highlighted and centered,
 * allowing the eye to recognize the entire word without moving.
 */
export function getOrpIndex(word: string): number {
  const len = word.length
  if (len <= 2) return 0
  if (len <= 4) return 1
  if (len <= 6) return 2
  if (len <= 9) return 3
  if (len <= 13) return 4
  return 5
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
