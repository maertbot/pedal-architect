import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { ParallelAdaptor, SeriesAdaptor } from '../../src/audio/wdf/adaptors.js'
import { Capacitor, Resistor } from '../../src/audio/wdf/elements.js'

describe('WDF elements', () => {
  it('resistor uses resistance as port resistance', () => {
    const resistor = new Resistor(4_700)
    assert.equal(resistor.portResistance, 4_700)
  })

  it('capacitor port resistance follows bilinear transform', () => {
    const capacitor = new Capacitor(0.047e-6, 44_100)
    assert.equal(capacitor.portResistance, 1 / (2 * 0.047e-6 * 44_100))
  })

  it('capacitor reflects previous incident wave', () => {
    const capacitor = new Capacitor(0.047e-6, 44_100)
    capacitor.accept(0.4)
    assert.equal(capacitor.reflect(), 0)
    capacitor.accept(-0.25)
    assert.equal(capacitor.reflect(), 0.4)
  })

  it('series adaptor port resistance is R1 + R2', () => {
    const series = new SeriesAdaptor(new Resistor(4_700), new Resistor(10_000))
    assert.equal(series.portResistance, 14_700)
  })

  it('parallel adaptor port resistance is R1*R2/(R1+R2)', () => {
    const parallel = new ParallelAdaptor(new Resistor(4_700), new Resistor(10_000))
    assert.equal(parallel.portResistance, (4_700 * 10_000) / (4_700 + 10_000))
  })
})
