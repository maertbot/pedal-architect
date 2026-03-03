import type { CircuitModel } from '../types'
import { createCurve } from './utils'

export const bossDs1: CircuitModel = {
  id: 'boss-ds1',
  name: 'Boss DS-1 Distortion',
  description: 'Hard-clipping distortion with classic post-clip tone tilt.',
  category: 'distortion',
  year: 1978,
  iconPath: 'M4 22h10l4-10 4 14 4-14 4 10h10',
  parameters: [
    { id: 'distortion', name: 'Distortion', label: 'DIST', min: 1, max: 42, default: 14, unit: '', curve: 'logarithmic', componentType: 'pot' },
    { id: 'tone', name: 'Tone', label: 'TONE', min: 0, max: 1, default: 0.5, unit: '', curve: 'linear', componentType: 'pot' },
    { id: 'level', name: 'Level', label: 'LEVEL', min: 0, max: 1.7, default: 0.85, unit: '', curve: 'linear', componentType: 'pot' },
  ],
  create: (ctx) => {
    const preGain = new GainNode(ctx, { gain: 14 })
    const clipper = new WaveShaperNode(ctx, {
      oversample: '4x',
      curve: createCurve((x) => {
        const y = x * 14
        return Math.sign(y) * Math.min(1, Math.abs(y))
      }),
    })

    const bassTilt = new BiquadFilterNode(ctx, { type: 'lowshelf', frequency: 380, gain: 0 })
    const trebleTilt = new BiquadFilterNode(ctx, { type: 'highshelf', frequency: 1650, gain: 0 })
    const level = new GainNode(ctx, { gain: 0.85 })

    preGain.connect(clipper)
    clipper.connect(bassTilt)
    bassTilt.connect(trebleTilt)
    trebleTilt.connect(level)

    const setTone = (value: number) => {
      const tone = Math.max(0, Math.min(1, value))
      const tilt = (tone - 0.5) * 20
      bassTilt.gain.value = -tilt * 0.85
      trebleTilt.gain.value = tilt
      trebleTilt.frequency.value = 1400 + tone * 1900
    }

    setTone(0.5)

    return {
      input: preGain,
      output: level,
      setParameter: (paramId, value) => {
        if (paramId === 'distortion') {
          preGain.gain.value = value
          clipper.curve = createCurve((x) => {
            const y = x * value
            const hard = Math.sign(y) * Math.min(1, Math.abs(y))
            return hard * 0.9 + Math.tanh(y * 0.5) * 0.1
          })
        }
        if (paramId === 'tone') setTone(value)
        if (paramId === 'level') level.gain.value = value
      },
      getFilterNodes: () => [
        { node: bassTilt, topology: 'series', label: 'Bass Tilt', paramId: 'tone' },
        { node: trebleTilt, topology: 'series', label: 'Treble Tilt', paramId: 'tone' },
      ],
    }
  },
}
