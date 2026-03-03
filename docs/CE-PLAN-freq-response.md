# CE: Plan — Frequency Response Visualization

## Implementation Plan

Based on CE-BRAINSTORM and CE-QA documents. This is the spec for Codex to execute.

---

## Phase 1: Circuit Model Upgrades

### Task 1.1: Add `getFilterNodes()` to CircuitRuntime type

**File:** `src/audio/types.ts`

Add to `CircuitRuntime` interface:
```typescript
export interface FilterNodeDescriptor {
  node: BiquadFilterNode;
  topology: 'series' | 'parallel-lp' | 'parallel-hp';
  label: string;
  paramId?: string; // which parameter controls this filter
}

export interface CircuitRuntime {
  input: AudioNode;
  output: AudioNode;
  setParameter: (paramId: string, value: number) => void;
  destroy?: () => void;
  getFilterNodes?: () => FilterNodeDescriptor[];
}
```

### Task 1.2: Upgrade Big Muff to parallel LP/HP tone stack

**File:** `src/audio/circuits/bigMuff.ts`

Replace the single notch filter with parallel LP/HP paths:

1. After the 4 cascaded clipping stages, split signal:
   - Path A: BiquadFilterNode lowpass (fc=723Hz, Q=0.5) — models the real LP path (22K + 10nF)
   - Path B: BiquadFilterNode highpass (fc=1800Hz, Q=0.5) — models the real HP path (pot + 4nF)
2. Each path goes through a GainNode for blend control
3. Tone knob crossfades: at min (350Hz setting), favor LP path. At max (1600Hz setting), favor HP path. At center, equal blend = maximum scoop.
4. Recombine into volume GainNode

**Tone pot mapping:**
- Tone at minimum (350): LP gain=0.9, HP gain=0.1, LP fc=350Hz
- Tone at center (~850): LP gain=0.5, HP gain=0.5, LP fc=850Hz
- Tone at maximum (1600): LP gain=0.1, HP gain=0.9, LP fc=1600Hz

The HP frequency stays relatively fixed around 1kHz. The LP frequency tracks the tone knob. The crossfade creates the variable mid-scoop.

**Implement `getFilterNodes()`:** Return both the LP and HP BiquadFilterNodes with their topologies.

### Task 1.3: Add highpass to Tube Screamer for mid-hump

**File:** `src/audio/circuits/tubeScreamer.ts`

Add a BiquadFilterNode highpass (fc=720Hz, Q=0.5) between the input GainNode and the WaveShaperNode:

```
preGain → highpass(720Hz) → shaper → tone(lowpass) → level
```

This creates the bandpass shape (highpass + lowpass) that IS the Tube Screamer mid-hump.

**Note:** The highpass frequency is fixed at 720Hz (not controlled by any knob). Only the lowpass (tone knob) is user-adjustable.

**Implement `getFilterNodes()`:** Return both the highpass and the lowpass (tone) BiquadFilterNodes.

### Task 1.4: Add `getFilterNodes()` to remaining circuits

**Files:** `klonCentaur.ts`, `rat.ts`, `fuzzFace.ts`, `phaseNinety.ts`

- **Klon:** Return the treble highshelf BiquadFilterNode
- **RAT:** Return the filter lowpass BiquadFilterNode
- **Fuzz Face:** Return empty array (no tone filter)
- **Phase 90:** Return the 4 allpass BiquadFilterNodes with topology='series', plus a flag indicating this is a phaser (needs dry+wet combination for visualization)

For Phase 90, add to the interface:
```typescript
export interface CircuitRuntime {
  // ... existing
  getFilterNodes?: () => FilterNodeDescriptor[];
  getPhaserConfig?: () => { dryGain: number; wetGain: number; allpassNodes: BiquadFilterNode[] };
}
```

---

## Phase 2: FrequencyResponseAnalyzer Component

### Task 2.1: Create frequency response computation utility

**New file:** `src/audio/frequencyResponse.ts`

```typescript
export interface FreqResponseData {
  frequencies: Float32Array;  // Hz values (log-spaced, 20-20000)
  magnitudesDb: Float32Array; // dB values
  hasAnalytical: boolean;     // false for Fuzz Face
}

export function computeFrequencyResponse(
  filterNodes: FilterNodeDescriptor[],
  phaserConfig?: PhaserConfig,
  numPoints?: number
): FreqResponseData
```

Implementation:
1. Create log-spaced frequency array (20Hz to 20kHz, 512 points)
2. For series topology: multiply magnitudes across all nodes
3. For parallel LP/HP topology (Big Muff):
   - Get complex response of each path (mag × cos(phase), mag × sin(phase))
   - Weight by current gain (blend ratio)
   - Sum complex values
   - Compute magnitude of sum
4. For phaser (Phase 90):
   - Compute complex response of allpass chain
   - Add dry signal (1 + 0j)
   - Weight by dry/wet gains
   - Compute magnitude of sum
