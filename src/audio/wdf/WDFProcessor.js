const MIN_RESISTANCE = 1e-9

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
    this.portResistance = 1 / (2 * capacitanceFarads * sampleRateHz)
    this.incident = 0
    this.reflected = 0
    this.bypass = false
    this.previousIncident = 0
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
const MAX_NEWTON_ITERATIONS = 50
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
  }

  setPortResistance(value) {
    this.portResistance = Math.max(value, MIN_RESISTANCE)
  }

  accept(wave) {
    this.incident = wave
  }

  clampExpArg(value) {
    if (value > MAX_EXP_ARGUMENT) return MAX_EXP_ARGUMENT
    if (value < -MAX_EXP_ARGUMENT) return -MAX_EXP_ARGUMENT
    return value
  }

  equation(incident, reflected) {
    const voltage = (incident + reflected) * 0.5
    const arg = this.clampExpArg(voltage / (this.n * this.Vt))
    const sinhTerm = Math.exp(arg) - Math.exp(-arg)
    return (incident - reflected) / (2 * this.portResistance) - this.Is * sinhTerm
  }

  derivative(incident, reflected) {
    const voltage = (incident + reflected) * 0.5
    const arg = this.clampExpArg(voltage / (this.n * this.Vt))
    const coshTerm = Math.exp(arg) + Math.exp(-arg)
    return -1 / (2 * this.portResistance) - this.Is * (0.5 / (this.n * this.Vt)) * coshTerm
  }

  reflect() {
    if (this.bypass) {
      this.reflected = this.incident
      return this.reflected
    }

    let x = Number.isFinite(this.reflected) ? this.reflected : 0

    for (let iteration = 0; iteration < MAX_NEWTON_ITERATIONS; iteration += 1) {
      const f = this.equation(this.incident, x)
      const df = this.derivative(this.incident, x)

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

const clamp01 = (value) => {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

const mapDriveToResistance = (driveNormalized) => {
  const normalized = clamp01(driveNormalized)
  return DRIVE_MIN_RESISTANCE + (1 - normalized) * DRIVE_SPAN_RESISTANCE
}

const mapToneToResistance = (toneNormalized) => {
  // Tone up should sound brighter on a TS-style control.
  const t = clamp01(toneNormalized)
  return TONE_RESISTANCE_BASE + (1 - t) * TONE_POT_SPAN
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
    this.feedbackCapacitor = new Capacitor(FEEDBACK_CAPACITANCE, this.sampleRateHz)
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

  refreshNetworkResistances() {
    this.feedbackSeries.refreshPortResistance()
    this.clippingParallel.refreshPortResistance()
    this.clippingRoot.refreshPortResistance()
    this.clippingDiodes.setPortResistance(this.clippingParallel.portResistance)
  }

  updateSmoothedParams() {
    const coeff = 0.01

    this.drive += (this.driveTarget - this.drive) * coeff
    this.tone += (this.toneTarget - this.tone) * coeff
    this.level += (this.levelTarget - this.level) * coeff

    this.driveResistor.setParam(mapDriveToResistance(this.drive))
    this.refreshNetworkResistances()
  }

  processInputCoupling(sample) {
    if (this.bypassed.has('ts-input-cap')) return sample

    const rc = INPUT_RESISTANCE * INPUT_CAPACITANCE
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
    const mixed = sourceVoltage * 0.65 + diodeVoltage * 0.35
    if (!Number.isFinite(mixed)) {
      return Math.tanh(sample * 3.2)
    }
    return mixed
  }

  processTone(sample) {
    if (this.bypassed.has('ts-tone-cap') || this.bypassed.has('ts-tone-resistor') || this.bypassed.has('ts-tone-pot')) {
      return sample
    }

    // PRD topology: 0.1uF highpass roll-off + RC lowpass with 220R + 0-20k tone pot and 0.22uF cap.
    const dt = 1 / this.sampleRateHz

    const hpRc = TONE_HIGHPASS_RESISTANCE * TONE_HIGHPASS_CAPACITANCE
    const hpAlpha = hpRc / (hpRc + dt)
    const highPassed = hpAlpha * (this.toneHPPrevOutput + sample - this.toneHPPrevInput)
    this.toneHPPrevInput = sample
    this.toneHPPrevOutput = highPassed

    const toneResistance = mapToneToResistance(this.tone)
    const lpRc = toneResistance * TONE_CAPACITANCE
    const lpAlpha = dt / (lpRc + dt)
    this.toneLPState += lpAlpha * (highPassed - this.toneLPState)

    return this.toneLPState
  }

  processSample(sample) {
    this.updateSmoothedParams()

    const fallbackBase = Math.tanh(sample * (1 + this.drive * 6))
    const fallback = this.bypassed.has('ts-volume') ? fallbackBase : fallbackBase * this.level

    const coupled = this.processInputCoupling(sample)
    const clipped = this.processClipping(coupled)
    const toned = this.processTone(clipped)
    const output = this.bypassed.has('ts-volume') ? toned : toned * this.level

    let safeOutput = output
    if (!Number.isFinite(safeOutput)) {
      safeOutput = fallback
    }

    safeOutput = Math.tanh(safeOutput * 1.2)

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
    return safeOutput
  }
}

class WDFProcessor extends AudioWorkletProcessor {
  graph = null
  startupSilentBlocks = 24

  constructor() {
    super()
    this.port.onmessage = (event) => {
      this.handleMessage(event.data)
    }
  }

  handleMessage(message) {
    if (message.type === 'setup') {
      this.graph = new TubeScreamerWDFGraph(message.config)
      this.startupSilentBlocks = 24
      this.prevOutput = 0
      return
    }

    if (!this.graph) return

    if (message.type === 'param') {
      this.graph.setParameter(message.paramId, message.value)
      return
    }

    this.graph.setBypassed(message.componentId, message.bypassed)
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

    for (let i = 0; i < inputChannel.length; i += 1) {
      outputChannel[i] = this.graph.processSample(inputChannel[i])
    }

    return true
  }
}

registerProcessor('wdf-processor', WDFProcessor)
