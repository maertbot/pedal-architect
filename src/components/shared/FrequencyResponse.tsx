import { useEffect, useRef } from 'react'
import { computeFrequencyResponse } from '../../audio/frequencyResponse'
import type { FilterNodeDescriptor, PhaserConfig } from '../../audio/types'

interface FrequencyResponseProps {
  filterNodes: FilterNodeDescriptor[]
  phaserConfig?: PhaserConfig
  analyser: AnalyserNode | null
  isPlaying: boolean
  circuitId: string
  circuitName: string
  hasNoToneControl?: boolean
}

const MIN_DB = -24
const MAX_DB = 12
const GRID_FREQS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]
const MOBILE_GRID_FREQS = [100, 1000, 10000]

function toLabel(freq: number): string {
  if (freq >= 1000) {
    const k = freq / 1000
    return Number.isInteger(k) ? `${k}K` : `${k.toFixed(1)}K`
  }
  return `${freq}`
}

function formatReadout(freq: number, db: number): string {
  return `${freq >= 1000 ? `${(freq / 1000).toFixed(1)} kHz` : `${Math.round(freq)} Hz`} | ${db >= 0 ? '+' : ''}${db.toFixed(1)} dB`
}

function getAnnotationIndex(circuitId: string, magnitudesDb: Float32Array, frequencies: Float32Array): { label: string; index: number } | null {
  if (magnitudesDb.length === 0) return null

  let minIndex = 0
  let maxIndex = 0
  for (let i = 1; i < magnitudesDb.length; i += 1) {
    if (magnitudesDb[i] < magnitudesDb[minIndex]) minIndex = i
    if (magnitudesDb[i] > magnitudesDb[maxIndex]) maxIndex = i
  }

  if (circuitId === 'big-muff' && magnitudesDb[minIndex] < -6) {
    return { label: 'MID SCOOP', index: minIndex }
  }

  if (circuitId === 'tube-screamer' && magnitudesDb[maxIndex] > -2) {
    return { label: 'MID HUMP', index: maxIndex }
  }

  if (circuitId === 'rat') {
    const cutoffIndex = magnitudesDb.findIndex((db, index) => frequencies[index] > 700 && db <= -3)
    if (cutoffIndex > 0) return { label: 'FILTER ROLLOFF', index: cutoffIndex }
  }

  if (circuitId === 'klon-centaur' && magnitudesDb[maxIndex] > 1) {
    return { label: 'TREBLE BOOST', index: maxIndex }
  }

  if (circuitId === 'phase-ninety' && magnitudesDb[minIndex] < -4) {
    return { label: 'NOTCH', index: minIndex }
  }

  return null
}

