import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isSelectionActive } from '../../src/components/learn/valueSelection.js'

describe('BR-07_learn-selection-highlighting', () => {
  it('treats close float values as active selection for UI highlight', () => {
    // BR-07: Learn experiment option pills should stay highlighted even with minor float drift.
    assert.equal(isSelectionActive(0.5509, 0.55), true)
    assert.equal(isSelectionActive(0.2492, 0.25), true)
  })
})
