import type { CircuitLesson } from './types'

export const klonCentaurLesson: CircuitLesson = {
  circuitId: 'klon-centaur-wdf',
  title: 'Klon Centaur: Transparent Architecture',
  intro:
    'The Klon is not just clipping; it is a parallel system that keeps clean definition while adding drive content. This lesson focuses on the clean blend, germanium texture, and gain-dependent behavior that make the design feel transparent.',
  steps: [
    {
      id: 'kl-overview',
      title: 'Signal Path Overview',
      narration:
        'The signal splits after buffering into clean and drive branches, then recombines before treble and output controls. This parallel architecture preserves note shape while adding harmonic content. Transparency comes from structure, not mystique.',
      highlightComponents: ['kl-input-buffer', 'kl-clean-path', 'kl-gain-stage', 'kl-summing'],
    },
    {
      id: 'kl-clean-blend',
      title: 'Clean Blend Innovation',
      narration:
        'A dedicated clean path runs alongside the clipped branch and is summed back in. This keeps pick attack and low-level detail intact as gain rises. Bypassing it reveals how much clarity it contributes.',
      highlightComponents: ['kl-clean-path', 'kl-summing'],
      experiment: {
        type: 'bypass',
        targetComponent: 'kl-clean-path',
        instruction: 'Toggle the clean path off and on.',
        listenFor: 'Without clean blend, the sound feels flatter and more purely distorted.',
        explanation: 'Parallel clean signal restores transient definition that pure clipping stages often smear.',
      },
    },
    {
      id: 'kl-germanium',
      title: 'Why Germanium Diodes',
      narration:
        'Germanium diodes clip with a softer, lower-threshold character than common silicon choices. In the Klon branch this contributes smoothness before summing with clean content. Turning clipping off isolates what those diodes add.',
      highlightComponents: ['kl-clipping-diodes', 'kl-gain-stage'],
      experiment: {
        type: 'bypass',
        targetComponent: 'kl-clipping-diodes',
        instruction: 'Bypass the clipping diodes, then re-enable them.',
        listenFor: 'The drive branch loses compressed harmonic thickness when clipping is bypassed.',
        explanation: 'Germanium clipping sets the overdrive texture that the clean branch then balances.',
      },
    },
    {
      id: 'kl-gain-dependent-blend',
      title: 'Gain-Dependent Blend Shift',
      narration:
        'As gain increases, the relative contribution of clipped content becomes more obvious even with clean path still present. The result is a continuous transition from boost-like clarity toward richer overdrive. This is why the control feels gradual and musical.',
      highlightComponents: ['kl-gain-stage', 'kl-clean-path', 'kl-clipping-diodes', 'kl-summing'],
      experiment: {
        type: 'knob',
        paramId: 'gain',
        instruction: 'Sweep GAIN from low to high while playing sustained notes.',
        listenFor: 'Low settings stay clean-forward; higher settings shift toward denser clipped harmonics.',
        paramValues: [0.15, 0.45, 0.85],
        explanation: 'The architecture preserves clean definition while increasing drive-branch prominence with gain.',
      },
    },
    {
      id: 'kl-treble',
      title: 'Treble as High-Shelf',
      narration:
        'The Klon treble circuit behaves like a shelf voice, emphasizing upper frequencies without acting like a simple low-pass cut. That keeps body intact while changing bite and articulation. It is a different tonal philosophy from many overdrives.',
      highlightComponents: ['kl-treble-control'],
      experiment: {
        type: 'knob',
        paramId: 'treble',
        instruction: 'Try TREBLE at low, middle, and high settings.',
        listenFor: 'Higher values add edge and clarity while lows remain present.',
        paramValues: [0.2, 0.5, 0.85],
        explanation: 'A high-shelf tilt changes top-end emphasis rather than only moving a low-pass cutoff.',
      },
    },
    {
      id: 'kl-buffers',
      title: 'Input and Output Buffering',
      narration:
        'Buffering around the core network stabilizes impedance interaction with guitars, cables, and downstream pedals. This makes tone and feel more consistent across rig changes. It is a practical engineering choice for pedalboards.',
      highlightComponents: ['kl-input-buffer', 'kl-output-volume'],
    },
    {
      id: 'kl-transparent-engineering',
      title: 'Transparent Means Designed',
      narration:
        'Klon transparency comes from parallel summing, controlled clipping texture, and measured EQ behavior working together. None of these parts alone creates the full effect. The design is deliberate system engineering, not magic.',
      highlightComponents: ['kl-clean-path', 'kl-clipping-diodes', 'kl-summing', 'kl-treble-control'],
    },
  ],
  conclusion:
    'You have mapped the Klon architecture: clean/drive parallelism plus gentle clipping and shelf voicing produce clarity with controllable grit.',
}