export function FrequencyResponse({
  filterNodes,
  phaserConfig,
  analyser,
  isPlaying,
  circuitId,
  circuitName,
  hasNoToneControl,
}: FrequencyResponseProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const hoverXRef = useRef<number | null>(null)
  const touchClearTimerRef = useRef<number | null>(null)
  const spectrumOpacityRef = useRef(0)
  const circuitTransitionStartRef = useRef<number>(performance.now())
  const lastCircuitRef = useRef(circuitId)

  useEffect(() => {
    if (lastCircuitRef.current !== circuitId) {
      lastCircuitRef.current = circuitId
      circuitTransitionStartRef.current = performance.now()
    }
  }, [circuitId])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let rafId = 0
    const fftBuffer = analyser ? new Uint8Array(analyser.frequencyBinCount) : null

    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const renderWidth = Math.max(1, Math.floor(width * dpr))
      const renderHeight = Math.max(1, Math.floor(height * dpr))
      if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
        canvas.width = renderWidth
        canvas.height = renderHeight
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#020a04'
      ctx.fillRect(0, 0, width, height)

      const isMobile = window.innerWidth <= 767
      const isVerySmall = window.innerWidth < 480
      const leftPadding = isMobile ? 34 : 44
      const rightPadding = 14
      const topPadding = 12
      const bottomPadding = isMobile ? 24 : 28
      const plotX = leftPadding
      const plotY = topPadding
      const plotWidth = width - leftPadding - rightPadding
      const plotHeight = height - topPadding - bottomPadding
      const dbRange = MAX_DB - MIN_DB

      if (plotWidth <= 0 || plotHeight <= 0) {
        rafId = requestAnimationFrame(draw)
        return
      }

      const freqToX = (freq: number) => {
        const normalized = Math.log10(freq / 20) / Math.log10(20000 / 20)
        return plotX + normalized * plotWidth
      }
      const xToFreq = (x: number) => {
        const normalized = Math.max(0, Math.min(1, (x - plotX) / plotWidth))
        return 20 * 1000 ** normalized
      }
      const dbToY = (db: number) => plotY + ((MAX_DB - db) / dbRange) * plotHeight

      ctx.strokeStyle = 'rgba(40, 120, 60, 0.35)'
      ctx.lineWidth = 1

      const freqTicks = isMobile ? MOBILE_GRID_FREQS : GRID_FREQS
      freqTicks.forEach((freq) => {
        const x = freqToX(freq)
        ctx.beginPath()
        ctx.moveTo(x, plotY)
        ctx.lineTo(x, plotY + plotHeight)
        ctx.stroke()
      })

      const dbStep = isMobile ? 12 : 6
      for (let db = MIN_DB; db <= MAX_DB; db += dbStep) {
        const y = dbToY(db)
        ctx.beginPath()
        ctx.moveTo(plotX, y)
        ctx.lineTo(plotX + plotWidth, y)
        ctx.stroke()
      }

      const zeroY = dbToY(0)
      ctx.save()
      ctx.setLineDash([4, 4])
      ctx.strokeStyle = 'rgba(40, 120, 60, 0.6)'
      ctx.beginPath()
      ctx.moveTo(plotX, zeroY)
      ctx.lineTo(plotX + plotWidth, zeroY)
      ctx.stroke()
      ctx.restore()

      const response = computeFrequencyResponse(filterNodes, phaserConfig)
      const { frequencies, magnitudesDb, hasAnalytical } = response

      const now = performance.now()
      const targetSpectrumOpacity = isPlaying ? 1 : 0
      const fadeRate = isPlaying ? 0.08 : 0.045
      spectrumOpacityRef.current += (targetSpectrumOpacity - spectrumOpacityRef.current) * fadeRate

      if (fftBuffer && analyser && spectrumOpacityRef.current > 0.01) {
        analyser.getByteFrequencyData(fftBuffer)
        const sampleRate = analyser.context.sampleRate
        const binMax = fftBuffer.length - 1

        ctx.save()
        ctx.globalAlpha = Math.max(0, Math.min(1, spectrumOpacityRef.current))
        ctx.fillStyle = 'rgba(32, 255, 96, 0.12)'
        ctx.strokeStyle = 'rgba(32, 255, 96, 0.3)'
        ctx.lineWidth = 1
        ctx.beginPath()

        for (let px = 0; px <= Math.floor(plotWidth); px += 1) {
          const x = plotX + px
          const freq = xToFreq(x)
          const bin = (freq / (sampleRate / 2)) * binMax
          const low = Math.max(0, Math.min(binMax, Math.floor(bin)))
          const high = Math.max(0, Math.min(binMax, Math.ceil(bin)))
          const t = bin - low
          const value = fftBuffer[low] * (1 - t) + fftBuffer[high] * t
          const db = (value / 255) * 48 - 24
          const y = dbToY(db)
          if (px === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }

        const endX = plotX + plotWidth
        const bottomY = plotY + plotHeight
        ctx.lineTo(endX, bottomY)
        ctx.lineTo(plotX, bottomY)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.restore()
      }

      if (hasAnalytical && !hasNoToneControl) {
        const transitionProgress = Math.min(1, (now - circuitTransitionStartRef.current) / 400)
        const transitionWidth = plotWidth * transitionProgress

        ctx.save()
        ctx.beginPath()
        ctx.rect(plotX, plotY, transitionWidth, plotHeight)
        ctx.clip()

        ctx.strokeStyle = 'rgba(32, 255, 96, 0.45)'
        ctx.shadowColor = 'rgba(32, 255, 96, 0.8)'
        ctx.shadowBlur = 8
        ctx.lineWidth = 4
        ctx.beginPath()

        for (let i = 0; i < frequencies.length; i += 1) {
          const x = freqToX(frequencies[i])
          const y = dbToY(Math.max(MIN_DB, Math.min(MAX_DB, magnitudesDb[i])))
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()

        ctx.shadowBlur = 0
        ctx.strokeStyle = '#20ff60'
        ctx.lineWidth = 2
        ctx.beginPath()
        for (let i = 0; i < frequencies.length; i += 1) {
          const x = freqToX(frequencies[i])
          const y = dbToY(Math.max(MIN_DB, Math.min(MAX_DB, magnitudesDb[i])))
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.restore()

        const annotation = getAnnotationIndex(circuitId, magnitudesDb, frequencies)
        if (annotation && !isVerySmall) {
          const x = freqToX(frequencies[annotation.index])
          const y = dbToY(magnitudesDb[annotation.index])
          const labelX = Math.min(plotX + plotWidth - 84, x + 8)
          const labelY = Math.max(plotY + 10, y - 10)

          ctx.strokeStyle = '#ff2020'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(labelX, labelY + 2)
          ctx.lineTo(x, y)
          ctx.stroke()

          ctx.fillStyle = '#ff2020'
          ctx.font = '8px "JetBrains Mono", monospace'
          ctx.fillText(annotation.label, labelX, labelY)
        }
      }

      ctx.font = '9px "JetBrains Mono", monospace'
      ctx.fillStyle = '#ffb020'
      freqTicks.forEach((freq) => {
        const x = freqToX(freq)
        ctx.fillText(toLabel(freq), x - 9, plotY + plotHeight + (isMobile ? 12 : 14))
      })

      ctx.fillStyle = '#888'
      for (let db = MIN_DB; db <= MAX_DB; db += dbStep) {
        const y = dbToY(db)
        ctx.fillText(`${db}dB`, 2, y + 3)
      }

      ctx.fillStyle = '#ffb020'
      ctx.font = '10px "JetBrains Mono", monospace'
      ctx.fillText(circuitName.toUpperCase(), plotX + 2, plotY + 10)

      if (hasNoToneControl) {
        ctx.fillStyle = '#555'
        ctx.font = '11px "JetBrains Mono", monospace'
        ctx.fillText('No tone control - live spectrum only', plotX + 8, plotY + plotHeight * 0.52)
      }

      if (hoverXRef.current !== null && hasAnalytical) {
        const crossX = Math.max(plotX, Math.min(plotX + plotWidth, hoverXRef.current))
        const freq = xToFreq(crossX)

        let nearestIndex = 0
        let nearestDistance = Number.POSITIVE_INFINITY
        for (let i = 0; i < frequencies.length; i += 1) {
          const distance = Math.abs(frequencies[i] - freq)
          if (distance < nearestDistance) {
            nearestDistance = distance
            nearestIndex = i
          }
        }

        const db = magnitudesDb[nearestIndex]
        const y = dbToY(db)

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(crossX, plotY)
        ctx.lineTo(crossX, plotY + plotHeight)
        ctx.moveTo(plotX, y)
        ctx.lineTo(plotX + plotWidth, y)
        ctx.stroke()

        const tooltip = formatReadout(freq, db)
        ctx.font = '10px "JetBrains Mono", monospace'
        const textWidth = ctx.measureText(tooltip).width
        const boxWidth = textWidth + 10
        const boxHeight = 18
        const boxX = Math.min(plotX + plotWidth - boxWidth - 2, crossX + 8)
        const boxY = Math.max(plotY + 2, y - 24)

        ctx.fillStyle = '#1a1a1a'
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight)
        ctx.strokeStyle = '#333'
        ctx.strokeRect(boxX, boxY, boxWidth, boxHeight)
        ctx.fillStyle = '#e8e8e8'
        ctx.fillText(tooltip, boxX + 5, boxY + 12)
      }

      rafId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(rafId)
  }, [analyser, circuitId, circuitName, filterNodes, hasNoToneControl, isPlaying, phaserConfig])

  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768

  return (
    <div className="freq-response-shell">
      <canvas
        className="freq-response-canvas"
        ref={canvasRef}
        width={820}
        height={200}
        onMouseMove={(event) => {
          if (!isDesktop) return
          const bounds = event.currentTarget.getBoundingClientRect()
          hoverXRef.current = event.clientX - bounds.left
        }}
        onMouseLeave={() => {
          hoverXRef.current = null
        }}
        onTouchStart={(event) => {
          const touch = event.touches[0]
          if (!touch) return
          const bounds = event.currentTarget.getBoundingClientRect()
          hoverXRef.current = touch.clientX - bounds.left
          if (touchClearTimerRef.current !== null) {
            window.clearTimeout(touchClearTimerRef.current)
            touchClearTimerRef.current = null
          }
        }}
        onTouchMove={(event) => {
          const touch = event.touches[0]
          if (!touch) return
          const bounds = event.currentTarget.getBoundingClientRect()
          hoverXRef.current = touch.clientX - bounds.left
        }}
        onTouchEnd={() => {
          if (touchClearTimerRef.current !== null) window.clearTimeout(touchClearTimerRef.current)
          touchClearTimerRef.current = window.setTimeout(() => {
            hoverXRef.current = null
          }, 1000)
        }}
      />
    </div>
  )
}
