#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const learnTabPath = path.join(process.cwd(), 'src/components/learn/LearnTab.tsx')
const learnTab = fs.readFileSync(learnTabPath, 'utf8')

const failures = []

const startLessonBlock = learnTab.match(/const startLesson = \(circuitId: string\) => \{([\s\S]*?)\n\s*\}/)
if (!startLessonBlock) {
  failures.push('could not locate startLesson function in LearnTab')
} else {
  const block = startLessonBlock[1]
  if (!block.includes('audioEngine.stop()')) {
    failures.push('startLesson does not stop currently playing audio')
  }
  if (block.includes('audioEngine.start(') || block.includes('await audioEngine.start(')) {
    failures.push('startLesson still auto-starts audio')
  }
}

if (failures.length) {
  console.error('BR-06 repro check failed:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('BR-06 repro check passed')
