import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { pathToFileURL } from 'node:url'

type Graph = {
  setParameter: (paramId: string, value: number) => void
  setBypassed: (componentId: string, bypassed: boolean) => void
  processSample: (sample: number, port: { postMessage: (msg: unknown) => void }) => number
}

const SAMPLE_RATE = 44_100

const rms = (values: number[]): number => Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length)
const highFreqProxy = (values: number[]): number => {
  let total = 0
  for (let i = 1; i < values.length; i += 1) {
    total += Math.abs(values[i] - values[i - 1])
  }
  return total / Math.max(1, values.length - 1)
}

function createKlonGraph(): Promise<Graph> {
  return import(pathToFileURL(`${process.cwd()}/src/audio/wdf/WDFProcessor.js`).href)
    .then((mod) => mod.__test.createGraphFromConfig({
      sampleRate: SAMPLE_RATE,
      circuit: 'klon-centaur',
      gain: 0.25,
      treble: 0.5,
      output: 0.9,
    }) as Graph)
}

function runWindow(graph: Graph, sampleCount: number): number[] {
  const out: number[] = []
  const port = { postMessage: () => {} }
  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / SAMPLE_RATE
    const input = Math.sin(2 * Math.PI * 220 * t) * 0.4 + Math.sin(2 * Math.PI * 660 * t) * 0.15
    out.push(graph.processSample(input, port))
  }
  return out
}

describe('BR-02_klon-parameter-audibility', () => {
  it('gain and treble produce audible response deltas', async () => {
    const graph = await createKlonGraph()

    // warmup
    runWindow(graph, 6_000)

    graph.setParameter('gain', 0)
    const gainLow = runWindow(graph, 12_000)
    graph.setParameter('gain', 1)
    const gainHigh = runWindow(graph, 12_000)

    const gainRmsDelta = Math.abs(rms(gainHigh) - rms(gainLow))
    assert.ok(gainRmsDelta > 0.02, `expected gain to change output level/texture; got delta=${gainRmsDelta}`)

    graph.setParameter('gain', 0.4)
    runWindow(graph, 8_000)
    graph.setParameter('treble', 0)
    const trebleLow = runWindow(graph, 12_000)
    graph.setParameter('treble', 1)
    const trebleHigh = runWindow(graph, 12_000)

    const hfLow = highFreqProxy(trebleLow)
    const hfHigh = highFreqProxy(trebleHigh)
    const hfRatio = hfHigh / Math.max(1e-9, hfLow)

    // PRD Phase 3 + Learn mode expectations: TREBLE should materially alter top-end character.
    assert.ok(hfRatio > 1.1 || hfRatio < 0.9, `expected treble sweep to materially alter high-frequency proxy; ratio=${hfRatio}`)
  })

  it('clean-path bypass produces a measurable tonal change', async () => {
    const graph = await createKlonGraph()
    runWindow(graph, 6_000)

    graph.setBypassed('kl-clean-path', false)
    const cleanOn = runWindow(graph, 10_000)
    graph.setBypassed('kl-clean-path', true)
    const cleanOff = runWindow(graph, 10_000)

    const hfOn = highFreqProxy(cleanOn)
    const hfOff = highFreqProxy(cleanOff)
    const change = Math.abs(hfOff - hfOn) / Math.max(1e-9, hfOn)
    assert.ok(change > 0.2, `expected clean-path bypass to measurably alter tone; change=${change}`)
  })
})
