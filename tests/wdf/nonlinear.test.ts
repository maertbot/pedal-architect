import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { DiodePair } from '../../src/audio/wdf/nonlinear.js'

describe('DiodePair', () => {
  it('returns zero reflection when input is zero', () => {
    const diode = new DiodePair(1_000)
    diode.accept(0)
    const reflected = diode.reflect()
    assert.ok(Math.abs(reflected) < 1e-9)
  })

  it('converges to a finite solution for large input', () => {
    const diode = new DiodePair(1_000)
    diode.accept(10)
    const reflected = diode.reflect()
    assert.ok(Number.isFinite(reflected))
  })

  it('produces soft clipping behavior for large signals', () => {
    const diode = new DiodePair(1_000)
    const largeInput = 8
    diode.accept(largeInput)
    diode.reflect()
    const outputVoltage = diode.getVoltage()
    assert.ok(Math.abs(outputVoltage) < Math.abs(largeInput))
  })

  it('converges within the configured Newton iteration limit', () => {
    const diode = new DiodePair(1_000)
    diode.accept(2)
    diode.reflect()
    assert.ok(diode.lastIterations > 0)
    assert.ok(diode.lastIterations <= 50)
  })
})
