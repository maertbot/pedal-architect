import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

type FakeMessage = { type: string; [key: string]: unknown }

const withAudioWorkletNode = async <T>(run: () => Promise<T>): Promise<T> => {
  const original = globalThis.AudioWorkletNode

  if (!original) {
    class PlaceholderAudioWorkletNode {
      port = { postMessage: () => {} }

      disconnect(): void {}
    }

    Object.assign(globalThis, { AudioWorkletNode: PlaceholderAudioWorkletNode })
  }

  try {
    return await run()
  } finally {
    if (!original) {
      Reflect.deleteProperty(globalThis, 'AudioWorkletNode')
    }
  }
}

describe('tubeScreamerWDF circuit', () => {
  it('creates a runtime with a mock AudioWorkletNode', async () => {
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
      const { tubeScreamerWDF } = await import('../../src/audio/wdf/circuits/tubeScreamerWDF.js')
      const runtime = tubeScreamerWDF.create({ sampleRate: 44_100 } as AudioContext)
      assert.equal(runtime.input, runtime.output)

      runtime.setParameter('drive', 0.9)
      assert.ok(posted.some((message) => message.type === 'setup'))
      assert.ok(posted.some((message) => message.type === 'param' && message.paramId === 'drive'))
    } finally {
      if (original) {
        Object.assign(globalThis, { AudioWorkletNode: original })
      } else {
        Reflect.deleteProperty(globalThis, 'AudioWorkletNode')
      }
    }
  })

  it('exports complete metadata for all Phase 1 TS808 components', async () => {
    const { tubeScreamerWDFComponents } = await withAudioWorkletNode(async () => import('../../src/audio/wdf/circuits/tubeScreamerWDF.js'))
    assert.equal(tubeScreamerWDFComponents.length, 9)

    for (const component of tubeScreamerWDFComponents) {
      assert.ok(component.id.length > 0)
      assert.ok(component.name.length > 0)
      assert.ok(component.stage.length > 0)
      assert.ok(component.description.length > 0)
      assert.ok(component.whyItMatters.length > 0)
      assert.ok(component.whatHappensWithout.length > 0)
    }
  })

  it('maps drive parameter into the expected feedback resistance range', async () => {
    const { mapDriveToResistance } = await withAudioWorkletNode(async () => import('../../src/audio/wdf/circuits/tubeScreamerWDF.js'))
    assert.equal(mapDriveToResistance(1), 51_000)
    assert.equal(mapDriveToResistance(0), 551_000)
    assert.equal(mapDriveToResistance(-1), 551_000)
    assert.equal(mapDriveToResistance(2), 51_000)
  })
})
