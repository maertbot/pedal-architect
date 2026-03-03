# QA Review: Brainstorm — Pedal Architect

**Reviewer:** Opus (design + architecture QA)  
**Date:** 2026-03-03  
**Verdict:** ✅ PASS with amendments

---

## Technical Feasibility Audit

### ✅ Web Audio API — Confirmed Feasible

**WaveShaperNode for clipping:** This is well-established. The MDN docs show exactly this use case (guitar distortion). Multiple open-source projects (micbuffa/WebAudio-Guitar-Amplifier-Simulator, Noise-box.es) prove it works in production browsers. The clipping curve approach is sound.

**BiquadFilterNode for tone stacks:** Standard. Allpass chains for phaser are textbook Web Audio.

**Latency concern:** Web Audio API runs on a separate thread with ~128-512 sample buffer (2.7-10.7ms at 48kHz). Parameter changes via `AudioParam.setValueAtTime()` are sample-accurate. This will feel responsive. **No issue here.**

**Browser support:** Web Audio API is supported in all modern browsers including Safari. No polyfills needed.

### ✅ PDF Export at 1:1 Scale — Feasible with Care

**Risk area:** PDF libraries (jsPDF, pdf-lib) work in millimeters/points. The conversion from screen pixels to physical millimeters must be precise. Standard approach:
- Define all enclosure dimensions in mm (already planned)
- Render to PDF in mm coordinates (1 point = 0.3528mm)
- Include a calibration ruler on the template so the user can verify print scale
- Add "Print at 100% / Actual Size" instruction prominently

**Amendment:** Add a **calibration square** (exactly 25mm × 25mm) on every exported PDF. User measures it with a ruler. If it's not 25mm, their printer is scaling. This is standard practice in the drill template community.

### ✅ SVG Drag-and-Drop — Feasible

@dnd-kit with SVG works. Maximum ~15-20 components on an enclosure. Performance is not a concern.

### ⚠️ Audio Samples — Needs Specific Plan

The brainstorm says "pre-recorded clean guitar samples" but doesn't specify sourcing. Options:

1. **Freesound.org CC0 samples** — Fast, free, legal. Quality varies.
2. **Record our own** — Best quality, but we'd need a clean DI guitar recording. Matt could provide one.
3. **Synthesized clean guitar** — Web Audio oscillators + body resonance. Sounds fake.

**Decision needed:** Use CC0 samples from Freesound for V1. They're good enough for demo purposes. If Matt wants to record his own DI samples later, we swap them in.

### ⚠️ Departure Mono Font — Licensing Check

Departure Mono is free for personal use. For a public web app deployed to a URL, we need to confirm the license allows web embedding. **Fallback: JetBrains Mono** (open source, OFL license, confirmed free for web use). JetBrains Mono actually has excellent technical/monospace character — it won't compromise the aesthetic.

**Decision:** Use JetBrains Mono as primary monospace. If Departure Mono is confirmed OFL/free, swap in later.

### ✅ Deployment — GitHub Pages

Simple, free, fits the repo-centric workflow. Vite builds to static files. `gh-pages` npm package handles deployment. No server needed.

---

## Design Audit (Make-Good-Art Quality Gates)

### 3-Second Read Test
When someone lands on the page, within 3 seconds they should understand: "This is a tool for designing guitar pedals." The oscilloscope visualization + pedal enclosure outline + circuit selector accomplish this. **Pass.**

### Squint Test
At a squint/blur, the layout should read as: dark workbench with two distinct work areas, red accent drawing the eye to active elements. The high contrast (white on black) ensures legibility. **Pass.**

### Information Density Check
The spec calls for "dense but organized" (aviation chart model). This is correct for the audience. DIY pedal builders are technical users who want information, not empty space. The risk is the OPPOSITE — being too sparse would feel like a toy. **Pass.**

### Differentiation Test
"What's the one thing someone will remember?" — The oscilloscope waveform changing in real-time as you twist a virtual knob, with the matte black tactical aesthetic. Nothing in this space looks or feels like this. **Strong pass.**

### Mobile Consideration
The brainstorm correctly identifies desktop-first. On mobile, the enclosure designer becomes impractical (drag precision). Recommendation: on mobile, show Circuit Lab only in a single-column layout with simplified controls. Enclosure Designer gets a "Use desktop for full experience" message. **Amended in plan.**

---

## Scope Audit

### Is 6 circuits the right number?
Yes. Covers the major families:
- **Overdrive:** Tube Screamer, Klon Centaur
- **Distortion:** RAT
- **Fuzz:** Big Muff, Fuzz Face
- **Modulation:** Phase 90

Missing categories (delay, chorus, reverb) are good V2 candidates but would significantly expand scope. 6 is right for V1.

### Is the enclosure designer necessary for V1?
**Yes.** It's the key differentiator. Without it, this is just another amp sim (Noise-box already exists). The combination of "hear it + design the box" is the entire value proposition.

### What's the realistic build time for Codex?
Estimated: 4-6 hours of Codex time across multiple sessions.
- Audio engine + 6 circuits: 2-3 hours
- UI/layout/styling: 1-2 hours
- Enclosure designer + PDF export: 1-2 hours
- Integration + polish: 1 hour

---

## Amendments to Brainstorm

1. **ADD:** Calibration square on PDF exports (25mm × 25mm)
2. **CHANGE:** Primary font to JetBrains Mono (confirmed OFL); Departure Mono as stretch goal
3. **ADD:** CC0 audio samples from Freesound as V1 source
4. **ADD:** Mobile fallback strategy (Circuit Lab only, simplified)
5. **ADD:** LocalStorage for saving current design state (lightweight, no auth required)
6. **CHANGE:** Deployment to GitHub Pages (confirmed decision)

---

## Approved for Planning

This brainstorm is technically sound, aesthetically well-directed, and appropriately scoped. The Web Audio API approach is proven, the design direction is distinctive, and the competitive gap is real.

**Next step:** CE: Plan — break this into implementation tasks for Codex.
