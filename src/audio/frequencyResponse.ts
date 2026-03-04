import type { FilterNodeDescriptor, PhaserConfig } from './types'

export interface FreqResponseData {
  frequencies: Float32Array
  magnitudesDb: Float32Array
  hasAnalytical: boolean
}

const MIN_FREQ = 20
const MAX_FREQ = 20_000
const EPSILON = 1e-6

type FrequencyResponseBuffer = Float32Array<ArrayBuffer>

function createResponseBuffer(size: number): FrequencyResponseBuffer {
  return new Float32Array(size) as FrequencyResponseBuffer
}

function createLogFrequencyArray(numPoints: number): FrequencyResponseBuffer {
  const frequencies = createResponseBuffer(numPoints)
  const ratio = MAX_FREQ / MIN_FREQ
  for (let i = 0; i < numPoints; i += 1) {
    frequencies[i] = MIN_FREQ * ratio ** (i / (numPoints - 1))
  }
  return frequencies
}

function multiplySeriesMagnitudes(filters: FilterNodeDescriptor[], frequencies: FrequencyResponseBuffer): Float32Array {
  const numPoints = frequencies.length
  const total = new Float32Array(numPoints)
  total.fill(1)

  const mag = createResponseBuffer(numPoints)
  const phase = createResponseBuffer(numPoints)

  filters.forEach(({ node }) => {
    node.getFrequencyResponse(frequencies, mag, phase)
    for (let i = 0; i < numPoints; i += 1) {
      total[i] *= mag[i]
    }
  })

  return total
}

function computeParallelResponse(filters: FilterNodeDescriptor[], frequencies: FrequencyResponseBuffer): Float32Array | null {
  const lp = filters.find((filter) => filter.topology === 'parallel-lp')
  const hp = filters.find((filter) => filter.topology === 'parallel-hp')
  if (!lp || !hp) return null

  const numPoints = frequencies.length
  const combined = new Float32Array(numPoints)

  const lpMag = createResponseBuffer(numPoints)
  const hpMag = createResponseBuffer(numPoints)
  const phaseScratch = createResponseBuffer(numPoints)

  lp.node.getFrequencyResponse(frequencies, lpMag, phaseScratch)
  hp.node.getFrequencyResponse(frequencies, hpMag, phaseScratch)

  const lpGain = Math.max(0, lp.gainNode?.gain.value ?? lp.gainNode?.gain.defaultValue ?? 1)
  const hpGain = Math.max(0, hp.gainNode?.gain.value ?? hp.gainNode?.gain.defaultValue ?? 1)

  for (let i = 0; i < numPoints; i += 1) {
    // The Big Muff tone stack branch blend is visualized as a weighted magnitude mix.
    // This keeps the expected W-shaped scoop stable across browsers.
    combined[i] = lpMag[i] * lpGain + hpMag[i] * hpGain
  }

  return combined
}

function computePhaserResponse(phaserConfig: PhaserConfig, frequencies: FrequencyResponseBuffer): Float32Array {
  const numPoints = frequencies.length
  const dryWet = new Float32Array(numPoints)

  const stageMagBuffers = phaserConfig.allpassNodes.map(() => createResponseBuffer(numPoints))
  const stagePhaseBuffers = phaserConfig.allpassNodes.map(() => createResponseBuffer(numPoints))

  phaserConfig.allpassNodes.forEach((node, index) => {
    node.getFrequencyResponse(frequencies, stageMagBuffers[index], stagePhaseBuffers[index])
  })

  for (let i = 0; i < numPoints; i += 1) {
    let chainReal = 1
    let chainImag = 0

    for (let stageIndex = 0; stageIndex < phaserConfig.allpassNodes.length; stageIndex += 1) {
      const mag = stageMagBuffers[stageIndex][i]
      const phase = stagePhaseBuffers[stageIndex][i]
      const stageReal = mag * Math.cos(phase)
      const stageImag = mag * Math.sin(phase)
      const nextReal = chainReal * stageReal - chainImag * stageImag
      const nextImag = chainReal * stageImag + chainImag * stageReal
      chainReal = nextReal
      chainImag = nextImag
    }

    const real = phaserConfig.dryGain + phaserConfig.wetGain * chainReal
    const imag = phaserConfig.wetGain * chainImag
    dryWet[i] = Math.hypot(real, imag)
  }

  return dryWet
}

export function computeFrequencyResponse(
  filterNodes: FilterNodeDescriptor[],
  phaserConfig?: PhaserConfig,
  numPoints = 512,
): FreqResponseData {
  const frequencies = createLogFrequencyArray(numPoints)
  const hasAnalytical = Boolean(phaserConfig || filterNodes.length > 0)
  const magnitudesDb = new Float32Array(numPoints)

  if (!hasAnalytical) {
    return { frequencies, magnitudesDb, hasAnalytical: false }
  }

  let linearMagnitude: Float32Array
  if (phaserConfig) {
    linearMagnitude = computePhaserResponse(phaserConfig, frequencies)
  } else {
    const series = filterNodes.filter((filter) => filter.topology === 'series')
    const seriesMagnitude = multiplySeriesMagnitudes(series, frequencies)
    const parallelMagnitude = computeParallelResponse(filterNodes, frequencies)
    linearMagnitude = parallelMagnitude ?? seriesMagnitude

    if (parallelMagnitude) {
      for (let i = 0; i < numPoints; i += 1) {
        linearMagnitude[i] *= seriesMagnitude[i]
      }
    }
  }

  for (let i = 0; i < numPoints; i += 1) {
    magnitudesDb[i] = 20 * Math.log10(Math.max(EPSILON, linearMagnitude[i]))
  }

  return { frequencies, magnitudesDb, hasAnalytical: true }
}
