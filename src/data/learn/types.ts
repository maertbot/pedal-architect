export interface LearnExperiment {
  type: 'bypass' | 'value' | 'knob'
  targetComponent?: string
  instruction: string
  listenFor: string
  suggestedValues?: number[]
  paramId?: string
  paramValues?: number[]
  explanation?: string
}

export interface LearnStep {
  id: string
  title: string
  narration: string
  highlightComponents: string[]
  autoBypass?: string[]
  autoValueOverrides?: { componentId: string; multiplier: number }[]
  experiment?: LearnExperiment
}

export interface CircuitLesson {
  circuitId: string
  title: string
  intro: string
  steps: LearnStep[]
  conclusion: string
}
