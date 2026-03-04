import { useMemo } from 'react'
import type { WDFComponentMeta } from '../../audio/wdf/types'
import type { LearnStep } from '../../data/learn/types'

interface ExperimentPanelProps {
  step: LearnStep
  component: WDFComponentMeta | null
  currentBypassed: boolean
  currentMultiplier: number
  onToggleBypass: (componentId: string) => void
  onSetMultiplier: (componentId: string, multiplier: number) => void
  onSetKnob: (paramId: string, value: number) => void
}

function nearestStep(value: number, steps: number[]): number {
  if (steps.length === 0) return value
  return steps.reduce((closest, candidate) => (Math.abs(candidate - value) < Math.abs(closest - value) ? candidate : closest), steps[0])
}

export function ExperimentPanel({
  step,
  component,
  currentBypassed,
  currentMultiplier,
  onToggleBypass,
  onSetMultiplier,
  onSetKnob,
}: ExperimentPanelProps) {
  const experiment = step.experiment
  const valueRange = component?.valueRange

  const valueSteps = useMemo(() => {
    if (!experiment || experiment.type !== 'value') return []
    if (experiment.suggestedValues && experiment.suggestedValues.length > 0) return experiment.suggestedValues
    return valueRange?.steps ?? []
  }, [experiment, valueRange?.steps])

  if (!experiment) {
    return (
      <aside className="learn-experiment panel">
        <div className="panel-title">EXPERIMENT</div>
        <p className="learn-experiment-empty">No hands-on experiment for this step. Continue when ready.</p>
      </aside>
    )
  }

  return (
    <aside className="learn-experiment panel active">
      <div className="panel-title">EXPERIMENT</div>
      <div className="learn-experiment-instruction">{experiment.instruction}</div>
      <div className="learn-experiment-listen">Listen for: {experiment.listenFor}</div>

      {experiment.type === 'bypass' && experiment.targetComponent ? (
        <button type="button" className={`learn-bypass-btn ${currentBypassed ? 'is-bypassed' : 'is-active'}`} onClick={() => onToggleBypass(experiment.targetComponent!)}>
          {currentBypassed ? 'ENABLE COMPONENT' : 'BYPASS COMPONENT'}
        </button>
      ) : null}

      {experiment.type === 'value' && experiment.targetComponent && component && valueRange ? (
        <div className="learn-value-controls">
          <input
            className="value-slider"
            type="range"
            min={valueRange.min}
            max={valueRange.max}
            step={0.01}
            value={currentMultiplier}
            onChange={(event) => onSetMultiplier(experiment.targetComponent!, nearestStep(Number(event.target.value), valueRange.steps))}
          />
          <div className="value-slider-steps">
            {valueSteps.map((value) => (
              <button
                key={value}
                type="button"
                className={Math.abs(currentMultiplier - value) < 1e-6 ? 'step-btn active' : 'step-btn'}
                onClick={() => onSetMultiplier(experiment.targetComponent!, value)}
              >
                {value}x
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {experiment.type === 'knob' && experiment.paramId ? (
        <div className="learn-knob-values">
          {(experiment.paramValues ?? []).map((value) => (
            <button key={value} type="button" className="step-btn" onClick={() => onSetKnob(experiment.paramId!, value)}>
              {value}
            </button>
          ))}
        </div>
      ) : null}

      {experiment.explanation ? <div className="learn-experiment-explanation">{experiment.explanation}</div> : null}
    </aside>
  )
}
