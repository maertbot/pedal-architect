# BR-02 — Klon Parameter Audibility (Gain/Treble)

## Symptom (lay description)
In Klon Circuit Lab / Learn Mode, gain and especially treble controls appeared to move in UI but produced little to no audible change.

## PRD reference
- `docs/PRD-wdf-learn-mode.md`
  - Phase 3 (Klon WDF): gain and treble must produce meaningful tonal changes
  - Learn mode experiments should be audibly demonstrable.

## Failing test first
- `tests/wdf/processorHarness.test.ts`
  - Added minimal Node test harness capability for `WDFProcessor` (`__test.createGraphFromConfig`).
- `tests/wdf/klonBehavior.test.ts`
  - `BR-02_klon-parameter-audibility`
  - Failed on treble sweep assertion (HF proxy ratio ~0.995 before fix).

## Root cause
Treble shelf implementation was too weak/one-sided:
- it behaved mostly as a slight boost and did not provide strong cut/boost around center
- resulting audible delta across full sweep was too small.

## Fix summary
- Updated Klon treble shelf DSP in `src/audio/wdf/WDFProcessor.js`:
  - center detent behavior (0.5 = neutral)
  - symmetric cut/boost range via dB mapping
- Updated visual frequency-response proxy in `src/audio/wdf/circuits/klonCentaurWDF.ts` to match DSP behavior (`highshelf` gain centered at 0 dB, same dB span).

## Prevention
- Keep `tests/wdf/klonBehavior.test.ts` thresholds as regression guard for gain/treble audibility.
- Keep processor harness test so DSP-level behavior can be tested without browser-only worklet runtime.
