# BR-04 — Big Muff Audio Output Validation

## Symptom (lay description)
Report indicated Big Muff audio was not working, blocking testing.

## PRD reference
- `docs/PRD-wdf-learn-mode.md` Phase 3: Big Muff WDF must be selectable and playable.

## Failing test first
- `tests/wdf/bigMuffAudio.test.ts`
  - `BR-04_big-muff-audio-output`
  - Validates non-silent, finite output under sustained input.

## Root cause
No automated regression check existed for Big Muff runtime audibility, so breakages could slip through unnoticed.

## Fix summary
- Added deterministic DSP regression test for Big Muff output continuity and audibility.
- This test now enforces finite sample output and minimum RMS threshold.

## Prevention
- Keep Big Muff audibility test in CI.
- Treat circuit-level non-silence checks as required for WDF models.
