# Pedal Architect: Component-Level Audio Engine + Learn Mode

## PRD & Phased Implementation Guide

**Goal:** Replace the current "sketch-level" Web Audio chain (WaveShaper + BiquadFilter approximations) with a component-level Wave Digital Filter (WDF) engine that models individual electronic components (resistors, capacitors, diodes, op-amps). This enables both VST-grade audio fidelity AND an interactive "Learn" mode where users can bypass, swap, and inspect individual circuit components in real time.

**Target circuits for WDF upgrade (Phase 1-3):**
1. Tube Screamer TS808
2. Big Muff Pi
3. Klon Centaur

**Existing circuits (12 total) remain untouched** — they keep using the current Web Audio chain. The new WDF engine runs alongside, not replacing. Users see which engine each circuit uses.

---

## Execution Model

### Roles

**Opus (orchestrator + taste):** Runs each CE: Brainstorm, CE: QA, and CE: Review step. Makes all architectural decisions, design direction, and quality judgments. Writes the prompts that Codex receives. Does NOT write implementation code directly.

**Codex gpt-5.3 (builder):** Receives a detailed CE: Plan + CE: Work prompt from Opus and executes autonomously. Writes all implementation code, tests, and build verification. Reports back with commit hash + test results.

### Workflow Per Phase

```
Opus: CE: Brainstorm     → explore approaches, risks, research
Opus: CE: QA             → quality gate (plain-language for non-SWE stakeholder)
Opus: CE: Plan           → detailed task spec for Codex
      ↓ (hand off to Codex)
Codex: CE: Work          → implement code, write tests, run build
      ↓ (Codex reports back)
Opus: CE: Review         → verify tests pass, visual QA, design quality gate
Opus: CE: Compound       → document lessons in DEV-NOTES.md
```

### Design Skills (mandatory for all UI work)

Two design skill protocols govern all visual/UI decisions in this project. Load and follow them during any phase that touches UI components.

#### Frontend Design Skill
**Purpose:** Ensure production-grade, distinctive interfaces that avoid generic AI aesthetics.

Before any UI coding, commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Commit to an extreme. For Pedal Architect, the established direction is **tactical hardware / NASA mission control** — matte black surfaces, phosphor displays, precision instruments.
- **Differentiation**: What makes this UNFORGETTABLE?