5. Convert all magnitudes to dB: `20 * Math.log10(magnitude)`
6. Return the data

### Task 2.2: Create FrequencyResponse canvas component

**New file:** `src/components/shared/FrequencyResponse.tsx`

Props:
```typescript
interface FrequencyResponseProps {
  filterNodes: FilterNodeDescriptor[];
  phaserConfig?: PhaserConfig;
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  circuitId: string;
  circuitName: string;
  hasNoToneControl?: boolean;
}
```

Canvas rendering (following oscilloscope pattern):
1. **Background:** #020a04 (matching oscilloscope)
2. **Grid:**
   - Vertical lines at standard audio frequencies: 20, 50, 100, 200, 500, 1K, 2K, 5K, 10K, 20K Hz
   - Horizontal lines every 6dB from -24dB to +12dB
   - Grid color: rgba(40, 120, 60, 0.35)
3. **0dB reference line:** Dashed, slightly brighter (rgba(40, 120, 60, 0.6))
4. **Analytical curve:**
   - Color: #20ff60 (phosphor green)
   - Line width: 2px with 4px glow (shadowBlur)
   - Smooth Bézier interpolation between points
5. **Live spectrum (when playing):**
   - AnalyserNode FFT data mapped to same log-frequency axis
   - Filled area: rgba(32, 255, 96, 0.12)
   - Top line: rgba(32, 255, 96, 0.3), 1px
6. **Frequency labels:** JetBrains Mono, 9px, #ffb020 (amber)
7. **dB labels:** JetBrains Mono, 9px, #888888
8. **"No tone control" message:** Centered text when hasNoToneControl=true, color: #555

Canvas dimensions: width=820, height=200 (desktop), height=140 (mobile)

### Task 2.3: Annotation badges for signature features

Within the FrequencyResponse component, after drawing the curve:

1. Find notable features in the frequency response data:
   - **Dip (mid-scoop):** Find local minimum in the curve. If dip > 6dB below 0dB line → annotate.
   - **Peak (mid-hump):** Find local maximum above 0dB line → annotate.
   - **Rolloff:** Find the -3dB point of a lowpass → annotate.
