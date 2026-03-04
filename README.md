# Pedal Architect

Interactive guitar effects pedal design workbench with component-level audio simulation.

**[Live Demo →](https://maertbot.github.io/pedal-architect/)**

## Features

### Circuit Lab
Real-time audio simulation of guitar effect circuits with interactive controls.

- **15 circuits** — classic overdrives, distortions, fuzz, and modulation effects
- **Oscilloscope** — real-time waveform and FFT visualization
- **Frequency response** — analytical and live spectrum overlay
- **Rotary knob controls** — adjust Drive, Tone, Level, and circuit-specific parameters

### WDF Engine (Component-Level)
Three circuits use a Wave Digital Filter engine that models individual electronic components:

- **Tube Screamer TS808** — feedback clipping with RC tone stage
- **Big Muff Pi** — four cascaded clipping stages with LP/HP tone stack
- **Klon Centaur** — parallel clean/drive blend with germanium diodes

Each WDF circuit includes:
- **Interactive topology diagram** — click any component to inspect and modify it
- **Component bypass** — remove individual parts and hear what changes
- **Value scaling** — adjust component values (0.25×–4×) in real time
- **Signal level meters** — see audio flow through each stage

### Learn Mode
Guided step-by-step walkthroughs for each WDF circuit:
- **22 lessons** across 3 circuits with interactive experiments
- **Bypass experiments** — toggle components off to hear their contribution
- **Value experiments** — scale component values and listen for tonal changes
- **Knob experiments** — explore parameter ranges with guided listening cues

### Enclosure Designer
Visual drag-and-drop pedal enclosure layout with PDF drill template export.

## Tech Stack

- React 19 + TypeScript + Vite
- Web Audio API with AudioWorklet
- Wave Digital Filter (WDF) engine — sample-by-sample component modeling
- Zustand for state management
- jsPDF for drill template export

## Circuits

| Circuit | Engine | Year | Category |
|---------|--------|------|----------|
| Tube Screamer TS808 | Legacy | 1979 | Overdrive |
| **Tube Screamer TS808 (WDF)** | Component-Level | 1979 | Overdrive |
| Big Muff Pi | Legacy | 1969 | Fuzz |
| **Big Muff Pi (WDF)** | Component-Level | 1969 | Fuzz |
| Klon Centaur | Legacy | 1994 | Overdrive |
| **Klon Centaur (WDF)** | Component-Level | 1994 | Overdrive |
| ProCo RAT | Legacy | 1978 | Distortion |
| Fuzz Face | Legacy | 1966 | Fuzz |
| Phase 90 | Legacy | 1974 | Modulation |
| Boss DS-1 | Legacy | 1978 | Distortion |
| Boss SD-1 | Legacy | 1981 | Overdrive |
| Boss BD-2 | Legacy | 1995 | Overdrive |
| Boss MT-2 | Legacy | 1991 | Distortion |
| Ibanez TS9 | Legacy | 1982 | Overdrive |
| MXR Distortion+ | Legacy | 1973 | Distortion |

## Development

```bash
npm install
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint check
```

## Deploy

```bash
npm run build
npx gh-pages -d dist
```

## License

MIT
