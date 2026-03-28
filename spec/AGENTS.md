# spec/ — Agent Context

Design specifications and non-obvious constraints for Sprint Read. **Read these before making changes** — many decisions look surprising without context.

## Files

| File | Read when you are... |
|---|---|
| `architecture.md` | Changing layout, adding components, modifying state, touching the scheduler |
| `speed-reading.md` | Changing ORP, WPM ramp, punctuation timing, wake lock, or font sizes |
| `performance.md` | Touching TextPreview, the scheduler, or any code that runs per word tick |
| `mobile.md` | Changing Vite config, Capacitor config, adding native plugins, or building for device |

These files are the source of truth. If code behaviour contradicts a spec file, treat the spec as correct and fix the code (unless there is a good reason to update the spec, in which case update both).