2. Draw annotation:
   - Small text label (8px, #ff2020, JetBrains Mono)
   - Thin leader line from label to the feature point on the curve
   - Labels: "MID SCOOP", "MID HUMP", "FILTER", "TREBLE"
3. Position annotations to avoid overlapping the curve

Circuit-specific annotation map:
```typescript
const ANNOTATIONS: Record<string, string> = {
  'big-muff': 'MID SCOOP',
  'tube-screamer': 'MID HUMP',
  'rat': 'FILTER ROLLOFF',
  'klon-centaur': 'TREBLE BOOST',
  'phase-ninety': 'NOTCH',
  'fuzz-face': '', // no annotation
}
```

### Task 2.4: Hover/touch crosshair readout

**Desktop (≥768px):** On mousemove over canvas:
- Draw vertical crosshair line (rgba(255,255,255,0.3))
- Show tooltip with frequency (Hz) and magnitude (dB) at that point
- Tooltip styled as small panel: bg #1a1a1a, border #333, text #e8e8e8
- Format: "1.2 kHz | -4.3 dB"

**Mobile (<768px):** On touchstart/touchmove:
- Same crosshair behavior but triggered by touch
- Hide on touchend after 1s delay

---

## Phase 3: Live Spectrum Integration

### Task 3.1: FFT-to-log-frequency mapping

In the FrequencyResponse component, when `isPlaying` is true:

1. Get FFT data from AnalyserNode: `analyser.getByteFrequencyData(buffer)`
2. FFT bins are linearly spaced: bin[i] represents frequency `i * sampleRate / fftSize`
3. Map each canvas x-position (log frequency) to the nearest FFT bin
4. Interpolate between bins for smooth rendering
5. Scale to match dB axis: `(binValue / 255) * 48 - 24` to map 0-255 → -24dB to +24dB (adjust empirically)

### Task 3.2: Fade-in/out with playback state

- When isPlaying transitions true → fade spectrum opacity from 0 to 1 over 300ms
- When isPlaying transitions false → fade from 1 to 0 over 500ms
- Track fade state with useRef, apply as globalAlpha in canvas context

---

## Phase 4: Integration

### Task 4.1: Wire into CircuitLab

**File:** `src/components/circuit-lab/CircuitLab.tsx`

Add FrequencyResponse component between the Oscilloscope and ParameterControls:

```tsx
<div className="scope-row panel">
  <div className="panel-title">OSCILLOSCOPE</div>
  {/* ... existing oscilloscope ... */}
</div>

{/* NEW */}
<div className="freq-response-row panel">
  <div className="panel-title">FREQUENCY RESPONSE</div>
  <FrequencyResponse
    filterNodes={filterNodes}
    phaserConfig={phaserConfig}
    analyser={audioEngine.getAnalyser()}
    isPlaying={audioPlaying}
    circuitId={currentCircuit}
    circuitName={circuit.name}
    hasNoToneControl={circuit.id === 'fuzz-face'}
  />
</div>

<ParameterControls ... />
```

### Task 4.2: Get filter nodes from AudioEngine

**File:** `src/audio/AudioEngine.ts`

Add method to AudioEngine:
```typescript
getFilterNodes(): FilterNodeDescriptor[] {
  return this.circuitRuntime?.getFilterNodes?.() ?? [];
}

getPhaserConfig(): PhaserConfig | undefined {
  return this.circuitRuntime?.getPhaserConfig?.();
}
```

Also expose these via a React hook or pass directly via props.

**Important:** The filter nodes are only available after `init()` is called. Before init, pass empty array.

### Task 4.3: Handle parameter changes updating the visualization

The visualization needs to re-compute when knob values change. Two approaches:

**Approach A (simpler):** Compute frequency response data on every animation frame by reading the current BiquadFilterNode parameters. Since `getFrequencyResponse()` is synchronous and fast, this is fine at 60fps.

**Approach B (optimized):** Only recompute when parameters change. Use a version counter in the store that increments on each parameter change.

**Decision:** Use Approach A. The computation cost is negligible (~0.5ms for 512 points) and it avoids synchronization complexity.

### Task 4.4: CSS additions

**File:** `src/index.css`

Add styles:
```css
.freq-response-row {
  padding: 10px;
}

.freq-response-shell {
  border: 1px solid #1f4d2c;
  border-radius: 12px;
  overflow: hidden;
  box-shadow:
    inset 0 0 35px rgba(32, 255, 96, 0.06),
    0 0 14px rgba(32, 255, 96, 0.08);
}

.freq-response-canvas {
  display: block;
  width: 100%;
  height: 200px;
  background: #020a04;
}

.freq-response-empty {
  display: grid;
  place-items: center;
  height: 200px;
  background: #020a04;
  border: 1px solid #1f4d2c;
  border-radius: 12px;
  color: var(--text-muted);
  font-size: 11px;
  letter-spacing: 0.08em;
}

@media (max-width: 767px) {
  .scope-canvas {
    height: 160px; /* reduced from 220px */
  }
  .freq-response-canvas {
    height: 140px;
  }
}
```

---

## Phase 5: Testing & QA

### Task 5.1: Accuracy validation

For each circuit, verify the frequency response shape:

1. **Tube Screamer:** Should show bandpass shape peaking ~720Hz-1kHz. As tone increases, the lowpass cutoff rises, widening the hump.
2. **Big Muff:** Should show mid-scoop centered ~1kHz. Tone knob shifts emphasis between bass and treble. At center, maximum scoop depth.
3. **RAT:** Should show lowpass rolloff. Filter knob sweeps the cutoff from ~800Hz to ~8kHz.
4. **Klon:** Should show highshelf boost above the treble frequency. Flat below.
5. **Phase 90:** Should show swept comb-filter notch pattern (multiple notches moving with LFO).
6. **Fuzz Face:** Should show "No tone control" message with live spectrum only.

### Task 5.2: Visual QA

Take screenshots at:
- 1440px desktop width
- 768px tablet width
- 375px mobile width

Verify:
- Canvas renders correctly at all widths
- Axis labels are readable
- Grid lines match oscilloscope style
- Curve glow effect is visible but not overwhelming
- Annotation badges are positioned correctly
- Mobile layout doesn't cause excessive scrolling

### Task 5.3: Performance validation

- Verify no dropped frames during playback with both visualization layers active
- Check memory: no Float32Array leaks in the animation loop
- Verify requestAnimationFrame cleanup on unmount

---

## File Summary

**New files:**
- `src/audio/frequencyResponse.ts` — computation utility
- `src/components/shared/FrequencyResponse.tsx` — canvas component

**Modified files:**
- `src/audio/types.ts` — add FilterNodeDescriptor, getFilterNodes, getPhaserConfig
- `src/audio/AudioEngine.ts` — add getFilterNodes(), getPhaserConfig() methods
- `src/audio/circuits/bigMuff.ts` — parallel LP/HP topology + getFilterNodes
- `src/audio/circuits/tubeScreamer.ts` — add highpass + getFilterNodes
- `src/audio/circuits/klonCentaur.ts` — add getFilterNodes
- `src/audio/circuits/rat.ts` — add getFilterNodes
- `src/audio/circuits/fuzzFace.ts` — add getFilterNodes (empty array)
- `src/audio/circuits/phaseNinety.ts` — add getFilterNodes + getPhaserConfig
- `src/components/circuit-lab/CircuitLab.tsx` — add FrequencyResponse panel
- `src/index.css` — add freq-response styles, mobile adjustments

**No new dependencies required.** Everything uses existing Web Audio API and Canvas2D.
