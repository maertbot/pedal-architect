# BR-03 — Klon Intermittent Click/Dropout Stability Check

## Symptom (lay description)
Reported intermittent clicking / unstable output in Klon Circuit Lab.

## PRD reference
- `docs/PRD-wdf-learn-mode.md` (Phase 3): Klon WDF should be playable and stable.

## Failing/guard test strategy
- Added deterministic regression test:
  - `tests/wdf/klonStability.test.ts`
  - `BR-03_klon-intermittent-clicks`
- Test asserts sustained output windows do not collapse into near-silent dropouts under continuous input.

## Root cause / status
No deterministic dropout was reproducible in the DSP harness after BR-01/BR-02 control-path fixes.
Primary risk was lack of automated stability coverage; clicks could regress unnoticed.

## Fix summary
- Added explicit stability regression coverage for Klon output continuity.
- Combined with BR-01 control-path fix and BR-02 treble/gain audibility changes, Klon path now has stronger test protection.

## Prevention
- Keep `tests/wdf/klonStability.test.ts` in CI to catch reintroduced intermittent behavior.
