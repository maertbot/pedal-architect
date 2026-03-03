import { useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'

interface RotaryKnobProps {
  value: number
  min: number
  max: number
  label: string
  unit?: string
  onChange: (value: number) => void
  onInteract?: () => void
}

const SWEEP = 270
const START_ANGLE = -135

export function RotaryKnob({ value, min, max, label, unit = '', onChange, onInteract }: RotaryKnobProps) {
  const [active, setActive] = useState(false)
  const startY = useRef(0)
  const startValue = useRef(value)

  const normalized = (value - min) / (max - min)
  const angle = START_ANGLE + normalized * SWEEP
  const theta = (angle * Math.PI) / 180

  const display = useMemo(() => {
    if (unit === 'Hz') {
      return value >= 1000 ? `${(value / 1000).toFixed(1)}kHz` : `${Math.round(value)}Hz`
    }
    return `${value.toFixed(value < 10 ? 2 : 1)}${unit}`
  }, [unit, value])

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    startY.current = event.clientY
    startValue.current = value
    setActive(true)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!active) return
    const delta = (startY.current - event.clientY) * (max - min) * 0.0038
    const next = Math.min(max, Math.max(min, startValue.current + delta))
    onInteract?.()
    onChange(next)
  }

  const handlePointerUp = () => setActive(false)

  return (
    <div className="rotary-knob" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      <svg width="86" height="86" viewBox="0 0 86 86">
        <circle cx="43" cy="43" r="37" className={active ? 'knob-ring active' : 'knob-ring'} />
        <circle cx="43" cy="43" r="31" className="knob-body" />
        <g>
          {Array.from({ length: 13 }).map((_, index) => {
            const markAngle = ((START_ANGLE + (SWEEP / 12) * index) * Math.PI) / 180
            const x1 = 43 + Math.cos(markAngle) * 34
            const y1 = 43 + Math.sin(markAngle) * 34
            const x2 = 43 + Math.cos(markAngle) * 38
            const y2 = 43 + Math.sin(markAngle) * 38
            return <line key={markAngle} x1={x1} y1={y1} x2={x2} y2={y2} className="knob-mark" />
          })}
        </g>
        <line
          x1="43"
          y1="43"
          x2={43 + Math.cos(theta) * 22}
          y2={43 + Math.sin(theta) * 22}
          className="knob-pointer"
        />
      </svg>
      <div className="knob-label">{label}</div>
      <div className="knob-readout">{display}</div>
    </div>
  )
}
