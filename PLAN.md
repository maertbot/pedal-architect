# CE: Plan — Pedal Architect

## Overview

Build an interactive guitar effects pedal design workbench as a React + TypeScript web app. Two integrated workbenches: Circuit Lab (audio simulation) and Enclosure Designer (layout + PDF export). Tactical hardware aesthetic (matte black, white traces, red accents, monospace typography).

**Repo:** https://github.com/maertbot/pedal-architect  
**Deploy:** GitHub Pages at https://maertbot.github.io/pedal-architect  
**Stack:** React 19, TypeScript, Vite, Zustand, Web Audio API, @dnd-kit, jsPDF

---

## Task Breakdown

### Phase 1: Project Scaffolding

**Task 1.1: Initialize Vite + React + TypeScript project**
- `npm create vite@latest . -- --template react-ts`
- Install dependencies: `zustand`, `@dnd-kit/core`, `@dnd-kit/sortable`, `jspdf`, `@fontsource/jetbrains-mono`
- Configure Vite for GitHub Pages (`base: '/pedal-architect/'`)
- Set up folder structure:
  ```
  src/
    audio/          # Web Audio engine, circuit definitions
    components/     # React components
      circuit-lab/  # Circuit Lab panel
      enclosure/    # Enclosure Designer panel
      shared/       # Knobs, sliders, visualizations
    data/           # Circuit definitions, enclosure specs
    hooks/          # Custom hooks (useAudioEngine, useDragDrop)
    store/          # Zustand stores
    styles/         # Global CSS, variables, fonts
    assets/         # Audio samples, SVG icons
    utils/          # PDF export, math helpers
  ```
- Set up CSS custom properties for the design system:
  ```css
  :root {
    --bg-primary: #0a0a0a;
    --bg-panel: #141414;
    --bg-recessed: #0d0d0d;
    --border-subtle: #1a1a1a;
    --border-active: #333333;
    --text-primary: #e8e8e8;
    --text-secondary: #888888;
    --text-muted: #555555;
    --accent-red: #ff2020;
    --accent-amber: #ffb020;
    --accent-green: #20ff60;
    --trace-white: #ffffff;
    --font-mono: 'JetBrains Mono', 'Courier New', monospace;
  }
  ```

**Task 1.2: Set up GitHub Pages deployment**
- Add `gh-pages` package
- Add deploy script to package.json: `"deploy": "vite build && gh-pages -d dist"`
- Configure GitHub Actions for auto-deploy on push to main (optional but nice)

### Phase 2: Audio Engine

**Task 2.1: Core audio engine class**
Create `src/audio/AudioEngine.ts`:
- Initialize `AudioContext` on first user interaction
- Signal chain: `AudioBufferSourceNode` → `GainNode` (input) → `WaveShaperNode` → `BiquadFilterNode[]` (tone stack) → `GainNode` (output) → `AnalyserNode` → `destination`
- Methods: `start()`, `stop()`, `setCircuit(circuitId)`, `setParameter(paramId, value)`
- AnalyserNode feeds waveform/FFT data for visualization
- Seamless loop playback of guitar samples

**Task 2.2: Circuit definitions**
Create `src/data/circuits.ts` — each circuit definition includes:
```typescript
interface CircuitDefinition {
  id: string;
  name: string;
  description: string;
  category: 'overdrive' | 'distortion' | 'fuzz' | 'modulation';
  year: number;
  icon: string; // SVG path for circuit symbol
  parameters: ParameterDefinition[];
  createNodes: (ctx: AudioContext) => AudioNodeGraph;
  updateParameter: (nodes: AudioNodeGraph, paramId: string, value: number) => void;
}

interface ParameterDefinition {
  id: string;
  name: string;
  label: string; // Display label (e.g., "DRIVE", "TONE", "LEVEL")
  min: number;
  max: number;
  default: number;
  unit: string; // "dB", "Hz", "%", ""
  curve: 'linear' | 'logarithmic';
  componentType: string; // "pot", "diode-select", "toggle"
}
```

**Task 2.3: Implement 6 circuit models**

