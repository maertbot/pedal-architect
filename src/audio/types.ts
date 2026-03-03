export type CircuitCategory = 'overdrive' | 'distortion' | 'fuzz' | 'modulation'

export interface ParameterDefinition {
  id: string
  name: string
  label: string
  min: number
  max: number
  default: number
  unit: string
  curve: 'linear' | 'logarithmic'
  componentType: 'pot' | 'toggle' | 'diode-select'
}

export interface FilterNodeDescriptor {
  node: BiquadFilterNode
  topology: 'series' | 'parallel-lp' | 'parallel-hp'
  label: string
  paramId?: string
  gainNode?: GainNode
}

export interface PhaserConfig {
  dryGain: number
  wetGain: number
  allpassNodes: BiquadFilterNode[]
  lfoRateHz: number
}

export interface CircuitRuntime {
  input: AudioNode
  output: AudioNode
  setParameter: (paramId: string, value: number) => void
  destroy?: () => void
  getFilterNodes?: () => FilterNodeDescriptor[]
  getPhaserConfig?: () => PhaserConfig
}

export interface CircuitModel {
  id: string
  name: string
  description: string
  category: CircuitCategory
  year: number
  iconPath: string
  parameters: ParameterDefinition[]
  create: (ctx: AudioContext) => CircuitRuntime
}

export interface EnclosureSize {
  id: string
  name: string
  widthMm: number
  heightMm: number
}

export interface ComponentDefinition {
  type: string
  name: string
  holeMm: number
  shape: 'circle' | 'rect'
  widthMm: number
  heightMm: number
  edgeConstraint?: 'side' | 'top'
}

export interface PlacedComponent {
  id: string
  componentType: string
  x: number
  y: number
}
