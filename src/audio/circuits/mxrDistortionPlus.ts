import type { CircuitModel } from '../types'
import { createCurve } from './utils'

export const mxrDistortionPlus: CircuitModel = {
  id: 'mxr-distortion-plus',
  name: 'MXR Distortion+',
  description: 'Two-knob op-amp distortion with fixed bright top-end contour.',
  category: 'distortion',
  year: 1973,
  iconPath: 'M4 22h12l3-12 3 12h8l3-8 3 8h12',
  parameters: [
    { id: 'distortion', name: 'Distortion', label: 'DIST', min: 2, max: 45, default: 12, unit: '', curve: 'logarithmic', componentType: 'pot' },
    { id: 'output', name: 'Output', label: 'OUTPUT', min: 0, max: 1.8, default: 0.9, unit: '', curve: 'linear', componentType: 'pot' },
  ],
  create: (ctx) => {
    const preGain = new GainNode(ctx, { gain: 12 })
    const lowCut = new BiquadFilterNode(ctx, { type: 'highpass', frequency: 160, Q: 0.64 })
    const clipper = new WaveShaperNode(ctx, {
      oversample: '4x',
      curve: createCurve((x) => {
        const y = x * 12
        return Math.sign(y) * Math.min(1, Math.abs(y))
      }),
    })
    const topRollOff = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 9000, Q: 0.72 })
    const output = new GainNode(ctx, { gain: 0.9 })

    preGain.connect(lowCut)
    lowCut.connect(clipper)
    clipper.connect(topRollOff)
    topRollOff.connect(output)

    return {
      input: preGain,
      output,
      setParameter: (paramId, value) => {
        if (paramId === 'distortion') {
          preGain.gain.value = value
          clipper.curve = createCurve((x) => {
            const y = x * value
            const hard = Math.sign(y) * Math.min(1, Math.abs(y))
            return hard * 0.84 + Math.tanh(y * 0.4) * 0.16
          })
        }
        if (paramId === 'output') output.gain.value = value
      },
      getFilterNodes: () => [
        { node: lowCut, topology: 'series', label: 'Input HP' },
        { node: topRollOff, topology: 'series', label: 'Post LP' },
      ],
    }
  },
}
