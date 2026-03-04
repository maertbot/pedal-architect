import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { pathToFileURL } from 'node:url'

describe('BR-02_wdf-processor-test-harness', () => {
  it('imports WDFProcessor module in node test runtime and exposes __test factory', async () => {
    const mod = await import(pathToFileURL(`${process.cwd()}/src/audio/wdf/WDFProcessor.js`).href)
    assert.equal(typeof mod.__test?.createGraphFromConfig, 'function')
  })
})
