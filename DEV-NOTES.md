# DEV NOTES - Pedal Architect v1

## What Worked
- `BiquadFilterNode.getFrequencyResponse()` was stable and fast enough for real-time analytical curve rendering (512 log-spaced points per frame).
- Extending `CircuitRuntime` with `getFilterNodes()` and `getPhaserConfig()` created a clean bridge from Web Audio graph internals to UI visualization.
- Big Muff parallel LP/HP topology plus gain crossfade produced a recognizable asymmetric scoop curve instead of the prior symmetric notch approximation.
- Tube Screamer highpass + lowpass chain now produces the expected mid-focused bandpass behavior in the response panel.
- Canvas rendering style matched existing oscilloscope aesthetics by reusing phosphor greens, amber labels, dark CRT-style grid, and glow layering.
- Live FFT overlay from `AnalyserNode` integrates well behind the analytical curve and remains lightweight.

## What Broke / Fixes Applied
- TypeScript strict DOM typings for `getFrequencyResponse()` required `Float32Array<ArrayBuffer>` buffers; plain `Float32Array` triggered compile errors. Fix: typed helper buffers in `src/audio/frequencyResponse.ts`.
- Zsh reserved variable name collision (`status`) broke dependency-check loop. Fix: renamed shell variable to `code_line`.
- The original Big Muff single-notch tone model could not represent true LP/HP blending behavior. Fix: rewired to parallel lowpass/highpass paths with blend gains.

## What Was Surprising
- `getFrequencyResponse()` can be called every frame without obvious performance issues in this app footprint, even with additional curve + spectrum drawing.
- The response panel readability depended more on axis padding/layout than line thickness; small padding changes materially improved legibility on mobile.
- Phase 90 response visualization is much more interpretable when dry+wet combination is computed, since allpass magnitude alone appears flat.

## Gotchas
- Fuzz Face intentionally has no tone-stack analytical curve; showing a forced synthetic curve is misleading. Keep the “No tone control” mode + live spectrum.
- Frequency-response math must combine parallel paths in the complex domain (real/imag), not by naive magnitude averaging or multiplying.
- Recomputing arrays each animation frame is acceptable here, but if more panels are added, buffer reuse should be prioritized to avoid avoidable GC churn.
- The panel depends on AudioEngine initialization for live node handles; before engine init there are no circuit filter nodes to inspect.

## Mobile/Responsive Check
- Verified layout constraints via CSS behavior for desktop and mobile breakpoints:
  - Desktop: `.scope-canvas` remains `220px`, `.freq-response-canvas` is `200px`.
  - Mobile (`<=767px`): `.scope-canvas` reduced to `160px`, `.freq-response-canvas` reduced to `140px`.
- Frequency labels are simplified on smaller screens (100, 1K, 10K grid labels) and crosshair hover is desktop-focused.
- Constraint: annotation badges are suppressed below `480px` to avoid visual overlap.

## How To Extend
- Add shadow filter nodes (offline context) if you want complete decoupling between audio graph state and visualization state.
- Add richer feature extraction (multiple notch markers, Q readout, auto -3dB markers) in `FrequencyResponse.tsx`.
- Introduce per-circuit validation snapshots (golden curves) to catch accidental DSP regressions.
- If needed, add a parameter-version trigger so analytical recompute can be event-driven rather than per-frame.

## Dependency Verification
- Ran `curl -sI` checks for every npm dependency/devDependency URL from `package.json` against `https://registry.npmjs.org/<pkg>`.
- Result: all package URLs returned `HTTP/2 200` (no 404s).

## Big Muff Mid-Scoop Validation
- Added `scripts/validate-big-muff-response.mjs` to sanity-check the modeled tone stack shape.
- Run: `node scripts/validate-big-muff-response.mjs`
- Expected relationships:
  - Center tone (`850Hz`): `mid(1kHz)` should be at least `5dB` below both `low(120Hz)` and `high(3.5kHz)`.
  - Bass side (`350Hz`): `low(120Hz)` should be at least `4dB` above `high(3.5kHz)`.
  - Treble side (`1600Hz`): `high(3.5kHz)` should be at least `4dB` above `low(120Hz)`.
- This check is intentionally relationship-based, so minor coefficient drift does not create false negatives.

## 2026-03-03 — Circuit Selection Sync + Circuit Expansion

### Maintenance Notes
- Introduced `src/audio/syncCircuitSelection.ts` as the single circuit-selection sync point (`setCircuit` + parameter replay). Any new UI entry point that changes circuits should call this helper.
- `App.tsx` now routes dropdown, keyboard shortcuts, and circuit-card selection through the same handler to prevent UI/audio graph drift.
- Added six new circuit modules and registered them in `src/data/circuits.ts`; defaults are auto-derived through existing `getCircuitDefaults` logic.
- Added a no-new-dependency test path via `tsconfig.test.json` and `node:test` to keep CI lightweight.

### Lessons Learned
- The stale frequency-response bug was a state-sync ordering issue, not a DSP issue: graph updates inside an effect did not automatically trigger a second render.
- Centralized selection orchestration is safer than scattered `setCircuit(...)` calls, especially when rendering depends on imperative engine state.
- NodeNext test compilation requires explicit `.js` import suffixes in TypeScript test files.

### Follow-on Maintenance Guidance
- If circuits exceed 9 and keyboard direct access remains a requirement, add a paging or command palette path; current shortcut handling intentionally covers `1-9` only.
- For future circuit additions, keep control names aligned to manufacturer labels to preserve user trust and searchability.

## 2026-03-03 — Phase 1 WDF Core Engine + AudioWorklet + TS808

