# BR-07 — Learn Experiment Selection Highlight Drift

## Symptom (lay description)
Learn mode option pills (e.g., gain/treble suggested values) sometimes failed to show active highlight after slider interaction.

## PRD / UX intent
Learn experiments should clearly indicate which value is active.

## Failing test first
- `tests/learn/valueSelection.test.ts`
  - `BR-07_learn-selection-highlighting`
  - failed due exact-equality matching on floats.

## Root cause
Strict floating-point equality (`<1e-6`) was too narrow for UI state comparisons after slider updates.

## Fix summary
- Added `src/components/learn/valueSelection.ts`
  - `isSelectionActive(current, candidate, epsilon=0.005)`
- Updated `src/components/learn/ExperimentPanel.tsx` to use tolerant matching for active button classes.

## Prevention
- Keep dedicated selection tolerance test to guard against float comparison regressions in UI highlighting.
