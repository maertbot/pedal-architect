import type { CircuitModel } from '../types'
import { createCurve } from './utils'

export const bossBd2: CircuitModel = {
  id: 'boss-bd2',
  name: 'Boss BD-2 Blues Driver',
  description: 'Dynamic low-to-medium gain drive with broad tone contour.',
  category: 'overdrive',
  year: 1995,
  iconPath: 'M4 24h10l4-14 4 20 4-20 4 14h10',
  parameters: [
    { id: 'gain', name: 'Gain', label: 'GAIN', min: 1, max: 32, default: 7.5, unit: '', curve: 'logarithmic', componentType: 'pot' },
    { id: 'tone', name: 'Tone', label: 'TONE', min: -10, max: 10, default: 0, unit: 'dB', curve: 'linear', componentType: 'pot' },
    { id: 'level', name: 'Level', label: 'LEVEL', min: 0, max: 1.7, default: 0.88, unit: '', curve: 'linear', componentType: 'pot' },
  ],
  create: (ctx) => {
    const preGain = new GainNode(ctx, { gain: 7.5 })
    const body = new BiquadFilterNode(ctx, { type: 'highpass', frequency: 120, Q: 0.6 })
    const clipper = new WaveShaperNode(ctx, {
      oversample: '4x',
      curve: createCurve((x) => Math.tanh(x * 7.5) / Math.tanh(7.5)),
    })
    const tone = new BiquadFilterNode(ctx, { type: 'highshelf', frequency: 2000, gain: 0 })
    const smooth = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 6800, Q: 0.7 })
    const level = new GainNode(ctx, { gain: 0.88 })

    preGain.connect(body)
    body.connect(clipper)
    clipper.connect(tone)
    tone.connect(smooth)
    smooth.connect(level)

    const setTone = (value: number) => {
      const clamped = Math.max(-10, Math.min(10, value))
      tone.gain.value = clamped
      tone.frequency.value = 1600 + ((clamped + 10) / 20) * 2000
      smooth.frequency.value = 5600 + ((clamped + 10) / 20) * 3000
    }

    setTone(0)

    return {
      input: preGain,
      output: level,
      setParameter: (paramId, value) => {
        if (paramId === 'gain') {
          preGain.gain.value = value
          clipper.curve = createCurve((x) => {
            const y = x * value
            return y >= 0 ? Math.tanh(y * 0.68) : Math.tanh(y * 0.56)
          })
        }
        if (paramId === 'tone') setTone(value)
        if (paramId === 'level') level.gain.value = value
      },
      getFilterNodes: () => [
        { node: body, topology: 'series', label: 'Input HP' },
        { node: tone, topology: 'series', label: 'Tone Shelf', paramId: 'tone' },
        { node: smooth, topology: 'series', label: 'Smoothing LP', paramId: 'tone' },
      ],
    }
  },
}
