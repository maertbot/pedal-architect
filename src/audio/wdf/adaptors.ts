import type { WDFElement } from './types.js'

const MIN_RESISTANCE = 1e-9

const safeResistance = (value: number): number => Math.max(value, MIN_RESISTANCE)

export class SeriesAdaptor implements WDFElement {
  portResistance: number

  incident = 0

  reflected = 0

  bypass = false

  private left: WDFElement

  private right: WDFElement

  constructor(left: WDFElement, right: WDFElement) {
    this.left = left
    this.right = right
    this.portResistance = safeResistance(this.left.portResistance + this.right.portResistance)
  }

  refreshPortResistance(): void {
    this.portResistance = safeResistance(this.left.portResistance + this.right.portResistance)
  }

  accept(wave: number): void {
    this.incident = wave
  }

  reflect(): number {
    this.refreshPortResistance()

    const r1 = safeResistance(this.left.portResistance)
    const r2 = safeResistance(this.right.portResistance)
    const total = r1 + r2

    const weighted = (r1 * this.right.reflected + r2 * this.left.reflected) / total

    const leftIncident = this.incident + this.right.reflected - weighted
    this.left.accept(leftIncident)
    const leftReflected = this.left.reflect()

    const rightIncident = this.incident + leftReflected - weighted
    this.right.accept(rightIncident)
    const rightReflected = this.right.reflect()

    this.reflected = leftReflected + rightReflected - this.incident
    return this.reflected
  }
}

export class ParallelAdaptor implements WDFElement {
  portResistance: number

  incident = 0

  reflected = 0

  bypass = false

  private left: WDFElement

  private right: WDFElement

  constructor(left: WDFElement, right: WDFElement) {
    this.left = left
    this.right = right
    this.portResistance = this.computePortResistance()
  }

  private computePortResistance(): number {
    const r1 = safeResistance(this.left.portResistance)
    const r2 = safeResistance(this.right.portResistance)
    return safeResistance((r1 * r2) / (r1 + r2))
  }

  refreshPortResistance(): void {
    this.portResistance = this.computePortResistance()
  }

  accept(wave: number): void {
    this.incident = wave
  }

  reflect(): number {
    this.refreshPortResistance()

    const r1 = safeResistance(this.left.portResistance)
    const r2 = safeResistance(this.right.portResistance)
    const total = r1 + r2

    const leftIncident = this.incident + (r1 / total) * (this.right.reflected - this.left.reflected)
    this.left.accept(leftIncident)
    const leftReflected = this.left.reflect()

    const rightIncident = this.incident + (r2 / total) * (leftReflected - this.right.reflected)
    this.right.accept(rightIncident)
    const rightReflected = this.right.reflect()

    this.reflected = (r2 * leftReflected + r1 * rightReflected) / total
    return this.reflected
  }
}
