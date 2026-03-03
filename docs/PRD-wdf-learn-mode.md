# Pedal Architect: Component-Level Audio Engine + Learn Mode

## PRD & Phased Implementation Guide

**Goal:** Replace the current "sketch-level" Web Audio chain (WaveShaper + BiquadFilter approximations) with a component-level Wave Digital Filter (WDF) engine that models individual electronic components (resistors, capacitors, diodes, op-amps). This enables both VST-grade audio fidelity AND an interactive "Learn" mode where users can bypass, swap, and inspect individual circuit components in real time.

**Target circuits for WDF upgrade (Phase 1-3):**
1. Tube Screamer TS808
2. Big Muff Pi
3. Klon Centaur

**Existing circuits (12 total) remain untouched** — they keep using the current Web Audio chain. The new WDF engine runs alongside, not replacing. Users see which engine each circuit uses.

---

## Architecture Overview

### What is WDF (Wave Digital Filters)?

WDF is a mathematically rigorous method for translating analog circuits into digital models. Each physical component (resistor, capacitor, diode, op-amp) becomes a "WDF element" with port variables (wave quantities). Components connect via "adaptors" (series/parallel junctions). The framework guarantees:
- Correct frequency response from the actual circuit topology
- Proper nonlinear behavior (diode clipping varies with frequency/amplitude)
- Component-level granularity (you can bypass or modify any single part)

### Why WDF over neural network models?

Neural capture (NAM/GuitarML) produces excellent audio but is a **black box** — you can't decompose it into components. WDF gives us both: high-fidelity audio AND per-component interactivity for the Learn mode. This is the only approach that achieves both goals simultaneously.

### Runtime Architecture

