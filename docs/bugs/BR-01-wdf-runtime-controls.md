# BR-01 — WDF Runtime Controls Not Wired (Circuit Lab + Learn Mode)

## Symptom (lay description)
In Circuit Lab and Learn Mode, component interactions looked active in UI but did not change sound:
- bypass toggles did nothing
- component value multipliers did nothing
- level readouts did not update from worklet

This made key experiments (e.g., Klon clean path bypass, Tube Screamer diode bypass) appear broken.

## PRD reference (intended behavior)
- `docs/PRD-wdf-learn-mode.md`
  - **Phase 2: Interactive Circuit Topology Visualization + Bypass Controls**
  - Component clicks/toggles/sliders must affect audio in real time through AudioWorklet messages.

## Failing test first
- Test file: `tests/wdf/runtimeControls.test.ts`
- Test name: `BR-01_wdf-runtime-controls`
- Assertions:
  1. each WDF circuit runtime exposes `bypassComponent`, `setComponentValueMultiplier`, `getComponentLevels`, `onLevels`
  2. calling bypass/multiplier sends expected `bypass` / `valueMultiplier` messages to the worklet port

This test failed before fix because the runtime wrapper methods were `undefined`.

## Root cause
Contract mismatch at circuit runtime boundary:
- `WDFWorkletNode` implemented control APIs
- but `create()` wrappers in WDF circuit model files returned runtime objects that only exposed `setParameter` (+ filters/destroy)
- `AudioEngine` used optional chaining (`?.`) to call runtime control methods, so missing methods failed silently

## Fix summary
Added explicit passthrough methods on all WDF runtime wrappers:
- `src/audio/wdf/circuits/tubeScreamerWDF.ts`
- `src/audio/wdf/circuits/bigMuffWDF.ts`
- `src/audio/wdf/circuits/klonCentaurWDF.ts`

Added methods:
- `bypassComponent(...)`
- `setComponentValueMultiplier(...)`
- `getComponentLevels()`
- `onLevels(...)`

Now runtime contract matches AudioEngine + UI expectations.

## Prevention
1. Keep `tests/wdf/runtimeControls.test.ts` as invariant contract test for all WDF circuits.
2. Bug intake should require explicit “control path” info:
   - UI action used
   - expected audio effect
   - affected circuit(s)
   - PRD section
3. Avoid silent runtime API drift by maintaining a single runtime contract test that spans all WDF circuits.
