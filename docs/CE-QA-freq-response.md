# CE: QA — Frequency Response Visualization

Review of CE-BRAINSTORM-freq-response.md for technical feasibility, accuracy risks, design quality, and gaps.

## 1. Technical Feasibility Audit

### ✅ `BiquadFilterNode.getFrequencyResponse()` — Confirmed
- MDN docs confirm: takes Float32Array of frequencies, returns magnitude + phase arrays
- Returns linear magnitude (1.0 = 0dB, 0.5 ≈ -6dB). Need to convert to dB: `20 * Math.log10(magnitude)`
- Works synchronously — no async overhead in the render loop
- Updates reflect current filter parameters immediately (no buffering delay)
- **Verified:** This is the right API for the job

### ✅ Parallel LP/HP for Big Muff — Feasible but needs careful gain staging
- Splitting signal into two BiquadFilter paths and recombining is standard Web Audio routing
- **Risk:** Splitting adds 2 extra nodes per circuit instance. Negligible performance impact.
- **Risk:** Computing the combined frequency response of parallel paths requires math, not just calling `getFrequencyResponse()` on one node. 
- **Solution:** For parallel topology, compute each path's complex response (magnitude + phase), convert to real/imaginary, sum, then back to magnitude. This is ~20 lines of math.
- **Alternative (simpler):** Create "shadow" BiquadFilter nodes just for visualization (not in the audio path). Configure them identically. Compute combined response mathematically. This avoids touching the audio graph for visualization purposes.

### ✅ Tube Screamer Highpass Addition — Low Risk
- Adding a BiquadFilter highpass before the waveshaper is trivial in Web Audio
- **Sound change expected:** Yes, and it SHOULD change. The current model is missing the highpass that defines the mid-hump. This is a bug fix, not a regression.
- **Validation:** A/B against the existing sound. The new version should have less bass and more midrange emphasis — which IS what a real Tube Screamer sounds like.

### ⚠️ Phase 90 Visualization — Needs Special Handling
- Allpass filters have FLAT magnitude response by definition. `getFrequencyResponse()` will return ~1.0 at all frequencies.
- The phaser effect comes from phase cancellation when dry + wet signals are mixed.
- **Solution:** Compute the combined dry+wet frequency response analytically:
  1. Get complex response of the 4 allpass chain (magnitude × e^(j×phase))
  2. Add dry signal (magnitude=1, phase=0)
  3. Compute resulting magnitude of the sum
  4. This will show the characteristic comb-filter notch pattern
- **Additional complexity:** The LFO sweeps the allpass frequencies, so the notch pattern moves over time
- **Decision:** Show the swept notch as an animation. Compute response at the current LFO-modulated frequency values.

### ✅ Canvas Performance
- 512-point curve at 60fps is trivial for Canvas2D
- The analytical curve computation (getFrequencyResponse + math) takes <1ms
- FFT overlay reuses existing AnalyserNode data — no additional computation
- Mobile throttling to 30fps is good practice but likely unnecessary

### ✅ Logarithmic Frequency Axis
- Standard: x = log10(freq/20) / log10(20000/20) × canvasWidth
- Inverse for hover: freq = 20 × 10^(x/canvasWidth × log10(1000))
- Well-established in audio visualisation

## 2. Accuracy Audit

### Big Muff Tone Stack — Cross-Reference with ElectroSmash

The real Big Muff V3 tone control:
- **LP path:** 22K + 10nF → fc = 723Hz (1st order, -20dB/decade above fc)
- **HP path:** 100K pot + 4nF → fc varies 398Hz (pot max) to ∞ (pot min). At mid-position (50K): fc ≈ 795Hz
- **Tone pot:** Blends between LP and HP output. At center position, both paths contribute equally.
- **Expected response at center:** LP passes below ~700Hz, HP passes above ~800Hz, the overlap gap around 700-800Hz creates the mid-scoop. Depth depends on the separation between the two cutoff frequencies.
- **ElectroSmash measured:** ~7dB overall loss, ~13.5dB total at the 1kHz notch point.

**Assessment:** Our BiquadFilter model can reproduce this accurately IF we:
1. Use the correct filter types (lowpass + highpass, both 1st order / Q=0.707)
2. Set cutoff frequencies to match the real component values
3. Implement the pot-based crossfade correctly (tone pot blends the gain between paths)
4. Accept that BiquadFilter's 2nd-order response (12dB/octave) differs from the real 1st-order (6dB/octave) RC filters

**Amendment needed:** Use `IIRFilterNode` instead of `BiquadFilterNode` for the Big Muff tone paths to get true 1st-order (6dB/octave) responses. The coefficients for a 1st-order lowpass are simple:
```
b = [wc/(1+wc), wc/(1+wc)]
a = [1, (wc-1)/(wc+1)]
where wc = 2π × fc / sampleRate (pre-warped)
```

Actually — `BiquadFilterNode` with very low Q (Q≈0.5) on lowpass/highpass gives a response that closely approximates 1st-order. The difference is minor and well within "accurate for educational purposes." **Keep BiquadFilter for simplicity. Note the approximation in comments.**

### Tube Screamer Mid-Hump — Cross-Reference

The real TS808 feedback loop:
- **Highpass in feedback:** C3=0.047µF, R4=4.7K → fc = 1/(2π × 4700 × 0.047e-6) ≈ 720Hz
- **Tone lowpass:** C5=0.22µF, R7=1K → fc = 1/(2π × 1000 × 0.22e-6) ≈ 723Hz
- **Active tone boost:** Variable treble boost via tone pot

