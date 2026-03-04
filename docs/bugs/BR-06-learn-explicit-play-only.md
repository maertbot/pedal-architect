# BR-06 — Learn Mode Must Not Auto-Start/Carry Audio

## Symptom (lay description)
Learn mode should only play audio after explicit user Play action.

## PRD / behavior reference
- User requirement from bug sprint: Learn audio must never start automatically.

## Failing check first (deterministic repro script)
- `scripts/repro/BR-06-learn-audio-explicit-play.mjs`
- Initially failed because `enterLearnMode` did not force-stop/reset playback state.

## Root cause
Learn mode entry did not explicitly stop running audio or clear play state.

## Fix summary
- `src/App.tsx`
  - `enterLearnMode` now calls `audioEngine.stop()`
  - sets `setAudioPlaying(false)` before activating Learn tab

## Prevention
- Keep explicit-play repro script so Learn entry behavior cannot regress.
