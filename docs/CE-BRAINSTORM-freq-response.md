# CE: Brainstorm — Frequency Response Visualization

## 1. Feature Intent

**What:** Add a real-time frequency response visualization to Pedal Architect that shows what each pedal's tone controls are doing to the frequency spectrum — updated live as the user twists knobs.

**Why:** Most guitarists have no idea what their tone stack actually does. A Tube Screamer's mid-hump, a Big Muff's mid-scoop, a RAT's filter sweep — these are famous sonic signatures that have never been *visible* to the average player. Making them visible turns Pedal Architect from a cool toy into an educational tool that music teachers, gear reviewers, and DIY pedal builders would use.

**Success criteria:**
- Frequency response curves are accurate to the real pedal circuits (not cosmetic approximations)
- Visualization updates in real-time as knobs are turned (< 16ms render budget)
- Big Muff mid-scoop, Tube Screamer mid-hump, RAT filter sweep, Klon treble boost, Phase 90 notch patterns are all clearly visible and recognizable
- Works on mobile (375px+) and desktop
- Maintains the existing tactical/hardware aesthetic

## 2. Technical Architecture

### 2.1 Two-Layer Visualization Strategy

**Layer 1: Analytical Frequency Response (Primary)**
- Uses `BiquadFilterNode.getFrequencyResponse()` to compute mathematically exact magnitude response
- Shows the frequency response of the tone/filter section ONLY (the linear part of the circuit)
- Displayed as a smooth EQ curve on a logarithmic frequency axis (20Hz–20kHz)
- Updates instantly when knob values change (no audio playback required)
- This is what shows the Big Muff mid-scoop, TS mid-hump, etc.

**Layer 2: Live Output Spectrum (Secondary)**
- Uses existing `AnalyserNode` FFT data (already in AudioEngine)
- Shows the actual frequency content of the processed output signal
- Only visible when audio is playing
- Displayed as a filled spectral envelope behind/below the analytical curve
- Shows the combined effect of input signal + distortion + filtering

### 2.2 Why Two Layers?

The analytical curve answers "what does this knob do?" — it's knob-position-dependent, not input-dependent. You can see the Big Muff's scoop without playing a note.

The live spectrum answers "what does the output actually sound like?" — it's input-dependent and shows harmonic generation from distortion.

Together they give the complete picture. Separately, either one alone would be misleading.

### 2.3 Circuit Model Upgrades Required

#### Big Muff Pi — Parallel LP/HP Tone Stack
**Current model:** Single `BiquadFilterNode` notch filter at tone frequency
**Real circuit:** Passive tone control with parallel lowpass and highpass paths mixed by a pot. The LP path (R + C to ground) passes lows; the HP path (C in series) passes highs. The pot blends between them. The overlap region (mids) gets attenuated because neither path passes them fully — creating the famous mid-scoop.

**Upgrade:** Replace single notch with:
1. Signal split → two paths
2. Path A: BiquadFilter lowpass (fc ≈ 1kHz, component-matched to real BMP V3)
3. Path B: BiquadFilter highpass (fc ≈ 1kHz, component-matched)
4. GainNode on each path, crossfaded by the Tone knob
5. Recombine at output

**Reference values (EH Big Muff V3, from ElectroSmash):**
- LP: R5=22K, C8=10nF → fc = 1/(2π × 22000 × 10e-9) ≈ 723Hz
- HP: R=22K (Tone pot), C9=4nF → fc = 1/(2π × 22000 × 4e-9) ≈ 1.8kHz (varies with pot)
- Mid-scoop notch centered ≈ 1kHz with ~7dB overall loss, ~13.5dB at deepest point

**Accuracy validation:** The resulting frequency response should show asymmetric mid-scoop (not perfectly symmetric like a notch filter), with the scoop deepest around 1kHz, matching published measurements.

#### Tube Screamer TS808 — Add Highpass for Mid-Hump
**Current model:** GainNode → WaveShaperNode → BiquadFilter lowpass (720Hz–4500Hz)
**Real circuit:** The clipping amp stage has a highpass filter in the feedback loop (fc ≈ 720Hz via 0.047µF cap + 4.7K resistor). The tone control is a passive lowpass (0.22µF + 1K = fc ≈ 723Hz) followed by an active tone circuit that boosts treble to compensate.

**The mid-hump:** The combination of highpass (from clipping feedback) + lowpass (tone control) creates a bandpass shape peaking in the mids. This is THE signature TS sound.

**Upgrade:** Add a BiquadFilter highpass before the WaveShaperNode:
1. BiquadFilter highpass (fc ≈ 720Hz, Q=0.7) — models the input cap/feedback loop
2. → existing GainNode → WaveShaperNode → BiquadFilter lowpass (tone control)

**The analytical frequency response of the HP + LP chain will show the mid-hump.**

