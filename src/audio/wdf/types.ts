export interface WDFElement {
  portResistance: number
  incident: number
  reflected: number
  accept(wave: number): void
  reflect(): number
  setParam?(value: number): void
  bypass?: boolean
}

export interface WDFComponentMeta {
  id: string
  name: string
  type: 'resistor' | 'capacitor' | 'diode' | 'opamp' | 'pot' | 'buffer'
  stage: string
  circuitRole: 'series' | 'shunt' | 'feedback'
  description: string
  whyItMatters: string
  whatHappensWithout: string
  whatHappensScaled: string
  realWorldValue?: string
  linkedParamId?: string
  bypassSafe: boolean
  bypassMode: 'short' | 'open' | 'substitute'
  valueRange?: {
    min: number
    max: number
    steps: number[]
    unit: string
  }
}
