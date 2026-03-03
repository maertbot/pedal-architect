import type { CircuitModel } from '../types'
import { createCurve } from './utils'

export const rat: CircuitModel = {
  id: 'rat',
  name: 'ProCo RAT',
  description: 'Aggressive hard clipping distortion with sweeping filter.',
  category: 'distortion',
  year: 1978,
  iconPath: 'M4 26h12l4-18 4 18h12',
  parameters: [
    { id: 'distortion', name: 'Distortion', label: 'DIST', min: 1, max: 36, default: 10, unit: '', curve: 'logarithmic', componentType: 'pot' },
    { id: 'filter', name: 'Filter', label: 'FILTER', min: 800, max: 8000, default: 3400, unit: 'Hz', curve: 'logarithmic', componentType: 'pot' },
    { id: 'volume', name: 'Volume', label: 'VOLUME', min: 0, max: 1.5, default: 0.9, unit: '', curve: 'linear', componentType: 'pot' },
  ],
  create: (ctx) => {
    const preGain = new GainNode(ctx, { gain: 10 })
    const shaper = new WaveShaperNode(ctx, {
      oversample: '4x',
      curve: createCurve((x) => {
        const y = x * 10
        const hard = Math.sign(y) * Math.min(Math.abs(y), 1)
        return hard * 0.88 + Math.tanh(y * 0.7) * 0.12
      }),
    })
    const filter = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 3400, Q: 0.8 })
    const out = new GainNode(ctx, { gain: 0.9 })

    preGain.connect(shaper)
    shaper.connect(filter)
    filter.connect(out)

    return {
      input: preGain,
      output: out,
      setParameter: (paramId, value) => {
        if (paramId === 'distortion') {
          preGain.gain.value = value
          shaper.curve = createCurve((x) => {
            const y = x * value
            const hard = Math.sign(y) * Math.min(Math.abs(y), 1)
            return hard * 0.88 + Math.tanh(y * 0.7) * 0.12
          })
        }
        if (paramId === 'filter') filter.frequency.value = value
        if (paramId === 'volume') out.gain.value = value
      },
    }
  },
}
