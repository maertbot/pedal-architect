import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { pathToFileURL } from 'node:url'

type Graph = {
  setParameter: (paramId: string, value: number) => void
  setValueMultiplier: (componentId: string, multiplier: number) => void
  setBypassed: (componentId: string, bypassed: boolean) => void
  processSample: (sample: number, port: { postMessage: (msg: unknown) => void }) => number
}

const SAMPLE_RATE = 44_100

const spectralAmplitude = (values: number[], frequency: number): number => {
  let real = 0
  let imag = 0
  for (let i = 0; i < values.length; i += 1) {
    const t = i / SAMPLE_RATE
    const phase = 2 * Math.PI * frequency * t
    real += values[i] * Math.cos(phase)
    imag += values[i] * Math.sin(phase)
  }
  return (2 / values.length) * Math.hypot(real, imag)
}

const rms = (values: number[]): number => Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length)

async function createGraph(): Promise<Graph> {
  const mod = await import(pathToFileURL(`${process.cwd()}/src/audio/wdf/WDFProcessor.js`).href)
  return mod.__test.createGraphFromConfig({
    sampleRate: SAMPLE_RATE,
    circuit: 'tube-screamer-ts808',
    drive: 0.55,
    tone: 0.5,
    level: 0.8,
  }) as Graph
}

function runWindow(graph: Graph, sampleCount: number): number[] {
  const out: number[] = []
  const port = { postMessage: () => {} }
  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / SAMPLE_RATE
    const input = Math.sin(2 * Math.PI * 220 * t) * 0.35 + Math.sin(2 * Math.PI * 1320 * t) * 0.12
    out.push(graph.processSample(input, port))
  }
  return out
}

describe('BR-08_tube-screamer-tone-and-component-audibility', () => {
  it('tone knob materially changes harmonic balance', async () => {
    const graph = await createGraph()
    runWindow(graph, 12_000)

    graph.setParameter('tone', 0)
    const dark = runWindow(graph, 16_000)

    graph.setParameter('tone', 1)
    const bright = runWindow(graph, 16_000)

    const darkHi = spectralAmplitude(dark, 1320)
    const brightHi = spectralAmplitude(bright, 1320)
    const ratio = brightHi / Math.max(1e-9, darkHi)

    assert.ok(ratio > 1.2 || ratio < 0.8, `expected tone sweep to materially change high-frequency content; ratio=${ratio}`)
    assert.ok(rms(bright) > 0.01, 'expected non-silent output from Tube Screamer graph')

    const rmsRatio = rms(bright) / Math.max(1e-9, rms(dark))
    // Tone should primarily tilt frequency response, not behave like a giant volume boost.
    assert.ok(rmsRatio < 1.5, `tone sweep changed overall loudness too much; rmsRatio=${rmsRatio}`)
  })

  it('component value and bypass controls materially affect output', async () => {
    const graph = await createGraph()
    runWindow(graph, 10_000)

    graph.setValueMultiplier('ts-tone-cap', 0.25)
    const smallCap = runWindow(graph, 12_000)
    graph.setValueMultiplier('ts-tone-cap', 4)
    const largeCap = runWindow(graph, 12_000)

    const hiSmall = spectralAmplitude(smallCap, 4000)
    const hiLarge = spectralAmplitude(largeCap, 4000)
    const capRatio = hiLarge / Math.max(1e-9, hiSmall)
    assert.ok(capRatio > 1.15 || capRatio < 0.85, `expected tone-cap multiplier to change output; ratio=${capRatio}`)

    graph.setBypassed('ts-clipping-diodes', false)
    const clipped = runWindow(graph, 12_000)
    graph.setBypassed('ts-clipping-diodes', true)
    const noDiodes = runWindow(graph, 12_000)

    const clippedRms = rms(clipped)
    const noDiodesRms = rms(noDiodes)
    const diodeDelta = Math.abs(clippedRms - noDiodesRms)
    assert.ok(diodeDelta > 0.01, `expected diode bypass to alter output energy; delta=${diodeDelta}`)
  })
})