```
┌─────────────────────────────────────────────────┐
│  Main Thread (React UI)                         │
│  ┌───────────────────┐  ┌────────────────────┐  │
│  │ Circuit Topology   │  │ Learn Mode Panel   │  │
│  │ (SVG signal flow)  │  │ (explanations,     │  │
│  │                    │  │  bypass toggles)   │  │
│  └────────┬───────────┘  └────────┬───────────┘  │
│           │ postMessage()         │              │
│           ▼                       ▼              │
│  ┌────────────────────────────────────────────┐  │
│  │ AudioWorkletNode (bridge)                  │  │
│  └────────────────┬───────────────────────────┘  │
└───────────────────┼──────────────────────────────┘
                    │
┌───────────────────┼──────────────────────────────┐
│  AudioWorklet Thread (audio rate, 128 samples)   │
│  ┌────────────────▼───────────────────────────┐  │
│  │ WDFProcessor                               │  │
│  │  - Runs WDF graph sample-by-sample         │  │
│  │  - Receives param/bypass messages           │  │
│  │  - Each component is a WDF element          │  │
│  │  - Bypass = replace element with wire       │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

**Language choice: TypeScript in AudioWorklet** (not WASM). Rationale:
- A single pedal circuit = ~15-30 WDF elements. At 44.1kHz / 128-sample blocks, that's ~345 blocks/sec. Even in JS, processing 30 elements × 128 samples = 3,840 operations per block is trivially fast.
- No build toolchain complexity (Rust/C++ → WASM compile step)
- Easier debugging, same language as the rest of the app
- If we ever hit perf limits, we can port the hot loop to WASM later without changing the architecture

---

## Current Codebase Context

**Stack:** React 19 + TypeScript + Vite + Zustand + Web Audio API
**Repo:** https://github.com/maertbot/pedal-architect
**Live:** https://maertbot.github.io/pedal-architect/
**Deploy:** `npm run build && npx gh-pages -d dist`

### Key files you'll modify or extend:
- `src/audio/AudioEngine.ts` — main audio engine, manages AudioContext + routing
- `src/audio/types.ts` — CircuitModel, CircuitRuntime, ParameterDefinition interfaces
- `src/audio/circuits/*.ts` — individual circuit implementations (current Web Audio chain approach)
- `src/data/circuits.ts` — circuit registry (exports CIRCUITS array + CIRCUIT_MAP)
- `src/components/circuit-lab/CircuitLab.tsx` — main circuit view
- `src/components/circuit-lab/CircuitDiagram.tsx` — signal flow visualization
- `src/components/shared/FrequencyResponse.tsx` — frequency response chart
- `src/store/useStore.ts` — Zustand state

### Current CircuitModel interface:
```typescript
interface CircuitModel {
  id: string
  name: string
  description: string
  category: CircuitCategory
  year: number
  iconPath: string
  parameters: ParameterDefinition[]
  create: (ctx: AudioContext) => CircuitRuntime
}
```

### Current CircuitRuntime interface:
```typescript
interface CircuitRuntime {
  input: AudioNode
  output: AudioNode
  setParameter: (paramId: string, value: number) => void
  destroy?: () => void
  getFilterNodes?: () => FilterNodeDescriptor[]
  getPhaserConfig?: () => PhaserConfig
}
```

New WDF circuits will implement the same `CircuitModel` interface but return a `CircuitRuntime` backed by an AudioWorkletNode instead of raw Web Audio nodes. Existing circuits are untouched.

---

## Compound Engineering Process

Each phase follows this cycle:
1. **CE: Brainstorm** — explore approaches, identify risks
2. **CE: QA** — initial quality gate (especially important since the stakeholder has no SWE experience)
3. **CE: Plan** — detailed implementation steps
4. **CE: Work** — write code, run tests
5. **CE: Review** — lint, test, build, visual QA
6. **CE: Compound** — document lessons learned, update DEV-NOTES.md

---

## Phase 1: WDF Core Engine + AudioWorklet + Tube Screamer

**Goal:** Build the WDF framework, wire it into AudioWorklet, and port the Tube Screamer as the first component-level circuit. This phase proves the entire architecture end-to-end.

### 1A: WDF Primitives Library
**Files:** `src/audio/wdf/elements.ts`, `src/audio/wdf/adaptors.ts`, `src/audio/wdf/types.ts`

Build the core WDF element library:
- **One-port elements:** Resistor, Capacitor (with bilinear transform), Inductor, IdealVoltageSource
- **Nonlinear elements:** DiodePair (Shockley equation, Newton-Raphson solver), DiodeClipper (asymmetric option)
- **Adaptors:** SeriesAdaptor, ParallelAdaptor (N-port, compute port resistances + wave scattering)
- **Root element:** RootNode (terminates the WDF tree, handles nonlinear solving)

Each element implements:
```typescript
interface WDFElement {
  portResistance: number
  incident: number   // incoming wave
  reflected: number  // outgoing wave
  accept(wave: number): void    // receive incident wave
  reflect(): number             // compute reflected wave
  setParam?(value: number): void
  bypass?: boolean              // when true, element acts as wire (pass-through)
}
```

**Tests:**
- Unit test: Resistor with known values produces correct port resistance
- Unit test: Capacitor frequency response matches analog RC filter (compare against known 1kHz RC cutoff)
- Unit test: DiodePair I-V curve matches Shockley equation within 1% for standard silicon diode parameters (Is=1e-12, Vt=25.85mV, n=1.0)
- Unit test: SeriesAdaptor with R+C produces correct combined port resistance

### 1B: AudioWorklet Processor
**Files:** `src/audio/wdf/WDFProcessor.ts` (worklet), `src/audio/wdf/WDFWorkletNode.ts` (main thread bridge)

The processor:
- Receives a circuit topology description via `port.postMessage()` during setup
- Processes audio sample-by-sample through the WDF graph
- Handles parameter change messages (knob turns)
- Handles bypass toggle messages (for Learn mode — Phase 4, but wire the message handling now)
- Reports back per-component signal levels (for UI visualization in Phase 2)

The bridge node:
- Extends `AudioWorkletNode`
- Provides typed API: `setParameter(paramId, value)`, `bypassComponent(componentId, bypassed)`, `getComponentLevels()`
- Implements `CircuitRuntime` interface so it plugs into existing AudioEngine

**Tests:**
- Integration test: Create WorkletNode, send 1kHz sine, verify output is not silence
- Integration test: Bypass all components → output equals input (passthrough)

### 1C: Tube Screamer WDF Model
**File:** `src/audio/wdf/circuits/tubeScreamerWDF.ts`

Model the actual TS808 circuit topology:
1. **Input buffer** — unity gain buffer (JFET follower → model as voltage source with series R)
2. **Clipping stage** — inverting op-amp with feedback loop containing:
   - R_input (4.7kΩ)
   - C_input (0.047µF) — the coupling cap
   - R_feedback (51kΩ) in series with Drive pot (0-500kΩ)
   - C_feedback (0.047µF)
   - Antiparallel diode pair (1N914 silicon) in the feedback path
3. **Tone stage** — simple RC lowpass:
   - R_tone (fixed 220Ω + Tone pot 0-20kΩ)
   - C_tone (0.22µF)
   - Highpass roll-off cap (0.1µF)
4. **Volume stage** — output attenuator pot

Each component gets a unique `componentId` string (e.g., `"ts-input-buffer"`, `"ts-clipping-diodes"`, `"ts-drive-pot"`, `"ts-tone-rc"`, `"ts-volume"`).

Component metadata (for Learn mode, used in Phase 4 but defined now):
```typescript
interface WDFComponentMeta {
  id: string
  name: string                    // "Clipping Diodes"
  type: 'resistor' | 'capacitor' | 'diode' | 'opamp' | 'pot' | 'buffer'
  stage: string                   // "input" | "clipping" | "tone" | "output"
  description: string             // "Two 1N914 silicon diodes wired back-to-back..."
  whyItMatters: string            // "These diodes are what makes a Tube Screamer sound..."
  whatHappensWithout: string      // "Without the diodes, the signal passes through clean..."
  realWorldValue?: string         // "4.7kΩ" or "0.047µF" or "1N914 silicon"
  linkedParamId?: string          // which knob controls this (e.g., "drive")
}
```

**Tests:**
- Audio test: Tube Screamer WDF output with Drive=8, Tone=1800 is not silence and has harmonic content above fundamental
- Bypass test: bypass clipping diodes → output is cleaner (lower THD)
- Bypass test: bypass tone RC → output has more high-frequency content
- Parameter test: increasing Drive increases harmonic distortion measurably
- Comparison test: WDF frequency response at multiple Tone knob positions roughly matches expected TS808 curve shape (mid-hump, LP rolloff above tone frequency)

### 1D: Integration with Existing App
**Files:** modify `src/data/circuits.ts`, `src/audio/AudioEngine.ts`

- Register `tube-screamer-wdf` as a new circuit entry in CIRCUITS array
- Keep existing `tube-screamer` as-is (legacy)
- AudioEngine.setCircuit() already handles any CircuitRuntime — the WDF version just returns one backed by AudioWorkletNode instead of raw nodes
- Add `engine: 'legacy' | 'wdf'` field to CircuitModel for UI to show badge
- Add AudioWorklet module registration in AudioEngine.init() (`audioCtx.audioWorklet.addModule(...)`)

**Tests:**
- E2E test: select Tube Screamer WDF in UI → audio plays → frequency response chart renders
- Build test: `npm run build` passes (Vite bundles the worklet correctly)

### Phase 1 Verification Checklist
- [ ] `npm run test` — all unit + integration tests pass
- [ ] `npm run lint` — clean
- [ ] `npm run build` — clean production build
- [ ] Manual: open app, select "Tube Screamer (WDF)", press play, hear distorted tone
- [ ] Manual: adjust Drive knob → tone changes in real time
- [ ] Manual: confirm existing legacy circuits still work unchanged

---

## Phase 2: Interactive Circuit Topology Visualization + Bypass Controls

**Goal:** Build an interactive signal flow diagram that shows every component in the WDF circuit. Users can click components to see info and toggle bypass.

### 2A: Circuit Topology Data Structure
**File:** `src/audio/wdf/topology.ts`

Define the visual topology for each WDF circuit:
```typescript
interface TopologyNode {
  componentId: string          // matches WDFComponentMeta.id
  x: number; y: number        // position in SVG layout
  width: number; height: number
  shape: 'rect' | 'diode' | 'cap' | 'resistor' | 'opamp' | 'pot'
  connections: string[]        // IDs of connected components
}

interface CircuitTopology {
  circuitId: string
  nodes: TopologyNode[]
  signalFlowDirection: 'left-to-right'
  stages: { id: string; name: string; startX: number; endX: number }[]
}
```

**Tests:**
- Unit test: Tube Screamer topology has nodes for all components defined in 1C
- Unit test: all connections reference valid node IDs (no dangling refs)

### 2B: Topology Renderer Component
**Files:** `src/components/circuit-lab/CircuitTopology.tsx`, `src/components/circuit-lab/ComponentNode.tsx`

- SVG-based signal flow diagram
- Each component rendered as a schematic-style symbol (resistor zigzag, capacitor plates, diode triangle, op-amp triangle)
- Signal flow animated with a subtle pulse/glow traveling left-to-right
- Bypassed components shown grayed out with a dashed outline
- Active component highlighted on hover with tooltip showing name + value
- Click a component → info panel slides in from right (component name, description, real-world value)
- Click bypass toggle → sends message to AudioWorklet → audio changes immediately

Visual style: match existing app aesthetic (matte black `#0a0a0a`, JetBrains Mono, red accent `#ff2020`, amber `#ffb020`). Component symbols in a phosphor green (`#20ff60`) when active, dim gray when bypassed.

**Tests:**
- Render test: TopologyRenderer mounts without errors for Tube Screamer WDF
- Interaction test: clicking bypass toggle sends correct message to AudioWorklet
- Visual QA: screenshot at 1440px desktop + 375px mobile

### 2C: Real-Time Signal Level Indicators
**Files:** extend `WDFProcessor.ts`, add `src/components/circuit-lab/SignalMeter.tsx`

- Worklet tracks RMS signal level at each component's output
- Reports levels back to main thread via `port.postMessage()` at ~15fps (every ~2940 samples)
- UI shows small level meters on each component node in the topology view
- When a component is bypassed, its meter shows the "before" level passing through

**Tests:**
- Unit test: RMS calculation produces correct value for known sine wave
- Integration test: with audio playing, component levels are non-zero and vary by position in chain

### Phase 2 Verification Checklist
- [ ] All tests pass
- [ ] Lint + build clean
- [ ] Manual: Tube Screamer WDF shows interactive signal flow diagram
- [ ] Manual: clicking a component shows its info
- [ ] Manual: toggling bypass on clipping diodes produces audible change + visual update
- [ ] Manual: signal level meters animate while audio plays
- [ ] Manual: mobile layout (375px) is usable

---

## Phase 3: Big Muff + Klon Centaur WDF Models

**Goal:** Port the remaining two circuits to WDF with full component-level topology.

### 3A: Big Muff Pi WDF Model
**File:** `src/audio/wdf/circuits/bigMuffWDF.ts`

The Big Muff is notable for its **four cascaded clipping stages** and unique **tone stack** (parallel LP/HP paths that create the mid-scoop).

Component topology:
1. **Input stage** — coupling cap + bias resistor
2. **Clipping stage 1** — common-emitter transistor gain stage + silicon diode pair
3. **Clipping stage 2** — same topology, more gain
4. **Clipping stage 3** — same
5. **Clipping stage 4** — same
6. **Tone stack** — the signature element:
   - Signal splits into LP path (R + C to ground) and HP path (C in series)
   - Tone pot blends between them
   - At center position: both paths contribute → mid frequencies cancel → characteristic scoop
7. **Volume stage** — output pot

Key research references:
- ElectroSmash Big Muff analysis: https://www.electrosmash.com/big-muff-pi-analysis
- Component values: R1=39kΩ, C1=100nF (coupling), clipping diodes=1N914, tone cap=10nF/3.9nF

**Tests:**
- Audio test: Big Muff WDF with Sustain=12, Tone=850 produces heavy fuzz with audible mid-scoop
- Bypass test: bypass all 4 clipping stages → clean signal
- Bypass test: bypass tone stack → flat(ter) frequency response, no mid-scoop
- Parameter test: Tone at min = dark/muffled, Tone at max = bright/cutting, Tone at noon = scooped
- Topology test: all 7 stages have valid component metadata

### 3B: Klon Centaur WDF Model
**File:** `src/audio/wdf/circuits/klonCentaurWDF.ts`

The Klon's magic is its **clean blend circuit** — the dry signal mixes with the driven signal, and the blend ratio is gain-dependent.

Component topology:
1. **Input buffer** — high-impedance JFET buffer
2. **Signal split** — signal goes to both clean and drive paths
3. **Clean path** — attenuated clean signal, gain-dependent blend (more gain = less clean)
4. **Drive path:**
   - Pre-gain stage (gain pot controls)
   - Germanium diode clipping pair (lower forward voltage = softer clipping than silicon)
   - Post-clipping filter
5. **Summing stage** — clean + drive mixed
6. **Treble control** — high-shelf EQ
7. **Output buffer** — output level pot

Key research references:
- ElectroSmash Klon analysis: https://www.electrosmash.com/klon-centaur-analysis  
- The clean blend is what makes it "transparent" — even at high gain, the clean fundamental comes through

**Tests:**
- Audio test: Klon WDF with Gain=7, Treble=3200 produces mild overdrive with clean note definition
- Bypass test: bypass diodes → clean signal with gain structure intact
- Bypass test: bypass clean path → loses the "transparent" character, becomes more conventional overdrive
- Parameter test: low gain = mostly clean with slight grit, high gain = clear overdrive but fundamental still present
- Topology test: all 7 stages have valid component metadata

### 3C: Circuit Registration + UI Updates
- Register `big-muff-wdf` and `klon-centaur-wdf` in CIRCUITS array
- All three WDF circuits get `engine: 'wdf'` badge in selector UI
- Frequency response chart works with WDF circuits (may need to compute analytically from WDF element values rather than reading BiquadFilterNode properties — adapt `frequencyResponse.ts`)

**Tests:**
- All three WDF circuits selectable, playable, and show topology view
- Frequency response renders for all three
- Legacy versions of all three still work

### Phase 3 Verification Checklist
- [ ] All tests pass
- [ ] Lint + build clean
- [ ] Manual: Big Muff WDF — four clipping stages visible, mid-scoop audible
- [ ] Manual: Klon WDF — clean blend audible, transparency at low gain
- [ ] Manual: all 3 WDF circuits have interactive topology with bypass
- [ ] Manual: existing 12 legacy circuits unaffected

---

## Phase 4: Learn Mode Tab

**Goal:** Build the educational "Learn" tab — step-by-step walkthroughs that teach users what each component does and WHY, with interactive experiments.

### 4A: Learn Mode Data Structure
**File:** `src/data/learn/types.ts`, `src/data/learn/tubeScreamer.ts`, etc.

```typescript
interface LearnStep {
  id: string
  title: string                  // "The Clipping Stage"
  narration: string              // 2-3 sentences explaining what this stage does
  highlightComponents: string[]  // component IDs to highlight in topology
  autoBypass: string[]           // components to bypass at this step
  experiment?: {
    instruction: string          // "Try toggling the diodes on and off"
    targetComponent: string      // component to toggle
    listenFor: string            // "Notice how the tone becomes clean and thin"
  }
  knobSuggestion?: {
    paramId: string
    values: number[]             // suggested values to try
    explanation: string          // "As you increase Drive, the diodes clip harder"
  }
}

interface CircuitLesson {
  circuitId: string
  title: string                  // "Inside the Tube Screamer"
  intro: string                  // opening paragraph
  steps: LearnStep[]
  conclusion: string             // closing summary
}
```

### 4B: Learn Tab UI
**Files:** `src/components/learn/LearnTab.tsx`, `src/components/learn/LearnStepper.tsx`, `src/components/learn/ExperimentPanel.tsx`

- New "Learn" tab alongside existing "Circuit Lab" and "Enclosure Designer" tabs
- Left panel: step-by-step narration with forward/back navigation
- Center: circuit topology view (reuse Phase 2 component) with current step's components highlighted
- Right: experiment panel when a step has an interactive experiment
- Audio auto-plays so user can hear changes as they progress through steps
- Bypassed components visually dim + audio reflects bypass state
- "Reset" button restores all components to active state
- Mobile: stacked layout (narration → topology → experiment)

### 4C: Lesson Content for All Three Circuits

**Tube Screamer lesson (~8 steps):**
1. The complete signal path overview
2. Input buffer — why it matters for impedance
3. The clipping stage — diodes explained, bypass experiment
4. Drive control — how feedback resistance affects clipping
5. Why diode type matters (silicon vs germanium) — conceptual, with Klon comparison teased
6. Tone control — RC lowpass, sweep experiment
7. Volume stage — why it's after everything else
8. The mid-hump — why the TS sounds "warm" (interaction of input coupling cap + feedback cap)

**Big Muff lesson (~7 steps):**
1. Signal path overview — "four stages of destruction"
2. Single clipping stage explained — transistor gain + diode clipping
3. Why four stages? Cascade experiment (bypass stages one by one)
4. The legendary tone stack — LP/HP split and the mid-scoop
5. Tone knob sweep — what "noon" does vs extremes
6. Sustain control — how input gain feeds the clipping stages
7. Why it sounds different from a Tube Screamer (architectural comparison)

**Klon Centaur lesson (~7 steps):**
1. Signal path overview — "the transparent overdrive"
2. The clean blend — THE innovation, bypass clean path experiment
3. Why germanium diodes? Softer clipping vs silicon (compare with TS)
4. Gain-dependent blend — how the clean/drive ratio shifts
5. Treble control — high-shelf, not lowpass (why it sparkles)
6. Input/output buffers — impedance and why they matter on a pedalboard
7. Why "transparent" isn't magic — it's engineering (the clean signal never leaves)

**Tests:**
- Unit test: each lesson has valid component references (all IDs exist in topology)
- Render test: LearnTab mounts, step navigation works
- Integration test: advancing steps applies correct bypass states
- Visual QA: screenshots at desktop + mobile

### Phase 4 Verification Checklist
- [ ] All tests pass
- [ ] Lint + build clean
- [ ] Manual: Learn tab loads, Tube Screamer lesson plays through all 8 steps
- [ ] Manual: bypass experiments produce audible changes
- [ ] Manual: Big Muff + Klon lessons complete
- [ ] Manual: mobile layout works
- [ ] Manual: can switch between Learn tab and Circuit Lab without breaking audio

---

## Phase 5: Polish, Performance, Deploy

### 5A: Performance Audit
- Profile AudioWorklet CPU usage with Chrome DevTools
- Ensure WDF processing stays under 50% of audio budget (< ~1.5ms per 128-sample block)
- If needed, optimize hot loops (pre-compute scattering matrices, avoid allocations in process())

### 5B: Visual Polish
- Circuit selector shows WDF badge with "Component-Level" label
- Smooth transitions between Learn mode steps
- Topology view zoom/pan for complex circuits (Big Muff has many nodes)
- Loading state while AudioWorklet module initializes

### 5C: A/B Comparison Feature (Bonus)
- "Compare" button in WDF circuits: toggles between WDF engine and legacy Web Audio chain
- Lets user hear the fidelity difference
- Shows which components the legacy version was approximating vs modeling

### 5D: Final QA + Deploy
- Full regression test: all 12 legacy + 3 WDF circuits
- Browser compatibility: Chrome, Firefox, Safari (AudioWorklet support)
- Deploy to GitHub Pages
- Update README with feature description

### Phase 5 Verification Checklist
- [ ] Performance: AudioWorklet CPU < 50% budget
- [ ] All tests pass across phases 1-4
- [ ] Production build clean, deployed to GitHub Pages
- [ ] README updated

---

## Reference Material

### WDF Implementation References
- **chowdsp_wdf** (C++, reference implementation): https://github.com/Chowdhury-DSP/chowdsp_wdf
- **rt-wdf** (real-time WDF library): https://github.com/RT-WDF/rt-wdf_lib
- **Julius O. Smith — Physical Audio Signal Processing** (WDF theory): https://ccrma.stanford.edu/~jos/pasp/Wave_Digital_Filters.html
- **Kurt Werner's PhD thesis** — canonical reference for WDF with nonlinearities

### Circuit Analysis References
- **ElectroSmash Tube Screamer**: https://www.electrosmash.com/tube-screamer-analysis
- **ElectroSmash Big Muff Pi**: https://www.electrosmash.com/big-muff-pi-analysis
- **ElectroSmash Klon Centaur**: https://www.electrosmash.com/klon-centaur-analysis
- **AMZ Tube Screamer analysis**: http://www.muzique.com/lab/ts.htm

### Existing Repo Context
- **Repo:** https://github.com/maertbot/pedal-architect
- **Deploy command:** `npm run build && npx gh-pages -d dist`
- **Stack:** React 19 + TypeScript + Vite + Zustand + Web Audio API
- **Current circuits:** 12 total (6 original + 6 added), all using Web Audio chain approach
- **Aesthetic:** Matte black (#0a0a0a), JetBrains Mono, red (#ff2020), amber (#ffb020), phosphor green (#20ff60)

### Compound Engineering Protocol
Follow CE workflow for each phase:
1. **CE: Brainstorm** — explore approaches, identify risks, research unknowns
2. **CE: QA** — initial quality gate before coding (especially for non-SWE stakeholder)
3. **CE: Plan** — detailed task breakdown with file paths
4. **CE: Work** — implement, write tests, iterate
5. **CE: Review** — lint/test/build verification + visual QA
6. **CE: Compound** — document lessons learned in DEV-NOTES.md

---

## How To Use This Document

This PRD is designed for **context-window-sized work sessions**:

1. **Start Phase 1** by pasting this entire document into a fresh context, then say: "Execute Phase 1 of this PRD using the Compound Engineering workflow. Start with CE: Brainstorm."
2. When Phase 1 is complete and all verification checklist items pass, **start a new context** and paste this document again with: "Phase 1 is complete. Execute Phase 2."
3. Repeat for Phases 3-5.

Each phase is self-contained with its own tests and verification checklist. The document provides all the context needed to pick up from any phase.

**Important:** After completing each phase:
- Commit all changes with a descriptive message
- Push to origin/main
- Deploy to GitHub Pages (`npm run build && npx gh-pages -d dist`)
- Update this document's checklist items with ✅
- Log any lessons learned in DEV-NOTES.md