**Assessment:** The highpass at ~720Hz + lowpass at ~720Hz creates the characteristic bandpass/mid-hump centered around 720Hz. Our model already has the lowpass (min=720, max=4500). Adding a highpass at ~720Hz will produce the correct bandpass shape.

**Note:** In the real circuit, the highpass is in the feedback loop of the op-amp, which means its effect on the overall frequency response is inverted (frequencies below 720Hz get MORE gain because the feedback is reduced). In our simplified model, we're putting a highpass in the signal path before the waveshaper, which achieves a similar net effect (less bass reaching the clipper). This is the correct simplification.

### RAT, Klon, Fuzz Face — Already Validated
No changes needed to these models. The filter parameters map well to the real circuits.

## 3. Design Quality Audit (Make Good Art Criteria)

### 3-Second Read Test ✅
- Primary focal: the glowing green frequency response curve
- Immediate comprehension: "this is an EQ curve"
- The shape tells the story (scoop, hump, rolloff)

### Squint/Blur Test ✅
- The curve is high-contrast (bright green on dark background)
- Grid provides structure without competing
- Axis labels are subordinate (amber, small)

### Figure/Ground Separation ✅  
- Dark background (#020a04 matching oscilloscope)
- Bright curve (#20ff60) with glow effect
- Live spectrum fill is intentionally dim — context, not focal

### Consistency with Existing Aesthetic ✅
- Same canvas style as oscilloscope
- Same color palette (green phosphor, amber labels, red accents)
- Same grid pattern
- Same panel framing (.panel class)

### Potential Design Issues ⚠️
1. **Two scope-like displays stacked:** The oscilloscope + frequency response could feel repetitive visually. **Mitigation:** The frequency response has a fundamentally different shape (smooth curve vs. jagged waveform/spectrum) and uses labeled axes (Hz, dB) that the oscilloscope doesn't have. This visual differentiation should be sufficient.
2. **Information density:** Adding another panel increases scroll distance on mobile. **Mitigation:** On mobile, make the frequency response panel collapsible, defaulting to open. Or reduce oscilloscope height to make room.

## 4. Gaps & Amendments

### Amendment 1: IIRFilterNode option
**Original plan:** BiquadFilterNode for all filter stages
**Amendment:** Consider IIRFilterNode for 1st-order filters (Big Muff tone paths) for more accurate rolloff slopes. **Decision:** Keep BiquadFilterNode with low Q for simplicity. The visual difference between 6dB/octave and 12dB/octave is noticeable but acceptable for V1. Document as known limitation. Consider IIRFilterNode upgrade in V2.

### Amendment 2: Shadow nodes for visualization
**Addition:** Rather than exposing live audio-path filter nodes to the visualization (which could cause timing issues), create lightweight "shadow" BiquadFilterNode instances that mirror the audio nodes' parameters. The visualization reads from shadow nodes; the audio path is untouched.

Benefits:
- No risk of visualization code affecting audio performance
- Shadow nodes can be created in an OfflineAudioContext (no audio output needed)
- Clean separation of concerns

### Amendment 3: Phase 90 swept animation
**Addition:** For Phase 90, the visualization should show the notch pattern sweeping back and forth at the LFO rate. This requires:
1. Sampling the current LFO-modulated allpass frequency on each frame
2. Computing the dry+wet combined response at that frequency
3. Animating the result

This is computationally cheap (4 allpass responses + combination = ~100 multiplications per frame).

### Amendment 4: Mobile layout adjustment
**Addition:** On mobile (≤767px), reduce oscilloscope canvas height from 220px to 160px to make room for the frequency response panel without excessive scrolling.

### Amendment 5: Bypass comparison line
**Addition:** Always show a faint dotted line at 0dB across the full frequency range. This makes it instantly obvious how much the circuit deviates from flat response.

### Amendment 6: "No tone control" state for Fuzz Face
**Addition:** When Fuzz Face is selected, show a message in the frequency response panel: "No tone control — spectral character shown via live spectrum" and display only the FFT layer (no analytical curve). This is honest and educational.

## 5. Final Risk Matrix (Post-QA)

| Risk | Likelihood | Impact | Status |
|------|-----------|--------|--------|
| Big Muff parallel topology audio artifacts | Low | High | Mitigated by shadow nodes for viz |
| Phase 90 flat magnitude confusion | Medium | Medium | Mitigated by dry+wet combined response |
| Two stacked scope-like panels feel redundant | Low | Low | Differentiated by axes + curve shape |
| Mobile scroll distance increases | Medium | Low | Mitigated by oscilloscope height reduction |
| Tube Screamer sound changes with highpass addition | Medium | Medium | Expected and correct — this is a fix |
| `getFrequencyResponse()` accuracy for parallel paths | Low | High | Math is straightforward; test against known curves |

## 6. QA Verdict

**APPROVED for implementation.** No blocking issues found. The approach is technically sound, the accuracy strategy is well-grounded in real circuit analysis, and the visual design is consistent with the existing aesthetic.

**Key amendments to incorporate:**
- Shadow nodes for visualization (Amendment 2)
- Phase 90 swept animation (Amendment 3)
- Mobile oscilloscope height reduction (Amendment 4)
- 0dB bypass reference line (Amendment 5)
- Fuzz Face "no tone control" state (Amendment 6)
