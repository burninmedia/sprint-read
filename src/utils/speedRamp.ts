/**
 * Ease-in-out cubic easing function.
 * t: progress from 0 to 1
 * Returns eased value from 0 to 1
 */
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Calculate the delay in milliseconds for a given word position.
 *
 * @param wordIndex  - 0-based index of the current word
 * @param totalWords - total number of words in the text
 * @param minWpm     - starting WPM (slowest)
 * @param maxWpm     - ending WPM (fastest)
 * @param word       - the word itself (used for length adjustment)
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

  // Long words get extra time to be processed
  const cleanWord = word.replace(/[^a-zA-Z]/g, '')
  if (cleanWord.length > 8) {
    delay *= 1.5
  }

  return delay
}

/**
 * Pre-calculate all word delays for the entire text.
 * Returns an array of delays (ms) for each word index.
 */
export function buildDelayTable(
  words: string[],
  minWpm: number,
  maxWpm: number,
): number[] {
  return words.map((word, i) => getWordDelay(i, words.length, minWpm, maxWpm, word))
}
