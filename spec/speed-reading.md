# Speed Reading Spec

## RSVP (Rapid Serial Visual Presentation)

Words are shown one at a time in a fixed focal zone. The reader's eye never moves — comprehension comes from the word coming to the eye rather than the eye scanning text. The top third of the screen is entirely dedicated to this focal zone.

## ORP (Optimal Recognition Point)

Research (O'Regan 1992, Rayner et al. 2016) shows the eye naturally fixates ~30% into a word. Sprint Read always places this character at the exact horizontal centre of the screen using a split-text layout:

```
[before]  [ORP letter]  [after]
right-aligned   ↑   left-aligned
             screen centre
```

Implementation: `src/utils/orp.ts`

```
Word length → ORP index
1–2  chars  → 0  (first char)
3–4  chars  → 1
5–6  chars  → 2
7–9  chars  → 3
10–13 chars → 4
14+  chars  → 5
```

`splitWordAtOrp(word)` returns `{ before, orp, after }`. The ORP letter is rendered in red (`--orp-color: #e74c3c`) with a subtle glow.

**Critical:** `.orp-word` must have **no CSS `opacity` or `transition`**. At 900 WPM each word displays for ~67ms. A 55ms fade causes words to vanish before they register. Instant swap is correct.

## Font Size

`font-size: clamp(3.6rem, 10vw, 6rem)` — targets ~58–96px on phone screens. Research suggests 0.5–1° visual angle per character at arm's length; larger glyphs reduce cognitive load at high WPM. Guide lines at ±62px bracket the cap height of this font size.

## WPM Ramp

Speed ramps from `minWpm` to `maxWpm` over a fixed 60-second wall-clock window (not a fixed word count). This ensures the ramp always feels the same regardless of document length.

```ts
rampProgress = clamp(elapsedMs / 60_000, 0, 1)
easedProgress = easeInOut(rampProgress)   // cubic ease-in-out
currentWpm = minWpm + easedProgress * (maxWpm - minWpm)
delayMs = (60_000 / currentWpm) * getWordMultiplier(word)
```

The delay table is computed once at play start (`buildDelayTable`) and reused until speed settings change or playback restarts.

**Default range:** min 200 WPM → max 900 WPM. UI limits: min 100–500, max 200–1200, step 20.

## Punctuation Timing Multipliers

Longer pauses after punctuation aid comprehension without breaking flow (Rayner et al. 2016):

| Pattern | Multiplier | Reason |
|---|---|---|
| Ends with `.` `!` `?` | 2.2× | Sentence boundary |
| Ends with `,` `;` `:` | 1.45× | Clause boundary |
| All digits | 1.8× | Numbers need extra processing time |

Implementation: `getWordMultiplier(word)` in `src/utils/speedRamp.ts`.

## Rolling WPM Display

The WPM shown in the corner is a rolling 10-second average, not the instantaneous delay. This smooths out punctuation pauses that would otherwise cause jarring jumps. Computed in the scheduler callback:

```ts
wpmWindowRef.current.push(now)
// keep only last 10s
const avgWpm = (count - 1) / ((now - oldest) / 60_000)
```

## Chapter Navigation

`handlePrevChapter`: seeks to the last chapter whose `wordIndex < current`.
`handleNextChapter`: seeks to the first chapter whose `wordIndex > current`.

Both restart the ramp from `minWpm` at the new position.

## Screen Wake Lock

`navigator.wakeLock.request('screen')` is acquired when playback starts and released on pause, stop, and unmount. It is re-acquired on `visibilitychange` if the page returns to foreground while still playing (handles Android app-switch). Gracefully no-ops if the API is unavailable (battery saver mode).
