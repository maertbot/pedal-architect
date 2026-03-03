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
