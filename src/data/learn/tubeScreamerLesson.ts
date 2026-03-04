import type { CircuitLesson } from './types'

export const tubeScreamerLesson: CircuitLesson = {
  circuitId: 'tube-screamer-wdf',
  title: 'Tube Screamer: Mid-Hump Overdrive',
  intro:
    'Learn how the TS808 turns guitar dynamics into smooth overdrive. Each step isolates one design choice so you can hear why this circuit feels warm, focused, and mix-friendly.',
  steps: [
    {
      id: 'ts-overview',
      title: 'Signal Path Overview',
      narration:
        'The Tube Screamer is a staged design: input conditioning, clipping in a feedback loop, then tone shaping and final level. Instead of massive gain, it uses selective filtering and controlled clipping to stay musical. We will walk each section and listen for what it contributes.',
      highlightComponents: ['ts-input-cap', 'ts-clipping-diodes', 'ts-tone-cap', 'ts-volume'],
    },
    {
      id: 'ts-input-buffering',
      title: 'Input Coupling and Impedance',
      narration:
        'The input capacitor and resistor set what low frequencies enter the gain stage and how strongly the guitar drives it. This front-end impedance behavior strongly affects feel before any clipping occurs. A stable input stage keeps the overdrive predictable across pickups.',
      highlightComponents: ['ts-input-cap', 'ts-input-resistor'],
    },
    {
      id: 'ts-diode-clipping',
      title: 'Clipping Stage Diodes',
      narration:
        'The antiparallel silicon diodes in the feedback path create the TS soft-clipping voice. They limit signal swing and add harmonics while also compressing transients. Removing them reveals how much of the overdrive identity lives here.',
      highlightComponents: ['ts-clipping-diodes'],
      experiment: {
        type: 'bypass',
        targetComponent: 'ts-clipping-diodes',
        instruction: 'Toggle the clipping diodes off, then back on.',
        listenFor: 'Notice how the tone becomes cleaner and less compressed when the diodes are bypassed.',
        explanation: 'Diodes set a soft clipping threshold. With them active, harmonics increase and picking feels more compressed.',
      },
    },
    {
      id: 'ts-drive-feedback',
      title: 'Drive Control in Feedback Loop',
      narration:
        'The drive control changes effective feedback resistance around the clipping stage. Lower feedback resistance increases loop gain and pushes clipping harder. That is why Drive changes both distortion amount and touch response.',
      highlightComponents: ['ts-drive-pot', 'ts-feedback-cap', 'ts-clipping-diodes'],
      experiment: {
        type: 'knob',
        paramId: 'drive',
        instruction: 'Sweep DRIVE through low, mid, and high positions.',
        listenFor: 'Listen for the transition from edge-of-breakup to dense clipping and longer sustain.',
        paramValues: [0.15, 0.55, 0.9],
        explanation: 'Higher drive raises the signal presented to the clipping branch and increases nonlinear action.',
      },
    },
    {
      id: 'ts-diode-type',
      title: 'Why Diode Type Matters',
      narration:
        'Silicon diodes clip at a different threshold and texture than germanium parts. The Tube Screamer uses silicon for a tighter, more consistent edge. Later, compare this to the Klon lesson where germanium clipping and clean blend change the feel.',
      highlightComponents: ['ts-clipping-diodes'],
    },
    {
      id: 'ts-tone-lowpass',
      title: 'Tone Control as RC Low-Pass',
      narration:
        'After clipping, the tone network smooths high-frequency content that would otherwise sound fizzy. The tone capacitor and resistance set the low-pass cutoff. This is where you shape bite versus smoothness.',
      highlightComponents: ['ts-tone-resistor', 'ts-tone-cap', 'ts-tone-pot'],
      experiment: {
        type: 'value',
        targetComponent: 'ts-tone-cap',
        instruction: 'Change the tone capacitor multiplier between the suggested values.',
        listenFor: 'Notice larger values darken the sound while smaller values keep more high-end bite.',
        suggestedValues: [0.25, 1, 4],
        explanation: 'Increasing capacitance lowers cutoff frequency, so more highs are filtered out.',
      },
    },
    {
      id: 'ts-volume-stage',
      title: 'Volume at the End',
      narration:
        'The output volume control is placed last so it does not alter clipping behavior upstream. This lets you set loudness independently after tone is shaped. It is a gain-staging choice that keeps drive and level controls useful.',
      highlightComponents: ['ts-volume'],
    },
    {
      id: 'ts-mid-hump',
      title: 'The Mid-Hump Voice',
      narration:
        'The Tube Screamer signature comes from where low end is filtered before and around clipping, not just from the diodes. This creates a focused midrange that helps guitar cut through a mix. Small value changes at the input coupling point shift that balance quickly.',
      highlightComponents: ['ts-input-cap', 'ts-input-resistor', 'ts-clipping-diodes'],
      experiment: {
        type: 'value',
        targetComponent: 'ts-input-cap',
        instruction: 'Try smaller and larger input cap multipliers.',
        listenFor: 'Smaller values feel tighter and thinner; larger values admit more bass into clipping and sound fuller.',
        suggestedValues: [0.25, 1, 4],
        explanation: 'Input coupling capacitance controls how much low-frequency content reaches the nonlinear stage.',
      },
    },
  ],
  conclusion:
    'You have traced how the TS808 balances clipping, filtering, and gain staging to produce a focused mid-forward overdrive rather than a full-range fuzz.',
}
