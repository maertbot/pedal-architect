# CE Pedal Architect Update (2026-03-03)

## CE: Brainstorm
- Problem A: frequency response curve stayed stale after circuit selection because UI state changed before the audio graph sync, and no render was triggered after graph sync.
- Problem B: circuit library was limited to six models.
- Chosen fix for A: centralize circuit selection sync in one helper called directly by all selection paths (dropdown, keyboard, circuit cards), so graph nodes are switched in the same interaction.
- Chosen approach for B: add six well-known pedal models with control-accurate parameter lists and behavior-focused Web Audio graph approximations.
- Testing strategy: unit-test the new immediate sync helper call flow (switch + param apply in one call path).

## CE: QA (Initial Gate for Non-SWE Stakeholder)
- Gate question 1: "If I click another circuit, does the response panel update right away without touching knobs?" Status: **Pass by design + automated test of immediate engine sync call path**.
- Gate question 2: "Are the new pedals recognizable by their controls and expected tonal behavior?" Status: **Pass (controls and behavior mapped from product/technical references).**
- Gate question 3: "Is this safe to merge without breaking current workflows?" Status: **Pass with low risk** (existing circuits untouched, lint/test/build all green).
- Gate question 4: "Can non-engineers audit what changed?" Status: **Pass** (this CE log + DEV notes updated).

## CE: Plan
1. Add shared `syncCircuitSelection(...)` helper.
2. Route all circuit selection entry points through that helper.
3. Add six new circuit models and register them.
4. Add tests proving immediate selection sync behavior.
5. Run lint/test/build and record outcomes.
6. Document maintenance notes and research references.

## CE: Work
- Immediate sync fix:
  - Added [`src/audio/syncCircuitSelection.ts`](/Users/maertbot/Projects/pedal-architect/src/audio/syncCircuitSelection.ts).
  - Updated App selection flows in [`src/App.tsx`](/Users/maertbot/Projects/pedal-architect/src/App.tsx).
  - Updated circuit-lab selector wiring in [`src/components/circuit-lab/CircuitLab.tsx`](/Users/maertbot/Projects/pedal-architect/src/components/circuit-lab/CircuitLab.tsx).
- Added six circuits:
  - [`src/audio/circuits/bossDs1.ts`](/Users/maertbot/Projects/pedal-architect/src/audio/circuits/bossDs1.ts)
  - [`src/audio/circuits/bossSd1.ts`](/Users/maertbot/Projects/pedal-architect/src/audio/circuits/bossSd1.ts)
  - [`src/audio/circuits/bossBd2.ts`](/Users/maertbot/Projects/pedal-architect/src/audio/circuits/bossBd2.ts)
  - [`src/audio/circuits/bossMt2.ts`](/Users/maertbot/Projects/pedal-architect/src/audio/circuits/bossMt2.ts)
  - [`src/audio/circuits/ibanezTs9.ts`](/Users/maertbot/Projects/pedal-architect/src/audio/circuits/ibanezTs9.ts)
  - [`src/audio/circuits/mxrDistortionPlus.ts`](/Users/maertbot/Projects/pedal-architect/src/audio/circuits/mxrDistortionPlus.ts)
- Registered circuits in [`src/data/circuits.ts`](/Users/maertbot/Projects/pedal-architect/src/data/circuits.ts).
- Added test harness + tests:
  - [`tests/syncCircuitSelection.test.ts`](/Users/maertbot/Projects/pedal-architect/tests/syncCircuitSelection.test.ts)
  - [`tsconfig.test.json`](/Users/maertbot/Projects/pedal-architect/tsconfig.test.json)
  - [`package.json`](/Users/maertbot/Projects/pedal-architect/package.json)
- Lint purity cleanup in [`src/components/shared/FrequencyResponse.tsx`](/Users/maertbot/Projects/pedal-architect/src/components/shared/FrequencyResponse.tsx).

## CE: Review
- `npm run lint`: **pass**
- `npm run test`: **pass** (2 tests, 0 failures)
- `npm run build`: **pass** (Vite production build complete)
- Residual risk:
  - New circuits are modeled approximations (not full SPICE-level emulation), but control mapping and tonal direction are source-backed.

## Research Summary (6 Added Circuits)
1. Boss DS-1 Distortion
- Mapping used: `Distortion`, `Tone`, `Level`.
- Modeling intent: hard clipping + tone tilt that boosts highs while reducing lows clockwise.
- Source: https://www.boss.info/us/products/ds-1/

2. Boss SD-1 Super OverDrive
- Mapping used: `Drive`, `Tone`, `Level`.
- Modeling intent: asymmetric clipping, focused mids, tighter low end.
- Source: https://www.boss.info/global/products/sd-1/

3. Boss BD-2 Blues Driver
- Mapping used: `Gain`, `Tone`, `Level`.
- Modeling intent: multi-stage amp-like clipping with high-end tone shaping.
- Source: https://www.boss.info/us/products/bd-2/

4. Boss MT-2 Metal Zone
- Mapping used: `Distortion`, `Low`, `Middle`, `Mid Freq`, `High`, `Level`.
- Modeling intent: dual-stage gain + active 3-band EQ with semi-parametric mids (`200 Hz` to `5 kHz`, +/-`15 dB`).
- Source: https://www.boss.info/global/products/mt-2/

5. Ibanez TS9 Tube Screamer
- Mapping used: `Drive`, `Tone`, `Level`.
- Modeling intent: mid-forward clipping with TS high-pass/low-pass shaping around the classic mid-hump region.
- Sources:
  - https://www.ibanez.com/usa/products/detail/ts9_99.html
  - https://electrosmash.com/tube-screamer-analysis

6. MXR Distortion+
- Mapping used: `Distortion`, `Output`.
- Modeling intent: two-knob op-amp distortion with no dedicated tone control, fixed bright/top filter contour.
- Source: https://www.electrosmash.com/mxr-distortion-plus-analysis
