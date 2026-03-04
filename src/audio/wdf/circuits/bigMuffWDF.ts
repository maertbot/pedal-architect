import type { CircuitModel, FilterNodeDescriptor } from '../../types.js'
import type { WDFComponentMeta } from '../types.js'
import { WDFWorkletNode } from '../WDFWorkletNode.js'

const clamp01 = (value: number): number => {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

const toneToLpHz = (tone: number): number => 500 + clamp01(tone) * 520
const toneToHpHz = (tone: number): number => 620 + clamp01(tone) * 1100

export const bigMuffWDFComponents: WDFComponentMeta[] = [
  {
    id: 'bm-input-cap',
    name: 'Input Coupling Capacitor',
    type: 'capacitor',
    stage: 'input',
    circuitRole: 'series',
    description: 'AC-couples guitar signal into the first clipping block.',
    whyItMatters: 'Sets low-end entry into the sustain chain and blocks DC offset.',
    whatHappensWithout: 'Bias shifts and uncontrolled low-frequency content hit the clipping stages.',
    whatHappensScaled: 'Larger cap = fuller low end into fuzz; smaller = tighter/thinner low end.',
    realWorldValue: '100nF',
    bypassSafe: false,
    bypassMode: 'short',
    valueRange: { min: 0.25, max: 4, steps: [0.25, 0.5, 1, 2, 4], unit: 'xC' },
  },
  {
    id: 'bm-input-resistor',
    name: 'Input Bias Resistor',
    type: 'resistor',
    stage: 'input',
    circuitRole: 'series',
    description: 'Defines source impedance entering the clipping cascade.',
    whyItMatters: 'Controls how hard the first stage is fed and stabilizes stage response.',
    whatHappensWithout: 'Input can become over-driven and unstable with inconsistent clipping onset.',
    whatHappensScaled: 'Higher resistance = less drive and softer attack; lower = hotter clipping.',
    realWorldValue: '39kΩ',
    bypassSafe: false,
    bypassMode: 'short',
    valueRange: { min: 0.25, max: 4, steps: [0.25, 0.5, 1, 2, 4], unit: 'xR' },
  },
  {
    id: 'bm-clip1-diodes',
    name: 'Clip Stage 1 Diodes',
    type: 'diode',
    stage: 'clip-1',
    circuitRole: 'feedback',
    description: 'Silicon diode pair that begins Big Muff compression and fuzz texture.',
    whyItMatters: 'Creates early harmonic generation before later clipping stages.',
    whatHappensWithout: 'The first stage becomes comparatively linear and less saturated.',
    whatHappensScaled: 'N/A — clipping pair is bypass-only.',
    realWorldValue: '1N914 pair',
    bypassSafe: true,
    bypassMode: 'substitute',
  },
  {
    id: 'bm-clip1-cap',
    name: 'Clip Stage 1 Coupling Cap',
    type: 'capacitor',
    stage: 'clip-1',
    circuitRole: 'series',
    description: 'High-pass coupling capacitor between clipping sections.',
    whyItMatters: 'Resets low-frequency content before each gain/clipping section.',
    whatHappensWithout: 'Low-end buildup and mud increase through the cascade.',
    whatHappensScaled: 'Larger cap = more bass per stage; smaller = tighter stage handoff.',
    realWorldValue: '100nF',
    bypassSafe: false,
    bypassMode: 'short',
    valueRange: { min: 0.25, max: 4, steps: [0.25, 0.5, 1, 2, 4], unit: 'xC' },
  },
  {
    id: 'bm-clip2-diodes',
    name: 'Clip Stage 2 Diodes',
    type: 'diode',
    stage: 'clip-2',
    circuitRole: 'feedback',
    description: 'Second silicon clipping pair for additional sustain and compression.',
    whyItMatters: 'Builds the Big Muff wall-of-fuzz density.',
    whatHappensWithout: 'Cascade loses sustain and harmonic thickness.',
    whatHappensScaled: 'N/A — clipping pair is bypass-only.',
    realWorldValue: '1N914 pair',
    bypassSafe: true,
    bypassMode: 'substitute',
  },
  {
    id: 'bm-clip2-cap',
    name: 'Clip Stage 2 Coupling Cap',
    type: 'capacitor',
    stage: 'clip-2',
    circuitRole: 'series',
    description: 'AC coupling into the second clipping transfer.',
    whyItMatters: 'Maintains controlled spectral handoff between stages.',
    whatHappensWithout: 'Inter-stage low-frequency accumulation increases.',
    whatHappensScaled: 'Larger cap = thicker transition; smaller = leaner and brighter.',
    realWorldValue: '100nF',
    bypassSafe: false,
    bypassMode: 'short',
    valueRange: { min: 0.25, max: 4, steps: [0.25, 0.5, 1, 2, 4], unit: 'xC' },
  },
  {
    id: 'bm-clip3-diodes',
    name: 'Clip Stage 3 Diodes',
    type: 'diode',
    stage: 'clip-3',
    circuitRole: 'feedback',
    description: 'Third clipping pair adding compression and upper harmonics.',
    whyItMatters: 'Pushes the sustain chain deeper into fuzzy saturation.',
    whatHappensWithout: 'Tone becomes less dense and less compressed.',
    whatHappensScaled: 'N/A — clipping pair is bypass-only.',
    realWorldValue: '1N914 pair',
    bypassSafe: true,
    bypassMode: 'substitute',
  },
  {
    id: 'bm-clip3-cap',
    name: 'Clip Stage 3 Coupling Cap',
    type: 'capacitor',
    stage: 'clip-3',
    circuitRole: 'series',
    description: 'Coupling capacitor before the third clipping transfer.',
    whyItMatters: 'Helps preserve fuzz articulation through deep cascaded gain.',
    whatHappensWithout: 'Stage transitions smear and low-end clouding rises.',
    whatHappensScaled: 'Larger cap = heavier body; smaller = tighter stage transient.',
    realWorldValue: '100nF',
    bypassSafe: false,
    bypassMode: 'short',
    valueRange: { min: 0.25, max: 4, steps: [0.25, 0.5, 1, 2, 4], unit: 'xC' },
  },
  {
    id: 'bm-clip4-diodes',
    name: 'Clip Stage 4 Diodes',
    type: 'diode',
    stage: 'clip-4',
    circuitRole: 'feedback',
    description: 'Final silicon clipping pair prior to tone stack blending.',
    whyItMatters: 'Sets final fuzz compression before LP/HP scoop network.',
    whatHappensWithout: 'Overall saturation falls and Big Muff identity softens.',
    whatHappensScaled: 'N/A — clipping pair is bypass-only.',
    realWorldValue: '1N914 pair',
    bypassSafe: true,
    bypassMode: 'substitute',
  },
  {
    id: 'bm-clip4-cap',
    name: 'Clip Stage 4 Coupling Cap',
    type: 'capacitor',
    stage: 'clip-4',
    circuitRole: 'series',
    description: 'Final coupling capacitor leading into tone stack split.',
    whyItMatters: 'Shapes final low-end entering LP/HP blend.',
    whatHappensWithout: 'Tone stack receives uncontrolled low frequencies.',
    whatHappensScaled: 'Larger cap = fuller lows into tone stack; smaller = tighter output.',
    realWorldValue: '100nF',
    bypassSafe: false,
    bypassMode: 'short',
    valueRange: { min: 0.25, max: 4, steps: [0.25, 0.5, 1, 2, 4], unit: 'xC' },
  },
  {
    id: 'bm-tone-lp-cap',
    name: 'Tone LP Capacitor',
    type: 'capacitor',
    stage: 'tone',
    circuitRole: 'shunt',
    description: 'Low-pass branch capacitor in the Big Muff tone stack.',
    whyItMatters: 'Controls the dark side of the LP/HP blend.',
    whatHappensWithout: 'Tone control loses low-pass contour and becomes brighter overall.',
    whatHappensScaled: 'Larger cap = darker LP branch; smaller = less low-pass contribution.',
    realWorldValue: '10nF',
    bypassSafe: true,
    bypassMode: 'open',
    valueRange: { min: 0.25, max: 4, steps: [0.25, 0.5, 1, 2, 4], unit: 'xC' },
  },
  {
    id: 'bm-tone-hp-cap',
    name: 'Tone HP Capacitor',
    type: 'capacitor',
    stage: 'tone',
    circuitRole: 'shunt',
    description: 'High-pass branch capacitor defining bright branch behavior.',
    whyItMatters: 'Controls the bright side of the LP/HP blend.',
    whatHappensWithout: 'Tone stack loses the cutting high-pass path.',
    whatHappensScaled: 'Larger cap = HP branch shifts lower; smaller = brighter, thinner top branch.',
    realWorldValue: '3.9nF',
    bypassSafe: true,
    bypassMode: 'open',
    valueRange: { min: 0.25, max: 4, steps: [0.25, 0.5, 1, 2, 4], unit: 'xC' },
  },
  {
    id: 'bm-tone-pot',
    name: 'Tone Potentiometer',
    type: 'pot',
    stage: 'tone',
    circuitRole: 'series',
    description: 'Blends low-pass and high-pass branches of the tone stack.',
    whyItMatters: 'Creates the characteristic mid-scoop at center position.',
    whatHappensWithout: 'No practical way to shift from dark to bright blend.',
    whatHappensScaled: 'Adjusted by TONE: 0 = LP-heavy dark, 1 = HP-heavy bright, 0.5 = scooped.',
    realWorldValue: 'tone blend control',
    linkedParamId: 'tone',
    bypassSafe: false,
    bypassMode: 'substitute',
  },
  {
    id: 'bm-volume',
    name: 'Output Volume',
    type: 'pot',
    stage: 'output',
    circuitRole: 'series',
    description: 'Final output attenuation after tone stack.',
    whyItMatters: 'Sets pedal output level into downstream stages.',
    whatHappensWithout: 'Output gain cannot be matched to bypass or amp input.',
    whatHappensScaled: 'Adjusted by VOLUME: linear output scaling post-fuzz.',
    realWorldValue: 'output level trim',
    linkedParamId: 'volume',
    bypassSafe: false,
    bypassMode: 'short',
  },
]

export const bigMuffWDF: CircuitModel = {
  id: 'big-muff-wdf',
  name: 'Big Muff Pi (WDF)',
  description: 'Wave Digital Filter model of the four-stage Big Muff clipping and tone stack.',
  category: 'fuzz',
  year: 1969,
  iconPath: 'M4 16h10l4-6 4 12 4-12 4 12 4-6h10',
  engine: 'wdf',
  parameters: [
    { id: 'sustain', name: 'Sustain', label: 'SUSTAIN', min: 2, max: 40, default: 12, unit: '', curve: 'logarithmic', componentType: 'pot' },
    { id: 'tone', name: 'Tone', label: 'TONE', min: 0, max: 1, default: 0.5, unit: '', curve: 'linear', componentType: 'pot' },
    { id: 'volume', name: 'Volume', label: 'VOLUME', min: 0, max: 1.5, default: 0.9, unit: '', curve: 'linear', componentType: 'pot' },
  ],
  create: (ctx) => {
    const node = new WDFWorkletNode(ctx, {
      sampleRate: ctx.sampleRate,
      circuit: 'big-muff-pi',
      sustain: 12,
      tone: 0.5,
      volume: 0.9,
    })

    const hasBiquad = typeof globalThis.BiquadFilterNode !== 'undefined'

    const lpPath = hasBiquad ? new BiquadFilterNode(ctx, { type: 'lowpass', frequency: toneToLpHz(0.5), Q: 0.55 }) : null
    const hpPath = hasBiquad ? new BiquadFilterNode(ctx, { type: 'highpass', frequency: toneToHpHz(0.5), Q: 0.55 }) : null
    const lpMix = hasBiquad ? new GainNode(ctx, { gain: 0.5 }) : null
    const hpMix = hasBiquad ? new GainNode(ctx, { gain: 0.5 }) : null
    const midNotch = hasBiquad ? new BiquadFilterNode(ctx, { type: 'peaking', frequency: 980, Q: 0.9, gain: -10 }) : null

    const filterNodes: FilterNodeDescriptor[] = lpPath && hpPath && lpMix && hpMix && midNotch
      ? [
          { node: lpPath, topology: 'parallel-lp', label: 'Tone LP', paramId: 'tone', gainNode: lpMix },
          { node: hpPath, topology: 'parallel-hp', label: 'Tone HP', paramId: 'tone', gainNode: hpMix },
          { node: midNotch, topology: 'series', label: 'Mid Notch', paramId: 'tone' },
        ]
      : []

    const setTone = (value: number) => {
      const tone = clamp01(value)
      const fromCenter = Math.abs(tone - 0.5) * 2

      if (lpPath) lpPath.frequency.value = toneToLpHz(tone)
      if (hpPath) hpPath.frequency.value = toneToHpHz(tone)
      if (lpMix) lpMix.gain.value = 0.18 + (1 - tone) * 0.82
      if (hpMix) hpMix.gain.value = 0.18 + tone * 0.82
      if (midNotch) {
        midNotch.frequency.value = 920 + (tone - 0.5) * 260
        midNotch.Q.value = 0.8 + (1 - fromCenter) * 0.35
        midNotch.gain.value = -4 - (1 - fromCenter) * 8
      }
    }

    setTone(0.5)

    return {
      input: node,
      output: node,
      setParameter: (paramId, value) => {
        node.setParameter(paramId, value)
        if (paramId === 'tone') setTone(value)
      },
      bypassComponent: (componentId, bypassed) => {
        node.bypassComponent(componentId, bypassed)
      },
      setComponentValueMultiplier: (componentId, multiplier) => {
        node.setComponentValueMultiplier(componentId, multiplier)
      },
      getComponentLevels: () => node.getComponentLevels(),
      onLevels: (callback) => {
        node.onLevels(callback)
      },
      getFilterNodes: () => filterNodes,
      destroy: () => {
        node.disconnect()
      },
    }
  },
}
