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
  description: string
  whyItMatters: string
  whatHappensWithout: string
  realWorldValue?: string
  linkedParamId?: string
}
