import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { pathToFileURL } from 'node:url'

type Graph = {
  processSample: (sample: number, port: { postMessage: (msg: unknown) => void }) => number
}

describe('BR-04_big-muff-audio-output', () => {
  it('produces non-silent finite output for sustained input', async () => {
    const mod = await import(pathToFileURL(`${process.cwd()}/src/audio/wdf/WDFProcessor.js`).href)
    const graph = mod.__test.createGraphFromConfig({
      sampleRate: 44_100,
      circuit: 'big-muff-pi',
      sustain: 12,
      tone: 0.5,
      volume: 0.9,
    }) as Graph

    const port = { postMessage: () => {} }
    let energy = 0
    let finiteCount = 0

    for (let i = 0; i < 20_000; i += 1) {
      const t = i / 44_100
      const input = Math.sin(2 * Math.PI * 110 * t) * 0.42 + Math.sin(2 * Math.PI * 220 * t) * 0.2
      const output = graph.processSample(input, port)
      if (Number.isFinite(output)) {
        finiteCount += 1
        energy += output * output
      }
    }

    const rms = Math.sqrt(energy / Math.max(1, finiteCount))
    assert.ok(finiteCount > 19_000, `expected mostly finite samples; finiteCount=${finiteCount}`)
    assert.ok(rms > 0.02, `expected audible non-silent output; rms=${rms}`)
  })
})
