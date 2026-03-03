import type { CircuitModel } from '../../audio/types'
import { RotaryKnob } from '../shared/RotaryKnob'

interface ParameterControlsProps {
  circuit: CircuitModel
  values: Record<string, number>
  onChange: (parameterId: string, value: number) => void
}

export function ParameterControls({ circuit, values, onChange }: ParameterControlsProps) {
  return (
    <section className="panel param-controls">
      <div className="panel-title">PARAMETER STRIP</div>
      <div className="knob-row">
        {circuit.parameters.map((parameter) => (
          <RotaryKnob
            key={parameter.id}
            value={values[parameter.id] ?? parameter.default}
            min={parameter.min}
            max={parameter.max}
            label={parameter.label}
            unit={parameter.unit}
            onInteract={() => undefined}
            onChange={(next) => onChange(parameter.id, next)}
          />
        ))}
      </div>
    </section>
  )
}
