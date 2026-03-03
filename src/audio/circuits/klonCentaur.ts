import type { CircuitModel } from '../types'
import { createCurve } from './utils'

export const klonCentaur: CircuitModel = {
  id: 'klon-centaur',
  name: 'Klon Centaur',
  description: 'Transparent overdrive with clean blend dynamics.',
  category: 'overdrive',
  year: 1994,
  iconPath: 'M4 20h8l4-8 8 16 8-16 4 8h8',
  parameters: [
    { id: 'gain', name: 'Gain', label: 'GAIN', min: 1, max: 28, default: 7, unit: '', curve: 'logarithmic', componentType: 'pot' },
    { id: 'treble', name: 'Treble', label: 'TREBLE', min: 1300, max: 7000, default: 3200, unit: 'Hz', curve: 'logarithmic', componentType: 'pot' },
    { id: 'output', name: 'Output', label: 'OUTPUT', min: 0, max: 1.5, default: 0.9, unit: '', curve: 'linear', componentType: 'pot' },
  ],
  create: (ctx) => {
    const split = new GainNode(ctx)

    const clean = new GainNode(ctx, { gain: 0.6 })

    const drivenPre = new GainNode(ctx, { gain: 7 })
    const germanium = new WaveShaperNode(ctx, {
      oversample: '4x',
      curve: createCurve((x) => (Math.tanh(x * 7) + Math.tanh(x * 3.5) * 0.35) / 1.35),
    })
    const driveGain = new GainNode(ctx, { gain: 0.4 })
    drivenPre.connect(germanium)
    germanium.connect(driveGain)

    split.connect(clean)
    split.connect(drivenPre)

    const mix = new GainNode(ctx)
    clean.connect(mix)
    driveGain.connect(mix)

    const treble = new BiquadFilterNode(ctx, { type: 'highshelf', frequency: 3200, gain: 4 })
    const output = new GainNode(ctx, { gain: 0.9 })
    mix.connect(treble)
    treble.connect(output)

    return {
      input: split,
      output,
      setParameter: (paramId, value) => {
        if (paramId === 'gain') {
          drivenPre.gain.value = value
          const blend = Math.min(0.9, Math.max(0.1, value / 28))
          driveGain.gain.value = blend
          clean.gain.value = 1 - blend * 0.8
          germanium.curve = createCurve((x) => (Math.tanh(x * value) + Math.tanh(x * value * 0.5) * 0.35) / 1.35)
        }
        if (paramId === 'treble') treble.frequency.value = value
        if (paramId === 'output') output.gain.value = value
      },
      getFilterNodes: () => [{ node: treble, topology: 'series', label: 'Treble', paramId: 'treble' }],
    }
  },
}
