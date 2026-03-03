# CE: Brainstorm — Pedal Architect

## What Is This?

An interactive web app for designing guitar effects pedals. Two integrated workbenches:

1. **Circuit Lab** — Pick classic pedal circuit topologies, tweak component values with sliders, hear the tone change in real-time via Web Audio API
2. **Enclosure Designer** — Drag knobs, LEDs, footswitches, and jacks onto a top-down pedal enclosure outline, export print-ready PDF drill templates

**Target user:** DIY pedal builders (r/diypedals: 170k+, plus broader guitar/maker community)

**Gap in market:** Existing tools are fragmented. SPICE simulators are ugly and desktop-only. Enclosure templates are static PDFs or 3D-printed jigs. Nothing lets you *hear the circuit AND design the enclosure* in one beautiful web app.

---

## Design Direction

### Aesthetic: "Tactical Hardware Lab"

Drawn from Matt's documented aesthetic preferences — specifically the **Military/Tactical/Hardware** category:

- **Trauma.works** tactical patches (stark black/white/red, military typography)
- **EOTech holographic sights** (precision reticle overlays, matte black)
- **1911 with wood grips** (machined metal, functional beauty)
- **Control panels** (1928 Berlin power station, F1 steering wheels)
- **NASA Graphics Standards Manual** (systematic, institutional, built to last)

### Visual Spec

