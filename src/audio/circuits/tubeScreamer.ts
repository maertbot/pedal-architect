import type { CircuitModel } from '../types'
import { createCurve } from './utils'

export const tubeScreamer: CircuitModel = {
  id: 'tube-screamer',
  name: 'Tube Screamer TS808',
  description: 'Warm mid-forward soft clipping overdrive.',
  category: 'overdrive',
  year: 1979,
  iconPath: 'M4 24h16l4-8h16l4 16h16',
  parameters: [
    { id: 'drive', name: 'Drive', label: 'DRIVE', min: 1, max: 30, default: 8, unit: '', curve: 'logarithmic', componentType: 'pot' },
    { id: 'tone', name: 'Tone', label: 'TONE', min: 720, max: 4500, default: 1800, unit: 'Hz', curve: 'logarithmic', componentType: 'pot' },
    { id: 'level', name: 'Level', label: 'LEVEL', min: 0, max: 1.4, default: 0.8, unit: '', curve: 'linear', componentType: 'pot' },
  ],
  create: (ctx) => {
    const preGain = new GainNode(ctx, { gain: 8 })
    const shaper = new WaveShaperNode(ctx, {
      oversample: '4x',
      curve: createCurve((x) => Math.tanh(x * 8) / Math.tanh(8)),
    })
    const tone = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 1800, Q: 0.65 })
    const level = new GainNode(ctx, { gain: 0.8 })

    preGain.connect(shaper)
    shaper.connect(tone)
    tone.connect(level)

    return {
      input: preGain,
      output: level,
      setParameter: (paramId, value) => {
        if (paramId === 'drive') {
          preGain.gain.value = value
          shaper.curve = createCurve((x) => Math.tanh(x * value) / Math.tanh(value))
        }
        if (paramId === 'tone') tone.frequency.value = value
        if (paramId === 'level') level.gain.value = value
      },
    }
  },
}