### What Worked
- Keeping WDF primitives (`elements`, `adaptors`, `nonlinear`) as standalone pure TypeScript modules made them directly testable in Node and reusable inside the AudioWorklet bundle.
- Preloading `WDFProcessor.ts` in `AudioEngine.init()` allowed synchronous `new AudioWorkletNode(...)` from circuit `create(...)`, preserving the existing `CircuitModel` synchronous runtime contract.
- Vite successfully emitted the worklet as a separate chunk from `new URL('./wdf/WDFProcessor.ts', import.meta.url).href`.
- Node-native tests were effective for validating WDF math behaviors (port resistances, capacitor delay behavior, diode Newton convergence).

### What Broke
- TypeScript app build initially failed in the worklet file because `AudioWorkletProcessor`/`registerProcessor` were not available in current compile libs. Fix: add local ambient declarations in `WDFProcessor.ts`.
- NodeNext test compilation failed on extensionless relative imports in WDF modules. Fix: convert new WDF internal imports to explicit `.js` suffixes.
- Node tests failed importing `WDFWorkletNode` because `AudioWorkletNode` does not exist in Node globals. Fix: use dynamic imports and temporary global `AudioWorkletNode` stubs in tests.
- ESLint errored when `.test-dist` was missing but still scanned. Fix: add `.test-dist` to `globalIgnores`.

### What Was Surprising
- Worklet chunk output used a `.ts` filename in `dist/assets/` while still loading and bundling correctly through Vite.
- The diode-pair Newton solver converged quickly for typical audio-level incidents with warm-starting from previous sample reflection.

### Gotchas
- With `moduleResolution: NodeNext` in test compilation, all relative ESM imports in source consumed by tests must use explicit file extensions.
- Any module that statically defines `class X extends AudioWorkletNode` cannot be imported in Node test runtime without first stubbing `globalThis.AudioWorkletNode`.
- Worklet modules are isolated from main-thread globals/import assumptions; keep processor dependencies self-contained and side-effect-safe.

### How To Extend
- Add additional WDF circuits by reusing `WDFWorkletNode` + protocol messages and creating per-circuit graph classes inside the processor (or by routing on `setup.circuit`).
- Expand bypass support by mapping UI/component IDs to worklet `bypass` messages and toggling `WDFElement.bypass` flags at sample time.
- For higher fidelity TS808 modeling, replace the simplified tone one-pole stage with a full WDF tone-stack subtree and include op-amp finite gain/bandwidth modeling.
- Add regression tests that sweep `drive/tone/level` and assert bounded output + monotonic mapping trends.

### Dependency Verification (Phase 1)
- Ran `curl -sI` against every npm package URL (`https://registry.npmjs.org/<name>`) from `dependencies` and `devDependencies` in `package.json`.
- Result: all checked package URLs returned HTTP `200`.

## 2026-03-03 — Phase 2 Interactive Topology + Bypass + Value Multipliers

### What Worked
- Splitting topology into `topology.ts` (layout data), `CircuitTopology.tsx` (wiring), and `ComponentNode.tsx` (symbol rendering) kept layout concerns isolated and made the SVG easier to maintain.
- Extending the WDF protocol with `valueMultiplier` and `levels` messages enabled two-way UI/worklet interaction without touching legacy circuit paths.
- RMS aggregation in the worklet at `2940` samples/report (`~15fps @ 44.1kHz`) produced stable component meter values with low messaging overhead.
- Keeping WDF bypass/multiplier/selection state in Zustand but outside persisted state avoided stale experiment settings across sessions.

### What Broke / Fixes Applied
- ESLint `react-hooks/refs` blocked reading `levelsRef.current` directly in JSX render. Fix: keep real-time values in a ref and publish a throttled snapshot for render updates.
- Dependency-check command initially failed for scoped npm packages. Fix: URL-encode package names with `encodeURIComponent()` before `curl`.
- One shell URL extraction pattern failed due regex parsing. Fix: switched to `rg --no-filename` URL extraction and unique sorting.

### What Was Surprising
- Most topology complexity was connection routing between series/shunt/feedback branches, not symbol rendering.
- Value multipliers were easiest to apply by scaling base constants and calling `setParam(...)` on affected WDF elements rather than rebuilding the graph.

### Gotchas
- `WDFWorkletNode.onLevels()` currently only adds callbacks and has no unsubscribe helper; avoid repeatedly attaching listeners in effects.
- Scaled-value readout parsing depends on numeric `realWorldValue` strings (e.g. `0.047µF`, `4.7kΩ`); free-text values intentionally fall back.
- `http://www.muzique.com/lab/ts.htm` now returns `404` during dependency/source verification.
- Keep topology UI gated behind `circuit.engine === 'wdf'` so legacy circuits remain on the existing block diagram.

### Mobile/Responsive Check
- Topology section allows horizontal scroll on mobile via `.topology-scroll` with fixed SVG minimum width for readability.
- Component info panel switches to bottom-sheet mode below `768px` (`position: fixed`, `max-height: 50vh`).
- Existing oscilloscope and frequency-response mobile sizing remains unchanged and still applies correctly.

### How To Extend
- Add explicit unsubscribe support to `WDFWorkletNode.onLevels()` if multiple UI consumers are introduced.
- Add per-component bypass safety guardrails by mapping `bypassMode` to richer UI warnings.
- Generalize `getTopology(circuitId)` to support additional WDF circuit layouts beyond Tube Screamer.

### Dependency Verification (Phase 2)
- Ran `curl -sIL` for every package in `dependencies` and `devDependencies` against `https://registry.npmjs.org/<encoded-package>`.
- Result: all npm package registry endpoints returned `200`.
- Ran `curl -sIL` for unique external URLs discovered in `README.md`, `docs/`, `src/`, `index.html`, and `DEV-NOTES.md`.
- Result: all checked URLs returned `200` except `http://www.muzique.com/lab/ts.htm` which returned `404`.
