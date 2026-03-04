import { CIRCUIT_MAP, CIRCUITS } from '../data/circuits'
import type { CircuitRuntime, FilterNodeDescriptor, PhaserConfig } from './types'

export type SamplePreset = 'strum' | 'single-note' | 'arpeggio' | 'power-chord'

const SAMPLE_FREQUENCIES: Record<SamplePreset, number[]> = {
  strum: [164.81, 220, 246.94, 329.63, 392, 493.88],
  'single-note': [329.63],
  arpeggio: [164.81, 220, 277.18, 329.63],
  'power-chord': [110, 164.81, 220],
}

export class AudioEngine {
  private context: AudioContext | null = null

  private source: AudioBufferSourceNode | null = null

  private inputGain: GainNode | null = null

  private outputGain: GainNode | null = null

  private analyser: AnalyserNode | null = null

  private circuitRuntime: CircuitRuntime | null = null

  private playing = false

  private currentCircuitId = CIRCUITS[0].id

  private currentPreset: SamplePreset = 'strum'

  private currentParameters = new Map<string, number>()

  async init(): Promise<void> {
    if (this.context) return

    this.context = new AudioContext({ latencyHint: 'interactive' })
    this.inputGain = new GainNode(this.context, { gain: 0 })
    this.outputGain = new GainNode(this.context, { gain: 0 })
    this.analyser = new AnalyserNode(this.context, {
      fftSize: 2048,
      smoothingTimeConstant: 0.86,
    })

    const processorUrl = new URL('./wdf/WDFProcessor.js', import.meta.url).href
    await this.context.audioWorklet.addModule(processorUrl)

    this.setCircuit(this.currentCircuitId)

    this.outputGain.connect(this.analyser)
    this.analyser.connect(this.context.destination)
  }

  async start(): Promise<void> {
    await this.init()
    if (!this.context || !this.inputGain || this.playing) return

    if (this.context.state === 'suspended') {
      await this.context.resume()
    }

    this.playing = true
    this.source = new AudioBufferSourceNode(this.context, {
      buffer: this.createSyntheticLoop(this.currentPreset),
      loop: true,
    })

    const now = this.context.currentTime
    const wdfStart = this.currentCircuitId.endsWith('-wdf')
    const inputRampSeconds = wdfStart ? 0.12 : 0.02
    const outputRampSeconds = wdfStart ? 0.16 : 0.045

    this.inputGain.gain.cancelScheduledValues(now)
    this.inputGain.gain.setValueAtTime(0, now)
    this.inputGain.gain.linearRampToValueAtTime(0.65, now + inputRampSeconds)

    if (this.outputGain) {
      this.outputGain.gain.cancelScheduledValues(now)
      this.outputGain.gain.setValueAtTime(0, now)
      this.outputGain.gain.linearRampToValueAtTime(0.95, now + outputRampSeconds)
    }

    this.source.connect(this.inputGain)
    this.source.start(now)
  }

  stop(): void {
    if (!this.source) {
      this.playing = false
      return
    }

    try {
      this.source.stop()
      this.source.disconnect()
    } catch {
      // Ignore node race during stop/start toggles.
    }
    this.source = null
    this.playing = false

    if (this.context && this.inputGain) {
      const now = this.context.currentTime
      this.inputGain.gain.cancelScheduledValues(now)
      this.inputGain.gain.setValueAtTime(0, now)

      if (this.outputGain) {
        this.outputGain.gain.cancelScheduledValues(now)
        this.outputGain.gain.setValueAtTime(0, now)
      }
    }
  }

  setCircuit(circuitId: string): void {
    if (!this.context || !this.inputGain || !this.outputGain) {
      this.currentCircuitId = circuitId
      return
    }

    const model = CIRCUIT_MAP[circuitId] ?? CIRCUITS[0]
    this.currentCircuitId = model.id

    this.inputGain.disconnect()
    this.circuitRuntime?.destroy?.()
    this.circuitRuntime?.output.disconnect()

    this.circuitRuntime = model.create(this.context)
    this.inputGain.connect(this.circuitRuntime.input)
    this.circuitRuntime.output.connect(this.outputGain)

    model.parameters.forEach((parameter) => {
      const value = this.currentParameters.get(`${model.id}.${parameter.id}`) ?? parameter.default
      this.circuitRuntime?.setParameter(parameter.id, value)
    })
  }

  setParameter(circuitId: string, parameterId: string, value: number): void {
    this.currentParameters.set(`${circuitId}.${parameterId}`, value)
    if (this.currentCircuitId !== circuitId || !this.circuitRuntime) return
    this.circuitRuntime.setParameter(parameterId, value)
  }

  setSamplePreset(preset: SamplePreset): void {
    this.currentPreset = preset
    const wasPlaying = this.playing
    if (wasPlaying) {
      this.stop()
      void this.start()
    }
  }

  isPlaying(): boolean {
    return this.playing
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser
  }

  getFilterNodes(): FilterNodeDescriptor[] {
    return this.circuitRuntime?.getFilterNodes?.() ?? []
  }

  getPhaserConfig(): PhaserConfig | undefined {
    return this.circuitRuntime?.getPhaserConfig?.()
  }

  getCurrentCircuitId(): string {
    return this.currentCircuitId
  }

  bypassWdfComponent(componentId: string, bypassed: boolean): void {
    this.circuitRuntime?.bypassComponent?.(componentId, bypassed)
  }

  setWdfComponentMultiplier(componentId: string, multiplier: number): void {
    this.circuitRuntime?.setComponentValueMultiplier?.(componentId, multiplier)
  }

  getWdfComponentLevels(): Record<string, number> {
    return this.circuitRuntime?.getComponentLevels?.() ?? {}
  }

  onWdfLevels(callback: (levels: Record<string, number>) => void): void {
    this.circuitRuntime?.onLevels?.(callback)
  }

  private createSyntheticLoop(preset: SamplePreset): AudioBuffer {
    if (!this.context) {
      throw new Error('AudioContext is not initialized')
    }

    const sampleRate = this.context.sampleRate
    const duration = 2.8
    const frameCount = Math.floor(sampleRate * duration)
    const buffer = this.context.createBuffer(1, frameCount, sampleRate)
    const channel = buffer.getChannelData(0)
    const notes = SAMPLE_FREQUENCIES[preset]

    for (let i = 0; i < frameCount; i += 1) {
      const time = i / sampleRate
      const loopPos = time % duration
      let value = 0

      notes.forEach((noteFreq, index) => {
        const patternOffset = preset === 'arpeggio' ? (index * 0.19) % duration : 0
        const hitTime = loopPos - patternOffset
        const normalizedHit = hitTime < 0 ? hitTime + duration : hitTime
        const envelope = Math.exp(-normalizedHit * 3.4)

        const saw = 2 * ((normalizedHit * noteFreq) % 1) - 1
        const body = Math.sin(2 * Math.PI * noteFreq * normalizedHit)
        const harmonic2 = Math.sin(2 * Math.PI * noteFreq * 2 * normalizedHit) * 0.35
        const harmonic3 = Math.sin(2 * Math.PI * noteFreq * 3 * normalizedHit) * 0.18
        const resonance = Math.sin(2 * Math.PI * 190 * normalizedHit) * 0.08
        value += (saw * 0.22 + body * 0.55 + harmonic2 + harmonic3 + resonance) * envelope
      })

      const attack = Math.min(1, loopPos / 0.02)
      const release = Math.min(1, (duration - loopPos) / 0.03)
      const crossfade = attack * release
      channel[i] = Math.tanh(value * 0.32) * crossfade
    }

    return buffer
  }
}

export const audioEngine = new AudioEngine()