#### Other Circuits — Already Accurate Enough
- **RAT:** Single lowpass, matches real circuit. No change needed.
- **Klon Centaur:** Highshelf for treble. Good approximation. No change needed.
- **Fuzz Face:** No tone control. Show output spectrum only (FFT layer). No change needed.
- **Phase 90:** 4-stage allpass with LFO. Show allpass frequency response (flat magnitude, but we can show the phase-related notch pattern by computing the combined dry+wet magnitude). Good candidate for showing the swept notch.

### 2.4 Frequency Response Computation

For circuits with BiquadFilter nodes in the tone section:

```typescript
// Create frequency array (logarithmic spacing, 20Hz to 20kHz)
const numPoints = 512;
const frequencies = new Float32Array(numPoints);
for (let i = 0; i < numPoints; i++) {
  frequencies[i] = 20 * Math.pow(1000, i / (numPoints - 1)); // 20Hz to 20kHz
}

// Get magnitude response from each BiquadFilter in the chain
const magResponse = new Float32Array(numPoints);
const phaseResponse = new Float32Array(numPoints);
biquadFilter.getFrequencyResponse(frequencies, magResponse, phaseResponse);

// For cascaded filters: multiply magnitude responses
// For parallel paths: compute each path, then combine based on mix ratio
```

**Key insight:** We need to expose the BiquadFilter nodes from each circuit model so the visualization can call `getFrequencyResponse()` on them. This requires a small API addition to CircuitRuntime.

### 2.5 CircuitRuntime API Extension

```typescript
export interface CircuitRuntime {
  input: AudioNode;
  output: AudioNode;
  setParameter: (paramId: string, value: number) => void;
  destroy?: () => void;
  
  // NEW: expose filter nodes for frequency response computation
  getFilterNodes?: () => FilterNodeDescriptor[];
}

interface FilterNodeDescriptor {
  node: BiquadFilterNode;
  type: 'series' | 'parallel-lp' | 'parallel-hp';
  label: string; // e.g., "Tone", "Filter", "Treble"
}
```

For the Big Muff's parallel topology, we'd return both the LP and HP nodes with their types, and the visualization layer would compute the combined response mathematically.

## 3. Visual Design (Frontend Design Skill + Make Good Art Skill)

### 3.1 Design Intent (Make Good Art Phase 1)
- **Subject:** Frequency response curve overlaid on a logarithmic grid
- **Story:** "Now you can SEE what your ears hear"
- **Emotion:** Precise, scientific, empowering, slightly dramatic
- **Context:** Embedded in the existing Pedal Architect tactical hardware aesthetic
- **Style rules:** 
  1. Must feel like a real hardware spectrum analyzer (not a web chart)
  2. Phosphor green glow aesthetic (matching existing oscilloscope)
  3. Grid lines should evoke CRT test equipment
  4. The curve itself should feel alive — smooth, glowing, responsive

### 3.2 Visual Hierarchy (Make Good Art)
1. **First read:** The frequency response curve itself — the glowing line
2. **Second read:** Frequency axis labels (20, 50, 100, 200, 500, 1K, 2K, 5K, 10K, 20K)
3. **Third read:** dB scale on Y axis (-24dB to +12dB)
4. **Supporting:** Grid lines, live spectrum fill, circuit name badge

### 3.3 Aesthetic Direction (Frontend Design Skill)

**Tone:** Tactical hardware spectrum analyzer. Think HP/Agilent test equipment meets NASA mission control.

