const SAMPLE_RATE = 48_000
const TWO_PI = Math.PI * 2

const toneMin = 350
const toneMax = 1600

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function toDb(linear) {
  return 20 * Math.log10(Math.max(1e-9, linear))
}

function complexAdd(a, b) {
  return { re: a.re + b.re, im: a.im + b.im }
}

function complexMul(a, b) {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }
}

function complexScale(a, scalar) {
  return { re: a.re * scalar, im: a.im * scalar }
}

function complexAbs(a) {
  return Math.hypot(a.re, a.im)
}

function zPowers(freq) {
  const w = TWO_PI * (freq / SAMPLE_RATE)
  const z1 = { re: Math.cos(-w), im: Math.sin(-w) }
  const z2 = { re: Math.cos(-2 * w), im: Math.sin(-2 * w) }
  return { z1, z2 }
}

function complexDiv(a, b) {
  const denom = b.re * b.re + b.im * b.im
  return {
    re: (a.re * b.re + a.im * b.im) / denom,
    im: (a.im * b.re - a.re * b.im) / denom,
  }
}

function evaluateBiquad({ b0, b1, b2, a1, a2 }, freq) {
  const { z1, z2 } = zPowers(freq)
  const num = complexAdd(
    { re: b0, im: 0 },
    complexAdd(complexScale(z1, b1), complexScale(z2, b2)),
  )
  const den = complexAdd(
    { re: 1, im: 0 },
    complexAdd(complexScale(z1, a1), complexScale(z2, a2)),
  )
  return complexDiv(num, den)
}

function makeLowpass(fc, q) {
  const w0 = TWO_PI * (fc / SAMPLE_RATE)
  const cos = Math.cos(w0)
  const sin = Math.sin(w0)
  const alpha = sin / (2 * q)
  const b0 = (1 - cos) / 2
  const b1 = 1 - cos
  const b2 = (1 - cos) / 2
  const a0 = 1 + alpha
  const a1 = -2 * cos
  const a2 = 1 - alpha
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 }
}

function makeHighpass(fc, q) {
  const w0 = TWO_PI * (fc / SAMPLE_RATE)
  const cos = Math.cos(w0)
  const sin = Math.sin(w0)
  const alpha = sin / (2 * q)
  const b0 = (1 + cos) / 2
  const b1 = -(1 + cos)
  const b2 = (1 + cos) / 2
  const a0 = 1 + alpha
  const a1 = -2 * cos
  const a2 = 1 - alpha
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 }
}

function makePeaking(fc, q, gainDb) {
  const w0 = TWO_PI * (fc / SAMPLE_RATE)
  const cos = Math.cos(w0)
  const sin = Math.sin(w0)
  const a = 10 ** (gainDb / 40)
  const alpha = sin / (2 * q)
  const b0 = 1 + alpha * a
  const b1 = -2 * cos
  const b2 = 1 - alpha * a
  const a0 = 1 + alpha / a
  const a1 = -2 * cos
  const a2 = 1 - alpha / a
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 }
}

function computeToneState(toneHz) {
  const clamped = clamp(toneHz, toneMin, toneMax)
  const toneNorm = (clamped - toneMin) / (toneMax - toneMin)
  const fromCenter = Math.abs(toneNorm - 0.5) * 2
  return {
    lpFc: 620 + toneNorm * 420,
    hpFc: 700 + toneNorm * 900,
    lpGain: 0.18 + (1 - toneNorm) * 0.82,
    hpGain: 0.18 + toneNorm * 0.82,
    notchFc: 920 + (toneNorm - 0.5) * 260,
    notchQ: 0.8 + (1 - fromCenter) * 0.35,
    notchGainDb: -4 - (1 - fromCenter) * 8,
  }
}

function magnitudeAt(toneHz, freqHz) {
  const state = computeToneState(toneHz)
  const lp = evaluateBiquad(makeLowpass(state.lpFc, 0.55), freqHz)
  const hp = evaluateBiquad(makeHighpass(state.hpFc, 0.55), freqHz)
  const notch = evaluateBiquad(makePeaking(state.notchFc, state.notchQ, state.notchGainDb), freqHz)

  const mixed = complexAdd(complexScale(lp, state.lpGain), complexScale(hp, state.hpGain))
  const withNotch = complexMul(mixed, notch)
  return complexAbs(withNotch) * 0.9
}

function sampleTriplet(toneHz) {
  const low = toDb(magnitudeAt(toneHz, 120))
  const mid = toDb(magnitudeAt(toneHz, 1000))
  const high = toDb(magnitudeAt(toneHz, 3500))
  return { low, mid, high }
}

function assertCondition(condition, message, failures) {
  if (!condition) failures.push(message)
}

const failures = []
const center = sampleTriplet(850)
const bass = sampleTriplet(350)
const treble = sampleTriplet(1600)

assertCondition(center.low - center.mid >= 5, 'Center tone: low should exceed mid by >= 5 dB', failures)
assertCondition(center.high - center.mid >= 5, 'Center tone: high should exceed mid by >= 5 dB', failures)
assertCondition(bass.low - bass.high >= 4, 'Bass-side tone: low should exceed high by >= 4 dB', failures)
assertCondition(treble.high - treble.low >= 4, 'Treble-side tone: high should exceed low by >= 4 dB', failures)

console.log('Big Muff response check')
console.log(`Center (850 Hz)  low=${center.low.toFixed(1)} mid=${center.mid.toFixed(1)} high=${center.high.toFixed(1)} dB`)
console.log(`Bass   (350 Hz)  low=${bass.low.toFixed(1)} mid=${bass.mid.toFixed(1)} high=${bass.high.toFixed(1)} dB`)
console.log(`Treble (1600 Hz) low=${treble.low.toFixed(1)} mid=${treble.mid.toFixed(1)} high=${treble.high.toFixed(1)} dB`)

if (failures.length > 0) {
  console.error('\nValidation failed:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('\nValidation passed.')
