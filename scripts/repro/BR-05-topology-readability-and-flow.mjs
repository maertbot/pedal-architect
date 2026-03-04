#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const cssPath = path.join(repoRoot, 'src/index.css')
const topologyPath = path.join(repoRoot, 'src/components/circuit-lab/CircuitTopology.tsx')

const css = fs.readFileSync(cssPath, 'utf8')
const topology = fs.readFileSync(topologyPath, 'utf8')

function extractFontSize(selector) {
  const rx = new RegExp(`\\${selector}\\s*\\{[\\s\\S]*?font-size:\\s*([0-9.]+)px`, 'm')
  const match = css.match(rx)
  return match ? Number(match[1]) : null
}

const stageLabelSize = extractFontSize('.stage-label')
const componentLabelSize = extractFontSize('.component-label')
const componentValueSize = extractFontSize('.component-value')

const failures = []

if (stageLabelSize == null || stageLabelSize < 12) {
  failures.push(`stage-label font-size too small: ${stageLabelSize ?? 'missing'} (min 12px)`) 
}
if (componentLabelSize == null || componentLabelSize < 10) {
  failures.push(`component-label font-size too small: ${componentLabelSize ?? 'missing'} (min 10px)`)
}
if (componentValueSize == null || componentValueSize < 9) {
  failures.push(`component-value font-size too small: ${componentValueSize ?? 'missing'} (min 9px)`)
}

if (topology.includes('className="signal-trace"')) {
  failures.push('topology uses global straight signal-trace line; expected flow along circuit connections')
}

if (!topology.includes('className="topology-connection signal-flow-path"')) {
  failures.push('topology connections are not marked as signal-flow-path for animated circuit-path flow')
}

if (failures.length > 0) {
  console.error('BR-05 repro check failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('BR-05 repro check passed')
