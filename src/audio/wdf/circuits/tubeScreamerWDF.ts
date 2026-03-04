import type { CircuitModel, FilterNodeDescriptor } from '../../types.js'
import type { WDFComponentMeta } from '../types.js'
import { WDFWorkletNode } from '../WDFWorkletNode.js'

const DRIVE_MIN_RESISTANCE = 51_000
const DRIVE_SPAN_RESISTANCE = 500_000
const TONE_MIN_CUTOFF_HZ = 720
const TONE_MAX_CUTOFF_HZ = 4_500

const clamp01 = (value: number): number => {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

export const mapDriveToResistance = (driveNormalized: number): number => {
  const normalized = clamp01(driveNormalized)
  return DRIVE_MIN_RESISTANCE + (1 - normalized) * DRIVE_SPAN_RESISTANCE
}

export const mapToneToCutoffHz = (toneNormalized: number): number => {
  const t = clamp01(toneNormalized)
  return TONE_MIN_CUTOFF_HZ * (TONE_MAX_CUTOFF_HZ / TONE_MIN_CUTOFF_HZ) ** t
}

export const tubeScreamerWDFComponents: WDFComponentMeta[] = [
  {
    id: 'ts-input-cap',
    name: 'Input Coupling Capacitor',
    type: 'capacitor',
    stage: 'input',
    description: 'AC-couples the guitar signal into the clipping stage.',
    whyItMatters: 'Removes DC and sets low-frequency response entering the gain stage.',
    whatHappensWithout: 'The stage biases drift and low-end behavior becomes uncontrolled.',
    realWorldValue: '0.047uF',
  },
  {
    id: 'ts-input-resistor',
    name: 'Input Resistor',
    type: 'resistor',
    stage: 'clipping',
    description: 'Series resistance feeding the clipping junction.',
    whyItMatters: 'Sets source impedance and clipping drive into the nonlinear branch.',
    whatHappensWithout: 'The clipping branch is over-driven and dynamics become unstable.',
    realWorldValue: '4.7kOhm',
  },
  {
    id: 'ts-clipping-diodes',
    name: 'Clipping Diodes',
    type: 'diode',
    stage: 'clipping',
    description: 'Antiparallel silicon diodes forming symmetric soft clipping.',
    whyItMatters: 'Creates the TS808 compression and harmonic profile.',
    whatHappensWithout: 'The stage behaves mostly linear and loses its overdrive character.',
    realWorldValue: '1N914 pair',
  },
  {
    id: 'ts-drive-pot',
    name: 'Drive Potentiometer',
    type: 'pot',
    stage: 'clipping',
    description: 'Controls feedback resistance around the clipping stage.',
    whyItMatters: 'Lower resistance increases loop gain and clipping intensity.',
    whatHappensWithout: 'Gain range collapses and drive control becomes ineffective.',
    realWorldValue: '0-500kOhm',
    linkedParamId: 'drive',
  },
  {
    id: 'ts-feedback-cap',
    name: 'Feedback Capacitor',
    type: 'capacitor',
    stage: 'clipping',
    description: 'Shapes frequency-dependent feedback in the drive loop.',
    whyItMatters: 'Defines how clipping responds across frequencies.',
    whatHappensWithout: 'The overdrive becomes harsh and less frequency selective.',
    realWorldValue: '0.047uF',
  },
  {
    id: 'ts-tone-resistor',
    name: 'Tone Resistor',
    type: 'resistor',
    stage: 'tone',
    description: 'Series tone-stage resistance setting the low-pass pole.',
    whyItMatters: 'Controls top-end rolloff behavior.',
    whatHappensWithout: 'Tone cutoff is undefined and high-frequency energy is excessive.',
  },
  {
    id: 'ts-tone-cap',
    name: 'Tone Capacitor',
    type: 'capacitor',
    stage: 'tone',
    description: 'Shunt capacitor for post-clipping low-pass filtering.',
    whyItMatters: 'Smooths clipped harmonics and reduces fizz.',
    whatHappensWithout: 'Output can sound brittle and overly bright.',
    realWorldValue: '0.22uF',
  },
  {
    id: 'ts-tone-pot',
    name: 'Tone Potentiometer',
    type: 'pot',
    stage: 'tone',
    description: 'Variable resistance controlling tone cutoff.',
    whyItMatters: 'Gives user control over brightness after clipping.',
    whatHappensWithout: 'No practical control over spectral balance.',
    linkedParamId: 'tone',
  },
  {
    id: 'ts-volume',
    name: 'Volume Control',
    type: 'pot',
    stage: 'output',
    description: 'Final output gain trim after tone shaping.',
    whyItMatters: 'Matches pedal output to downstream stages.',
    whatHappensWithout: 'Output level cannot be set relative to bypass/amp input.',
    linkedParamId: 'level',
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
      drive: 0.55,
      tone: 0.5,
      level: 0.8,
    })

    const hasBiquad = typeof globalThis.BiquadFilterNode !== 'undefined'

    const inputHP = hasBiquad ? new BiquadFilterNode(ctx, { type: 'highpass', frequency: 720, Q: 0.7 }) : null
    const toneLP = hasBiquad ? new BiquadFilterNode(ctx, { type: 'lowpass', frequency: mapToneToCutoffHz(0.5), Q: 0.8 }) : null
    const midShape = hasBiquad ? new BiquadFilterNode(ctx, { type: 'peaking', frequency: 900, Q: 0.95, gain: 2.5 }) : null

    const filterNodes: FilterNodeDescriptor[] = inputHP && toneLP && midShape
      ? [
          { node: inputHP, topology: 'series', label: 'Input HP' },
          { node: toneLP, topology: 'series', label: 'Tone LP', paramId: 'tone' },
          { node: midShape, topology: 'series', label: 'Mid Shape' },
        ]
      : []

    return {
      input: node,
      output: node,
      setParameter: (paramId, value) => {
        node.setParameter(paramId, value)

        if (paramId === 'tone' && toneLP) {
          toneLP.frequency.value = mapToneToCutoffHz(value)
        }

        if (paramId === 'drive' && midShape) {
          midShape.gain.value = 1.5 + clamp01(value) * 3
        }
      },
      getFilterNodes: () => filterNodes,
      destroy: () => {
        node.disconnect()
      },
    }
  },
}
