export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const createCurve = (fn: (x: number) => number, samples = 2048) => {
  const curve = new Float32Array(samples)
  for (let i = 0; i < samples; i += 1) {
    const x = (i / (samples - 1)) * 2 - 1
    curve[i] = clamp(fn(x), -1, 1)
  }
  return curve
}
