export interface TubeScreamerWDFConfig {
  sampleRate: number
  circuit: 'tube-screamer-ts808'
  drive: number
  tone: number
  level: number
}

export interface BigMuffWDFConfig {
  sampleRate: number
  circuit: 'big-muff-pi'
  sustain: number
  tone: number
  volume: number
}

export interface KlonCentaurWDFConfig {
  sampleRate: number
  circuit: 'klon-centaur'
  gain: number
  treble: number
  output: number
}

export type WDFCircuitConfig = TubeScreamerWDFConfig | BigMuffWDFConfig | KlonCentaurWDFConfig

export type WDFSetupMessage = {
  type: 'setup'
  circuit: WDFCircuitConfig['circuit']
  config: WDFCircuitConfig
}

export type WDFParamMessage = {
  type: 'param'
  paramId: string
  value: number
}

export type WDFBypassMessage = {
  type: 'bypass'
  componentId: string
  bypassed: boolean
}

export type WDFValueMultiplierMessage = {
  type: 'valueMultiplier'
  componentId: string
  multiplier: number
}

export type WDFLevelsMessage = {
  type: 'levels'
  levels: Record<string, number>
}

export type WDFMessage = WDFSetupMessage | WDFParamMessage | WDFBypassMessage | WDFValueMultiplierMessage
