import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { pathToFileURL } from 'node:url'

type Graph = {
  processSample: (sample: number, port: { postMessage: (msg: unknown) => void }) => number
}

describe('BR-03_klon-intermittent-clicks', () => {
  it('maintains stable continuous output without periodic dropouts', async () => {
    const mod = await import(pathToFileURL(`${process.cwd()}/src/audio/wdf/WDFProcessor.js`).href)
    const graph = mod.__test.createGraphFromConfig({
      sampleRate: 44_100,
      circuit: 'klon-centaur',
      gain: 0.55,
      treble: 0.5,
      output: 0.9,
    }) as Graph

    const port = { postMessage: () => {} }
    const windowSize = 1024
    const windowRms: number[] = []
    const samples: number[] = []

    for (let i = 0; i < 44_100 * 2; i += 1) {
      const t = i / 44_100
      const input = Math.sin(2 * Math.PI * 146.83 * t) * 0.4 + Math.sin(2 * Math.PI * 293.66 * t) * 0.2
      samples.push(graph.processSample(input, port))
    }

    for (let start = 0; start + windowSize <= samples.length; start += windowSize) {
      let energy = 0
      for (let i = start; i < start + windowSize; i += 1) {
        const sample = samples[i]
        energy += sample * sample
      }
      windowRms.push(Math.sqrt(energy / windowSize))
    }

    const avg = windowRms.reduce((sum, value) => sum + value, 0) / windowRms.length
    const min = Math.min(...windowRms)

    // Intermittent clicks/dropouts show up as near-silent windows.
    assert.ok(avg > 0.03, `expected sustained audible output; avg=${avg}`)
    assert.ok(min > avg * 0.25, `detected severe intermittent dropout window; min=${min}, avg=${avg}`)
  })
})
