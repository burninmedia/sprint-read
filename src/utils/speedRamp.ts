/**
 * Ease-in-out cubic easing function.
 * t: progress from 0 to 1
 * Returns eased value from 0 to 1
 */
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Compute a punctuation/length multiplier for a word.
 * Based on empirically-validated multipliers from open-source RSVP research
 * (Rayner et al. 2016; dashreader; quickreader; SpeedReader).
 */
function getWordMultiplier(word: string): number {
  // Sentence-ending punctuation — brain needs time to "wrap up" the sentence
  if (/[.!?]$/.test(word)) return 2.2
  // Paragraph/section break marker (we may inject these during tokenisation)
  if (word === '¶') return 3.0
  // Numbers — brain processes digits more slowly than letters
  if (/^\d/.test(word)) return 1.8
  // Comma / semicolon / colon — clause boundary
  if (/[,;:]$/.test(word)) return 1.45
  // Very long words (10+ clean chars) — extra cognitive load
  const clean = word.replace(/[^a-zA-Z]/g, '')
  if (clean.length >= 10) return 1.35
  return 1.0
}

/**
 * Calculate the delay in milliseconds for a given word position.
 *
 * @param wordIndex  - 0-based index of the current word
 * @param totalWords - total number of words in the text
 * @param minWpm     - starting WPM (slowest)
 * @param maxWpm     - ending WPM (fastest)
 * @param word       - the word itself (used for length/punctuation adjustment)
 * @returns delay in milliseconds
 */
export function getWordDelay(
  wordIndex: number,
  totalWords: number,
  minWpm: number,
  maxWpm: number,
  word: string,
): number {
  // Clamp progress between 0 and 1
  const progress = totalWords <= 1 ? 1 : wordIndex / (totalWords - 1)

  // Apply easing so speed change feels natural
  const easedProgress = easeInOut(progress)

  // Interpolate WPM between min and max
  const currentWpm = minWpm + easedProgress * (maxWpm - minWpm)

  // Base delay: 60000ms per minute / words per minute
  let delay = 60000 / currentWpm

  // Apply punctuation / word-length multiplier
  delay *= getWordMultiplier(word)

  return delay
}

/**
 * Pre-calculate all word delays for the text starting at fromIndex.
 *
 * Speed always begins at minWpm (regardless of fromIndex) and ramps to maxWpm
 * over rampMs of cumulative display time (~60 seconds by default).
 * Words before fromIndex get a 0-length placeholder so array indices stay aligned.
 */
export function buildDelayTable(
  words: string[],
  minWpm: number,
  maxWpm: number,
  fromIndex = 0,
  rampMs = 60_000,
): number[] {
  // Placeholders for words we won't play
  const delays: number[] = new Array(fromIndex).fill(0)

  let elapsedMs = 0

  for (let i = fromIndex; i < words.length; i++) {
    // Ramp progress is time-based so it always takes ~rampMs to reach maxWpm,
    // regardless of which word in the document we started from.
    const rampProgress = Math.min(elapsedMs / rampMs, 1)
    const easedProgress = easeInOut(rampProgress)
    const currentWpm = minWpm + easedProgress * (maxWpm - minWpm)

    const delay = (60_000 / currentWpm) * getWordMultiplier(words[i])
    delays.push(delay)
    elapsedMs += delay
  }

  return delays
}