**Color strategy:**
- **Analytical curve:** Phosphor green (#20ff60) with glow — matches existing oscilloscope, signals "computed/precise"
- **Live spectrum fill:** Dim green fill (rgba(32, 255, 96, 0.15)) — background context, not focal
- **Grid:** Dark green lines (rgba(40, 120, 60, 0.35)) — matches existing scope grid
- **Frequency labels:** Amber (#ffb020) — matches existing panel-title color, signals "calibrated scale"
- **dB labels:** Secondary text (#888) — reference, not attention-grabbing
- **Circuit-specific accent:** When a notable feature is present (mid-scoop, mid-hump), subtle annotation text in red (#ff2020)

**Typography:** JetBrains Mono throughout (inherited from app). Axis labels at 9-10px. Annotations at 8px.

**Layout placement:** New panel between the oscilloscope and the parameter controls:
```
┌──────────────────────────────┐
│ OSCILLOSCOPE  [TIME] [FFT]   │  ← existing
│ ┌──────────────────────────┐ │
│ │ waveform / fft display   │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│ FREQUENCY RESPONSE           │  ← NEW
│ ┌──────────────────────────┐ │
│ │ 12dB ┬─────────────────┐ │ │
│ │  0dB ┤    ╭──╮         │ │ │
│ │-12dB ┤   ╱    ╲        │ │ │
│ │-24dB ┴───┴─────┴───────┘ │ │
│ │ 20  100  1K    10K  20K  │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│ [DRIVE ◎] [TONE ◎] [LEVEL ◎]│  ← existing parameter controls
└──────────────────────────────┘
```

### 3.4 Interaction Design

1. **Always visible:** The analytical curve is always drawn, even with audio stopped. Turning the tone knob updates the curve instantly.
2. **Live spectrum appears on play:** When audio plays, the FFT spectrum fades in behind the analytical curve.
3. **Knob highlight linkage:** When the user adjusts the tone/filter knob, the curve should glow brighter momentarily (0.3s pulse) to draw attention to the change.
4. **Circuit switch animation:** When switching circuits, the old curve fades out and the new one draws in (left to right, 0.4s).
5. **Hover interaction (desktop):** Hovering over the curve shows a crosshair with frequency + dB readout at that point.
6. **Annotation badges:** For circuits with signature features, show a subtle label:
   - Big Muff: "MID SCOOP" label near the dip
   - Tube Screamer: "MID HUMP" label near the peak
   - RAT: "FILTER" label at the rolloff point
   - Phase 90: "NOTCH" labels at the null points

### 3.5 Mobile Design (≤767px)

- Canvas height reduced from 200px to 140px
- Axis labels use abbreviated format (100, 1K, 10K only)
- dB labels shown every 12dB only (not every 6dB)
- Hover crosshair disabled (no hover on mobile)
- Touch-and-hold shows readout at touch point
- Annotation badges hidden on <480px

### 3.6 Canvas vs SVG Decision

**Canvas** (recommended):
- Matches existing oscilloscope implementation
- 60fps animation is trivial
- Glow effects via shadow/blur are natural
- Better performance for real-time updates
- Consistent with the "test equipment CRT" aesthetic

## 4. Competitive Analysis

- **Fender Tone app:** Shows basic EQ curves but only for Fender amps, not pedals. No real-time interaction.
- **ToneStack calculator (Duncan's):** Desktop app that computes tone stack frequency response for amp circuits. Accurate but ugly, not interactive, desktop-only. Our main reference for accuracy.
- **PedalPlayground:** Web-based pedal board builder but no frequency visualization.
- **Guitarix (Linux):** Open-source amp sim with basic spectrum analyzer but not educational.

**Our differentiator:** Real-time, interactive, accurate-to-the-circuit frequency response for specific pedal models with the "see what you hear" educational angle. Nothing like this exists for web.

## 5. Scope & Phases

### Phase 1: Circuit Model Upgrades (accuracy foundation)
- Upgrade Big Muff to parallel LP/HP topology
- Add highpass to Tube Screamer for mid-hump
- Add `getFilterNodes()` API to all CircuitRuntime implementations
- Verify each circuit's frequency response matches published data

### Phase 2: FrequencyResponseAnalyzer Component
- Canvas-based visualization component
- Logarithmic frequency axis (20Hz–20kHz)
- dB magnitude axis (-24dB to +12dB)
- Grid rendering matching oscilloscope style
- Analytical curve rendering with glow effect
- Real-time update loop (requestAnimationFrame)

### Phase 3: Live Spectrum Integration
- FFT data overlay from existing AnalyserNode
- Fade-in/out tied to audio playback state
- Logarithmic frequency mapping for FFT bins

### Phase 4: Interaction & Polish
- Knob-change highlight pulse
- Circuit-switch transition animation
- Hover/touch crosshair with readout
- Signature feature annotation badges
- Mobile responsive layout

### Phase 5: Integration & QA
- Wire into CircuitLab layout
- Zustand state integration
- Visual QA at desktop (1440px) and mobile (375px)
- Accuracy validation against ElectroSmash published curves

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Big Muff parallel topology introduces audio artifacts | Low | High | Test with and without audio; use gain compensation |
| `getFrequencyResponse()` doesn't update when AudioParam changes | Low | High | Verify with test; re-create BiquadFilterNode if needed |
| Phase 90 allpass response looks flat (magnitude IS flat for allpass) | Medium | Medium | Show combined dry+wet magnitude, or show phase response as secondary view |
| Canvas performance on mobile with two layers at 60fps | Low | Medium | Throttle live spectrum to 30fps on mobile; keep analytical at 60fps |
| Tube Screamer highpass addition changes the sound | Medium | Medium | A/B test carefully; the highpass SHOULD be there (it was missing) |

## 7. Questions Resolved During Brainstorm

**Q: Should we show phase response?** 
A: No, not for V1. Phase response is meaningful for the Phase 90 but confusing for non-engineers. Focus on magnitude (what guitarists call "EQ").

**Q: Should we add a bypass comparison (flat line overlay)?**
A: Yes — show a faint reference line at 0dB. This makes the deviation from flat response instantly obvious.

**Q: What about the Fuzz Face with no tone control?**
A: Show the output spectrum only (FFT layer) with a note: "No tone control — spectrum shows output character." Still educational.

**Q: Should the visualization be a separate tab/view?**
A: No. It should be always-visible in the Circuit Lab, placed between the oscilloscope and the knob controls. It's the centerpiece of this feature.
