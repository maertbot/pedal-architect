import { useEffect, useRef } from 'react'

interface OscilloscopeProps {
  analyser: AnalyserNode | null
  mode: 'waveform' | 'fft'
}

export function Oscilloscope({ analyser, mode }: OscilloscopeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!analyser || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let rafId = 0
    const timeBuffer = new Float32Array(analyser.fftSize)
    const fftBuffer = new Uint8Array(analyser.frequencyBinCount)

    const drawGrid = (width: number, height: number) => {
      ctx.strokeStyle = 'rgba(40, 120, 60, 0.45)'
      ctx.lineWidth = 1
      for (let x = 0; x <= width; x += width / 10) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y <= height; y += height / 8) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
    }

    const draw = () => {
      const width = canvas.width
      const height = canvas.height
      ctx.fillStyle = '#020a04'
      ctx.fillRect(0, 0, width, height)
      drawGrid(width, height)

      if (mode === 'waveform') {
        analyser.getFloatTimeDomainData(timeBuffer)
        const step = Math.max(1, Math.floor(timeBuffer.length / width))

        ctx.strokeStyle = 'rgba(32, 255, 96, 0.4)'
        ctx.lineWidth = 4
        ctx.beginPath()

        for (let x = 0; x < width; x += 1) {
          const y = (0.5 + timeBuffer[x * step] * 0.38) * height
          if (x === 0) ctx.moveTo(0, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()

        ctx.strokeStyle = '#20ff60'
        ctx.lineWidth = 1.6
        ctx.beginPath()
        for (let x = 0; x < width; x += 1) {
          const y = (0.5 + timeBuffer[x * step] * 0.38) * height
          if (x === 0) ctx.moveTo(0, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      } else {
        analyser.getByteFrequencyData(fftBuffer)
        const binWidth = width / fftBuffer.length

        ctx.fillStyle = 'rgba(32, 255, 96, 0.25)'
        for (let i = 0; i < fftBuffer.length; i += 1) {
          const barHeight = (fftBuffer[i] / 255) * height * 0.94
          ctx.fillRect(i * binWidth, height - barHeight, Math.max(1, binWidth), barHeight)
        }

        ctx.strokeStyle = '#20ff60'
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let i = 0; i < fftBuffer.length; i += 1) {
          const x = i * binWidth
          const y = height - (fftBuffer[i] / 255) * height * 0.94
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      rafId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(rafId)
  }, [analyser, mode])

  return (
    <div className="scope-shell">
      <canvas className="scope-canvas" ref={canvasRef} width={820} height={220} />
    </div>
  )
}