Requirements for all UI work:
- Typography: distinctive, characterful choices (JetBrains Mono is established; pair with a display font for headers if adding new sections)
- Color: dominant dark with sharp accents. Existing palette (#0a0a0a / #ff2020 / #ffb020 / #20ff60) is the foundation — extend, don't replace
- Motion: high-impact moments. One orchestrated reveal > scattered micro-interactions. Signal flow animation, bypass toggle transitions, learn mode step transitions
- Spatial composition: unexpected layouts welcome. Asymmetry, overlap, grid-breaking elements where they serve the experience
- Backgrounds: create atmosphere and depth. Noise textures, subtle grid patterns, layered transparencies — NOT flat solid backgrounds
- **NEVER**: Inter/Roboto/Arial, purple gradients, cookie-cutter component patterns, generic card layouts

#### Make Good Art Skill
**Purpose:** Ensure visual elements are intentionally designed, not one-shot mediocre outputs.

For any significant visual component (topology diagrams, learn mode UI, signal flow animations):
1. **Intent first**: What should the viewer see first? What mood/energy? What's the attention hierarchy?
2. **Generate options**: Never solve on first try for visual design. Propose 2-3 directions, choose the strongest.
3. **Value structure**: Dominant dark theme means the value plan is critical — where do the bright accents live? Reserve strongest contrast for focal elements (active components, signal flow, experiment targets).
4. **Quality gates**: Every visual component must pass:
   - 3-second read test (can user understand the view in 3 seconds?)
   - Figure/ground separation (components readable against background?)
   - Attention hierarchy (eye goes where intended?)
   - Mobile distance read (works at phone arm's length?)

These skills apply during CE: Brainstorm (design direction), CE: Plan (design specs for Codex), and CE: Review (visual QA gates).

### CE: QA — Non-SWE Stakeholder Gate (mandatory every phase)

The project owner has no software engineering experience. Every phase includes a CE: QA step BEFORE coding begins. This step must:

1. **Explain in plain language** what will be built, what it will look/sound like, and how the user will interact with it
2. **Surface risks honestly** — what might not work, what's hard, what we're uncertain about
3. **Provide concrete "done" criteria** that a non-engineer can verify:
   - "You'll open the app, select Tube Screamer (WDF), and hear distorted guitar tone"
   - "You'll click on the diode symbol and hear the tone go clean"
   - NOT: "unit tests pass and the AudioWorklet initializes correctly"
4. **Ask for go/no-go** before proceeding to CE: Work

Format the QA as a conversation, not a report. Use analogies. If something is risky, say so.

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
│  │  - Receives param/bypass/value messages     │  │
│  │  - Each component is a WDF element          │  │
│  │  - Context-aware bypass (series=short,      │  │
│  │    shunt=open, feedback=safe substitute)    │  │
│  │  - Value multiplier per component           │  │
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

### Established Visual Aesthetic:
- **Theme:** Tactical hardware / NASA mission control
- **Background:** Matte black `#0a0a0a`
- **Typography:** JetBrains Mono (monospace throughout)
- **Accent colors:** Red `#ff2020` (active/danger), Amber `#ffb020` (warm/warning), Phosphor green `#20ff60` (displays/oscilloscope)
- **Surface treatments:** Subtle noise texture on panels, precision grid lines, high-contrast instrument-style controls
- **Motion:** Phosphor glow effects, CRT-style scan lines on oscilloscope, smooth parameter transitions

---

## Phase 1: WDF Core Engine + AudioWorklet + Tube Screamer

**Goal:** Build the WDF framework, wire it into AudioWorklet, and port the Tube Screamer as the first component-level circuit. This phase proves the entire architecture end-to-end. Phase 1 is purely audio engineering — no new UI components (that's Phase 2).

### CE: QA Gate (for non-SWE stakeholder)

**What you're building in plain language:**
Right now, the Tube Screamer in the app is like a photo of a Tube Screamer — it looks roughly right and sounds kinda like one, but it's a flat image. What we're building is a working replica of the actual circuit inside a Tube Screamer, where every resistor, capacitor, and diode is modeled as a real electronic component. The audio passes through each component just like electricity flows through the real pedal.

**What you'll be able to verify when done:**
1. Open the app → you'll see a new "Tube Screamer (WDF)" option in the circuit selector alongside the existing one
2. Select it, press play → you'll hear distorted guitar tone (it should sound noticeably different from the legacy version — more organic, more responsive)
3. Turn the Drive knob → the distortion character changes smoothly
4. Turn the Tone knob → brightness changes
5. The existing 12 circuits all still work exactly as before

**What's hard / risky:**
- WDF math is non-trivial (wave scattering, Newton-Raphson solver for diodes). If Codex gets the math wrong, it'll either produce silence, white noise, or unstable feedback. We verify with automated tests that check for silence/noise/instability.
- AudioWorklet has browser quirks (Safari is finicky). Chrome/Firefox are the priority; Safari is Phase 5.

**If this phase fails:** We'll know within the first test run. The math either produces audio or it doesn't — there's no ambiguous middle ground.

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
  bypass?: boolean              // when true, element is bypassed (see bypassMode)
  bypassMode: 'short' | 'open' | 'substitute'
  // - 'short': series element → wire (signal passes through unchanged)
  // - 'open': shunt element → disconnected (signal unaffected, component removed)
  // - 'substitute': feedback element → safe neutral value (prevents instability)
  valueMultiplier: number       // default 1.0; adjustable 0.25x–4x for exploration
  baseValue: number             // the real-world component value (ohms, farads, etc.)
}
```

**Component interaction model — hybrid bypass + value exploration:**

Naive "bypass = wire" would kill the signal for shunt components (shorts to ground) and cause instability for feedback components (infinite gain). Instead:

1. **Context-aware bypass** — each component declares its `bypassMode` based on circuit position:
   - Series components (in signal path): `'short'` — replace with wire, signal passes through
   - Shunt components (to ground): `'open'` — disconnect entirely, as if physically removed
   - Feedback components (op-amp loops): `'substitute'` — replace with a safe neutral value that prevents instability (e.g., feedback diodes → large resistor, maintaining finite gain)

2. **Value multiplier** — the primary exploration tool. Every component supports 0.25x / 0.5x / 1x / 2x / 4x of its real-world value. This is MORE educational than bypass (hear what changes when a cap is bigger/smaller) and never kills the signal. The UI presents this as a slider or discrete steps.

3. **Bypass reserved for safe + dramatic cases** — bypass is available on all components but the UI prominently features it only where the result is safe and instructive (e.g., TS clipping diodes → clean signal, tone caps → flat response). For shunt/feedback components, bypass still works correctly via the context-aware mode, but value exploration is the default experiment.

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
- Handles bypass toggle messages with context-aware behavior (series→short, shunt→open, feedback→substitute)
- Handles value multiplier messages (component value scaling for exploration)
- Reports back per-component signal levels (for UI visualization in Phase 2)

The bridge node:
- Extends `AudioWorkletNode`
- Provides typed API:
  - `setParameter(paramId, value)` — knob control
  - `bypassComponent(componentId, bypassed)` — context-aware bypass
  - `setComponentValueMultiplier(componentId, multiplier)` — value exploration (0.25–4.0)
  - `getComponentLevels()` — signal level readback
- Implements `CircuitRuntime` interface so it plugs into existing AudioEngine

**Tests:**
- Integration test: Create WorkletNode, send 1kHz sine, verify output is not silence
- Integration test: Bypass all series components → signal still passes (not silence)
- Integration test: Set value multiplier 2x on tone cap → measurable frequency response shift
- Integration test: Reset all multipliers to 1.0 → output matches original

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
  circuitRole: 'series' | 'shunt' | 'feedback'  // determines bypass behavior
  description: string             // "Two 1N914 silicon diodes wired back-to-back..."
  whyItMatters: string            // "These diodes are what makes a Tube Screamer sound..."
  whatHappensWithout: string      // "Without the diodes, the signal passes through clean..."
  whatHappensScaled: string       // "Doubling this cap darkens the tone; halving brightens it"
  realWorldValue?: string         // "4.7kΩ" or "0.047µF" or "1N914 silicon"
  linkedParamId?: string          // which knob controls this (e.g., "drive")
  bypassSafe: boolean             // true = bypass is safe + dramatic (feature in UI)
                                  // false = bypass works but value slider is primary experiment
  valueRange?: {                  // if set, value multiplier is available for this component
    min: number                   // e.g., 0.25
    max: number                   // e.g., 4.0
    steps: number[]               // e.g., [0.25, 0.5, 1, 2, 4] — discrete slider stops
    unit: string                  // e.g., "kΩ", "µF", "mV"
  }
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

**Goal:** Build an interactive signal flow diagram that shows every component in the WDF circuit. Users can click components to see info and toggle bypass. This is the first major UI phase — **Frontend Design Skill and Make Good Art Skill are mandatory here.**

### CE: QA Gate (for non-SWE stakeholder)

**What you're building in plain language:**
Think of the circuit diagram on the back of a guitar pedal's box — but alive. Each component (resistor, capacitor, diode) is an interactive element you can click. Click a diode → an info panel tells you what it does and gives you two ways to explore:

1. **Value slider** (primary) — slide between 0.25x and 4x of the real component value. "What if this capacitor were 4x bigger?" You hear the tone change in real time. This is the main learning tool — it never kills the signal and teaches more than on/off.

2. **Bypass toggle** (where safe) — for components where removal is dramatic and safe (like clipping diodes → clean signal, or tone caps → flat response), a bypass switch is prominently available. For other components, bypass is tucked behind "advanced" — it still works (correctly, using context-aware removal), but the value slider is the default experiment.

Little signal meters pulse on each component showing how much audio is flowing through it.

**What you'll be able to verify when done:**
1. Select the WDF Tube Screamer → below the knobs, you'll see a signal flow diagram showing the actual circuit path
2. Components glow phosphor green when active, go dim gray when bypassed
3. Hover over any component → tooltip shows name and real-world value ("1N914 Silicon Diode")
4. Click a component → info panel slides in explaining what it does
5. Drag the value slider on the tone cap → hear brightness change in real time
6. Toggle bypass on clipping diodes → hear the signal go clean (bypass prominently shown for safe components)
7. Signal level meters pulse in time with the audio
8. On mobile, everything stacks vertically and remains readable

**What's hard / risky:**
- SVG schematic symbols need to look professional, not amateur. If they look like a high school electronics worksheet, the whole feature feels cheap. The Make Good Art quality gates will catch this.
- Signal level meters need to be smooth (no jank) while receiving data from the audio thread. If they stutter, it breaks the "live instrument" feel.
- Value multiplier range (0.25x–4x) needs to produce audible but not destructive changes for every component. Some components may need narrower ranges — this will be tuned per-component during implementation.

### Design Direction (Frontend Design + Make Good Art)

**Aesthetic concept: "X-Ray Oscilloscope"**
The topology view should feel like looking INSIDE the pedal through an oscilloscope — as if you've removed the enclosure cover and can see the components glowing on the PCB. Think: high-end test equipment display, not a textbook circuit diagram.

**Attention hierarchy:**
1. FIRST: Signal flow path (animated phosphor green trace, brightest element)
2. SECOND: Active component being inspected (highlight glow, info panel)
3. THIRD: Component symbols and labels (readable but not competing)
4. FOURTH: Signal level meters (subtle, peripheral awareness)

**Value structure:**
- Background: deep black (#0a0a0a) with subtle PCB-trace grid pattern at very low opacity
- Active components: phosphor green (#20ff60) with soft glow (box-shadow/filter)
- Modified components (value ≠ 1x): amber (#ffb020) glow — clearly "tweaked" vs stock
- Bypassed components: #333 with dashed outline — clearly "off" without being invisible
- Signal flow trace: animated dash-array, phosphor green, slight bloom effect
- Info panel: dark surface (#111) with amber (#ffb020) accent border, smooth slide-in transition
- Value slider: phosphor green track, amber thumb, current multiplier displayed as "2.0×" label
- Bypass toggle: red (#ff2020) when active → gray when bypassed, satisfying click animation. Prominently shown only for `bypassSafe: true` components; available but secondary for others

**Quality gates (must pass before shipping):**
- 3-second read: Can a new user understand "this is the signal path, these are components" in 3 seconds?
- Figure/ground: Every component clearly readable against the dark background?
- Attention hierarchy: Eye drawn to signal flow first, then highlighted component?
- Mobile distance read: Component symbols distinguishable on a phone at arm's length?
- NASA Mission Control test: Does this look like it belongs on a control panel, not in a textbook?

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
- Signal flow animated with a subtle pulse/glow traveling left-to-right (CSS animation on stroke-dasharray)
- Bypassed components shown grayed out with dashed outline
- Modified components (value ≠ 1x) shown with amber glow + multiplier label ("2.0×")
- Active component highlighted on hover with tooltip (name + value)
- Click a component → info panel slides in from right with two interaction modes:
  - **Value slider** (always shown): discrete steps [0.25×, 0.5×, 1×, 2×, 4×] with real-time audio feedback. Shows actual component value at current multiplier (e.g., "0.047µF → 0.188µF at 4×"). Component-specific `whatHappensScaled` hint text below slider.
  - **Bypass toggle** (prominent for `bypassSafe: true` components, collapsed/secondary for others): context-aware bypass with `whatHappensWithout` hint text. For non-safe components, shown under an "Advanced" disclosure.
- Component symbols must be crisp and professional — reference real schematic symbol standards (IEEE Std 315)
- "Reset All" button restores every component to 1× / unbypassed

**Design requirements (from Frontend Design Skill):**
- Motion: signal flow animation is THE signature moment. Invest in making it feel alive — subtle phosphor bloom, animated dash traveling left-to-right, gentle pulse on each component as signal passes through
- Spatial composition: the signal path should dominate the view. Component labels secondary. Stage labels (Input → Clipping → Tone → Output) as subtle zone markers, not heavy borders
- Background: subtle PCB-trace grid pattern, very low opacity (#1a1a1a lines on #0a0a0a)
- Typography: JetBrains Mono for labels, slightly smaller weight. Component values in amber, names in white
- Value slider: styled as a precision instrument — stepped detents at each multiplier, phosphor green track, amber fill showing deviation from 1× center. Current multiplier displayed prominently. Satisfying snap feel on each step.
- Bypass toggle: compact, high-contrast. Red dot when active, gray when bypassed. Satisfying scale transition on click. Featured prominently only for safe bypass components.

**Tests:**
- Render test: TopologyRenderer mounts without errors for Tube Screamer WDF
- Interaction test: clicking bypass toggle sends correct bypassComponent message to AudioWorklet
- Interaction test: dragging value slider sends correct setComponentValueMultiplier message
- Interaction test: "Reset All" restores all components to default state
- Visual QA: screenshot at 1440px desktop + 375px mobile, run through all 4 Make Good Art quality gates

### 2C: Real-Time Signal Level Indicators
**Files:** extend `WDFProcessor.ts`, add `src/components/circuit-lab/SignalMeter.tsx`

- Worklet tracks RMS signal level at each component's output
- Reports levels back to main thread via `port.postMessage()` at ~15fps (every ~2940 samples)
- UI shows small level meters on each component node in the topology view — styled as tiny phosphor bar graphs
- When a component is bypassed, its meter flatlines with a dim "no signal" indicator

**Tests:**
- Unit test: RMS calculation produces correct value for known sine wave
- Integration test: with audio playing, component levels are non-zero and vary by position in chain

### Phase 2 Verification Checklist
- [ ] All tests pass
- [ ] Lint + build clean
- [ ] Visual QA: 3-second read test passes
- [ ] Visual QA: figure/ground separation clear
- [ ] Visual QA: attention hierarchy correct (flow → component → labels → meters)
- [ ] Visual QA: mobile distance read passes (375px)
- [ ] Visual QA: NASA Mission Control aesthetic test passes
- [ ] Manual: Tube Screamer WDF shows interactive signal flow diagram
- [ ] Manual: clicking a component shows info panel with value slider + bypass toggle
- [ ] Manual: dragging value slider on tone cap produces audible brightness change
- [ ] Manual: toggling bypass on clipping diodes (bypassSafe) produces audible change + visual update
- [ ] Manual: bypass on non-safe component (via Advanced) works correctly without killing signal
- [ ] Manual: "Reset All" restores all components to default
- [ ] Manual: modified components show amber glow + multiplier label
- [ ] Manual: signal level meters animate while audio plays

---

## Phase 3: Big Muff + Klon Centaur WDF Models

**Goal:** Port the remaining two circuits to WDF with full component-level topology. Audio engineering + topology data — reuses Phase 2's renderer.

### CE: QA Gate (for non-SWE stakeholder)

**What you're building in plain language:**
Same thing we did for the Tube Screamer, but for two more pedals. The Big Muff is famous for its "wall of fuzz" — it runs the signal through FOUR separate clipping stages (like four Tube Screamers in a row, roughly). You'll be able to bypass each stage one at a time and hear the fuzz build up. The Klon Centaur is the "transparent overdrive" — its trick is mixing clean guitar signal with driven signal so you never lose note clarity. You'll be able to mute the clean path and hear how it loses that transparency.

**What you'll be able to verify when done:**
1. Three WDF circuits available in the selector, each with interactive topology diagrams
2. Big Muff: toggle clipping stages off one by one → hear the fuzz thin out progressively
3. Big Muff: toggle the tone stack → mid-scoop disappears, tone becomes flat
4. Klon: toggle the clean blend path → sound loses its "transparent" character
5. Klon: low gain sounds mostly clean with sparkle; high gain sounds overdriven but note definition remains
6. All 12 legacy circuits still work perfectly

**What's hard / risky:**
- Big Muff has 4 cascaded clipping stages — the WDF tree structure gets deeper. If Newton-Raphson convergence is slow on 4 series stages, we may need to increase iteration limits (costs CPU).
- Klon's parallel clean/drive blend is architecturally different from the other two. The WDF tree needs to split and rejoin — this is a "multi-path" topology that's harder than series chains.

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
- Topology diagrams for Big Muff and Klon use same renderer from Phase 2, just with their own topology data
- Frequency response chart works with WDF circuits (may need to compute analytically from WDF element values rather than reading BiquadFilterNode properties — adapt `frequencyResponse.ts`)

**Tests:**
- All three WDF circuits selectable, playable, and show topology view
- Frequency response renders for all three
- Legacy versions of all three still work

### Phase 3 Verification Checklist
- [ ] All tests pass
- [ ] Lint + build clean
- [ ] Manual: Big Muff WDF — four clipping stages visible in topology, mid-scoop audible
- [ ] Manual: Klon WDF — clean blend path visible, transparency audible at low gain
- [ ] Manual: all 3 WDF circuits have interactive topology with bypass
- [ ] Manual: existing 12 legacy circuits unaffected
- [ ] Visual QA: Big Muff topology readable despite more components (4 stages)
- [ ] Visual QA: Klon parallel paths (clean + drive) visually clear

---

## Phase 4: Learn Mode Tab

**Goal:** Build the educational "Learn" tab — step-by-step walkthroughs that teach users what each component does and WHY, with interactive experiments. This is the second major UI phase — **Frontend Design Skill and Make Good Art Skill are mandatory.**

### CE: QA Gate (for non-SWE stakeholder)

**What you're building in plain language:**
A guided tour of each pedal's insides. Imagine a museum audio guide, but for guitar circuits. You step through explanations like "This is the clipping stage — these two diodes are what give the Tube Screamer its sound. Press the bypass button and listen to what happens when you remove them." At each step, the relevant component lights up in the diagram, and you can experiment by toggling things on and off.

**What you'll be able to verify when done:**
1. New "Learn" tab appears alongside Circuit Lab and Enclosure Designer
2. Select a circuit → you get a step-by-step walkthrough (8 steps for Tube Screamer, 7 each for Big Muff and Klon)
3. Each step highlights the relevant component in the circuit diagram
4. Steps with experiments show an "Experiment" panel — most use value sliders ("Slide the tone cap to 4× and listen to how it darkens"), some use bypass ("Toggle the diodes off and hear the signal go clean")
5. Audio plays throughout so you hear changes as you progress
6. A "Reset" button restores everything to normal (all values to 1×, all bypasses off)
7. Works on mobile (stacked layout)

**What's hard / risky:**
- The narration has to be genuinely good — educational but not boring, accessible but not dumbed-down. Bad writing kills this feature. The content targets curious musicians AND EE students.
- Coordinating audio state + visual state + lesson state across three systems. If they get out of sync (diagram shows component modified but audio doesn't reflect it), the educational value collapses.
- Value multiplier experiments need good "listen for" guidance — the tonal changes from 0.5× to 2× can be subtle for some components. The narration must prime the user's ears.

### Design Direction (Frontend Design + Make Good Art)

**Aesthetic concept: "The Apprentice's Workbench"**
The Learn mode should feel like sitting at a master builder's bench with the pedal opened up in front of you and a knowledgeable mentor explaining each part. Warm but precise. Think: well-lit workbench in an otherwise dark workshop, spotlight on the circuit.

**Attention hierarchy:**
1. FIRST: The circuit topology diagram with highlighted component (this is what you're learning about)
2. SECOND: The narration text (what you're reading/understanding)
3. THIRD: The experiment panel (what you're doing)
4. FOURTH: Navigation (step indicators, forward/back)

**Layout concept (desktop):**
```
┌─────────────────────────────────────────────────────┐
│  [Step 3 of 8]  ● ● ◉ ○ ○ ○ ○ ○    [Reset] [Exit] │
├──────────────┬──────────────────────┬───────────────┤
│              │                      │               │
│  NARRATION   │   CIRCUIT TOPOLOGY   │  EXPERIMENT   │
│              │   (highlighted       │  PANEL        │
│  "The        │    component glows)  │               │
│   clipping   │                      │  🔴 Bypass    │
│   stage..."  │                      │  Diodes       │
│              │                      │               │
│  ◄ Back      │                      │  "Listen for  │
│     Next ►   │                      │   the change" │
│              │                      │               │
└──────────────┴──────────────────────┴───────────────┘
```

**Layout concept (mobile, stacked):**
```
┌─────────────────────┐
│ Step 3 of 8  ● ● ◉  │
├─────────────────────┤
│ "The clipping       │
│  stage..."          │
├─────────────────────┤
│  CIRCUIT TOPOLOGY   │
│  (scrollable,       │
│   component glows)  │
├─────────────────────┤
│  🔴 Bypass Diodes   │
│  "Listen for..."    │
├─────────────────────┤
│  ◄ Back    Next ►   │
└─────────────────────┘
```

**Visual polish requirements:**
- Step transition: smooth crossfade on narration text, topology highlight slides to new component (not instant jump)
- Progress indicator: small dots, current step filled with amber (#ffb020), completed steps dimmer
- Experiment panel: distinct surface (slightly lighter than background, maybe #141414) with red accent border when experiment is active
- Narration typography: JetBrains Mono but at comfortable reading size (15-16px), generous line height (1.6), warm white (#e8e8e8) not pure white
- "Highlighted component" effect: bright phosphor green glow + subtle pulsing animation, connected traces brighter, rest of diagram dims slightly

**Quality gates (must pass):**
- 3-second read: User understands "I'm in a guided lesson, this is step 3, that component is highlighted" instantly
- Reading comfort: narration text is comfortable to read for 2-3 paragraphs without eye strain (dark theme typography is hard — test it)
- Experiment clarity: user knows what to do and what to listen for without confusion
- Mobile: everything accessible without horizontal scrolling, experiment panel not cramped

### 4A: Learn Mode Data Structure
**File:** `src/data/learn/types.ts`, `src/data/learn/tubeScreamer.ts`, etc.

```typescript
interface LearnStep {
  id: string
  title: string                  // "The Clipping Stage"
  narration: string              // 2-3 sentences explaining what this stage does
  highlightComponents: string[]  // component IDs to highlight in topology
  autoBypass: string[]           // components to bypass at this step (only bypassSafe ones)
  autoValueOverrides?: {         // set value multipliers at this step for demonstration
    componentId: string
    multiplier: number
  }[]
  experiment?: {
    type: 'bypass' | 'value' | 'knob'  // which interaction mode
    // --- bypass experiment (for bypassSafe components) ---
    targetComponent?: string     // component to toggle bypass on
    instruction: string          // "Toggle the diodes off and listen"
    listenFor: string            // "Notice how the tone becomes clean and thin"
    // --- value experiment (primary exploration tool) ---
    suggestedValues?: number[]   // e.g., [0.25, 1, 4] — multipliers to try
    // --- knob experiment ---
    paramId?: string             // which knob to adjust
    paramValues?: number[]       // suggested knob positions to try
    explanation?: string         // "As you increase Drive, the diodes clip harder"
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
- Three-column layout (desktop): narration | topology | experiment
- Stacked layout (mobile): narration → topology → experiment → nav
- Audio auto-plays so user can hear changes as they progress through steps
- Bypassed components visually dim + audio reflects bypass state
- "Reset" button restores all components to active state
- Step transitions animated (crossfade text, slide highlight)

### 4C: Lesson Content for All Three Circuits

**Tube Screamer lesson (~8 steps):**
1. The complete signal path overview
2. Input buffer — why it matters for impedance
3. The clipping stage — diodes explained, **bypass experiment** (bypassSafe: diodes → clean signal)
4. Drive control — how feedback resistance affects clipping, **knob experiment**
5. Why diode type matters (silicon vs germanium) — conceptual, with Klon comparison teased
6. Tone control — RC lowpass, **value experiment** (slide tone cap 0.25×→4× to hear brightness shift)
7. Volume stage — why it's after everything else
8. The mid-hump — why the TS sounds "warm", **value experiment** (scale coupling cap to hear the mid-hump shift)

**Big Muff lesson (~7 steps):**
1. Signal path overview — "four stages of destruction"
2. Single clipping stage explained — transistor gain + diode clipping
3. Why four stages? **Bypass experiment** — bypass stages one by one (all bypassSafe) to hear fuzz build
4. The legendary tone stack — LP/HP split and the mid-scoop, **value experiment** (scale tone caps to shift the scoop frequency)
5. Tone knob sweep — what "noon" does vs extremes, **knob experiment**
6. Sustain control — how input gain feeds the clipping stages, **knob experiment**
7. Why it sounds different from a Tube Screamer (architectural comparison)

**Klon Centaur lesson (~7 steps):**
1. Signal path overview — "the transparent overdrive"
2. The clean blend — THE innovation, **bypass experiment** (bypass clean path → hear transparency vanish)
3. Why germanium diodes? **Value experiment** (scale diode forward voltage equivalent to simulate silicon vs germanium character)
4. Gain-dependent blend — how the clean/drive ratio shifts, **knob experiment**
5. Treble control — high-shelf, not lowpass (why it sparkles), **value experiment** (scale treble cap)
6. Input/output buffers — impedance and why they matter on a pedalboard
7. Why "transparent" isn't magic — it's engineering (the clean signal never leaves)

**Tests:**
- Unit test: each lesson has valid component references (all IDs exist in topology)
- Render test: LearnTab mounts, step navigation works
- Integration test: advancing steps applies correct bypass states
- Visual QA: screenshots at desktop + mobile, run through all Make Good Art quality gates

### Phase 4 Verification Checklist
- [ ] All tests pass
- [ ] Lint + build clean
- [ ] Visual QA: 3-second read test passes for Learn tab
- [ ] Visual QA: reading comfort test passes (dark theme typography)
- [ ] Visual QA: experiment clarity test passes (both value slider and bypass experiments)
- [ ] Visual QA: mobile layout test passes (375px, no horizontal scroll)
- [ ] Visual QA: step transitions are smooth, not jarring
- [ ] Manual: Learn tab loads, Tube Screamer lesson plays through all 8 steps
- [ ] Manual: value slider experiments produce audible changes (e.g., tone cap scaling)
- [ ] Manual: bypass experiments produce audible changes (e.g., diode bypass → clean)
- [ ] Manual: knob experiments produce audible changes synchronized with visual
- [ ] Manual: Big Muff + Klon lessons complete and all experiment types work
- [ ] Manual: "Reset" restores all values to 1× and all bypasses off
- [ ] Manual: can switch between Learn tab and Circuit Lab without breaking audio

---

## Phase 5: Polish, Performance, A/B Comparison, Deploy

**Goal:** Performance optimization, cross-browser testing, the A/B comparison feature, and final deploy. Light UI work — Frontend Design Skill applies to the A/B toggle and WDF badge design.

### CE: QA Gate (for non-SWE stakeholder)

**What you're building in plain language:**
Final polish. The A/B comparison is the crowd-pleaser: a toggle button that instantly switches between our component-level model and the old approximation, so you can hear exactly how much better the new engine sounds. Plus performance tuning (making sure it doesn't drain your phone battery) and making it work across browsers.

**What you'll be able to verify when done:**
1. A/B button on WDF circuits: click to toggle between WDF and legacy engine, hear the difference
2. App runs smoothly on Chrome and Firefox (no audio glitches, no UI stutter)
3. README on GitHub describes the WDF engine and Learn mode
4. Live site updated at maertbot.github.io/pedal-architect

### 5A: Performance Audit
- Profile AudioWorklet CPU usage with Chrome DevTools
- Ensure WDF processing stays under 50% of audio budget (< ~1.5ms per 128-sample block)
- If needed, optimize hot loops (pre-compute scattering matrices, avoid allocations in process())

### 5B: Visual Polish
- WDF circuit selector badge: "Component-Level" label with subtle phosphor green border, distinguishes from legacy circuits
- Loading state while AudioWorklet module initializes (brief spinner or "Initializing audio engine..." overlay)
- Smooth transitions between Learn mode steps (refine based on Phase 4 QA feedback)
- Topology view: if Big Muff diagram feels cramped, add horizontal scroll/zoom

### 5C: A/B Comparison Feature
- "Compare" toggle on WDF circuits: switches between WDF engine and legacy Web Audio chain in real time
- Toggle styled as a hardware switch (satisfying click animation, red/green state indicator)
- Brief label: "WDF" vs "Legacy" with subtle engine description
- Lets user hear the fidelity difference directly
- Shows which components the legacy version was approximating vs actually modeling

### 5D: Final QA + Deploy
- Full regression test: all 12 legacy + 3 WDF circuits
- Browser compatibility: Chrome, Firefox (Safari is stretch goal — AudioWorklet support varies)
- Deploy to GitHub Pages
- Update README with feature description, screenshots, architecture overview

### Phase 5 Verification Checklist
- [ ] Performance: AudioWorklet CPU < 50% budget
- [ ] All tests pass across phases 1-4
- [ ] A/B comparison works on all 3 WDF circuits
- [ ] Chrome + Firefox compatibility verified
- [ ] Production build clean, deployed to GitHub Pages
- [ ] README updated with screenshots and feature description

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
- **Live:** https://maertbot.github.io/pedal-architect/
- **Deploy command:** `npm run build && npx gh-pages -d dist`
- **Stack:** React 19 + TypeScript + Vite + Zustand + Web Audio API
- **Current circuits:** 12 total (6 original + 6 added), all using Web Audio chain approach
- **Visual aesthetic:** Tactical hardware / NASA mission control — matte black (#0a0a0a), JetBrains Mono, red (#ff2020), amber (#ffb020), phosphor green (#20ff60)

---

## How To Use This Document

This PRD is designed for **context-window-sized work sessions**. Each phase follows the CE workflow with Opus orchestrating and Codex coding.

### Starting a phase:

Paste this entire document into a fresh context, then say:

> "Execute Phase [N] of this PRD. Follow the Compound Engineering workflow. Start with CE: Brainstorm. Use the Codex model (gpt-5.3-codex) for all implementation coding. Run the CE: QA gate before handing off to Codex. Apply the Frontend Design Skill and Make Good Art Skill for any UI work (Phases 2, 4, 5)."

### Phase completion protocol:

After completing each phase:
1. All verification checklist items pass ✅
2. Commit all changes with a descriptive message
3. Push to origin/main
4. Deploy to GitHub Pages (`npm run build && npx gh-pages -d dist`)
5. Update this document's checklist items
6. Log lessons learned in DEV-NOTES.md
7. Notify the user with: what was built, commit hash, verification results, and link to live site

### If a phase fails:

If Codex produces broken output:
1. Document what failed and why in DEV-NOTES.md
2. Fix the specific failure (don't restart the whole phase)
3. Re-run the failing tests
4. If fundamentally broken (architecture doesn't work), escalate to the user before burning more tokens
