import type { CircuitModel } from '../types'
import { createCurve } from './utils'

export const ibanezTs9: CircuitModel = {
  id: 'ibanez-ts9',
  name: 'Ibanez TS9 Tube Screamer',
  description: 'Mid-forward soft clipping overdrive with classic TS9 voicing.',
  category: 'overdrive',
  year: 1982,
  iconPath: 'M4 24h14l4-9 4 9h14',
  parameters: [
    { id: 'drive', name: 'Drive', label: 'DRIVE', min: 1, max: 30, default: 8, unit: '', curve: 'logarithmic', componentType: 'pot' },
    { id: 'tone', name: 'Tone', label: 'TONE', min: 720, max: 4500, default: 1700, unit: 'Hz', curve: 'logarithmic', componentType: 'pot' },
    { id: 'level', name: 'Level', label: 'LEVEL', min: 0, max: 1.5, default: 0.84, unit: '', curve: 'linear', componentType: 'pot' },
  ],
  create: (ctx) => {
    const preGain = new GainNode(ctx, { gain: 8 })
    const lowCut = new BiquadFilterNode(ctx, { type: 'highpass', frequency: 720, Q: 0.55 })
    const clipper = new WaveShaperNode(ctx, {
      oversample: '4x',
      curve: createCurve((x) => Math.tanh(x * 8) / Math.tanh(8)),
    })
    const tone = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 1700, Q: 0.62 })
    const output = new GainNode(ctx, { gain: 0.84 })

    preGain.connect(lowCut)
    lowCut.connect(clipper)
    clipper.connect(tone)
    tone.connect(output)

    return {
      input: preGain,
      output,
      setParameter: (paramId, value) => {
        if (paramId === 'drive') {
          preGain.gain.value = value
          clipper.curve = createCurve((x) => Math.tanh(x * value) / Math.tanh(value))
        }
        if (paramId === 'tone') tone.frequency.value = value
        if (paramId === 'level') output.gain.value = value
      },
      getFilterNodes: () => [
        { node: lowCut, topology: 'series', label: 'Feedback HP' },
        { node: tone, topology: 'series', label: 'Tone LP', paramId: 'tone' },
      ],
    }
  },
}
