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
- Big Muff tone-stack visualization is more stable with a gain-weighted LP/HP magnitude blend before the series mid-notch; phase-coherent summing can over-cancel and hide the expected scoop depending on browser filter phase behavior.
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

## 2026-03-04 — Topology Spacing + WDF Audible Control Recovery

### What Worked
- Expanding topology geometry to `780x440` and redistributing nodes by stage removed most collision pressure in the clipping loop and output area.
- Wrapping long component labels into two lines in `ComponentNode.tsx` stabilized text layout without abbreviating engineering names.
- Keeping all audible behavior inside `WDFProcessor.js` (instead of relying on disconnected Biquad nodes) keeps UI controls and component controls aligned with the actual DSP path.
- Adjusting tone bypass handling to be component-specific (instead of bypassing all tone processing when any tone component is bypassed) restored audible control sensitivity.

### What Broke / Fixes Applied
- The processor had a final unconditional `tanh` saturation pass, which masked differences from diode bypass and tone/component changes. Fix: only apply protective soft limiting when output magnitude exceeds a safety threshold.
- Tone processing previously short-circuited entirely when any tone component (`ts-tone-cap`, `ts-tone-resistor`, `ts-tone-pot`) was bypassed. Fix: model each bypass path independently:
  - `ts-tone-cap` bypass now skips the lowpass capacitor branch only.
  - `ts-tone-resistor` and `ts-tone-pot` bypass now alter effective resistance rather than nuking the whole tone stage.
- The clipping diode bypass path was not distinct enough in output character. Fix: explicit linearized output branch when diodes are bypassed.

### What Was Surprising
- The biggest “no audible change” factor was not message transport; `param`/`bypass`/`valueMultiplier` messaging was already wired correctly.
- Small post-DSP utility nonlinearities can hide meaningful control differences more than expected in low-latency pedal models.
- Label overlap pressure was mostly from text width, not symbol size; adding horizontal spacing alone was insufficient without label wrapping.

### Gotchas
- Frequency-response visualization nodes (`getFilterNodes`) can remain useful while being disconnected from audio, but this must stay clearly documented to avoid false debugging trails.
- If topology values or label formats change, re-check 375px viewport behavior; horizontal scroll is intentional and required for readability.
- Keep tone-stage bypass semantics physically plausible; an “all-or-nothing” bypass gate can make multiple controls appear broken at once.

### Maintenance / Extension Guide
- Topology layout source of truth is `src/audio/wdf/topology.ts`; rendering behavior lives in `src/components/circuit-lab/CircuitTopology.tsx` and `ComponentNode.tsx`.
- If adding components, budget horizontal spacing for three text lines (`name`, `realWorldValue`, `multiplier`) and update stage boundaries accordingly.
- WDF audible control logic should stay centralized in `src/audio/wdf/WDFProcessor.js`; UI/runtime files should only send control messages.
- When introducing new bypassable DSP blocks, avoid global bypass short-circuits and instead define per-component bypass effects.
- Regression check list for future WDF edits:
  - Diode bypass audibly reduces distortion.
  - Input cap multiplier shifts low-end.
  - Feedback cap multiplier changes clipping character.
  - Tone cap multiplier changes brightness.
  - Drive/Tone/Level knobs audibly and visibly affect output.

### Dependency Verification (2026-03-04)
- Verified all `dependencies` and `devDependencies` from `package.json` via `npm view <package> version`.
- Result: all package names resolved successfully; no missing packages.

## 2026-03-04 — Big Muff Mid-Scoop + Mobile Info Panel Polish

### What Worked
- Updating `computeParallelResponse` to sum LP/HP branch magnitudes using their current gain-node values restored a consistent Big Muff mid-scoop visualization at default tone.
- Keeping the mid-notch as a series multiplier after the LP/HP blend preserved the expected notch center behavior around ~900-1000Hz.
- Mobile bottom-sheet polish was straightforward with a fixed scrim layer plus stronger panel z-index and a dedicated drag handle.

### What Broke / Fixes Applied
- Existing parallel-path complex summing could visually collapse into a tilted/lowpass-looking curve in some runs, preventing the expected Big Muff “MID SCOOP” annotation. Fix: switch visual blend to gain-weighted LP/HP magnitude summing, then apply series filters.
- The mobile component info panel lacked visual separation from underlying content and had a small close target. Fix: add a backdrop scrim, increase panel z-index, and expand close button hit area to `44x44`.

