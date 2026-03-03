import type { CircuitModel } from '../types'
import { createCurve } from './utils'

export const fuzzFace: CircuitModel = {
  id: 'fuzz-face',
  name: 'Fuzz Face',
  description: 'Asymmetric vintage fuzz with input cleanup behavior.',
  category: 'fuzz',
  year: 1966,
  iconPath: 'M4 20h8a6 6 0 0 1 12 0h8',
  parameters: [
    { id: 'fuzz', name: 'Fuzz', label: 'FUZZ', min: 1, max: 32, default: 12, unit: '', curve: 'logarithmic', componentType: 'pot' },
    { id: 'volume', name: 'Volume', label: 'VOLUME', min: 0, max: 1.6, default: 1, unit: '', curve: 'linear', componentType: 'pot' },
  ],
  create: (ctx) => {
    const preGain = new GainNode(ctx, { gain: 12 })
    const gate = new DynamicsCompressorNode(ctx, {
      threshold: -45,
      knee: 6,
      ratio: 14,
      attack: 0.004,
      release: 0.25,
    })
    const shaper = new WaveShaperNode(ctx, {
      oversample: '4x',
      curve: createCurve((x) => {
        const y = x * 12
        const asymmetric = y >= 0 ? Math.tanh(y * 0.85) : Math.tanh(y * 0.38) * 0.75
        return asymmetric
      }),
    })
    const out = new GainNode(ctx, { gain: 1 })

    preGain.connect(gate)
    gate.connect(shaper)
    shaper.connect(out)

    return {
      input: preGain,
      output: out,
      setParameter: (paramId, value) => {
        if (paramId === 'fuzz') {
          preGain.gain.value = value
          const threshold = -56 + Math.min(16, value * 0.6)
          gate.threshold.value = threshold
          shaper.curve = createCurve((x) => {
            const y = x * value
            const asymmetric = y >= 0 ? Math.tanh(y * 0.85) : Math.tanh(y * 0.38) * 0.75
            const cleanup = Math.abs(y) < 0.12 ? y * 0.35 : asymmetric
            return cleanup
          })
        }
        if (paramId === 'volume') out.gain.value = value
      },
      getFilterNodes: () => [],
    }
  },
}
