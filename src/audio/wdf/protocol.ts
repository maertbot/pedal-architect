export interface TubeScreamerWDFConfig {
  sampleRate: number
  drive: number
  tone: number
  level: number
}

export type WDFSetupMessage = {
  type: 'setup'
  circuit: 'tube-screamer-ts808'
  config: TubeScreamerWDFConfig
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