### What Was Surprising
- The Big Muff curve shape was more sensitive to summing method than to notch depth; the same filter settings produced much clearer W-shape behavior once LP/HP blend semantics changed.
- `overflow-x: auto` was already present for topology; adding touch scrolling behavior and scrim/padding logic solved most perceived mobile crowding without changing node geometry.

### Gotchas
- `getFilterNodes()` returns live `AudioNode` handles; visualization behavior can change with browser-specific phase implementation details even when parameters match.
- A fixed mobile bottom-sheet should include either content offset (`padding-bottom`) or a hard interaction lock with scrim; otherwise underlying controls can appear obscured or partially reachable.

### Mobile/Responsive Check (375px)
- CSS logic confirms horizontal topology scrolling remains enabled (`.topology-scroll` keeps `overflow-x: auto`, touch scrolling enabled, SVG `min-width: 780px`).
- When the info panel is open on mobile: scrim (`z-index: 55`) covers background, sheet (`z-index: 60`) sits above all content, and close button meets tap-target sizing (`44x44`).
- Added `padding-bottom: 52vh` on `.topology-stack.panel-open` so underlying sections are not trapped beneath the fixed sheet during page scroll.
- Bottom-sheet retains `max-height: 50vh` and `overflow-y: auto`, so panel content remains reachable.

### How To Extend
- If more circuits adopt parallel tone stacks, consider adding an explicit `blendMode` field on `FilterNodeDescriptor` (`magnitude-sum` vs `complex-sum`) instead of relying on one global strategy.
- Add a lightweight response regression script that asserts Big Muff center-tone notch depth (`minDb < -6`) to protect the “MID SCOOP” annotation behavior.
- For richer mobile UX, wire the drag handle to pointer gestures and snap states (`peek`, `half`, `closed`) while keeping close-button access.

### Dependency Verification (2026-03-04, This Change)
- Ran `curl -sI https://registry.npmjs.org/<package>` for every package in `dependencies` and `devDependencies`.
- Result: all package registry URLs returned HTTP `200` (no 404s).

## 2026-03-04 — Phase 3 Big Muff Pi + Klon Centaur WDF Models

### What Worked
- Reusing the Tube Screamer worklet patterns (smoothed params, startup warmup/attack ramps, output safety fallback, periodic RMS level reporting) made the two new graph classes integrate without changes to UI rendering components.
- A single setup factory in `WDFProcessor.js` keyed by `config.circuit` cleanly enabled multi-circuit WDF routing while preserving the existing TS path.
- Modeling Big Muff as cascaded stage HP coupling + WDF diode clipping + inter-stage `tanh` normalization kept the cascade stable under high sustain values.
- Modeling Klon with explicit parallel clean/drive split outside the WDF clipping subtree preserved the expected clean-blend behavior and made gain interaction straightforward to tune.

### What Broke / Fixes Applied
- Initial dependency verification command mixed a Node heredoc and shell pipe incorrectly, causing a syntax error. Fix: replaced with a shell loop that reads package names from Node and executes `curl -sI` per registry URL.
- `CircuitLab.tsx` originally mapped WDF component metadata only for Tube Screamer, which would leave new WDF topologies without metadata panels. Fix: added explicit mappings for `big-muff-wdf` and `klon-centaur-wdf`.

### What Was Surprising
- The topology renderer’s generic orthogonal routing already handled Klon’s fork/merge layout without any `CircuitTopology.tsx` changes.
- Big Muff’s stage-to-stage amplitude normalization was critical; without inter-stage soft limiting, later diode stages quickly saturated into near-constant output.

### Gotchas
- Keep `config.circuit` duplicated in both setup message and config payload for compatibility; graph selection currently relies on `message.config.circuit`.
- Topology node IDs must exactly match WDF component metadata IDs; otherwise nodes render blank (filtered out by `componentMap`).
- For new WDF circuits, update `CircuitLab.tsx` component metadata mapping or topology UI will appear with missing component details.

### How To Extend
- If adding more WDF pedals, keep per-circuit graph classes self-contained in `WDFProcessor.js` and only expose them through the setup factory.
- Consider extracting shared startup/safety/level-report behavior into reusable helper mixins inside `WDFProcessor.js` to reduce duplicated logic across graph classes.
- Add regression tests for topology integrity (node IDs + connection endpoints) and bounded-output DSP sweeps for each WDF circuit.

### Dependency Verification (2026-03-04, Phase 3)
- Ran `curl -sI https://registry.npmjs.org/<encoded-package>` for every package in `dependencies` and `devDependencies`.
- Result: all package registry URLs returned HTTP `200`.
- No new CDN URLs or runtime external HTTP dependencies were introduced by this phase.
