const MIN_RESISTANCE = 1e-9
const LN2 = 0.6931471805599453
const INV_LN2 = 1.4426950408889634
const _pow2Buffer = new ArrayBuffer(8)
const _pow2F64 = new Float64Array(_pow2Buffer)
const _pow2I32 = new Int32Array(_pow2Buffer)

function fastPow2(power) {
  if (power < -1022) return 0
  if (power > 1023) return Infinity
  _pow2I32[1] = (power + 1023) << 20
  _pow2I32[0] = 0
  return _pow2F64[0]
}

function fastExp(x) {
  if (x > 709) return Infinity
  if (x < -745) return 0

  const power = (x * INV_LN2 + (x >= 0 ? 0.5 : -0.5)) | 0
  const r = x - power * LN2
  const r2 = r * r
  const r3 = r2 * r
  const r4 = r2 * r2
  const r5 = r4 * r
  const poly = 1 + r + 0.5 * r2 + (1 / 6) * r3 + (1 / 24) * r4 + (1 / 120) * r5

  return fastPow2(power) * poly
}

function nowMs() {
  if (globalThis.performance?.now) return globalThis.performance.now()
  return Date.now()
}

class Resistor {
  constructor(resistanceOhms) {
    this.portResistance = Math.max(resistanceOhms, MIN_RESISTANCE)
    this.incident = 0
    this.reflected = 0
    this.bypass = false
  }

  setParam(value) {
    this.portResistance = Math.max(value, MIN_RESISTANCE)
  }

  accept(wave) {
    this.incident = wave
  }

  reflect() {
    this.reflected = 0
    return this.reflected
  }
}

class Capacitor {
  constructor(capacitanceFarads, sampleRateHz) {
    this.sampleRateHz = sampleRateHz
    this.capacitanceFarads = capacitanceFarads
    this.portResistance = 1 / (2 * capacitanceFarads * sampleRateHz)
    this.incident = 0
    this.reflected = 0
    this.bypass = false
    this.previousIncident = 0
  }

  setParam(value) {
    this.capacitanceFarads = Math.max(value, 1e-12)
    this.portResistance = 1 / (2 * this.capacitanceFarads * this.sampleRateHz)
  }

  accept(wave) {
    this.incident = wave
  }

  reflect() {
    this.reflected = this.previousIncident
    this.previousIncident = this.incident
    return this.reflected
  }
}

class IdealVoltageSource {
  constructor() {
    this.portResistance = MIN_RESISTANCE
    this.incident = 0
    this.reflected = 0
    this.bypass = false
    this.voltage = 0
  }

  setParam(value) {
    this.voltage = value
  }

  accept(wave) {
    this.incident = wave
  }

  reflect() {
    this.reflected = 2 * this.voltage - this.incident
    return this.reflected
  }
}

class SeriesAdaptor {
  constructor(left, right) {
    this.left = left
    this.right = right
    this.incident = 0
    this.reflected = 0
    this.bypass = false
    this.portResistance = Math.max(this.left.portResistance + this.right.portResistance, MIN_RESISTANCE)
  }

  refreshPortResistance() {
    this.portResistance = Math.max(this.left.portResistance + this.right.portResistance, MIN_RESISTANCE)
  }

  accept(wave) {
    this.incident = wave
  }

