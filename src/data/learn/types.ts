export interface LearnStep {
  id: string
  title: string
  narration: string
  highlightComponents: string[]
  experiment?: {
    type: 'bypass' | 'value' | 'knob'
    targetComponent?: string
    instruction: string
    listenFor: string
    suggestedValues?: number[]
    paramId?: string
    paramValues?: number[]
    explanation?: string
  }
  autoBypass?: Record<string, boolean>
  autoValueOverrides?: Record<string, number>
}

export interface CircuitLesson {
  circuitId: string
  title: string
  intro: string
  steps: LearnStep[]
  conclusion: string
}
