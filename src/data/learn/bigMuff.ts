import type { CircuitLesson } from './types'

export const bigMuffLesson: CircuitLesson = {
  circuitId: 'big-muff-wdf',
  title: 'Big Muff Learn Mode',
  intro: 'Trace how the Big Muff stacks clipping stages, then carves the result with its famous tone network.',
  steps: [
    {
      id: 'bm-signal-path',
      title: 'Signal Path Overview',
      narration:
        'Think of this as four stages of destruction feeding one tone stack. Each clipping block adds compression and harmonics, so the sound gets denser as it travels right. By the time it reaches the tone network, there is a lot of fuzz energy to shape.',
      highlightComponents: [
        'bm-input-cap',
        'bm-input-resistor',
        'bm-clip1-diodes',
        'bm-clip1-cap',
        'bm-clip2-diodes',
        'bm-clip2-cap',
        'bm-clip3-diodes',
        'bm-clip3-cap',
        'bm-clip4-diodes',
        'bm-clip4-cap',
        'bm-tone-lp-cap',
        'bm-tone-hp-cap',
        'bm-tone-pot',
        'bm-volume',
      ],
    },
    {
      id: 'bm-single-stage',
      title: 'A Single Clipping Stage',
      narration:
        'One clipping stage is already a complete mini fuzz voice: transistor-like gain feeding diode limiting. The coupling cap around it decides how much low-frequency weight survives that transfer. Change it and the stage either feels tight and focused or fat and heavy.',
      highlightComponents: ['bm-clip1-diodes', 'bm-clip1-cap'],
      experiment: {
        type: 'value',
        targetComponent: 'bm-clip1-cap',
        instruction: 'Sweep the first clip-stage cap from 0.25x to 4x.',
        listenFor: 'Whether this stage hands off a lean, punchy signal or a thicker low-end payload.',
        suggestedValues: [0.25, 0.5, 1, 2, 4],
      },
    },
    {
      id: 'bm-why-four',
      title: 'Why Four Stages?',
      narration:
        'Cascading clipping is why a Muff can feel like a wall instead of a light overdrive. Each stage adds sustain and compression on top of the last one. Remove late stages and the fuzz gets noticeably thinner and less endless.',
      highlightComponents: ['bm-clip1-diodes', 'bm-clip2-diodes', 'bm-clip3-diodes', 'bm-clip4-diodes'],
      experiment: {
        type: 'bypass',
        targetComponent: 'bm-clip4-diodes',
        instruction: 'Bypass clip stage 4 diodes, then re-enable and compare. Next, repeat the same idea with clip stage 3 from the topology.',
        listenFor: 'Sustain and density dropping as late clipping stages are removed.',
      },
    },
    {
      id: 'bm-tone-stack',
      title: 'The Legendary Tone Stack',
      narration:
        'This tone section is a parallel split: one branch favors lows, the other favors highs, then they recombine at the pot. The middle area is where the classic mid-scoop appears. That scoop is why the Muff can sound huge alone but sit differently than a Tube Screamer in a band mix.',
      highlightComponents: ['bm-tone-lp-cap', 'bm-tone-hp-cap', 'bm-tone-pot'],
      experiment: {
        type: 'value',
        targetComponent: 'bm-tone-lp-cap',
        instruction: 'Change the low-pass branch cap from 0.25x to 4x.',
        listenFor: 'How the dark side of the blend gets heavier or lighter as the branch cutoff moves.',
        suggestedValues: [0.25, 0.5, 1, 2, 4],
      },
    },
    {
      id: 'bm-tone-sweep',
      title: 'Tone Knob Sweep',
      narration:
        'The Tone knob crossfades between those LP and HP branches, not a simple treble cut. Noon tends to emphasize the mid scoop, while the extremes lean darker or brighter. Sweep it slowly and listen to where your pick attack sits.',
      highlightComponents: ['bm-tone-pot'],
      experiment: {
        type: 'knob',
        paramId: 'tone',
        instruction: 'Sweep the TONE knob from 0 to 1, pausing around noon.',
        listenFor: 'Mid scoop near center, with bass-favored and treble-favored extremes at the ends.',
        paramValues: [0, 0.25, 0.5, 0.75, 1],
      },
    },
    {
      id: 'bm-sustain-control',
      title: 'Sustain Control',
      narration:
        'Sustain is really input drive into the clipping cascade. Push more level in and the later stages stay in compression longer, which feels like extra sustain. Pull it back and the response opens up with less blanket-like fuzz.',
      highlightComponents: ['bm-input-resistor'],
      experiment: {
        type: 'knob',
        paramId: 'sustain',
        instruction: 'Sweep the SUSTAIN control from low to high.',
        listenFor: 'How the clipping chain shifts from gritty to saturated and long-decay fuzz.',
        paramValues: [2, 10, 20, 30, 40],
      },
    },
    {
      id: 'bm-architectural-compare',
      title: 'Why It Sounds Different',
      narration:
        'Compared with a Tube Screamer, this architecture is a different philosophy: multiple clipping stages plus a scooping blend network. The TS pushes mids forward with a tighter low-end entry. The Muff stacks saturation and then carves out center energy, which is why its fuzz feels wider and more cinematic.',
      highlightComponents: [
        'bm-input-cap',
        'bm-input-resistor',
        'bm-clip1-diodes',
        'bm-clip1-cap',
        'bm-clip2-diodes',
        'bm-clip2-cap',
        'bm-clip3-diodes',
        'bm-clip3-cap',
        'bm-clip4-diodes',
        'bm-clip4-cap',
        'bm-tone-lp-cap',
        'bm-tone-hp-cap',
        'bm-tone-pot',
        'bm-volume',
      ],
    },
  ],
  conclusion:
    'Big Muff identity comes from stacking clipping repeatedly, then using a split tone network to sculpt the resulting fuzz wall.',
}