| Element | Treatment |
|---------|-----------|
| **Background** | Matte black (#0a0a0a), subtle PCB texture/grid |
| **Primary lines** | White circuit traces, thin and precise |
| **Accent color** | Signal red (#ff2020) — for active states, warnings, emphasis |
| **Secondary accent** | Amber (#ffb020) — for warm indicators, LED glow |
| **Typography** | Monospace primary (Departure Mono or JetBrains Mono), sans-serif secondary for labels |
| **UI Chrome** | Beveled dark grey panels, recessed sections like machined aluminum |
| **Knobs/Controls** | Skeuomorphic but flat — top-down view of real pedal knobs with hash marks |
| **Grid** | Faint crosshair grid, like a milling machine bed or oscilloscope |
| **Hover states** | Red glow halo, like a holographic sight reticle activating |
| **Audio visualization** | Oscilloscope-style waveform display, green phosphor or amber on black |

### Typography Pairing

- **Display/Headers:** Departure Mono (or Azeret Mono) — military stencil energy, monospaced
- **Body/Labels:** Space Mono or IBM Plex Mono — legible, technical, warm
- **Values/Readouts:** Tabular figures, right-aligned, like instrument panel readouts

### Composition

- **Layout:** Two-panel workspace (Circuit Lab left, Enclosure Designer right) on desktop; tabbed on mobile
- **Navigation:** Minimal — top bar with project name, circuit selector dropdown, and export button
- **Information density:** High but organized — think aviation chart, not empty whitespace
- **Negative space:** Used structurally (panel gutters, section breaks), not decoratively

### Make-Good-Art Creative Brief

**Subject:** A professional-grade guitar pedal design workbench  
**Story:** The maker's bench, digitized — where analog craft meets precision tooling  
**Emotion:** Precise, capable, slightly dangerous (like handling electronics), deeply satisfying  
**Context:** Desktop-first web app (responsive to tablet/mobile), shared via URL  
**Style rules:**
1. Every pixel should feel machined, not drawn
2. Color is functional — red means active/danger, amber means warm/signal, white means structure
3. Skeuomorphism only where it teaches (knob rotation = value change)
4. Sound and visual feedback are synchronized — tweaking a knob should feel AND sound immediate
5. Dense information is a feature, not a bug — this is a workbench, not a landing page

---

## Technical Architecture

### Stack

- **Framework:** React 19 + TypeScript (mature ecosystem, good for complex interactive UIs)
- **Build:** Vite (fast, modern, zero-config for deployment)
- **Audio:** Web Audio API (native browser, no plugins)
- **Canvas/SVG:** SVG for enclosure designer (precise, scalable, exportable), Canvas for audio visualizations
- **PDF Export:** jsPDF or pdf-lib for drill template generation
- **Drag & Drop:** @dnd-kit (best React DnD library, accessible)
- **State:** Zustand (lightweight, works well for audio parameter state)
- **Deployment:** GitHub Pages or Vercel (free, instant)

### Audio Engine Design

The Web Audio API provides the primitives we need:

| Pedal Effect | Web Audio Implementation |
|-------------|------------------------|
| **Overdrive/Distortion** (Tube Screamer, RAT, Big Muff) | `WaveShaperNode` with different clipping curves (soft clip = tube, hard clip = diode, asymmetric = Klon) |
| **Fuzz** (Fuzz Face) | `WaveShaperNode` with extreme transfer function + gated noise floor simulation |
| **Phaser** (Phase 90) | Chain of `BiquadFilterNode` (allpass) modulated by `OscillatorNode` LFO |
| **Delay** (analog delay) | `DelayNode` + feedback loop + low-pass filter for tape degradation |
| **Chorus** | `DelayNode` with LFO-modulated delay time + wet/dry mix |
| **Tone Stack** | `BiquadFilterNode` chain (lowpass, highpass, peaking) to simulate passive tone controls |

**Audio signal chain:**
```
Guitar Sample → Input Gain → Pre-EQ → Clipping Stage → Post-EQ/Tone Stack → Output Volume → Speakers
                                         ↑
                                   WaveShaper curve
                                   (varies by circuit)
```

**Key technical insight:** We're NOT doing full SPICE-level circuit simulation. We're modeling the *transfer function* of each classic circuit — the relationship between input signal and output signal that gives each pedal its character. This is what makes it feasible in a browser at 60fps. The WaveShaperNode accepts a Float32Array curve that maps input amplitude → output amplitude. Different curves = different pedal characters.

**Clipping curve library:**
- **Tube Screamer (TS808):** Soft clipping via back-to-back silicon diodes in the feedback loop → smooth, compressed overdrive. Modeled as `tanh(x * gain)` with asymmetric bias.
- **Big Muff:** Four cascaded clipping stages → thick, sustaining fuzz. Modeled as stacked waveshapers with interstage filtering.
- **Klon Centaur:** Germanium diode clipping with clean blend → transparent drive. Modeled as soft clip + parallel clean signal mix.
- **RAT:** Hard clipping to ground via silicon diodes → aggressive, angular distortion. Modeled as `sign(x) * min(|x * gain|, 1)` with slight rounding.
- **Fuzz Face:** Germanium transistor saturation → gated, sputtery fuzz. Modeled as asymmetric waveshaper with noise gate behavior at low input.
- **Phase 90:** No clipping — 4-stage allpass filter chain with LFO sweep. Pure Web Audio node graph.

**Component value → parameter mapping:**
Each "component" slider maps to a real audio parameter:
- Gain pot → WaveShaper input gain multiplier
- Tone pot → BiquadFilter frequency/Q
- Clipping diode selector → switches between WaveShaper curves
- Volume pot → output GainNode value
- For Phase 90: Rate pot → LFO frequency, Depth → allpass filter Q range

### Audio Source

- **Default:** Pre-recorded clean guitar samples (chord strum, single notes, picking patterns) loaded as `AudioBufferSourceNode`
- **Live input:** Optional `getUserMedia()` for plugging in a real guitar via audio interface
- **Looping:** Seamless loop playback so the user can tweak and listen continuously

### Enclosure Designer

**Standard enclosure sizes** (Hammond/clone dimensions, to scale):
- 1590A (92mm × 38mm × 31mm) — mini
- 1590B (112mm × 60mm × 31mm) — standard small
- 125B (122mm × 67mm × 31mm) — standard
- 1590BB (120mm × 94mm × 34mm) — large
- 1590XX (145mm × 121mm × 39mm) — extra large

**Draggable components:**
- Potentiometer (various shaft sizes: 6mm, 7mm)
- 3PDT footswitch (12mm hole)
- LED bezel (5mm, 3mm)
- 1/4" input/output jacks (placed on sides)
- DC power jack (placed on top edge)
- Toggle switch (6mm)

**Snap grid:** 2mm increments for precision
**Collision detection:** Warn if components overlap or are too close to edges
**Measurements:** Show center-to-center distances between components

**PDF export:**
- 1:1 scale drill template
- Component labels with drill bit sizes
- Registration marks for alignment
- Print on standard US Letter/A4

### Circuit Diagrams

Each pedal includes a simplified schematic view (SVG) showing:
- Signal flow (left to right)
- Active components highlighted
- The component being tweaked pulses/glows
- NOT full schematics — functional block diagrams that teach the circuit concept

---

## Scope for V1

### In Scope
- [x] 6 classic circuits (Tube Screamer, Big Muff, Klon, RAT, Fuzz Face, Phase 90)
- [x] Real-time audio processing via Web Audio API
- [x] Component value tweaking with immediate audio feedback
- [x] Pre-recorded clean guitar samples (at least chord + single note + riff)
- [x] Oscilloscope-style waveform visualization
- [x] Enclosure layout designer with drag-and-drop
- [x] 5 standard enclosure sizes
- [x] PDF drill template export at 1:1 scale
- [x] Fully responsive (desktop-first, functional on tablet)
- [x] Tactical hardware UI aesthetic
- [x] Deploy to public URL

### Out of Scope (V2+)
- Live guitar input via getUserMedia
- Custom circuit builder (wire your own topology)
- PCB layout / trace routing
- Component sourcing / BOM generation
- User accounts / save/load designs
- Full SPICE simulation
- 3D enclosure rendering

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Web Audio API latency makes tweaking feel sluggish | High | Use `AudioWorklet` for critical path if needed; parameter changes via `.setValueAtTime()` for sample-accurate updates |
| Clipping curves don't sound realistic enough | Medium | Use reference recordings from real pedals for A/B comparison; add post-clipping cabinet IR convolution as a polish pass |
| PDF export scaling is wrong | Medium | Test with physical ruler on printed output; include calibration marks |
| SVG drag-and-drop performance with many components | Low | Unlikely to exceed 20 components; @dnd-kit handles this fine |
| Mobile audio autoplay restrictions | Medium | Require user interaction (tap "Play") before starting audio context |
| Font loading (Departure Mono availability) | Low | Self-host font files; fallback to JetBrains Mono (freely available) |

---

## Competitive Landscape

| Existing Tool | What It Does | What It Lacks |
|--------------|-------------|---------------|
| **Noise-box.es** | Web audio guitar amp sim | No pedal circuits, no enclosure design, generic UI |
| **LiveSPICE** | Real-time SPICE simulation | Desktop only, ugly UI, no enclosure design |
| **Pachyderm Pedals templates** | Static PDF drill templates | No interactivity, no audio, no design tool |
| **Keech Design jigs** | 3D printed drill jigs | Physical product, no digital design |
| **WASABI Pedalboard** | Academic Web Audio pedalboard | Research demo, not user-friendly, no enclosure |

**Our differentiation:** First tool that combines circuit audio simulation + enclosure design + beautiful UI in one web app. The tactical hardware aesthetic alone sets it apart from everything in this space.

---

## Open Questions for Resolution in Planning

1. **Audio samples:** Record our own clean guitar samples or use Creative Commons? (CC is faster; recording is higher quality but requires sourcing)
2. **Deployment target:** GitHub Pages (free, simple) vs Vercel (free tier, better DX)?
3. **State persistence:** LocalStorage for saving designs in V1, or pure ephemeral?
4. **Circuit diagrams:** Full SVG schematics or simplified block diagrams?
5. **Font licensing:** Departure Mono — confirm it's freely available for web use; if not, fallback to JetBrains Mono

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| React + TypeScript + Vite | Best ecosystem for complex interactive web apps; TypeScript catches audio parameter type errors early |
| WaveShaper-based simulation (not SPICE) | Browser-feasible at 60fps; captures the *character* of each circuit without the computational cost of full simulation |
| SVG for enclosure designer | Scalable, precise, directly exportable to PDF; better than Canvas for drag-and-drop with hit testing |
| Zustand for state | Lightweight, no boilerplate, works naturally with audio parameter binding |
| 6 circuits for V1 | Covers the major pedal families (overdrive, distortion, fuzz, phaser) without scope creep |
| Desktop-first responsive | Primary use case is workbench design at a desk; tablet support is nice-to-have, phone is view-only |

---

*This brainstorm was created by Opus (design/architecture) following the Compound Engineering workflow. Next step: ce:plan with detailed implementation tasks, then hand to Codex for execution.*
