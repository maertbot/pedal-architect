import type { CircuitModel } from '../types'
import { createCurve } from './utils'

export const bigMuff: CircuitModel = {
  id: 'big-muff',
  name: 'Big Muff Pi',
  description: 'Cascaded fuzz with scooped mids and huge sustain.',
  category: 'fuzz',
  year: 1969,
  iconPath: 'M4 16h10l4-6 4 12 4-12 4 12 4-6h10',
  parameters: [
    { id: 'sustain', name: 'Sustain', label: 'SUSTAIN', min: 2, max: 40, default: 12, unit: '', curve: 'logarithmic', componentType: 'pot' },
    { id: 'tone', name: 'Tone', label: 'TONE', min: 350, max: 1600, default: 850, unit: 'Hz', curve: 'logarithmic', componentType: 'pot' },
    { id: 'volume', name: 'Volume', label: 'VOLUME', min: 0, max: 1.5, default: 0.9, unit: '', curve: 'linear', componentType: 'pot' },
  ],
  create: (ctx) => {
    const input = new GainNode(ctx, { gain: 12 })
    const stages: WaveShaperNode[] = []
    const hpStages: BiquadFilterNode[] = []
    const toneMin = 350
    const toneMid = 850
    const toneMax = 1600

    let current: AudioNode = input
    for (let i = 0; i < 4; i += 1) {
      const hp = new BiquadFilterNode(ctx, { type: 'highpass', frequency: 160, Q: 0.7 })
      const shaper = new WaveShaperNode(ctx, {
        oversample: '4x',
        curve: createCurve((x) => Math.tanh(x * 12) / Math.tanh(12)),
      })
      current.connect(hp)
      hp.connect(shaper)
      hpStages.push(hp)
      stages.push(shaper)
      current = shaper
    }

    const lpPath = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 820, Q: 0.55 })
    const hpPath = new BiquadFilterNode(ctx, { type: 'highpass', frequency: 1050, Q: 0.55 })
    const lpMix = new GainNode(ctx, { gain: 0.5 })
    const hpMix = new GainNode(ctx, { gain: 0.5 })
    const toneSum = new GainNode(ctx, { gain: 0.72 })
    const midNotch = new BiquadFilterNode(ctx, {
      type: 'peaking',
      frequency: 980,
      Q: 0.9,
      gain: -10,
    })
    const post = new GainNode(ctx, { gain: 0.9 })

    current.connect(lpPath)
    current.connect(hpPath)
    lpPath.connect(lpMix)
    hpPath.connect(hpMix)
    lpMix.connect(toneSum)
    hpMix.connect(toneSum)
    toneSum.connect(midNotch)
    midNotch.connect(post)

    const setTone = (value: number) => {
      const clamped = Math.min(toneMax, Math.max(toneMin, value))
      const toneNorm = (clamped - toneMin) / (toneMax - toneMin)
      const fromCenter = Math.abs(toneNorm - 0.5) * 2

      // Approximate Big Muff tone stack behavior:
      // blend between LP/HP paths while preserving a center-position mid scoop.
      lpPath.frequency.value = 620 + toneNorm * 420
      hpPath.frequency.value = 700 + toneNorm * 900
      lpMix.gain.value = 0.18 + (1 - toneNorm) * 0.82
      hpMix.gain.value = 0.18 + toneNorm * 0.82

      // Deepest notch at noon, shallower at extremes.
      midNotch.frequency.value = 920 + (toneNorm - 0.5) * 260
      midNotch.Q.value = 0.8 + (1 - fromCenter) * 0.35
      midNotch.gain.value = -4 - (1 - fromCenter) * 8
    }

    setTone(toneMid)

    return {
      input,
      output: post,
      setParameter: (paramId, value) => {
        if (paramId === 'sustain') {
          input.gain.value = value
          stages.forEach((stage) => {
            stage.curve = createCurve((x) => Math.tanh(x * value) / Math.tanh(value))
          })
        }
        if (paramId === 'tone') setTone(value)
        if (paramId === 'volume') post.gain.value = value
      },
      getFilterNodes: () => [
        { node: lpPath, topology: 'parallel-lp', label: 'Tone LP', paramId: 'tone', gainNode: lpMix },
        { node: hpPath, topology: 'parallel-hp', label: 'Tone HP', paramId: 'tone', gainNode: hpMix },
        { node: midNotch, topology: 'series', label: 'Mid Notch', paramId: 'tone' },
      ],
      destroy: () => {
        hpStages.forEach((node) => node.disconnect())
        stages.forEach((node) => node.disconnect())
        lpPath.disconnect()
        hpPath.disconnect()
        lpMix.disconnect()
        hpMix.disconnect()
        toneSum.disconnect()
        midNotch.disconnect()
      },
    }
  },
}
