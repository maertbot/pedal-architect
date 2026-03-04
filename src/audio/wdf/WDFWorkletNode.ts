import type {
  TubeScreamerWDFConfig,
  WDFBypassMessage,
  WDFLevelsMessage,
  WDFParamMessage,
  WDFSetupMessage,
  WDFValueMultiplierMessage,
} from './protocol.js'

export class WDFWorkletNode extends AudioWorkletNode {
  private levels: Record<string, number> = {}

  private levelsCallbacks = new Set<(levels: Record<string, number>) => void>()

  constructor(context: AudioContext, config: TubeScreamerWDFConfig) {
    super(context, 'wdf-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    })

    const setup: WDFSetupMessage = {
      type: 'setup',
      circuit: 'tube-screamer-ts808',
      config,
    }
    this.port.postMessage(setup)

    this.port.onmessage = (event: MessageEvent<WDFLevelsMessage>) => {
      if (event.data?.type !== 'levels') return
      this.levels = event.data.levels
      this.levelsCallbacks.forEach((callback) => callback(this.levels))
    }
  }

  static async create(context: AudioContext, config: TubeScreamerWDFConfig): Promise<WDFWorkletNode> {
    const processorUrl = new URL('./WDFProcessor.js', import.meta.url).href
    await context.audioWorklet.addModule(processorUrl)
    return new WDFWorkletNode(context, config)
  }

  setParameter(paramId: string, value: number): void {
    const message: WDFParamMessage = {
      type: 'param',
      paramId,
      value,
    }
    this.port.postMessage(message)
  }

  bypassComponent(componentId: string, bypassed: boolean): void {
    const message: WDFBypassMessage = {
      type: 'bypass',
      componentId,
      bypassed,
    }
    this.port.postMessage(message)
  }

  setComponentValueMultiplier(componentId: string, multiplier: number): void {
    const message: WDFValueMultiplierMessage = {
      type: 'valueMultiplier',
      componentId,
      multiplier,
    }
    this.port.postMessage(message)
  }

  onLevels(callback: (levels: Record<string, number>) => void): void {
    this.levelsCallbacks.add(callback)
  }

  getComponentLevels(): Record<string, number> {
    return this.levels
  }
}
