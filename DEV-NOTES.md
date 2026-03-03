# DEV NOTES - Pedal Architect v1

## What Worked
- Web Audio engine with lazy `AudioContext` init and synthetic guitar loop generation (no external sample files).
- Six circuit models implemented and switchable live: Tube Screamer, Big Muff, Klon, RAT, Fuzz Face, Phase 90.
- Circuit parameter updates apply in real-time through store + audio engine sync.
- Oscilloscope renders both waveform and FFT modes using `AnalyserNode`.
- Enclosure Designer supports drag/drop from library, snapping to 2mm grid, overlap and edge-clearance validation, and repositioning.
- PDF export works through jsPDF with 1:1 mm units, enclosure outline, drill markers, legend, and 25mm calibration square.
- Zustand persistence restores circuit, parameter, sample, enclosure, and placed component state from LocalStorage.
- Keyboard shortcuts wired: Space, 1-6, R, Tab (tablet), Delete/Backspace, Cmd/Ctrl+E.

## What Broke / Fixes Applied
- `@dnd-kit/core` `setNodeRef` expects `HTMLElement`, but enclosure canvas uses SVG nodes. Fix: explicit ref casts for SVG node refs in `EnclosureCanvas`.
- Initial keydown handler had stale playback closures; adjusted dependencies and in-handler play/stop logic.

## Gotchas
- Drag-drop add position from sidebar to canvas is delta-based and anchored from enclosure center; functional but not pixel-perfect pointer drop.
- Invalid placement feedback is strongest for repositioning existing parts; new invalid drops are rejected immediately and not persisted.
- Vite warns about large chunks (jsPDF/html2canvas dependency footprint). Build still succeeds with zero errors.

## How To Extend
- Add higher-fidelity circuit math by splitting audio graph nodes into reusable DSP building blocks and adding per-stage filtering.
- Improve enclosure UX by tracking live drag coordinates for true pointer-anchored placement preview and live collision highlighting.
- Add FFT controls (windowing/smoothing) and oscilloscope trigger modes.
- Add unit tests for placement validation and store reducers, and Playwright checks for keyboard shortcuts + layout breakpoints.
- If chunk size matters, code-split enclosure/PDF tooling using lazy imports.
