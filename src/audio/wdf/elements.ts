import type { WDFElement } from './types.js'

const MIN_RESISTANCE = 1e-9

export class Resistor implements WDFElement {
  portResistance: number

  incident = 0

  reflected = 0

  bypass = false

  constructor(resistanceOhms: number) {
    this.portResistance = Math.max(resistanceOhms, MIN_RESISTANCE)
  }

  setParam(value: number): void {
    this.portResistance = Math.max(value, MIN_RESISTANCE)
  }

  accept(wave: number): void {
    this.incident = wave
  }

  reflect(): number {
    this.reflected = 0
    return this.reflected
  }
}

export class Capacitor implements WDFElement {
  portResistance: number

  incident = 0

  reflected = 0

  bypass = false

  private previousIncident = 0

  constructor(capacitanceFarads: number, sampleRateHz: number) {
    this.portResistance = 1 / (2 * capacitanceFarads * sampleRateHz)
  }

  accept(wave: number): void {
    this.incident = wave
  }

  reflect(): number {
    this.reflected = this.previousIncident
    this.previousIncident = this.incident
    return this.reflected
  }
}

export class IdealVoltageSource implements WDFElement {
  portResistance = MIN_RESISTANCE

  incident = 0

  reflected = 0

  bypass = false

  private voltage = 0

  setParam(value: number): void {
    this.voltage = value
  }

  accept(wave: number): void {
    this.incident = wave
  }

  reflect(): number {
    this.reflected = 2 * this.voltage - this.incident
    return this.reflected
  }

  getVoltage(): number {
    return this.voltage
  }
}
