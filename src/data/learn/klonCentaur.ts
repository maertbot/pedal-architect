import type { CircuitLesson } from './types'

export const klonCentaurLesson: CircuitLesson = {
  circuitId: 'klon-centaur-wdf',
  title: 'Klon Centaur Learn Mode',
  intro: 'Follow the Klon architecture to hear how clean blend plus soft clipping creates its transparent feel.',
  steps: [
    {
      id: 'kl-signal-path',
      title: 'Signal Path Overview',
      narration:
        'This is the transparent overdrive blueprint: buffered input, split paths, recombination, then output voicing. Instead of forcing all signal through one clipping lane, the Klon keeps a clean lane alive. That structural choice is the core of its feel under your fingers.',
      highlightComponents: [
        'kl-input-buffer',
        'kl-clean-path',
        'kl-gain-stage',
        'kl-clipping-diodes',
        'kl-post-filter-r',
        'kl-post-filter-c',
        'kl-summing',
        'kl-treble-control',
        'kl-output-volume',
      ],
    },
    {
      id: 'kl-clean-blend',
      title: 'The Clean Blend',
      narration:
        'The clean path is the Klon innovation: it preserves note edges and pick clarity while drive is added in parallel. Remove that path and you lose a lot of the transparent character. What remains sounds more like a standard clipped overdrive lane.',
      highlightComponents: ['kl-clean-path'],
      experiment: {
        type: 'bypass',
        targetComponent: 'kl-clean-path',
        instruction: 'Bypass the clean path, then switch it back on.',
        listenFor: 'Transparency and note definition dropping when only the driven path is left.',
      },
    },
    {
      id: 'kl-germanium-diodes',
      title: 'Why Germanium Diodes?',
      narration:
        'Germanium diodes conduct earlier than silicon, so clipping starts sooner and feels softer at the transition. That gives the Klon drive path a rounder, less abrupt edge. Toggle clipping out to hear how much of the texture is coming from this pair.',
      highlightComponents: ['kl-clipping-diodes'],
      experiment: {
        type: 'bypass',
        targetComponent: 'kl-clipping-diodes',
        instruction: 'Bypass the germanium clipping pair, then re-enable it.',
        listenFor: 'Softer clipping texture disappearing when the diode limiter is removed.',
      },
    },
    {
      id: 'kl-gain-dependent-blend',
      title: 'Gain-Dependent Blend',
      narration:
        'Gain changes more than distortion amount here; it shifts the clean/drive balance. At low gain you hear mostly clean sparkle with a little edge. As gain rises, the drive branch takes over but the clean path never fully leaves.',
      highlightComponents: ['kl-gain-stage', 'kl-clean-path'],
      experiment: {
        type: 'knob',
        paramId: 'gain',
        instruction: 'Sweep the GAIN control from minimum to maximum.',
        listenFor: 'Transition from clean-forward boost to drive-forward texture while retaining core definition.',
        paramValues: [0, 0.25, 0.5, 0.75, 1],
      },
    },
    {
      id: 'kl-treble-control',
      title: 'Treble Control',
      narration:
        'This control behaves like a high-shelf, not a simple lowpass. Instead of mostly shaving highs like a Tube Screamer tone cap, it can actively add sparkle on top. Sweep it and focus on pick presence and air rather than bass loss.',
      highlightComponents: ['kl-treble-control'],
      experiment: {
        type: 'knob',
        paramId: 'treble',
        instruction: 'Sweep the TREBLE control from dark to bright.',
        listenFor: 'Top-end sparkle and edge increasing without the same kind of lowpass dulling.',
        paramValues: [0, 0.25, 0.5, 0.75, 1],
        explanation: 'The modeled filter is a high-shelf voicing stage, so you are shaping high-frequency emphasis instead of only rolling highs off.',
      },
    },
    {
      id: 'kl-buffers',
      title: 'Input/Output Buffers',
      narration:
        'Buffers are practical engineering, not hype. The input buffer keeps pickups from being loaded down, and the output stage drives the next pedal or cable more consistently. On a crowded pedalboard, that stability is a big part of why the Klon feels controlled.',
      highlightComponents: ['kl-input-buffer', 'kl-output-volume'],
    },
    {
      id: 'kl-transparent-not-magic',
      title: "Why 'Transparent' Isn't Magic",
      narration:
        'Transparency here is architecture: clean path retained, soft clipping branch blended in, and controlled output voicing. Nothing mystical is required when the signal flow is designed this way. The clean signal never leaves the path, so your guitar identity stays present even with gain added.',
      highlightComponents: [
        'kl-input-buffer',
        'kl-clean-path',
        'kl-gain-stage',
        'kl-clipping-diodes',
        'kl-post-filter-r',
        'kl-post-filter-c',
        'kl-summing',
        'kl-treble-control',
        'kl-output-volume',
      ],
    },
  ],
  conclusion:
    'Klon transparency is deliberate circuit design: preserve clean information, shape a softer clipped branch, and blend them with controlled EQ.',
}
