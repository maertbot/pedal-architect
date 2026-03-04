import type { CircuitLesson } from './types'

export const bigMuffLesson: CircuitLesson = {
  circuitId: 'big-muff-wdf',
  title: 'Big Muff: Four Stages of Destruction',
  intro:
    'Learn why the Big Muff sounds huge and sustaining: repeated clipping sections feed a blended tone stack that scoops the mids. This walkthrough isolates each architectural block so the fuzz behavior becomes predictable.',
  steps: [
    {
      id: 'bm-overview',
      title: 'Signal Path Overview',
      narration:
        'The Big Muff stacks multiple gain and clipping sections before a distinctive LP/HP tone blend. Instead of one clipping event, it accumulates saturation across stages. Think of it as controlled overload in sequence.',
      highlightComponents: ['bm-input-cap', 'bm-clip1-diodes', 'bm-clip4-diodes', 'bm-tone-pot'],
    },
    {
      id: 'bm-single-stage',
      title: 'One Clipping Stage Concept',
      narration:
        'Each clipping block combines gain behavior and diode limiting to generate harmonics. One stage already adds fuzz texture, but not the full sustain wall. The full Big Muff voice appears when these blocks cascade.',
      highlightComponents: ['bm-clip1-cap', 'bm-clip1-diodes'],
    },
    {
      id: 'bm-why-four',
      title: 'Why Four Stages?',
      narration:
        'Cascading stages compounds harmonic density and dynamic compression. Bypassing any clipping pair shows how much each section contributes to the final sustain. The effect is cumulative rather than all-or-nothing.',
      highlightComponents: ['bm-clip1-diodes', 'bm-clip2-diodes', 'bm-clip3-diodes', 'bm-clip4-diodes'],
      experiment: {
        type: 'bypass',
        targetComponent: 'bm-clip1-diodes',
        instruction: 'Bypass clip diodes one stage at a time: bm-clip1-diodes, bm-clip2-diodes, bm-clip3-diodes, then bm-clip4-diodes.',
        listenFor: 'Each bypass step reduces sustain and density; re-enabling restores the full fuzz wall.',
        explanation: 'Each diode pair adds nonlinear compression and harmonics, so removing stages thins the aggregate clipping result.',
      },
    },
    {
      id: 'bm-tone-stack',
      title: 'Legendary Tone Stack',
      narration:
        'The Muff tone stack blends low-pass and high-pass branches instead of using a simple single-filter tone control. Around center settings, this blend naturally scoops mids. That voicing is a major reason the pedal sounds massive but hollow in the middle.',
      highlightComponents: ['bm-tone-lp-cap', 'bm-tone-hp-cap', 'bm-tone-pot'],
      experiment: {
        type: 'value',
        targetComponent: 'bm-tone-lp-cap',
        instruction: 'Adjust the LP capacitor multiplier to reshape the dark branch.',
        listenFor: 'Larger values push darker response; smaller values reduce low-pass dominance.',
        suggestedValues: [0.25, 1, 4],
        explanation: 'The LP branch corner frequency shifts with capacitance, changing branch balance at the tone blend point.',
      },
    },
    {
      id: 'bm-tone-sweep',
      title: 'Tone Knob Sweep',
      narration:
        'The Tone control crossfades between low-pass-heavy and high-pass-heavy branches. Midpoint emphasizes the classic scoop, while extremes favor dark or bright output. Sweep it while sustaining notes to hear spectral movement clearly.',
      highlightComponents: ['bm-tone-pot', 'bm-tone-lp-cap', 'bm-tone-hp-cap'],
      experiment: {
        type: 'knob',
        paramId: 'tone',
        instruction: 'Move TONE from dark to bright and pause at center.',
        listenFor: 'Center sounds scooped; low settings feel thicker; high settings cut harder.',
        paramValues: [0.1, 0.5, 0.9],
        explanation: 'The control changes LP/HP branch weighting and shifts the midrange contour.',
      },
    },
    {
      id: 'bm-sustain',
      title: 'Sustain Feeds Clipping',
      narration:
        'Sustain changes how hard the clipping chain is driven. More input drive into many nonlinear stages means denser harmonics and longer apparent sustain. This control is effectively gain staging into the whole cascade.',
      highlightComponents: ['bm-input-resistor', 'bm-clip1-diodes', 'bm-clip4-diodes'],
      experiment: {
        type: 'knob',
        paramId: 'sustain',
        instruction: 'Set SUSTAIN low, medium, then high.',
        listenFor: 'Higher sustain increases compression, saturation, and note hold time.',
        paramValues: [4, 12, 30],
        explanation: 'Input amplitude into the clipping network rises, so each stage clips more aggressively.',
      },
    },
    {
      id: 'bm-vs-ts',
      title: 'Why It Differs from Tube Screamer',
      narration:
        'The Big Muff is a cascaded fuzz architecture with a branch-blend tone stack; the Tube Screamer is a mid-focused feedback overdrive with lighter clipping structure. Muff creates scale through repeated saturation, while TS shapes focus through selective filtering. Different architecture, different musical role.',
      highlightComponents: ['bm-clip1-diodes', 'bm-clip4-diodes', 'bm-tone-pot'],
    },
  ],
  conclusion:
    'You now have the Big Muff mental model: multi-stage clipping for sustain and a blend tone stack for the signature scoop.',
}
