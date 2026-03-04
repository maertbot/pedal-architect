import type { CircuitModel, FilterNodeDescriptor } from '../../types.js'
import type { WDFComponentMeta } from '../types.js'
import { WDFWorkletNode } from '../WDFWorkletNode.js'

const clamp01 = (value: number): number => {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

const trebleToFrequency = (treble: number): number => 1300 + clamp01(treble) * (7000 - 1300)

export const klonCentaurWDFComponents: WDFComponentMeta[] = [
  {
    id: 'kl-input-buffer',
    name: 'Input Buffer',
    type: 'buffer',
    stage: 'input',
    circuitRole: 'series',
    description: 'JFET-like input buffering stage modeled as a low-impedance source.',
    whyItMatters: 'Preserves pickup dynamics and drives the split network consistently.',
    whatHappensWithout: 'Input loading and inconsistent response reduce transparency.',
    whatHappensScaled: 'N/A — modeled buffer is bypass-only.',
    realWorldValue: 'JFET buffer',
    bypassSafe: false,
    bypassMode: 'short',
  },
  {
    id: 'kl-clean-path',
    name: 'Clean Path',
    type: 'opamp',
    stage: 'clean',
    circuitRole: 'series',
    description: 'Parallel clean branch mixed with the clipped drive path.',
    whyItMatters: 'Maintains note definition as drive increases.',
    whatHappensWithout: 'Circuit behaves like a pure clipped overdrive with less clarity.',
    whatHappensScaled: 'Gain-dependent attenuation: more gain reduces clean contribution.',
    realWorldValue: 'parallel clean blend',
    bypassSafe: false,
    bypassMode: 'substitute',
  },
  {
    id: 'kl-gain-stage',
    name: 'Gain Stage',
    type: 'pot',
    stage: 'drive',
    circuitRole: 'feedback',
    description: 'Pre-clipping gain stage driving germanium diode clipping.',
    whyItMatters: 'Controls transition from transparent boost to overdrive.',
    whatHappensWithout: 'Drive path intensity range collapses.',
    whatHappensScaled: 'Adjusted by GAIN knob: maps to approximately 1x to 28x drive.',
    realWorldValue: 'gain pot network',
    linkedParamId: 'gain',
    bypassSafe: false,
    bypassMode: 'substitute',
  },
  {
    id: 'kl-clipping-diodes',
    name: 'Germanium Clipping Pair',
    type: 'diode',
    stage: 'drive',
    circuitRole: 'feedback',
    description: 'Softer germanium clipping pair in the overdrive branch.',
    whyItMatters: 'Generates Klon-style smooth clipping texture.',
    whatHappensWithout: 'Drive branch is comparatively linear and less compressed.',
    whatHappensScaled: 'N/A — clipping pair is bypass-only.',
    realWorldValue: 'germanium pair',
    bypassSafe: true,
    bypassMode: 'substitute',
  },
  {
    id: 'kl-post-filter-r',
    name: 'Post-Clip Filter Resistor',
    type: 'resistor',
    stage: 'drive',
    circuitRole: 'series',
    description: 'Series resistor in the post-clipping RC low-pass filter.',
    whyItMatters: 'Sets drive-branch smoothing cutoff with the shunt capacitor.',
    whatHappensWithout: 'Upper harmonics remain harsher after clipping.',
    whatHappensScaled: 'Higher R = lower cutoff (smoother); lower R = brighter drive branch.',
    realWorldValue: '1kΩ',
    bypassSafe: false,
    bypassMode: 'short',
    valueRange: { min: 0.25, max: 4, steps: [0.25, 0.5, 1, 2, 4], unit: 'xR' },
  },
  {
    id: 'kl-post-filter-c',
    name: 'Post-Clip Filter Capacitor',
    type: 'capacitor',
    stage: 'drive',
    circuitRole: 'shunt',
    description: 'Shunt capacitor in the post-clipping RC low-pass network.',
    whyItMatters: 'Rounds clipped transients before recombining with clean path.',
    whatHappensWithout: 'Drive branch retains more gritty high-end content.',
    whatHappensScaled: 'Larger C = darker drive path; smaller C = brighter drive path.',
    realWorldValue: '68nF',
    bypassSafe: true,
    bypassMode: 'open',
    valueRange: { min: 0.25, max: 4, steps: [0.25, 0.5, 1, 2, 4], unit: 'xC' },
  },
  {
    id: 'kl-summing',
    name: 'Summing Node',
    type: 'opamp',
    stage: 'mix',
    circuitRole: 'series',
    description: 'Recombines clean and driven branches into a single signal.',
    whyItMatters: 'Defines blend balance and overall voicing before treble stage.',
    whatHappensWithout: 'Parallel architecture is lost or imbalanced.',
    whatHappensScaled: 'N/A — fixed summing behavior in this model.',
    realWorldValue: 'op-amp summing',
    bypassSafe: false,
    bypassMode: 'substitute',
  },
  {
    id: 'kl-treble-control',
    name: 'Treble Control',
    type: 'pot',
    stage: 'tone',
    circuitRole: 'series',
    description: 'High-shelf voicing stage using high-pass blend behavior.',
    whyItMatters: 'Adds clarity and bite without fully removing low content.',
    whatHappensWithout: 'No user control over top-end emphasis.',
    whatHappensScaled: 'Adjusted by TREBLE: maps shelf pivot from about 1.3kHz to 7kHz.',
    realWorldValue: 'treble pot network',
    linkedParamId: 'treble',
    bypassSafe: false,
    bypassMode: 'substitute',
  },
  {
    id: 'kl-output-volume',
    name: 'Output Volume',
    type: 'pot',
    stage: 'output',
    circuitRole: 'series',
    description: 'Final output level trim after blend and treble shaping.',
    whyItMatters: 'Matches pedal loudness to bypass and amp input.',
    whatHappensWithout: 'Output level cannot be gain-staged externally.',
    whatHappensScaled: 'Adjusted by OUTPUT: linear final gain scaling.',
    realWorldValue: 'output level trim',
    linkedParamId: 'output',
    bypassSafe: false,
    bypassMode: 'short',
  },
]

export const klonCentaurWDF: CircuitModel = {
  id: 'klon-centaur-wdf',
  name: 'Klon Centaur (WDF)',
  description: 'Wave Digital Filter model of the Klon parallel clean/drive architecture.',
  category: 'overdrive',
  year: 1994,
  iconPath: 'M4 20h8l4-8 8 16 8-16 4 8h8',
  engine: 'wdf',
  parameters: [
    { id: 'gain', name: 'Gain', label: 'GAIN', min: 0, max: 1, default: 0.25, unit: '', curve: 'linear', componentType: 'pot' },
    { id: 'treble', name: 'Treble', label: 'TREBLE', min: 0, max: 1, default: 0.5, unit: '', curve: 'linear', componentType: 'pot' },
    { id: 'output', name: 'Output', label: 'OUTPUT', min: 0, max: 1.5, default: 0.9, unit: '', curve: 'linear', componentType: 'pot' },
  ],
  create: (ctx) => {
    const node = new WDFWorkletNode(ctx, {
      sampleRate: ctx.sampleRate,
      circuit: 'klon-centaur',
      gain: 0.25,
      treble: 0.5,
      output: 0.9,
    })

    const hasBiquad = typeof globalThis.BiquadFilterNode !== 'undefined'
    const treble = hasBiquad ? new BiquadFilterNode(ctx, { type: 'highshelf', frequency: trebleToFrequency(0.5), gain: 4 }) : null

    const filterNodes: FilterNodeDescriptor[] = treble
      ? [{ node: treble, topology: 'series', label: 'Treble Shelf', paramId: 'treble' }]
      : []

    return {
      input: node,
      output: node,
      setParameter: (paramId, value) => {
        node.setParameter(paramId, value)
        if (paramId === 'treble' && treble) {
          treble.frequency.value = trebleToFrequency(value)
          treble.gain.value = 1.5 + clamp01(value) * 5.5
        }
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
