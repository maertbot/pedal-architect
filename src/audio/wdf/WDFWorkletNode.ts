import type { TubeScreamerWDFConfig, WDFBypassMessage, WDFParamMessage, WDFSetupMessage } from './protocol.js'

export class WDFWorkletNode extends AudioWorkletNode {
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
}