  reflect() {
    this.refreshPortResistance()

    const r1 = Math.max(this.left.portResistance, MIN_RESISTANCE)
    const r2 = Math.max(this.right.portResistance, MIN_RESISTANCE)
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

class ParallelAdaptor {
  constructor(left, right) {
    this.left = left
    this.right = right
    this.incident = 0
    this.reflected = 0
    this.bypass = false
    this.portResistance = this.computePortResistance()
  }

  computePortResistance() {
    const r1 = Math.max(this.left.portResistance, MIN_RESISTANCE)
    const r2 = Math.max(this.right.portResistance, MIN_RESISTANCE)
    return Math.max((r1 * r2) / (r1 + r2), MIN_RESISTANCE)
  }

  refreshPortResistance() {
    this.portResistance = this.computePortResistance()
  }

  accept(wave) {
    this.incident = wave
  }

  reflect() {
    this.refreshPortResistance()

    const r1 = Math.max(this.left.portResistance, MIN_RESISTANCE)
    const r2 = Math.max(this.right.portResistance, MIN_RESISTANCE)
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

const DEFAULT_IS = 2.52e-9
const DEFAULT_N = 1.752
const DEFAULT_VT = 25.85e-3
const MAX_NEWTON_ITERATIONS = 8
const NEWTON_TOLERANCE = 1e-6
const MAX_EXP_ARGUMENT = 40

class DiodePair {
  constructor(portResistance, Is = DEFAULT_IS, n = DEFAULT_N, Vt = DEFAULT_VT) {
    this.portResistance = Math.max(portResistance, MIN_RESISTANCE)
    this.incident = 0
    this.reflected = 0
    this.bypass = false
    this.Is = Is
    this.n = n
    this.Vt = Vt
    this.updateConstants()
  }

  updateConstants() {
    this.invTwoPortResistance = 1 / (2 * this.portResistance)
    this.invNVt = 1 / (this.n * this.Vt)
    this.diodeSlopeScale = this.Is * (0.5 * this.invNVt)
  }

  setPortResistance(value) {
    this.portResistance = Math.max(value, MIN_RESISTANCE)
    this.updateConstants()
  }

  accept(wave) {
    this.incident = wave
  }

  clampExpArg(value) {
    if (value > MAX_EXP_ARGUMENT) return MAX_EXP_ARGUMENT
    if (value < -MAX_EXP_ARGUMENT) return -MAX_EXP_ARGUMENT
    return value
  }

  equation(incident, reflected, expArg, expNegArg) {
    const sinhTerm = expArg - expNegArg
    return (incident - reflected) * this.invTwoPortResistance - this.Is * sinhTerm
  }

  derivative(expArg, expNegArg) {
    const coshTerm = expArg + expNegArg
    return -this.invTwoPortResistance - this.diodeSlopeScale * coshTerm
  }

  reflect() {
    if (this.bypass) {
      this.reflected = this.incident
      return this.reflected
    }

    let x = Number.isFinite(this.reflected) ? this.reflected : 0

    for (let iteration = 0; iteration < MAX_NEWTON_ITERATIONS; iteration += 1) {
      const voltage = (this.incident + x) * 0.5
      const arg = this.clampExpArg(voltage * this.invNVt)
      const expArg = fastExp(arg)
      const expNegArg = fastExp(-arg)
      const f = this.equation(this.incident, x, expArg, expNegArg)
      const df = this.derivative(expArg, expNegArg)

      if (!Number.isFinite(df) || Math.abs(df) < Number.EPSILON) {
        break
      }

      const next = x - f / df
      if (!Number.isFinite(next)) break
      if (Math.abs(next - x) <= NEWTON_TOLERANCE) {
        x = next
        break
      }

      x = next
    }

    if (!Number.isFinite(x)) {
      x = 0
    }
    this.reflected = x
    return this.reflected
  }

  getVoltage() {
    return (this.incident + this.reflected) * 0.5
  }
}

const INPUT_CAPACITANCE = 0.047e-6
const INPUT_RESISTANCE = 4_700
const FEEDBACK_CAPACITANCE = 0.047e-6
const DRIVE_MIN_RESISTANCE = 51_000
const DRIVE_SPAN_RESISTANCE = 500_000
const TONE_RESISTANCE_BASE = 220
const TONE_POT_SPAN = 20_000
const TONE_CAPACITANCE = 0.22e-6
const TONE_HIGHPASS_CAPACITANCE = 0.1e-6
const TONE_HIGHPASS_RESISTANCE = 10_000
const LEVEL_REPORT_INTERVAL_SAMPLES = 2_940
const COMPONENT_IDS = [
  'ts-input-cap',
  'ts-input-resistor',
  'ts-clipping-diodes',
  'ts-drive-pot',
  'ts-feedback-cap',
  'ts-tone-resistor',
  'ts-tone-cap',
  'ts-tone-pot',
  'ts-volume',
]

const clamp01 = (value) => {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

const mapDriveToResistance = (driveNormalized) => {
  const normalized = clamp01(driveNormalized)
  return DRIVE_MIN_RESISTANCE + (1 - normalized) * DRIVE_SPAN_RESISTANCE
}

const mapToneToResistance = (toneNormalized, resistanceBase = TONE_RESISTANCE_BASE) => {
  // Tone up should sound brighter on a TS-style control.
  const t = clamp01(toneNormalized)
  return resistanceBase + (1 - t) * TONE_POT_SPAN
}

class TubeScreamerWDFGraph {
  source = new IdealVoltageSource()
  inputResistor = new Resistor(INPUT_RESISTANCE)
  clippingDiodes = new DiodePair(1_000)
  drive = 0.5
  tone = 0.5
  level = 0.8
  driveTarget = 0.5
  toneTarget = 0.5
  levelTarget = 0.8
  bypassed = new Set()
  hpPrevInput = 0
  hpPrevOutput = 0
  toneHPPrevInput = 0
  toneHPPrevOutput = 0
  toneLPState = 0
  valueMultipliers = {}
  multipliersDirty = true
  inputCapacitance = INPUT_CAPACITANCE
  inputResistanceValue = INPUT_RESISTANCE
  feedbackCapacitance = FEEDBACK_CAPACITANCE
  toneResistanceBase = TONE_RESISTANCE_BASE
  toneCapacitance = TONE_CAPACITANCE
  levelSquares = Object.fromEntries(COMPONENT_IDS.map((componentId) => [componentId, 0]))
  levelSampleCount = 0
  sampleCounter = 0

  constructor(config) {
    this.sampleRateHz = Math.max(config.sampleRate, 1)
    this.startupWarmupSamples = Math.max(512, Math.floor(this.sampleRateHz * 0.03))
    this.startupAttackSamples = Math.max(128, Math.floor(this.sampleRateHz * 0.006))
    this.signalAttackSamples = Math.max(256, Math.floor(this.sampleRateHz * 0.012))
    this.startupCounter = 0
    this.signalAttackCounter = 0
    this.signalLatched = false
    this.prevOutput = 0
    this.driveResistor = new Resistor(mapDriveToResistance(config.drive))
    this.feedbackCapacitor = new Capacitor(this.feedbackCapacitance, this.sampleRateHz)
    this.feedbackSeries = new SeriesAdaptor(this.driveResistor, this.feedbackCapacitor)
    this.clippingParallel = new ParallelAdaptor(this.clippingDiodes, this.feedbackSeries)
    this.clippingRoot = new SeriesAdaptor(this.inputResistor, this.clippingParallel)

    this.drive = clamp01(config.drive)
    this.tone = clamp01(config.tone)
    this.level = config.level
    this.driveTarget = this.drive
    this.toneTarget = this.tone
    this.levelTarget = this.level

    this.driveResistor.setParam(mapDriveToResistance(this.drive))
    this.applyValueMultipliers()
    this.refreshNetworkResistances()
  }

  setBypassed(componentId, bypassed) {
    if (bypassed) this.bypassed.add(componentId)
    else this.bypassed.delete(componentId)
  }

  setParameter(paramId, value) {
    if (paramId === 'drive') {
      this.driveTarget = clamp01(value)
      return
    }

    if (paramId === 'tone') {
      this.toneTarget = clamp01(value)
      return
    }

    if (paramId === 'level') {
      this.levelTarget = value
    }
  }

  setValueMultiplier(componentId, multiplier) {
    const safeMultiplier = Math.max(0.25, Math.min(4, Number.isFinite(multiplier) ? multiplier : 1))
    this.valueMultipliers[componentId] = safeMultiplier
    this.multipliersDirty = true
  }

  getMultiplier(componentId) {
    return this.valueMultipliers[componentId] ?? 1
  }

  applyValueMultipliers() {
    if (!this.multipliersDirty) return

    this.inputCapacitance = INPUT_CAPACITANCE * this.getMultiplier('ts-input-cap')
    this.inputResistanceValue = INPUT_RESISTANCE * this.getMultiplier('ts-input-resistor')
    this.feedbackCapacitance = FEEDBACK_CAPACITANCE * this.getMultiplier('ts-feedback-cap')
    this.toneResistanceBase = TONE_RESISTANCE_BASE * this.getMultiplier('ts-tone-resistor')
    this.toneCapacitance = TONE_CAPACITANCE * this.getMultiplier('ts-tone-cap')

    this.inputResistor.setParam(this.inputResistanceValue)
    this.feedbackCapacitor.setParam(this.feedbackCapacitance)
    this.multipliersDirty = false
    this.refreshNetworkResistances()
  }

  refreshNetworkResistances() {
    this.feedbackSeries.refreshPortResistance()
    this.clippingParallel.refreshPortResistance()
    this.clippingRoot.refreshPortResistance()
    this.clippingDiodes.setPortResistance(this.clippingParallel.portResistance)
  }

  updateSmoothedParams() {
    this.applyValueMultipliers()

    const coeff = 0.01

    this.drive += (this.driveTarget - this.drive) * coeff
    this.tone += (this.toneTarget - this.tone) * coeff
    this.level += (this.levelTarget - this.level) * coeff

    this.driveResistor.setParam(mapDriveToResistance(this.drive))
    this.refreshNetworkResistances()
  }

  processInputCoupling(sample) {
    if (this.bypassed.has('ts-input-cap')) return sample

    const rc = this.inputResistanceValue * this.inputCapacitance
    const dt = 1 / this.sampleRateHz
    const alpha = rc / (rc + dt)
    const output = alpha * (this.hpPrevOutput + sample - this.hpPrevInput)
    this.hpPrevInput = sample
    this.hpPrevOutput = output
    return output
  }

  processClipping(sample) {
    this.clippingDiodes.bypass = this.bypassed.has('ts-clipping-diodes')

    this.source.setParam(sample)
    const incident = this.source.reflect()
    this.clippingRoot.accept(incident)
    const reflected = this.clippingRoot.reflect()
    this.source.accept(reflected)

    if (this.bypassed.has('ts-input-resistor')) return sample

    const sourceVoltageRaw = (incident + reflected) * 0.5
    const diodeVoltageRaw = this.clippingDiodes.getVoltage()
    const sourceVoltage = Number.isFinite(sourceVoltageRaw) ? Math.max(-4, Math.min(4, sourceVoltageRaw)) : 0
    const diodeVoltage = Number.isFinite(diodeVoltageRaw) ? Math.max(-4, Math.min(4, diodeVoltageRaw)) : 0
    if (this.clippingDiodes.bypass) {
      return sourceVoltage * 0.95
    }
    const mixed = sourceVoltage * 0.65 + diodeVoltage * 0.35
    if (!Number.isFinite(mixed)) {
      return Math.tanh(sample * 3.2)
    }
    return mixed
  }

  processTone(sample) {
    // PRD topology: 0.1uF highpass roll-off + RC lowpass with 220R + 0-20k tone pot and 0.22uF cap.
    const dt = 1 / this.sampleRateHz

    const hpRc = TONE_HIGHPASS_RESISTANCE * TONE_HIGHPASS_CAPACITANCE
    const hpAlpha = hpRc / (hpRc + dt)
    const highPassed = hpAlpha * (this.toneHPPrevOutput + sample - this.toneHPPrevInput)
    this.toneHPPrevInput = sample
    this.toneHPPrevOutput = highPassed

    let toneResistance = mapToneToResistance(this.tone, this.toneResistanceBase)
    if (this.bypassed.has('ts-tone-resistor')) {
      toneResistance = mapToneToResistance(this.tone, Math.max(24, this.toneResistanceBase * 0.08))
    } else if (this.bypassed.has('ts-tone-pot')) {
      toneResistance = Math.max(this.toneResistanceBase, 24)
    }

    if (this.bypassed.has('ts-tone-cap')) {
      this.toneLPState = highPassed
      return highPassed
    }

    const lpRc = Math.max(1e-12, toneResistance * this.toneCapacitance)
    const lpAlpha = dt / (lpRc + dt)
    this.toneLPState += lpAlpha * (highPassed - this.toneLPState)

    return this.toneLPState
  }

  addLevel(componentId, sample) {
    const safeSample = Number.isFinite(sample) ? sample : 0
    this.levelSquares[componentId] += safeSample * safeSample
  }

  captureStageLevels(coupled, clipped, toned, output) {
    this.addLevel('ts-input-cap', coupled)
    this.addLevel('ts-input-resistor', coupled)
    this.addLevel('ts-clipping-diodes', clipped)
    this.addLevel('ts-drive-pot', clipped)
    this.addLevel('ts-feedback-cap', clipped)
    this.addLevel('ts-tone-resistor', toned)
    this.addLevel('ts-tone-cap', toned)
    this.addLevel('ts-tone-pot', toned)
    this.addLevel('ts-volume', output)
    this.levelSampleCount += 1
    this.sampleCounter += 1
  }

  flushLevelsIfNeeded(port) {
    if (this.sampleCounter < LEVEL_REPORT_INTERVAL_SAMPLES || this.levelSampleCount <= 0) return

    const levels = {}
    COMPONENT_IDS.forEach((componentId) => {
      const rms = Math.sqrt(this.levelSquares[componentId] / this.levelSampleCount)
      levels[componentId] = Math.max(0, Math.min(1, rms))
      this.levelSquares[componentId] = 0
    })

    this.levelSampleCount = 0
    this.sampleCounter = 0
    port.postMessage({ type: 'levels', levels })
  }

  processSample(sample, port) {
    this.updateSmoothedParams()

    const fallbackBase = Math.tanh(sample * (1 + this.drive * 6))
    const fallback = this.bypassed.has('ts-volume') ? fallbackBase : fallbackBase * this.level

    const coupled = this.processInputCoupling(sample)
    const clipped = this.processClipping(coupled)
    const toned = this.processTone(clipped)
    const output = this.bypassed.has('ts-volume') ? toned : toned * this.level
    this.captureStageLevels(coupled, clipped, toned, output)

    let safeOutput = output
    if (!Number.isFinite(safeOutput)) {
      safeOutput = fallback
    }

    if (Math.abs(safeOutput) > 1.2) {
      safeOutput = Math.tanh(safeOutput * 0.9)
    }

    if (Math.abs(safeOutput) < 1e-7 && Math.abs(sample) > 1e-5) {
      safeOutput = fallback
    }

    if (this.startupCounter < this.startupWarmupSamples) {
      const mix = this.startupCounter / this.startupWarmupSamples
      this.startupCounter += 1
      safeOutput = fallback * (1 - mix) + safeOutput * mix
    } else {
      this.startupCounter += 1
    }

    const maxDelta = 0.06
    const delta = safeOutput - this.prevOutput
    if (delta > maxDelta) safeOutput = this.prevOutput + maxDelta
    else if (delta < -maxDelta) safeOutput = this.prevOutput - maxDelta

    const startupAttack = Math.min(1, this.startupCounter / this.startupAttackSamples)
    safeOutput *= startupAttack

    if (!this.signalLatched && Math.abs(sample) > 1e-5) {
      this.signalLatched = true
      this.signalAttackCounter = 0
    }

    if (this.signalLatched && this.signalAttackCounter < this.signalAttackSamples) {
      const signalAttack = this.signalAttackCounter / this.signalAttackSamples
      this.signalAttackCounter += 1
      safeOutput *= signalAttack
    }

    this.prevOutput = safeOutput
    this.flushLevelsIfNeeded(port)
    return safeOutput
  }
}

const BIG_MUFF_INPUT_CAPACITANCE = 0.1e-6
const BIG_MUFF_INPUT_RESISTANCE = 39_000
const BIG_MUFF_STAGE_CAPACITANCE = 0.1e-6
const BIG_MUFF_STAGE_RESISTANCE = 470_000
const BIG_MUFF_STAGE_SOURCE_RESISTANCE = 2_200
const BIG_MUFF_TONE_LP_CAPACITANCE = 10e-9
const BIG_MUFF_TONE_LP_RESISTANCE = 22_000
const BIG_MUFF_TONE_HP_CAPACITANCE = 3.9e-9
const BIG_MUFF_TONE_HP_RESISTANCE = 22_000
const BIG_MUFF_COMPONENT_IDS = [
  'bm-input-cap',
  'bm-input-resistor',
  'bm-clip1-diodes',
  'bm-clip1-cap',
  'bm-clip2-diodes',
  'bm-clip2-cap',
  'bm-clip3-diodes',
  'bm-clip3-cap',
  'bm-clip4-diodes',
  'bm-clip4-cap',
  'bm-tone-lp-cap',
  'bm-tone-hp-cap',
  'bm-tone-pot',
  'bm-volume',
]

const clampRange = (value, min, max) => {
  if (!Number.isFinite(value)) return min
  if (value < min) return min
  if (value > max) return max
  return value
}

class BigMuffWDFGraph {
  source = new IdealVoltageSource()
  inputResistor = new Resistor(BIG_MUFF_INPUT_RESISTANCE)
  sustain = 12
  tone = 0.5
  volume = 0.9
  sustainTarget = 12
  toneTarget = 0.5
  volumeTarget = 0.9
  bypassed = new Set()
  hpInputPrev = 0
  hpInputState = 0
  toneHPPrevInput = 0
  toneHPPrevOutput = 0
  toneLPState = 0
  valueMultipliers = {}
  multipliersDirty = true
  inputCapacitance = BIG_MUFF_INPUT_CAPACITANCE
  inputResistanceValue = BIG_MUFF_INPUT_RESISTANCE
  clipCapacitances = [BIG_MUFF_STAGE_CAPACITANCE, BIG_MUFF_STAGE_CAPACITANCE, BIG_MUFF_STAGE_CAPACITANCE, BIG_MUFF_STAGE_CAPACITANCE]
  clipResistance = BIG_MUFF_STAGE_RESISTANCE
  toneLPCapacitance = BIG_MUFF_TONE_LP_CAPACITANCE
  toneHPCapacitance = BIG_MUFF_TONE_HP_CAPACITANCE
  toneLPResistance = BIG_MUFF_TONE_LP_RESISTANCE
  toneHPResistance = BIG_MUFF_TONE_HP_RESISTANCE
  levelSquares = Object.fromEntries(BIG_MUFF_COMPONENT_IDS.map((componentId) => [componentId, 0]))
  levelSampleCount = 0
  sampleCounter = 0

  constructor(config) {
    this.sampleRateHz = Math.max(config.sampleRate, 1)
    this.startupWarmupSamples = Math.max(512, Math.floor(this.sampleRateHz * 0.03))
    this.startupAttackSamples = Math.max(128, Math.floor(this.sampleRateHz * 0.006))
    this.signalAttackSamples = Math.max(256, Math.floor(this.sampleRateHz * 0.012))
    this.startupCounter = 0
    this.signalAttackCounter = 0
    this.signalLatched = false
    this.prevOutput = 0

    this.sustain = clampRange(config.sustain, 2, 40)
    this.tone = clamp01(config.tone)
    this.volume = clampRange(config.volume, 0, 1.5)
    this.sustainTarget = this.sustain
    this.toneTarget = this.tone
    this.volumeTarget = this.volume

    this.stageStates = [0, 0, 0, 0]
    this.stagePrevInputs = [0, 0, 0, 0]
    this.stagePrevOutputs = [0, 0, 0, 0]
    this.stageInputResistors = [
      new Resistor(BIG_MUFF_STAGE_SOURCE_RESISTANCE),
      new Resistor(BIG_MUFF_STAGE_SOURCE_RESISTANCE),
      new Resistor(BIG_MUFF_STAGE_SOURCE_RESISTANCE),
      new Resistor(BIG_MUFF_STAGE_SOURCE_RESISTANCE),
    ]
    this.stageGainResistors = [
      new Resistor(this.clipResistance),
      new Resistor(this.clipResistance),
      new Resistor(this.clipResistance),
      new Resistor(this.clipResistance),
    ]
    this.stageDiodes = [
      new DiodePair(1_000, DEFAULT_IS, DEFAULT_N),
      new DiodePair(1_000, DEFAULT_IS, DEFAULT_N),
      new DiodePair(1_000, DEFAULT_IS, DEFAULT_N),
      new DiodePair(1_000, DEFAULT_IS, DEFAULT_N),
    ]
    this.stageParallels = [
      new ParallelAdaptor(this.stageDiodes[0], this.stageGainResistors[0]),
      new ParallelAdaptor(this.stageDiodes[1], this.stageGainResistors[1]),
      new ParallelAdaptor(this.stageDiodes[2], this.stageGainResistors[2]),
      new ParallelAdaptor(this.stageDiodes[3], this.stageGainResistors[3]),
    ]
    this.stageRoots = [
      new SeriesAdaptor(this.stageInputResistors[0], this.stageParallels[0]),
      new SeriesAdaptor(this.stageInputResistors[1], this.stageParallels[1]),
      new SeriesAdaptor(this.stageInputResistors[2], this.stageParallels[2]),
      new SeriesAdaptor(this.stageInputResistors[3], this.stageParallels[3]),
    ]
    this.stageDiodeIds = ['bm-clip1-diodes', 'bm-clip2-diodes', 'bm-clip3-diodes', 'bm-clip4-diodes']
    this.stageCapIds = ['bm-clip1-cap', 'bm-clip2-cap', 'bm-clip3-cap', 'bm-clip4-cap']

    this.inputResistor.setParam(this.inputResistanceValue)
    this.applyValueMultipliers()
    this.refreshNetworkResistances()
  }

  setBypassed(componentId, bypassed) {
    if (bypassed) this.bypassed.add(componentId)
    else this.bypassed.delete(componentId)
  }

  setParameter(paramId, value) {
    if (paramId === 'sustain') {
      this.sustainTarget = clampRange(value, 2, 40)
      return
    }

    if (paramId === 'tone') {
      this.toneTarget = clamp01(value)
      return
    }

    if (paramId === 'volume') {
      this.volumeTarget = clampRange(value, 0, 1.5)
    }
  }

  setValueMultiplier(componentId, multiplier) {
    const safeMultiplier = Math.max(0.25, Math.min(4, Number.isFinite(multiplier) ? multiplier : 1))
    this.valueMultipliers[componentId] = safeMultiplier
    this.multipliersDirty = true
  }

  getMultiplier(componentId) {
    return this.valueMultipliers[componentId] ?? 1
  }

  applyValueMultipliers() {
    if (!this.multipliersDirty) return

    this.inputCapacitance = BIG_MUFF_INPUT_CAPACITANCE * this.getMultiplier('bm-input-cap')
    this.inputResistanceValue = BIG_MUFF_INPUT_RESISTANCE * this.getMultiplier('bm-input-resistor')
    this.clipCapacitances = [
      BIG_MUFF_STAGE_CAPACITANCE * this.getMultiplier('bm-clip1-cap'),
      BIG_MUFF_STAGE_CAPACITANCE * this.getMultiplier('bm-clip2-cap'),
      BIG_MUFF_STAGE_CAPACITANCE * this.getMultiplier('bm-clip3-cap'),
      BIG_MUFF_STAGE_CAPACITANCE * this.getMultiplier('bm-clip4-cap'),
    ]
    this.toneLPCapacitance = BIG_MUFF_TONE_LP_CAPACITANCE * this.getMultiplier('bm-tone-lp-cap')
    this.toneHPCapacitance = BIG_MUFF_TONE_HP_CAPACITANCE * this.getMultiplier('bm-tone-hp-cap')

    this.inputResistor.setParam(this.inputResistanceValue)
    this.stageGainResistors.forEach((resistor) => resistor.setParam(this.clipResistance))
    this.multipliersDirty = false
  }

  refreshNetworkResistances() {
    this.stageParallels.forEach((parallel, stageIndex) => {
      parallel.refreshPortResistance()
      this.stageRoots[stageIndex].refreshPortResistance()
      this.stageDiodes[stageIndex].setPortResistance(parallel.portResistance)
    })
  }

  updateSmoothedParams() {
    this.applyValueMultipliers()
    const coeff = 0.01

    this.sustain += (this.sustainTarget - this.sustain) * coeff
    this.tone += (this.toneTarget - this.tone) * coeff
    this.volume += (this.volumeTarget - this.volume) * coeff

    this.refreshNetworkResistances()
  }

  processHighPass(sample, prevInput, prevOutput, resistance, capacitance) {
    const rc = Math.max(1e-12, resistance * capacitance)
    const dt = 1 / this.sampleRateHz
    const alpha = rc / (rc + dt)
    const output = alpha * (prevOutput + sample - prevInput)
    return output
  }

  processInput(sample) {
    if (this.bypassed.has('bm-input-cap')) return sample
    const output = this.processHighPass(sample, this.hpInputPrev, this.hpInputState, this.inputResistanceValue, this.inputCapacitance)
    this.hpInputPrev = sample
    this.hpInputState = output
    return output
  }

  processStage(sample, stageIndex, stageGain) {
    const stageCapId = this.stageCapIds[stageIndex]
    let staged = sample

    if (!this.bypassed.has(stageCapId)) {
      const filtered = this.processHighPass(
        sample,
        this.stagePrevInputs[stageIndex],
        this.stagePrevOutputs[stageIndex],
        this.clipResistance,
        this.clipCapacitances[stageIndex],
      )
      this.stagePrevInputs[stageIndex] = sample
      this.stagePrevOutputs[stageIndex] = filtered
      staged = filtered
    }

    const driven = Math.tanh(staged * stageGain)
    const stageDiode = this.stageDiodes[stageIndex]
    const stageRoot = this.stageRoots[stageIndex]
    stageDiode.bypass = this.bypassed.has(this.stageDiodeIds[stageIndex])

    this.source.setParam(driven)
    const incident = this.source.reflect()
    stageRoot.accept(incident)
    const reflected = stageRoot.reflect()
    this.source.accept(reflected)

    const sourceVoltageRaw = (incident + reflected) * 0.5
    const diodeVoltageRaw = stageDiode.getVoltage()
    const sourceVoltage = Number.isFinite(sourceVoltageRaw) ? Math.max(-4, Math.min(4, sourceVoltageRaw)) : 0
    const diodeVoltage = Number.isFinite(diodeVoltageRaw) ? Math.max(-4, Math.min(4, diodeVoltageRaw)) : 0
    const combined = stageDiode.bypass ? sourceVoltage * 0.95 : sourceVoltage * 0.62 + diodeVoltage * 0.38
    const safeCombined = Number.isFinite(combined) ? combined : Math.tanh(sample * stageGain)
    return Math.tanh(safeCombined * 0.85)
  }

  processTone(sample) {
    const dt = 1 / this.sampleRateHz
    const toneBlend = this.bypassed.has('bm-tone-pot') ? 0.5 : this.tone

    let lpPath = sample
    if (!this.bypassed.has('bm-tone-lp-cap')) {
      const lpRc = Math.max(1e-12, this.toneLPResistance * this.toneLPCapacitance)
      const lpAlpha = dt / (lpRc + dt)
      this.toneLPState += lpAlpha * (sample - this.toneLPState)
      lpPath = this.toneLPState
    }

    let hpPath = sample
    if (!this.bypassed.has('bm-tone-hp-cap')) {
      hpPath = this.processHighPass(sample, this.toneHPPrevInput, this.toneHPPrevOutput, this.toneHPResistance, this.toneHPCapacitance)
      this.toneHPPrevInput = sample
      this.toneHPPrevOutput = hpPath
    }

    const lpMix = 1 - clamp01(toneBlend)
    const hpMix = clamp01(toneBlend)
    const center = 1 - Math.abs(clamp01(toneBlend) - 0.5) * 2
    const midScoop = 1 - center * 0.16
    return (lpPath * lpMix + hpPath * hpMix) * midScoop
  }

  addLevel(componentId, sample) {
    const safeSample = Number.isFinite(sample) ? sample : 0
    this.levelSquares[componentId] += safeSample * safeSample
  }

  captureStageLevels(coupled, stageOutputs, toned, output) {
    this.addLevel('bm-input-cap', coupled)
    this.addLevel('bm-input-resistor', coupled)
    this.addLevel('bm-clip1-diodes', stageOutputs[0])
    this.addLevel('bm-clip1-cap', stageOutputs[0])
    this.addLevel('bm-clip2-diodes', stageOutputs[1])
    this.addLevel('bm-clip2-cap', stageOutputs[1])
    this.addLevel('bm-clip3-diodes', stageOutputs[2])
    this.addLevel('bm-clip3-cap', stageOutputs[2])
    this.addLevel('bm-clip4-diodes', stageOutputs[3])
    this.addLevel('bm-clip4-cap', stageOutputs[3])
    this.addLevel('bm-tone-lp-cap', toned)
    this.addLevel('bm-tone-hp-cap', toned)
    this.addLevel('bm-tone-pot', toned)
    this.addLevel('bm-volume', output)
    this.levelSampleCount += 1
    this.sampleCounter += 1
  }

  flushLevelsIfNeeded(port) {
    if (this.sampleCounter < LEVEL_REPORT_INTERVAL_SAMPLES || this.levelSampleCount <= 0) return

    const levels = {}
    BIG_MUFF_COMPONENT_IDS.forEach((componentId) => {
      const rms = Math.sqrt(this.levelSquares[componentId] / this.levelSampleCount)
      levels[componentId] = Math.max(0, Math.min(1, rms))
      this.levelSquares[componentId] = 0
    })

    this.levelSampleCount = 0
    this.sampleCounter = 0
    port.postMessage({ type: 'levels', levels })
  }

  processSample(sample, port) {
    this.updateSmoothedParams()

    const sustainNorm = (this.sustain - 2) / 38
    const stageGain = 1 + sustainNorm * 9.5
    const fallbackBase = Math.tanh(sample * (1 + sustainNorm * 18))
    const fallback = this.bypassed.has('bm-volume') ? fallbackBase : fallbackBase * this.volume

    const coupled = this.processInput(sample)
    const stageOutputs = [0, 0, 0, 0]
    stageOutputs[0] = this.processStage(coupled, 0, stageGain)
    stageOutputs[1] = this.processStage(stageOutputs[0], 1, stageGain * 1.05)
    stageOutputs[2] = this.processStage(stageOutputs[1], 2, stageGain * 1.1)
    stageOutputs[3] = this.processStage(stageOutputs[2], 3, stageGain * 1.16)
    const toned = this.processTone(stageOutputs[3])
    const output = this.bypassed.has('bm-volume') ? toned : toned * this.volume
    this.captureStageLevels(coupled, stageOutputs, toned, output)

    let safeOutput = output
    if (!Number.isFinite(safeOutput)) safeOutput = fallback
    if (Math.abs(safeOutput) > 1.2) safeOutput = Math.tanh(safeOutput * 0.9)
    if (Math.abs(safeOutput) < 1e-7 && Math.abs(sample) > 1e-5) safeOutput = fallback

    if (this.startupCounter < this.startupWarmupSamples) {
      const mix = this.startupCounter / this.startupWarmupSamples
      this.startupCounter += 1
      safeOutput = fallback * (1 - mix) + safeOutput * mix
    } else {
      this.startupCounter += 1
    }

    const maxDelta = 0.06
    const delta = safeOutput - this.prevOutput
    if (delta > maxDelta) safeOutput = this.prevOutput + maxDelta
    else if (delta < -maxDelta) safeOutput = this.prevOutput - maxDelta

    const startupAttack = Math.min(1, this.startupCounter / this.startupAttackSamples)
    safeOutput *= startupAttack

    if (!this.signalLatched && Math.abs(sample) > 1e-5) {
      this.signalLatched = true
      this.signalAttackCounter = 0
    }

    if (this.signalLatched && this.signalAttackCounter < this.signalAttackSamples) {
      const signalAttack = this.signalAttackCounter / this.signalAttackSamples
      this.signalAttackCounter += 1
      safeOutput *= signalAttack
    }

    this.prevOutput = safeOutput
    this.flushLevelsIfNeeded(port)
    return safeOutput
  }
}

const KLON_POST_FILTER_R = 1_000
const KLON_POST_FILTER_C = 68e-9
const KLON_COMPONENT_IDS = [
  'kl-input-buffer',
  'kl-clean-path',
  'kl-gain-stage',
  'kl-clipping-diodes',
  'kl-post-filter-r',
  'kl-post-filter-c',
  'kl-summing',
  'kl-treble-control',
  'kl-output-volume',
]

class KlonCentaurWDFGraph {
  source = new IdealVoltageSource()
  driveInputResistor = new Resistor(2_200)
  clippingDiodes = new DiodePair(1_000, 200e-9, 2.0)
  driveResistor = new Resistor(22_000)
  gain = 0.25
  treble = 0.5
  output = 0.9
  gainTarget = 0.25
  trebleTarget = 0.5
  outputTarget = 0.9
  bypassed = new Set()
  valueMultipliers = {}
  multipliersDirty = true
  postFilterR = KLON_POST_FILTER_R
  postFilterC = KLON_POST_FILTER_C
  postLPState = 0
  shelfHPPrevInput = 0
  shelfHPPrevOutput = 0
  levelSquares = Object.fromEntries(KLON_COMPONENT_IDS.map((componentId) => [componentId, 0]))
  levelSampleCount = 0
  sampleCounter = 0

  constructor(config) {
    this.sampleRateHz = Math.max(config.sampleRate, 1)
    this.startupWarmupSamples = Math.max(512, Math.floor(this.sampleRateHz * 0.03))
    this.startupAttackSamples = Math.max(128, Math.floor(this.sampleRateHz * 0.006))
    this.signalAttackSamples = Math.max(256, Math.floor(this.sampleRateHz * 0.012))
    this.startupCounter = 0
    this.signalAttackCounter = 0
    this.signalLatched = false
    this.prevOutput = 0

    this.gain = clamp01(config.gain)
    this.treble = clamp01(config.treble)
    this.output = clampRange(config.output, 0, 1.5)
    this.gainTarget = this.gain
    this.trebleTarget = this.treble
    this.outputTarget = this.output

    this.driveParallel = new ParallelAdaptor(this.clippingDiodes, this.driveResistor)
    this.driveRoot = new SeriesAdaptor(this.driveInputResistor, this.driveParallel)

    this.applyValueMultipliers()
    this.refreshNetworkResistances()
  }

  setBypassed(componentId, bypassed) {
    if (bypassed) this.bypassed.add(componentId)
    else this.bypassed.delete(componentId)
  }

  setParameter(paramId, value) {
    if (paramId === 'gain') {
      this.gainTarget = clamp01(value)
      return
    }

    if (paramId === 'treble') {
      this.trebleTarget = clamp01(value)
      return
    }

    if (paramId === 'output') {
      this.outputTarget = clampRange(value, 0, 1.5)
    }
  }

  setValueMultiplier(componentId, multiplier) {
    const safeMultiplier = Math.max(0.25, Math.min(4, Number.isFinite(multiplier) ? multiplier : 1))
    this.valueMultipliers[componentId] = safeMultiplier
    this.multipliersDirty = true
  }

  getMultiplier(componentId) {
    return this.valueMultipliers[componentId] ?? 1
  }

  applyValueMultipliers() {
    if (!this.multipliersDirty) return
    this.postFilterR = KLON_POST_FILTER_R * this.getMultiplier('kl-post-filter-r')
    this.postFilterC = KLON_POST_FILTER_C * this.getMultiplier('kl-post-filter-c')
    this.multipliersDirty = false
  }

  refreshNetworkResistances() {
    this.driveParallel.refreshPortResistance()
    this.driveRoot.refreshPortResistance()
    this.clippingDiodes.setPortResistance(this.driveParallel.portResistance)
  }

  updateSmoothedParams() {
    this.applyValueMultipliers()
    const coeff = 0.01

    this.gain += (this.gainTarget - this.gain) * coeff
    this.treble += (this.trebleTarget - this.treble) * coeff
    this.output += (this.outputTarget - this.output) * coeff

    this.refreshNetworkResistances()
  }

  processDriveClip(sample) {
    this.clippingDiodes.bypass = this.bypassed.has('kl-clipping-diodes')

    this.source.setParam(sample)
    const incident = this.source.reflect()
    this.driveRoot.accept(incident)
    const reflected = this.driveRoot.reflect()
    this.source.accept(reflected)

    const sourceVoltageRaw = (incident + reflected) * 0.5
    const diodeVoltageRaw = this.clippingDiodes.getVoltage()
    const sourceVoltage = Number.isFinite(sourceVoltageRaw) ? Math.max(-4, Math.min(4, sourceVoltageRaw)) : 0
    const diodeVoltage = Number.isFinite(diodeVoltageRaw) ? Math.max(-4, Math.min(4, diodeVoltageRaw)) : 0
    const mixed = this.clippingDiodes.bypass ? sourceVoltage * 0.96 : sourceVoltage * 0.6 + diodeVoltage * 0.4
    return Number.isFinite(mixed) ? mixed : Math.tanh(sample * 2.6)
  }

  processPostFilter(sample) {
    const dt = 1 / this.sampleRateHz
    const rc = Math.max(1e-12, this.postFilterR * this.postFilterC)
    const alpha = dt / (rc + dt)
    this.postLPState += alpha * (sample - this.postLPState)
    return this.postLPState
  }

  processTrebleShelf(sample) {
    const frequency = 1_300 + this.treble * (7_000 - 1_300)
    const dt = 1 / this.sampleRateHz
    const rc = 1 / (2 * Math.PI * frequency)
    const hpAlpha = rc / (rc + dt)
    const hp = hpAlpha * (this.shelfHPPrevOutput + sample - this.shelfHPPrevInput)
    this.shelfHPPrevInput = sample
    this.shelfHPPrevOutput = hp

    // Treble behaves as a proper shelf centered around noon:
    // < 0.5 cuts highs, > 0.5 boosts highs.
    const gainDb = (this.treble - 0.5) * 24
    const shelfGain = Math.pow(10, gainDb / 20) - 1
    return sample + hp * shelfGain
  }

  addLevel(componentId, sample) {
    const safeSample = Number.isFinite(sample) ? sample : 0
    this.levelSquares[componentId] += safeSample * safeSample
  }

  captureStageLevels(buffered, clean, drivenPre, clipped, filteredDrive, summed, trebled, output) {
    this.addLevel('kl-input-buffer', buffered)
    this.addLevel('kl-clean-path', clean)
    this.addLevel('kl-gain-stage', drivenPre)
    this.addLevel('kl-clipping-diodes', clipped)
    this.addLevel('kl-post-filter-r', filteredDrive)
    this.addLevel('kl-post-filter-c', filteredDrive)
    this.addLevel('kl-summing', summed)
    this.addLevel('kl-treble-control', trebled)
    this.addLevel('kl-output-volume', output)
    this.levelSampleCount += 1
    this.sampleCounter += 1
  }

  flushLevelsIfNeeded(port) {
    if (this.sampleCounter < LEVEL_REPORT_INTERVAL_SAMPLES || this.levelSampleCount <= 0) return

    const levels = {}
    KLON_COMPONENT_IDS.forEach((componentId) => {
      const rms = Math.sqrt(this.levelSquares[componentId] / this.levelSampleCount)
      levels[componentId] = Math.max(0, Math.min(1, rms))
      this.levelSquares[componentId] = 0
    })

    this.levelSampleCount = 0
    this.sampleCounter = 0
    port.postMessage({ type: 'levels', levels })
  }

  processSample(sample, port) {
    this.updateSmoothedParams()

    const gainFactor = 1 + this.gain * 27
    const fallbackBase = Math.tanh(sample * (1 + gainFactor * 0.3))
    const fallback = this.bypassed.has('kl-output-volume') ? fallbackBase : fallbackBase * this.output

    const buffered = this.bypassed.has('kl-input-buffer') ? sample : Math.tanh(sample * 1.2)
    const cleanGain = this.bypassed.has('kl-clean-path') ? 0 : 1 - this.gain * 0.8
    const cleanPath = buffered * cleanGain

    const drivenPre = this.bypassed.has('kl-gain-stage') ? buffered : Math.tanh(buffered * gainFactor * 0.28)
    const clipped = this.processDriveClip(drivenPre)

    let filteredDrive = clipped
    if (!this.bypassed.has('kl-post-filter-r') && !this.bypassed.has('kl-post-filter-c')) {
      filteredDrive = this.processPostFilter(clipped)
    }

    const summed = (cleanPath + filteredDrive) * (this.bypassed.has('kl-summing') ? 0.85 : 1)
    const trebled = this.bypassed.has('kl-treble-control') ? summed : this.processTrebleShelf(summed)
    const output = this.bypassed.has('kl-output-volume') ? trebled : trebled * this.output
    this.captureStageLevels(buffered, cleanPath, drivenPre, clipped, filteredDrive, summed, trebled, output)

    let safeOutput = output
    if (!Number.isFinite(safeOutput)) safeOutput = fallback
    if (Math.abs(safeOutput) > 1.2) safeOutput = Math.tanh(safeOutput * 0.9)
    if (Math.abs(safeOutput) < 1e-7 && Math.abs(sample) > 1e-5) safeOutput = fallback

    if (this.startupCounter < this.startupWarmupSamples) {
      const mix = this.startupCounter / this.startupWarmupSamples
      this.startupCounter += 1
      safeOutput = fallback * (1 - mix) + safeOutput * mix
    } else {
      this.startupCounter += 1
    }

    const maxDelta = 0.06
    const delta = safeOutput - this.prevOutput
    if (delta > maxDelta) safeOutput = this.prevOutput + maxDelta
    else if (delta < -maxDelta) safeOutput = this.prevOutput - maxDelta

    const startupAttack = Math.min(1, this.startupCounter / this.startupAttackSamples)
    safeOutput *= startupAttack

    if (!this.signalLatched && Math.abs(sample) > 1e-5) {
      this.signalLatched = true
      this.signalAttackCounter = 0
    }

    if (this.signalLatched && this.signalAttackCounter < this.signalAttackSamples) {
      const signalAttack = this.signalAttackCounter / this.signalAttackSamples
      this.signalAttackCounter += 1
      safeOutput *= signalAttack
    }

    this.prevOutput = safeOutput
    this.flushLevelsIfNeeded(port)
    return safeOutput
  }
}

const createGraphFromConfig = (config) => {
  if (!config || typeof config !== 'object') {
    return new TubeScreamerWDFGraph({ sampleRate: sampleRate, drive: 0.55, tone: 0.5, level: 0.8 })
  }

  if (config.circuit === 'big-muff-pi') {
    return new BigMuffWDFGraph(config)
  }

  if (config.circuit === 'klon-centaur') {
    return new KlonCentaurWDFGraph(config)
  }

  return new TubeScreamerWDFGraph(config)
}

const WorkletProcessorBase = typeof AudioWorkletProcessor === 'function'
  ? AudioWorkletProcessor
  : class {
      constructor() {
        this.port = {
          onmessage: null,
          postMessage() {},
        }
      }
    }

class WDFProcessor extends WorkletProcessorBase {
  graph = null
  startupSilentBlocks = 24
  perfTotalMs = 0
  perfBlockCount = 0

  constructor() {
    super()
    this.port.onmessage = (event) => {
      this.handleMessage(event.data)
    }
  }

  handleMessage(message) {
    if (message.type === 'setup') {
      this.graph = createGraphFromConfig(message.config)
      this.startupSilentBlocks = 24
      this.prevOutput = 0
      return
    }

    if (!this.graph) return

    if (message.type === 'param') {
      this.graph.setParameter(message.paramId, message.value)
      return
    }

    if (message.type === 'valueMultiplier') {
      this.graph.setValueMultiplier(message.componentId, message.multiplier)
      return
    }

    if (message.type === 'bypass') {
      this.graph.setBypassed(message.componentId, message.bypassed)
    }
  }

  process(inputs, outputs) {
    const inputChannel = inputs[0]?.[0]
    const outputChannel = outputs[0]?.[0]

    if (!outputChannel) return true
    if (!inputChannel) {
      outputChannel.fill(0)
      return true
    }

    if (!this.graph) {
      outputChannel.fill(0)
      return true
    }

    if (this.startupSilentBlocks > 0) {
      this.startupSilentBlocks -= 1
      outputChannel.fill(0)
      return true
    }

    const startTime = nowMs()
    for (let i = 0; i < inputChannel.length; i += 1) {
      outputChannel[i] = this.graph.processSample(inputChannel[i], this.port)
    }
    const elapsedMs = nowMs() - startTime

    this.perfTotalMs += elapsedMs
    this.perfBlockCount += 1
    if (this.perfBlockCount >= 100) {
      this.port.postMessage({
        type: 'perf',
        avgMsPerBlock: this.perfTotalMs / this.perfBlockCount,
      })
      this.perfTotalMs = 0
      this.perfBlockCount = 0
    }

    return true
  }
}

if (typeof registerProcessor === 'function') {
  registerProcessor('wdf-processor', WDFProcessor)
}

export const __test = {
  createGraphFromConfig,
}
