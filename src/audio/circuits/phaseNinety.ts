import type { CircuitModel } from '../types'

export const phaseNinety: CircuitModel = {
  id: 'phase-ninety',
  name: 'Phase 90',
  description: 'Four-stage all-pass phaser with classic sweep.',
  category: 'modulation',
  year: 1974,
  iconPath: 'M4 18q4-10 8 0t8 0t8 0t8 0',
  parameters: [
    { id: 'speed', name: 'Speed', label: 'SPEED', min: 0.1, max: 8, default: 1.3, unit: 'Hz', curve: 'logarithmic', componentType: 'pot' },
  ],
  create: (ctx) => {
    const input = new GainNode(ctx)
    const dry = new GainNode(ctx, { gain: 0.55 })
    const wet = new GainNode(ctx, { gain: 0.65 })
    const output = new GainNode(ctx)

    const allpass = new Array(4).fill(null).map(
      () => new BiquadFilterNode(ctx, { type: 'allpass', frequency: 420, Q: 0.6 }),
    )

    input.connect(dry)
    input.connect(allpass[0])
    for (let i = 0; i < allpass.length - 1; i += 1) {
      allpass[i].connect(allpass[i + 1])
    }
    allpass[allpass.length - 1].connect(wet)

    dry.connect(output)
    wet.connect(output)

    const lfo = new OscillatorNode(ctx, { type: 'sine', frequency: 1.3 })
    const lfoGain = new GainNode(ctx, { gain: 260 })
    const base = new ConstantSourceNode(ctx, { offset: 520 })

    lfo.connect(lfoGain)
    allpass.forEach((stage, index) => {
      const offset = new ConstantSourceNode(ctx, { offset: 40 * index })
      base.connect(stage.frequency)
      offset.connect(stage.frequency)
      lfoGain.connect(stage.frequency)
      offset.start()
    })

    lfo.start()
    base.start()

    return {
      input,
      output,
      setParameter: (paramId, value) => {
        if (paramId === 'speed') lfo.frequency.value = value
      },
      destroy: () => {
        lfo.stop()
        base.stop()
      },
    }
  },
}
