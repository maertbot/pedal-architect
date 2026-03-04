import type { CircuitLesson } from './types'

export const tubeScreamerLesson: CircuitLesson = {
  circuitId: 'tube-screamer-wdf',
  title: 'Tube Screamer Learn Mode',
  intro: 'Walk the TS808 from input to output and hear how each section builds the classic mid-forward overdrive.',
  steps: [
    {
      id: 'ts-signal-path',
      title: 'The Signal Path',
      narration:
        'Every note passes through these 9 components in sequence, and each handoff is part of the voice. The Tube Screamer is not one magic part; it is a chain where filtering, clipping, and level staging all interact. As you step through, treat this like tracing a signal with your probe from jack to output.',
      highlightComponents: [
        'ts-input-cap',
        'ts-input-resistor',
        'ts-clipping-diodes',
        'ts-drive-pot',
        'ts-feedback-cap',
        'ts-tone-resistor',
        'ts-tone-cap',
        'ts-tone-pot',
        'ts-volume',
      ],
    },
    {
      id: 'ts-input-coupling',
      title: 'Input Coupling',
      narration:
        'This cap is a bouncer, deciding how much bass gets into the party before clipping even starts. Smaller values trim low end early, which tightens the pedal and can make palm mutes feel more focused. Bigger values let more bass through, so the drive stage feels fuller and heavier.',
      highlightComponents: ['ts-input-cap'],
      experiment: {
        type: 'value',
        targetComponent: 'ts-input-cap',
        instruction: 'Sweep this cap from 0.25x to 4x in steps.',
        listenFor: 'How the low-end weight changes before the pedal starts to grind.',
        suggestedValues: [0.25, 0.5, 1, 2, 4],
      },
    },
    {
      id: 'ts-clipping-stage',
      title: 'The Clipping Stage',
      narration:
        'These two tiny diodes are the Tube Screamer signature, turning peaks into that smooth, compressed grind. Their symmetry keeps clipping tight and controlled instead of ragged. Toggle them off and you hear the gain structure without the familiar TS bite.',
      highlightComponents: ['ts-clipping-diodes'],
      experiment: {
        type: 'bypass',
        targetComponent: 'ts-clipping-diodes',
        instruction: 'Bypass the clipping diodes, then re-enable them.',
        listenFor: 'How the overdrive character collapses into a cleaner, less compressed signal when clipping is removed.',
      },
    },
    {
      id: 'ts-drive-control',
      title: 'Drive Control',
      narration:
        'The Drive knob changes feedback resistance in the clipping amp, which directly changes how hard it pushes the diodes. Less resistance means more loop gain and stronger clipping. You should hear the attack get denser and sustain thicken as you sweep upward.',
      highlightComponents: ['ts-drive-pot'],
      experiment: {
        type: 'knob',
        paramId: 'drive',
        instruction: 'Sweep the DRIVE knob from low to high.',
        listenFor: 'Increasing compression, harmonic density, and sustain as clipping ramps up.',
        paramValues: [0.1, 0.4, 0.7, 1],
      },
    },
    {
      id: 'ts-diode-type',
      title: 'Why Diode Type Matters',
      narration:
        'Silicon diodes clip a little sharper, and that is part of why the Tube Screamer sounds tight and focused. This is a big contrast with the Klon approach, where germanium clipping feels softer and rounder. Same concept, different threshold and texture at the edges of each note.',
      highlightComponents: ['ts-clipping-diodes'],
    },
    {
      id: 'ts-tone-control',
      title: 'Tone Control',
      narration:
        'This cap is the heart of a simple post-clipping lowpass. Bigger cap, lower cutoff, darker result; smaller cap, brighter top end. You are shaping fizz versus smoothness here, not just turning up generic treble.',
      highlightComponents: ['ts-tone-cap'],
      experiment: {
        type: 'value',
        targetComponent: 'ts-tone-cap',
        instruction: 'Sweep this cap from 0.25x to 4x.',
        listenFor: 'How brightness shifts from airy and edgy to rounded and dark.',
        suggestedValues: [0.25, 0.5, 1, 2, 4],
      },
    },
    {
      id: 'ts-volume-stage',
      title: 'Volume Stage',
      narration:
        'After all that shaping, this pot mostly sets output level. It does not redesign the clipping voice; it decides how hard you hit whatever comes next. Use it to compare unity gain against boosted output while keeping the same drive setting.',
      highlightComponents: ['ts-volume'],
      experiment: {
        type: 'knob',
        paramId: 'level',
        instruction: 'Sweep the LEVEL knob from low to high.',
        listenFor: 'Mostly loudness change, with the same core overdrive texture.',
        paramValues: [0.2, 0.6, 1, 1.4],
      },
    },
    {
      id: 'ts-mid-hump',
      title: 'The Mid-Hump',
      narration:
        'The Tube Screamer mid-hump comes from multiple filters working together, not one secret part. The coupling caps keep deep bass in check while the feedback network shapes the top end around clipping. That leaves the mids forward, which is why leads sit so well in a mix.',
      highlightComponents: ['ts-input-cap', 'ts-feedback-cap'],
      experiment: {
        type: 'value',
        targetComponent: 'ts-input-cap',
        instruction: 'Move the input cap between 0.25x and 4x while listening to chord clarity.',
        listenFor: 'At lower values, tighter lows and stronger apparent mids; at higher values, fuller lows and less hump focus.',
        suggestedValues: [0.25, 0.5, 1, 2, 4],
      },
    },
  ],
  conclusion:
    'You now have the TS map: controlled low end in, silicon clipping in the middle, and tone/level shaping at the end. Small value changes in those spots shift feel as much as raw gain does.',
}
