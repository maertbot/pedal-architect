import type { WDFElement } from './types.js'

const DEFAULT_IS = 2.52e-9
const DEFAULT_N = 1.752
const DEFAULT_VT = 25.85e-3
const MAX_NEWTON_ITERATIONS = 50
const NEWTON_TOLERANCE = 1e-6
const MIN_RESISTANCE = 1e-9
const MAX_EXP_ARGUMENT = 40

const clampExpArg = (value: number): number => {
  if (value > MAX_EXP_ARGUMENT) return MAX_EXP_ARGUMENT
  if (value < -MAX_EXP_ARGUMENT) return -MAX_EXP_ARGUMENT
  return value
}

export class DiodePair implements WDFElement {
  portResistance: number

  incident = 0

  reflected = 0

  bypass = false

  readonly Is: number

  readonly Vt: number

  readonly n: number

  lastIterations = 0

  constructor(portResistance: number, Is = DEFAULT_IS, n = DEFAULT_N, Vt = DEFAULT_VT) {
    this.portResistance = Math.max(portResistance, MIN_RESISTANCE)
    this.Is = Is
    this.n = n
    this.Vt = Vt
  }

  setPortResistance(value: number): void {
    this.portResistance = Math.max(value, MIN_RESISTANCE)
  }

  accept(wave: number): void {
    this.incident = wave
  }

  private equation(incident: number, reflected: number): number {
    const voltage = (incident + reflected) * 0.5
    const arg = clampExpArg(voltage / (this.n * this.Vt))
    const sinhTerm = Math.exp(arg) - Math.exp(-arg)
    return (incident - reflected) / (2 * this.portResistance) - this.Is * sinhTerm
  }

  private derivative(incident: number, reflected: number): number {
    const voltage = (incident + reflected) * 0.5
    const arg = clampExpArg(voltage / (this.n * this.Vt))
    const coshTerm = Math.exp(arg) + Math.exp(-arg)
    return -1 / (2 * this.portResistance) - this.Is * (0.5 / (this.n * this.Vt)) * coshTerm
  }

  reflect(): number {
    if (this.bypass) {
      this.reflected = this.incident
      this.lastIterations = 0
      return this.reflected
    }

    let x = Number.isFinite(this.reflected) ? this.reflected : 0

    for (let iteration = 0; iteration < MAX_NEWTON_ITERATIONS; iteration += 1) {
      const f = this.equation(this.incident, x)
      const df = this.derivative(this.incident, x)

      if (!Number.isFinite(df) || Math.abs(df) < Number.EPSILON) {
        this.lastIterations = iteration + 1
        break
      }

      const next = x - f / df
      this.lastIterations = iteration + 1

      if (!Number.isFinite(next)) {
        break
      }

      if (Math.abs(next - x) <= NEWTON_TOLERANCE) {
        x = next
        break
      }

      x = next
    }

    this.reflected = x
    return this.reflected
  }

  getVoltage(): number {
    return (this.incident + this.reflected) * 0.5
  }
}

export const diodeDefaults = {
  Is: DEFAULT_IS,
  n: DEFAULT_N,
  Vt: DEFAULT_VT,
  maxIterations: MAX_NEWTON_ITERATIONS,
  tolerance: NEWTON_TOLERANCE,
}
