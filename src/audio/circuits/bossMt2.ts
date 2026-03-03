import type { CircuitModel } from '../types'
import { createCurve } from './utils'

export const bossMt2: CircuitModel = {
  id: 'boss-mt2',
  name: 'Boss MT-2 Metal Zone',
  description: 'High-gain distortion with active low/high and semi-parametric mids.',
  category: 'distortion',
  year: 1991,
  iconPath: 'M4 24h8l4-8 4 8h4l4-12 4 12h4l4-8h8',
  parameters: [
    { id: 'distortion', name: 'Distortion', label: 'DIST', min: 2, max: 58, default: 20, unit: '', curve: 'logarithmic', componentType: 'pot' },
    { id: 'low', name: 'Low', label: 'LOW', min: -15, max: 15, default: 0, unit: 'dB', curve: 'linear', componentType: 'pot' },
    { id: 'middle', name: 'Middle', label: 'MID', min: -15, max: 15, default: 0, unit: 'dB', curve: 'linear', componentType: 'pot' },
    { id: 'midFreq', name: 'Mid Freq', label: 'MID F', min: 200, max: 5000, default: 900, unit: 'Hz', curve: 'logarithmic', componentType: 'pot' },
    { id: 'high', name: 'High', label: 'HIGH', min: -15, max: 15, default: 0, unit: 'dB', curve: 'linear', componentType: 'pot' },
    { id: 'level', name: 'Level', label: 'LEVEL', min: 0, max: 1.6, default: 0.86, unit: '', curve: 'linear', componentType: 'pot' },
  ],
  create: (ctx) => {
    const preGain = new GainNode(ctx, { gain: 20 })
    const tight = new BiquadFilterNode(ctx, { type: 'highpass', frequency: 90, Q: 0.7 })
    const clipA = new WaveShaperNode(ctx, {
      oversample: '4x',
      curve: createCurve((x) => Math.tanh(x * 8) / Math.tanh(8)),
    })
    const clipB = new WaveShaperNode(ctx, {
      oversample: '4x',
      curve: createCurve((x) => {
        const y = x * 8
        const hard = Math.sign(y) * Math.min(1, Math.abs(y))
        return hard * 0.7 + Math.tanh(y * 0.4) * 0.3
      }),
    })

    const low = new BiquadFilterNode(ctx, { type: 'lowshelf', frequency: 120, gain: 0 })
    const mid = new BiquadFilterNode(ctx, { type: 'peaking', frequency: 900, Q: 1.1, gain: 0 })
    const high = new BiquadFilterNode(ctx, { type: 'highshelf', frequency: 3200, gain: 0 })
    const topCut = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 7600, Q: 0.66 })
    const level = new GainNode(ctx, { gain: 0.86 })

    preGain.connect(tight)
    tight.connect(clipA)
    clipA.connect(clipB)
    clipB.connect(low)
    low.connect(mid)
    mid.connect(high)
    high.connect(topCut)
    topCut.connect(level)

    return {
      input: preGain,
      output: level,
      setParameter: (paramId, value) => {
        if (paramId === 'distortion') {
          preGain.gain.value = value
          clipA.curve = createCurve((x) => Math.tanh(x * value * 0.43) / Math.tanh(value * 0.43))
          clipB.curve = createCurve((x) => {
            const y = x * value * 0.38
            const hard = Math.sign(y) * Math.min(1, Math.abs(y))
            return hard * 0.74 + Math.tanh(y * 0.45) * 0.26
          })
        }
        if (paramId === 'low') low.gain.value = value
        if (paramId === 'middle') mid.gain.value = value
        if (paramId === 'midFreq') mid.frequency.value = value
        if (paramId === 'high') high.gain.value = value
        if (paramId === 'level') level.gain.value = value
      },
      getFilterNodes: () => [
        { node: tight, topology: 'series', label: 'Input HP' },
        { node: low, topology: 'series', label: 'Low EQ', paramId: 'low' },
        { node: mid, topology: 'series', label: 'Mid EQ', paramId: 'middle' },
        { node: high, topology: 'series', label: 'High EQ', paramId: 'high' },
        { node: topCut, topology: 'series', label: 'Top LP' },
      ],
    }
  },
}
