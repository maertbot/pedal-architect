import type { CircuitModel, FilterNodeDescriptor } from '../../types.js'
import type { WDFComponentMeta } from '../types.js'
import { WDFWorkletNode } from '../WDFWorkletNode.js'

const DRIVE_MIN_RESISTANCE = 51_000
const DRIVE_SPAN_RESISTANCE = 500_000
const TONE_RESISTANCE_BASE = 220
const TONE_POT_SPAN = 20_000
const TONE_CAPACITANCE = 0.22e-6
const TONE_HIGHPASS_RESISTANCE = 10_000
const TONE_HIGHPASS_CAPACITANCE = 0.1e-6

const clamp01 = (value: number): number => {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

export const mapDriveToResistance = (driveNormalized: number): number => {
  const normalized = clamp01(driveNormalized)
  return DRIVE_MIN_RESISTANCE + (1 - normalized) * DRIVE_SPAN_RESISTANCE
}

export const mapToneToResistance = (toneNormalized: number): number => {
  const t = clamp01(toneNormalized)
  return TONE_RESISTANCE_BASE + (1 - t) * TONE_POT_SPAN
}

export const mapToneToCutoffHz = (toneNormalized: number): number => {
  const resistance = mapToneToResistance(toneNormalized)
  return 1 / (2 * Math.PI * resistance * TONE_CAPACITANCE)
}

export const tubeScreamerWDFComponents: WDFComponentMeta[] = [
  {
    id: 'ts-input-cap',
    name: 'Input Coupling Capacitor',
    type: 'capacitor',
    stage: 'input',
    circuitRole: 'series',
    description: 'AC-couples the guitar signal into the clipping stage.',
    whyItMatters: 'Removes DC and sets low-frequency response entering the gain stage.',
    whatHappensWithout: 'The stage biases drift and low-end behavior becomes uncontrolled.',
    whatHappensScaled: 'Larger cap = more low end enters the clipping stage; smaller = thinner, more treble',
    realWorldValue: '0.047µF',
    bypassSafe: false,
    bypassMode: 'short',
    valueRange: { min: 0.25, max: 4, steps: [0.25, 0.5, 1, 2, 4], unit: 'µF' },
  },
  {
    id: 'ts-input-resistor',
    name: 'Input Resistor',
    type: 'resistor',
    stage: 'clipping',
    circuitRole: 'series',
    description: 'Series resistance feeding the clipping junction.',
    whyItMatters: 'Sets source impedance and clipping drive into the nonlinear branch.',
    whatHappensWithout: 'The clipping branch is over-driven and dynamics become unstable.',
    whatHappensScaled: 'Higher resistance = less drive into clipping; lower = hotter signal, more clipping',
    realWorldValue: '4.7kΩ',
    bypassSafe: false,
    bypassMode: 'short',
    valueRange: { min: 0.25, max: 4, steps: [0.25, 0.5, 1, 2, 4], unit: 'kΩ' },
  },
  {
    id: 'ts-clipping-diodes',
    name: 'Clipping Diodes',
    type: 'diode',
    stage: 'clipping',
    circuitRole: 'feedback',
    description: 'Antiparallel silicon diodes forming symmetric soft clipping.',
    whyItMatters: 'Creates the TS808 compression and harmonic profile.',
    whatHappensWithout: 'The stage behaves mostly linear and loses its overdrive character.',
    whatHappensScaled: 'N/A — diodes are bypass-only (on/off clipping)',
    realWorldValue: '1N914 pair',
    bypassSafe: true,
    bypassMode: 'substitute',
  },
  {
    id: 'ts-drive-pot',
    name: 'Drive Potentiometer',
    type: 'pot',
    stage: 'clipping',
    circuitRole: 'feedback',
    description: 'Controls feedback resistance around the clipping stage.',
    whyItMatters: 'Lower resistance increases loop gain and clipping intensity.',
    whatHappensWithout: 'Gain range collapses and drive control becomes ineffective.',
    whatHappensScaled: 'Adjusted by the DRIVE knob: lower resistance raises loop gain and increases clipping.',
    realWorldValue: '0-500kΩ',
    linkedParamId: 'drive',
    bypassSafe: false,
    bypassMode: 'substitute',
  },
  {
    id: 'ts-feedback-cap',
    name: 'Feedback Capacitor',
    type: 'capacitor',
    stage: 'clipping',
    circuitRole: 'feedback',
    description: 'Shapes frequency-dependent feedback in the drive loop.',
    whyItMatters: 'Defines how clipping responds across frequencies.',
    whatHappensWithout: 'The overdrive becomes harsh and less frequency selective.',
    whatHappensScaled: 'Larger cap = more low-frequency feedback, warmer overdrive; smaller = brighter, edgier clipping',
    realWorldValue: '0.047µF',
    bypassSafe: false,
    bypassMode: 'substitute',
    valueRange: { min: 0.25, max: 4, steps: [0.25, 0.5, 1, 2, 4], unit: 'µF' },
  },
  {
    id: 'ts-tone-resistor',
    name: 'Tone Resistor',
    type: 'resistor',
    stage: 'tone',
    circuitRole: 'series',
    description: 'Series tone-stage resistance setting the low-pass pole.',
    whyItMatters: 'Controls top-end rolloff behavior.',
    whatHappensWithout: 'Tone cutoff is undefined and high-frequency energy is excessive.',
    whatHappensScaled: 'Higher resistance = lower cutoff, darker tone; lower = brighter',
    realWorldValue: '220Ω',
    bypassSafe: false,
    bypassMode: 'short',
    valueRange: { min: 0.25, max: 4, steps: [0.25, 0.5, 1, 2, 4], unit: 'Ω' },
  },
  {
    id: 'ts-tone-cap',
    name: 'Tone Capacitor',
    type: 'capacitor',
    stage: 'tone',
    circuitRole: 'shunt',
    description: 'Shunt capacitor for post-clipping low-pass filtering.',
    whyItMatters: 'Smooths clipped harmonics and reduces fizz.',
    whatHappensWithout: 'Output can sound brittle and overly bright.',
    whatHappensScaled: 'Larger cap = darker tone (lower cutoff); smaller = brighter, more treble passes',
    realWorldValue: '0.22µF',
    bypassSafe: true,
    bypassMode: 'open',
    valueRange: { min: 0.25, max: 4, steps: [0.25, 0.5, 1, 2, 4], unit: 'µF' },
  },
  {
    id: 'ts-tone-pot',
    name: 'Tone Potentiometer',
    type: 'pot',
    stage: 'tone',
    circuitRole: 'series',
    description: 'Variable resistance controlling tone cutoff.',
    whyItMatters: 'Gives user control over brightness after clipping.',
    whatHappensWithout: 'No practical control over spectral balance.',
    whatHappensScaled: 'Adjusted by the TONE knob: higher settings brighten by raising effective cutoff.',
    realWorldValue: '0-20kΩ',
    linkedParamId: 'tone',
    bypassSafe: false,
    bypassMode: 'short',
  },
  {
    id: 'ts-volume',
    name: 'Volume Control',
    type: 'pot',
    stage: 'output',
    circuitRole: 'series',
    description: 'Final output gain trim after tone shaping.',
    whyItMatters: 'Matches pedal output to downstream stages.',
    whatHappensWithout: 'Output level cannot be set relative to bypass/amp input.',
    whatHappensScaled: 'Adjusted by the LEVEL knob: scales final output level after clipping and tone shaping.',
    realWorldValue: 'output level trim',
    linkedParamId: 'level',
    bypassSafe: false,
    bypassMode: 'short',
  },
]

export const tubeScreamerWDF: CircuitModel = {
  id: 'tube-screamer-wdf',
  name: 'Tube Screamer TS808 (WDF)',
  description: 'Wave Digital Filter model of the TS808 clipping and tone path.',
  category: 'overdrive',
  year: 1979,
  iconPath: 'M4 24h16l4-8h16l4 16h16',
  engine: 'wdf',
  parameters: [
    { id: 'drive', name: 'Drive', label: 'DRIVE', min: 0, max: 1, default: 0.55, unit: '', curve: 'linear', componentType: 'pot' },
    { id: 'tone', name: 'Tone', label: 'TONE', min: 0, max: 1, default: 0.5, unit: '', curve: 'linear', componentType: 'pot' },
    { id: 'level', name: 'Level', label: 'LEVEL', min: 0, max: 1.4, default: 0.8, unit: '', curve: 'linear', componentType: 'pot' },
  ],
  create: (ctx) => {
    const node = new WDFWorkletNode(ctx, {
      sampleRate: ctx.sampleRate,
      circuit: 'tube-screamer-ts808',
      drive: 0.55,
      tone: 0.5,
      level: 0.8,
    })

    const hasBiquad = typeof globalThis.BiquadFilterNode !== 'undefined'

    const baseToneHighpassHz = 1 / (2 * Math.PI * TONE_HIGHPASS_RESISTANCE * TONE_HIGHPASS_CAPACITANCE)
    const inputHP = hasBiquad ? new BiquadFilterNode(ctx, { type: 'highpass', frequency: baseToneHighpassHz, Q: 0.7 }) : null
    const toneLP = hasBiquad ? new BiquadFilterNode(ctx, { type: 'lowpass', frequency: mapToneToCutoffHz(0.5), Q: 0.8 }) : null
    const midShape = hasBiquad ? new BiquadFilterNode(ctx, { type: 'peaking', frequency: 900, Q: 0.95, gain: 2.5 }) : null

    const filterNodes: FilterNodeDescriptor[] = inputHP && toneLP && midShape
      ? [
          { node: inputHP, topology: 'series', label: 'Input HP' },
          { node: toneLP, topology: 'series', label: 'Tone LP', paramId: 'tone' },
          { node: midShape, topology: 'series', label: 'Mid Shape' },
        ]
      : []

    const multipliers: Record<string, number> = {}
    const bypasses: Record<string, boolean> = {}
    let toneValue = 0.5

    const getMultiplier = (componentId: string): number => multipliers[componentId] ?? 1

    const updateFilterVisualization = () => {
      if (!toneLP || !inputHP || !midShape) return

      const inputCap = (bypasses['ts-input-cap'] ? Number.MAX_VALUE : TONE_HIGHPASS_CAPACITANCE) * getMultiplier('ts-input-cap')
      const inputRes = (bypasses['ts-input-resistor'] ? TONE_HIGHPASS_RESISTANCE * 0.08 : TONE_HIGHPASS_RESISTANCE) * getMultiplier('ts-input-resistor')
      const inputCutoff = 1 / (2 * Math.PI * Math.max(1e-12, inputRes * inputCap))
      inputHP.frequency.value = Math.max(20, Math.min(20_000, inputCutoff))

      const toneResBase = TONE_RESISTANCE_BASE * getMultiplier('ts-tone-resistor')
      const toneCap = TONE_CAPACITANCE * getMultiplier('ts-tone-cap')

      let toneRes = toneResBase + (1 - clamp01(toneValue)) * TONE_POT_SPAN
      if (bypasses['ts-tone-resistor']) toneRes = Math.max(24, toneResBase * 0.08)
      if (bypasses['ts-tone-pot']) toneRes = Math.max(toneResBase, 24)

      if (bypasses['ts-tone-cap']) {
        toneLP.frequency.value = 20_000
      } else {
        const toneCutoff = 1 / (2 * Math.PI * Math.max(1e-12, toneRes * toneCap))
        toneLP.frequency.value = Math.max(20, Math.min(20_000, toneCutoff))
      }

      midShape.gain.value = 1.5 + clamp01(multipliers['ts-drive-pot'] ?? 1) * 0.2 + clamp01((1 - toneValue)) * 0.8
    }

    updateFilterVisualization()

    return {
      input: node,
      output: node,
      setParameter: (paramId, value) => {
        node.setParameter(paramId, value)

        if (paramId === 'tone') {
          toneValue = clamp01(value)
          updateFilterVisualization()
        }

        if (paramId === 'drive' && midShape) {
          midShape.gain.value = 1.5 + clamp01(value) * 3
        }
      },
      bypassComponent: (componentId, bypassed) => {
        bypasses[componentId] = bypassed
        node.bypassComponent(componentId, bypassed)
        updateFilterVisualization()
      },
      setComponentValueMultiplier: (componentId, multiplier) => {
        multipliers[componentId] = multiplier
        node.setComponentValueMultiplier(componentId, multiplier)
        updateFilterVisualization()
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