1. **Tube Screamer (TS808)**
   - Parameters: Drive (gain), Tone (lowpass frequency), Level (output volume)
   - Clipping: Soft clip via `tanh(x * drive)` — symmetric, smooth compression
   - Tone stack: Single lowpass filter, 720Hz-4.5kHz sweep
   - Character: Warm, mid-humped, compressed

2. **Big Muff Pi**
   - Parameters: Sustain (gain), Tone (scoop frequency), Volume
   - Clipping: 4 cascaded soft-clip stages (each with interstage highpass at 160Hz)
   - Tone stack: Notch/scoop filter (the famous Big Muff mid-scoop)
   - Character: Thick, wall-of-sound fuzz, scooped mids

3. **Klon Centaur**
   - Parameters: Gain, Treble, Output
   - Clipping: Germanium diode soft clip + parallel clean blend
   - Unique: Clean/drive crossfade — at low gain, mostly clean signal passes through
   - Character: Transparent, touch-sensitive overdrive

4. **ProCo RAT**
   - Parameters: Distortion (gain), Filter (lowpass), Volume
   - Clipping: Hard clip to ground — `Math.sign(x) * Math.min(Math.abs(x * gain), 1)` with slight knee
   - Filter: Single lowpass, 800Hz-8kHz (the RAT's unique filter control)
   - Character: Angular, aggressive, cuts through

5. **Fuzz Face**
   - Parameters: Fuzz (gain), Volume
   - Clipping: Asymmetric waveshaper (PNP germanium transistor behavior)
   - Added: Noise gate behavior at low input levels (the Fuzz Face "cleanup" when you roll off guitar volume)
   - Character: Sputtery, dynamic, vintage

6. **Phase 90**
   - Parameters: Speed (LFO rate)
   - No clipping — pure modulation effect
   - 4 cascaded allpass filters (`BiquadFilterNode` type: 'allpass')
   - LFO (`OscillatorNode`) modulates allpass center frequencies
   - Character: Classic jet-engine sweep

**Task 2.4: Audio sample loading**
- Source 3-4 CC0 clean guitar samples from Freesound (DI recordings)
  - Clean chord strum (major, sustained)
  - Single note sustain (mid-range, ~330Hz E4)
  - Fingerpicking pattern (arpeggiated)
  - Power chord (palm muted, chunky)
- Load as `AudioBuffer` via `fetch` + `decodeAudioData`
- Implement gapless looping with crossfade at loop boundary

### Phase 3: UI Components

**Task 3.1: App shell and layout**
- Two-panel layout: Circuit Lab (left, ~55% width) + Enclosure Designer (right, ~45%)
- Top bar: Logo ("PEDAL ARCHITECT" in monospace), circuit selector, sample selector, play/stop
- Bottom bar: Keyboard shortcuts help, GitHub link
- Responsive: Below 1024px, switch to tabbed layout (two tabs)
- On mobile (<768px): Circuit Lab only, simplified controls

**Task 3.2: Rotary knob component**
The signature UI element. Create `src/components/shared/RotaryKnob.tsx`:
- SVG-based rotary knob (top-down view, like looking down at a real pedal)
- Visual: dark grey body, white pointer line, hash marks around the sweep (270° range)
- Interaction: click-drag vertically to turn (industry standard for audio knobs)
- Red glow ring when active/being turned
- Value readout below in monospace (e.g., "7.2" or "3.4kHz")
- Smooth animation with `requestAnimationFrame`
- Props: `value`, `min`, `max`, `label`, `onChange`, `unit`

**Task 3.3: Oscilloscope visualization**
Create `src/components/shared/Oscilloscope.tsx`:
- Canvas-based waveform display
- Aesthetic: green phosphor traces on black (classic CRT oscilloscope look)
- Subtle CRT screen curve effect via CSS `border-radius` and `box-shadow`
- Phosphor glow via blurred duplicate render
- Shows real-time waveform from `AnalyserNode.getFloatTimeDomainData()`
- Crosshair grid lines (subtle, 50% opacity)
- Also support FFT mode (frequency spectrum) as toggle

**Task 3.4: Circuit selector panel**
- Grid of 6 circuit cards (2×3 or 3×2)
- Each card: circuit name, year, category badge, simplified circuit icon
- Selected circuit has red border glow
- Hover: subtle lift + shadow
- Clicking a circuit switches the audio engine and updates the parameter knobs

**Task 3.5: Parameter controls panel**
- Dynamically renders knobs based on selected circuit's `parameters[]`
- Each parameter gets a `RotaryKnob` + label
- For diode-select parameters: toggle switch component instead of knob
- Layout: horizontal row of knobs below the oscilloscope (like a real pedal face)

**Task 3.6: Circuit diagram display**
- Simplified block diagram (NOT full schematic) for each circuit
- SVG, showing signal flow left-to-right
- Blocks: Input → Gain Stage → Clipping → Tone → Output
- The block corresponding to the parameter being tweaked pulses with red glow
- Drawn in white lines on dark background (PCB trace aesthetic)

### Phase 4: Enclosure Designer

**Task 4.1: Enclosure canvas**
Create `src/components/enclosure/EnclosureCanvas.tsx`:
- SVG workspace showing top-down view of selected enclosure
- Enclosure outline: rounded rectangle with exact proportions (mm-accurate)
- 2mm snap grid (visible as faint dots)
- Background: subtle PCB green-black texture (#0a1a0a)
- Measurement overlays: center-to-center distances between placed components

**Task 4.2: Component library sidebar**
- Sidebar listing draggable components:
  - Potentiometer (16mm body, 7mm shaft hole) — shown as circle with knob
  - 3PDT Footswitch (12mm hole) — shown as circle with "3PDT" label
  - LED Bezel 5mm — shown as small circle with glow
  - LED Bezel 3mm — smaller circle
  - 1/4" Jack (12mm hole) — shown on side edges only
  - DC Power Jack (11mm hole) — shown on top edge only
  - Toggle Switch (6mm hole) — shown as small rectangle
- Each component shows its drill bit size

**Task 4.3: Drag-and-drop with @dnd-kit**
- Drag from sidebar → drop onto enclosure
- Snap to 2mm grid
- Show ghost/preview while dragging
- Collision detection: red outline if component overlaps another or is too close to edge (min 5mm clearance)
- Click placed component to select → show delete button, position readout (X, Y in mm)
- Drag to reposition

**Task 4.4: Enclosure size selector**
- Dropdown or visual selector for 5 standard sizes
- Changing size clears placed components (with confirmation) or attempts to reflow
- Show dimensions label: "125B — 122mm × 67mm"

**Task 4.5: PDF drill template export**
Create `src/utils/pdfExport.ts`:
- Generate 1:1 scale drill template using jsPDF
- Page setup: A4 or US Letter (auto-detect or let user choose)
- Content:
  - Enclosure outline at true scale
  - Crosshair at each drill point
  - Drill size annotation next to each hole
  - 25mm × 25mm calibration square (top right corner)
  - "PRINT AT 100% / ACTUAL SIZE" warning text
  - Project name + date in footer
  - Component legend (list of components with quantities and drill sizes)
- Registration marks at corners for alignment on enclosure

### Phase 5: Integration & Polish

**Task 5.1: State management**
- Zustand store for:
  - `currentCircuit`: active circuit ID
  - `parameters`: Map of param ID → current value
  - `audioPlaying`: boolean
  - `selectedSample`: active guitar sample
  - `enclosureSize`: selected enclosure
  - `placedComponents`: array of {componentType, x, y, id}
  - `selectedComponentId`: for enclosure editor selection
- LocalStorage persistence: save/restore entire state on page load

**Task 5.2: Keyboard shortcuts**
- `Space`: play/stop audio
- `1-6`: select circuit
- `R`: reset parameters to defaults
- `Tab`: switch between Circuit Lab and Enclosure Designer (on mobile/tablet)
- `Delete/Backspace`: remove selected enclosure component
- `Cmd+E`: export PDF

**Task 5.3: Loading & first-run experience**
- Show brief loading state while audio samples decode
- First interaction: "Click anywhere to start audio engine" overlay (required by browser autoplay policy)
- Subtle fade-in animation for all panels

**Task 5.4: Final styling pass**
- Ensure all CSS custom properties are consistent
- Add PCB texture to backgrounds (subtle repeating SVG pattern)
- Red accent animations (glow pulses, hover states)
- Panel borders: 1px solid with subtle bevel (light edge top-left, dark edge bottom-right)
- Scrollbar styling (thin, dark, matches theme)
- Favicon: red pedal icon

**Task 5.5: Deploy to GitHub Pages**
- Build and deploy
- Verify at https://maertbot.github.io/pedal-architect
- Test in Chrome, Firefox, Safari
- Test PDF export with physical print

---

## File Structure (Final)

```
pedal-architect/
├── public/
│   ├── samples/           # Clean guitar audio files (.wav)
│   └── favicon.svg
├── src/
│   ├── audio/
│   │   ├── AudioEngine.ts
│   │   ├── circuits/
│   │   │   ├── tubeScreamer.ts
│   │   │   ├── bigMuff.ts
│   │   │   ├── klonCentaur.ts
│   │   │   ├── rat.ts
│   │   │   ├── fuzzFace.ts
│   │   │   └── phaseNinety.ts
│   │   └── types.ts
│   ├── components/
│   │   ├── App.tsx
│   │   ├── TopBar.tsx
│   │   ├── circuit-lab/
│   │   │   ├── CircuitLab.tsx
│   │   │   ├── CircuitSelector.tsx
│   │   │   ├── ParameterControls.tsx
│   │   │   └── CircuitDiagram.tsx
│   │   ├── enclosure/
│   │   │   ├── EnclosureDesigner.tsx
│   │   │   ├── EnclosureCanvas.tsx
│   │   │   ├── ComponentLibrary.tsx
│   │   │   └── EnclosureSizeSelector.tsx
│   │   └── shared/
│   │       ├── RotaryKnob.tsx
│   │       ├── Oscilloscope.tsx
│   │       ├── ToggleSwitch.tsx
│   │       └── GlowButton.tsx
│   ├── data/
│   │   ├── circuits.ts
│   │   └── enclosures.ts
│   ├── hooks/
│   │   ├── useAudioEngine.ts
│   │   └── useEnclosureDesigner.ts
│   ├── store/
│   │   └── useStore.ts
│   ├── styles/
│   │   ├── global.css
│   │   ├── variables.css
│   │   └── fonts.css
│   ├── utils/
│   │   ├── pdfExport.ts
│   │   └── math.ts
│   ├── main.tsx
│   └── vite-env.d.ts
├── BRAINSTORM.md
├── QA-BRAINSTORM.md
├── PLAN.md
├── DEV-NOTES.md          # Codex fills this in during/after build
├── COMPOUND.md           # Lessons learned (CE: Compound phase)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── README.md
```

---

## Testing Strategy

### Audio Tests (Codex evaluates)
- [ ] Each circuit produces audibly different output from the same input sample
- [ ] Parameter changes produce audible, real-time difference (no clicks/pops)
- [ ] Oscilloscope visualization responds to parameter changes
- [ ] Audio loops seamlessly without gaps or clicks
- [ ] Audio starts/stops cleanly

### UI Tests (Opus evaluates via screenshot)
- [ ] Tactical aesthetic is cohesive — matte black, white traces, red accents, monospace
- [ ] Knobs feel responsive and look like real hardware
- [ ] Oscilloscope has CRT phosphor aesthetic
- [ ] Information density is high but organized
- [ ] Would pass the "Would this belong on the wall of NASA Mission Control?" test
- [ ] Mobile layout degrades gracefully

### Enclosure Tests (Codex evaluates)
- [ ] Components snap to grid
- [ ] Collision detection works
- [ ] PDF exports at correct 1:1 scale (calibration square measures 25mm)
- [ ] All 5 enclosure sizes render at correct proportions

### Integration Tests (Both evaluate)
- [ ] Switching circuits updates both audio engine AND parameter knobs
- [ ] State persists across page reload (LocalStorage)
- [ ] Deploy to GitHub Pages works end-to-end

---

## Compound Engineering Notes

After each phase, Codex should:
1. Document what worked and what didn't in `DEV-NOTES.md`
2. Note any dependencies that required version pinning
3. Flag any architectural decisions that deviated from the plan
4. After the full build, write `COMPOUND.md` with lessons for future Web Audio + interactive design projects

---

*Plan created by Opus. Ready for Codex execution.*
