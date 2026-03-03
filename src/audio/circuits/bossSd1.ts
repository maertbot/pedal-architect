import type { CircuitModel } from '../types'
import { createCurve } from './utils'

export const bossSd1: CircuitModel = {
  id: 'boss-sd1',
  name: 'Boss SD-1 Super OverDrive',
  description: 'Asymmetrical overdrive with focused mids and softened lows.',
  category: 'overdrive',
  year: 1981,
  iconPath: 'M4 24h12l3-8 3 8h6l3-12 3 12h12',
  parameters: [
    { id: 'drive', name: 'Drive', label: 'DRIVE', min: 1, max: 34, default: 9, unit: '', curve: 'logarithmic', componentType: 'pot' },
    { id: 'tone', name: 'Tone', label: 'TONE', min: 900, max: 5200, default: 2200, unit: 'Hz', curve: 'logarithmic', componentType: 'pot' },
    { id: 'level', name: 'Level', label: 'LEVEL', min: 0, max: 1.6, default: 0.9, unit: '', curve: 'linear', componentType: 'pot' },
  ],
  create: (ctx) => {
    const preGain = new GainNode(ctx, { gain: 9 })
    const lowCut = new BiquadFilterNode(ctx, { type: 'highpass', frequency: 700, Q: 0.58 })
    const asymClip = new WaveShaperNode(ctx, {
      oversample: '4x',
      curve: createCurve((x) => {
        const y = x * 9
        return y >= 0 ? Math.tanh(y * 0.75) : Math.tanh(y * 0.45) * 0.82
      }),
    })
    const tone = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 2200, Q: 0.66 })
    const level = new GainNode(ctx, { gain: 0.9 })

    preGain.connect(lowCut)
    lowCut.connect(asymClip)
    asymClip.connect(tone)
    tone.connect(level)

    return {
      input: preGain,
      output: level,
      setParameter: (paramId, value) => {
        if (paramId === 'drive') {
          preGain.gain.value = value
          asymClip.curve = createCurve((x) => {
            const y = x * value
            const positive = Math.tanh(y * 0.8)
            const negative = Math.tanh(y * 0.48) * 0.8
            return y >= 0 ? positive : negative
          })
        }
        if (paramId === 'tone') tone.frequency.value = value
        if (paramId === 'level') level.gain.value = value
      },
      getFilterNodes: () => [
        { node: lowCut, topology: 'series', label: 'Input HP' },
        { node: tone, topology: 'series', label: 'Tone LP', paramId: 'tone' },
      ],
    }
  },
}
