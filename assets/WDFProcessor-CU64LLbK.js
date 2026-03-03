import { ParallelAdaptor, SeriesAdaptor } from './adaptors.js'
import { Capacitor, IdealVoltageSource, Resistor } from './elements.js'
import { DiodePair } from './nonlinear.js'
import type { TubeScreamerWDFConfig, WDFMessage } from './protocol.js'

declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort
  constructor(options?: unknown)
  abstract process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean
}

declare function registerProcessor(
  name: string,
  processorCtor: new () => AudioWorkletProcessor,
): void

const INPUT_CAPACITANCE = 0.047e-6
const INPUT_RESISTANCE = 4_700
const FEEDBACK_CAPACITANCE = 0.047e-6
const DRIVE_MIN_RESISTANCE = 51_000
const DRIVE_SPAN_RESISTANCE = 500_000
const TONE_BASE_RESISTANCE = 220
const TONE_POT_SPAN = 20_000
const TONE_CAPACITANCE = 0.22e-6

const clamp01 = (value: number): number => {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

const mapDriveToResistance = (driveNormalized: number): number => {
  const normalized = clamp01(driveNormalized)
  return DRIVE_MIN_RESISTANCE + (1 - normalized) * DRIVE_SPAN_RESISTANCE
}

const mapToneToResistance = (toneNormalized: number): number => {
  return TONE_BASE_RESISTANCE + clamp01(toneNormalized) * TONE_POT_SPAN
}

class TubeScreamerWDFGraph {
  private source = new IdealVoltageSource()

  private inputResistor = new Resistor(INPUT_RESISTANCE)

  private driveResistor: Resistor

  private feedbackCapacitor: Capacitor

  private clippingDiodes = new DiodePair(1_000)

  private feedbackSeries: SeriesAdaptor

  private clippingParallel: ParallelAdaptor

  private clippingRoot: SeriesAdaptor

  private sampleRateHz: number

  private drive = 0.5

  private tone = 0.5

  private level = 0.8

  private bypassed = new Set<string>()

  private hpPrevInput = 0

  private hpPrevOutput = 0

  private toneState = 0

  constructor(config: TubeScreamerWDFConfig) {
    this.sampleRateHz = Math.max(config.sampleRate, 1)
    this.driveResistor = new Resistor(mapDriveToResistance(config.drive))
    this.feedbackCapacitor = new Capacitor(FEEDBACK_CAPACITANCE, this.sampleRateHz)
    this.feedbackSeries = new SeriesAdaptor(this.driveResistor, this.feedbackCapacitor)
    this.clippingParallel = new ParallelAdaptor(this.clippingDiodes, this.feedbackSeries)
    this.clippingRoot = new SeriesAdaptor(this.inputResistor, this.clippingParallel)

    this.setParameter('drive', config.drive)
    this.setParameter('tone', config.tone)
    this.setParameter('level', config.level)
    this.refreshNetworkResistances()
  }

  setBypassed(componentId: string, bypassed: boolean): void {
    if (bypassed) {
      this.bypassed.add(componentId)
    } else {
      this.bypassed.delete(componentId)
    }
  }

  setParameter(paramId: string, value: number): void {
    if (paramId === 'drive') {
      this.drive = clamp01(value)
      this.driveResistor.setParam(mapDriveToResistance(this.drive))
      this.refreshNetworkResistances()
      return
    }

    if (paramId === 'tone') {
      this.tone = clamp01(value)
      return
    }

    if (paramId === 'level') {
      this.level = value
    }
  }

  private refreshNetworkResistances(): void {
    this.feedbackSeries.refreshPortResistance()
    this.clippingParallel.refreshPortResistance()
    this.clippingRoot.refreshPortResistance()
    this.clippingDiodes.setPortResistance(this.clippingParallel.portResistance)
  }

  private processInputCoupling(sample: number): number {
    if (this.bypassed.has('ts-input-cap')) {
      return sample
    }

    const rc = INPUT_RESISTANCE * INPUT_CAPACITANCE
    const dt = 1 / this.sampleRateHz
    const alpha = rc / (rc + dt)
    const output = alpha * (this.hpPrevOutput + sample - this.hpPrevInput)
    this.hpPrevInput = sample
    this.hpPrevOutput = output
    return output
  }

  private processClipping(sample: number): number {
    this.clippingDiodes.bypass = this.bypassed.has('ts-clipping-diodes')

    this.source.setParam(sample)
    const incident = this.source.reflect()
    this.clippingRoot.accept(incident)
    const reflected = this.clippingRoot.reflect()
    this.source.accept(reflected)

    if (this.bypassed.has('ts-input-resistor')) {
      return sample
    }

    return this.clippingDiodes.getVoltage()
  }

  private processTone(sample: number): number {
    if (this.bypassed.has('ts-tone-cap') || this.bypassed.has('ts-tone-resistor') || this.bypassed.has('ts-tone-pot')) {
      return sample
    }

    const resistance = mapToneToResistance(this.tone)
    const cutoffHz = 1 / (2 * Math.PI * resistance * TONE_CAPACITANCE)
    const alpha = Math.exp((-2 * Math.PI * cutoffHz) / this.sampleRateHz)
    this.toneState = (1 - alpha) * sample + alpha * this.toneState
    return this.toneState
  }

  processSample(sample: number): number {
    const coupled = this.processInputCoupling(sample)
    const clipped = this.processClipping(coupled)
    const toned = this.processTone(clipped)
    if (this.bypassed.has('ts-volume')) {
      return toned
    }
    return toned * this.level
  }
}

class WDFProcessor extends AudioWorkletProcessor {
  private graph: TubeScreamerWDFGraph | null = null

  constructor() {
    super()
    this.port.onmessage = (event: MessageEvent<WDFMessage>) => {
      this.handleMessage(event.data)
    }
  }

  private handleMessage(message: WDFMessage): void {
    if (message.type === 'setup') {
      this.graph = new TubeScreamerWDFGraph(message.config)
      return
    }

    if (!this.graph) {
      return
    }

    if (message.type === 'param') {
      this.graph.setParameter(message.paramId, message.value)
      return
    }

    this.graph.setBypassed(message.componentId, message.bypassed)
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const inputChannel = inputs[0]?.[0]
    const outputChannel = outputs[0]?.[0]

    if (!outputChannel) {
      return true
    }

    if (!inputChannel) {
      outputChannel.fill(0)
      return true
    }

    if (!this.graph) {
      outputChannel.set(inputChannel)
      return true
    }

    for (let i = 0; i < inputChannel.length; i += 1) {
      outputChannel[i] = this.graph.processSample(inputChannel[i])
    }

    return true
  }
}

registerProcessor('wdf-processor', WDFProcessor)
