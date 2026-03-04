import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

type FakeMessage = { type: string; [key: string]: unknown }

type CircuitFixture = {
  name: string
  importPath: string
  exportName: string
  bypassId: string
  multiplierId: string
}

type RuntimeControls = {
  bypassComponent?: (componentId: string, bypassed: boolean) => void
  setComponentValueMultiplier?: (componentId: string, multiplier: number) => void
  getComponentLevels?: () => Record<string, number>
  onLevels?: (callback: (levels: Record<string, number>) => void) => void
}

const fixtures: CircuitFixture[] = [
  {
    name: 'tube-screamer-wdf',
    importPath: '../../src/audio/wdf/circuits/tubeScreamerWDF.js',
    exportName: 'tubeScreamerWDF',
    bypassId: 'ts-clipping-diodes',
    multiplierId: 'ts-input-cap',
  },
  {
    name: 'big-muff-wdf',
    importPath: '../../src/audio/wdf/circuits/bigMuffWDF.js',
    exportName: 'bigMuffWDF',
    bypassId: 'bm-clip2-diodes',
    multiplierId: 'bm-tone-lp-cap',
  },
  {
    name: 'klon-centaur-wdf',
    importPath: '../../src/audio/wdf/circuits/klonCentaurWDF.js',
    exportName: 'klonCentaurWDF',
    bypassId: 'kl-clean-path',
    multiplierId: 'kl-post-filter-c',
  },
]

describe('BR-01_wdf-runtime-controls', () => {
  it('exposes component control methods for all WDF circuits and forwards control messages', async () => {
    const posted: FakeMessage[] = []
    const original = globalThis.AudioWorkletNode

    class FakeAudioWorkletNode {
      port = {
        postMessage: (message: FakeMessage) => {
          posted.push(message)
        },
      }

      disconnect(): void {}
    }

    Object.assign(globalThis, {
      AudioWorkletNode: FakeAudioWorkletNode,
    })

    try {
      for (const fixture of fixtures) {
        const module = await import(fixture.importPath)
        const circuit = module[fixture.exportName] as { create: (ctx: AudioContext) => RuntimeControls }
        const runtime = circuit.create({ sampleRate: 44_100 } as AudioContext)

        // BR-01 / PRD Phase 2 intent: Component info panel controls must alter audio engine in real-time.
        assert.equal(typeof runtime.bypassComponent, 'function')
        assert.equal(typeof runtime.setComponentValueMultiplier, 'function')
        assert.equal(typeof runtime.getComponentLevels, 'function')
        assert.equal(typeof runtime.onLevels, 'function')

        runtime.bypassComponent?.(fixture.bypassId, true)
        runtime.setComponentValueMultiplier?.(fixture.multiplierId, 2)
      }

      assert.ok(posted.some((message) => message.type === 'bypass' && message.componentId === 'ts-clipping-diodes'))
      assert.ok(posted.some((message) => message.type === 'bypass' && message.componentId === 'bm-clip2-diodes'))
      assert.ok(posted.some((message) => message.type === 'bypass' && message.componentId === 'kl-clean-path'))
      assert.ok(posted.some((message) => message.type === 'valueMultiplier' && message.componentId === 'ts-input-cap'))
      assert.ok(posted.some((message) => message.type === 'valueMultiplier' && message.componentId === 'bm-tone-lp-cap'))
      assert.ok(posted.some((message) => message.type === 'valueMultiplier' && message.componentId === 'kl-post-filter-c'))
    } finally {
      if (original) {
        Object.assign(globalThis, { AudioWorkletNode: original })
      } else {
        Reflect.deleteProperty(globalThis, 'AudioWorkletNode')
      }
    }
  })
})
