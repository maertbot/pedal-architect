import { useMemo } from 'react'
import type { AudioEngine } from '../../audio/AudioEngine'
import type { ParameterDefinition } from '../../audio/types'
import type { WDFComponentMeta } from '../../audio/wdf/types'
import type { LearnExperiment } from '../../data/learn/types'
import { useStore } from '../../store/useStore'

interface ExperimentPanelProps {
  experiment: LearnExperiment | undefined
  components: WDFComponentMeta[]
  parameters: ParameterDefinition[]
  circuitId: string
  audioEngine: AudioEngine
}

const nearestStep = (value: number, steps: number[]): number => {
  let nearest = steps[0]
  let minDistance = Math.abs(value - nearest)

  for (let i = 1; i < steps.length; i += 1) {
    const distance = Math.abs(value - steps[i])
    if (distance < minDistance) {
      minDistance = distance
      nearest = steps[i]
    }
  }

  return nearest
}

function formatParamValue(value: number): string {
  if (Math.abs(value) >= 100) return value.toFixed(0)
  if (Math.abs(value) >= 10) return value.toFixed(1).replace(/\.0$/, '')
  return value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d*?)0+$/, '$1')
}

export function ExperimentPanel({ experiment, components, parameters, circuitId, audioEngine }: ExperimentPanelProps) {
  const componentBypasses = useStore((state) => state.componentBypasses)
  const componentMultipliers = useStore((state) => state.componentMultipliers)
  const parameterValues = useStore((state) => state.parameters[circuitId] ?? {})
  const setComponentBypass = useStore((state) => state.setComponentBypass)
  const setComponentMultiplier = useStore((state) => state.setComponentMultiplier)
  const setParameter = useStore((state) => state.setParameter)

  const targetComponent = useMemo(
    () => components.find((component) => component.id === experiment?.targetComponent) ?? null,
    [components, experiment?.targetComponent],
  )

  const targetParameter = useMemo(
    () => parameters.find((parameter) => parameter.id === experiment?.paramId) ?? null,
    [experiment?.paramId, parameters],
  )

  if (!experiment) {
    return (
      <aside className="experiment-panel muted">
        <div className="experiment-label">EXPERIMENT</div>
        <div className="experiment-empty">No hands-on experiment for this step. Focus on the narration and topology highlights.</div>
      </aside>
    )
  }

  return (
    <aside className="experiment-panel">
      <div className="experiment-label">EXPERIMENT</div>
      <p className="experiment-instruction">{experiment.instruction}</p>
      <p className="experiment-listen">
        Listen for: {experiment.listenFor}
      </p>

      {experiment.type === 'bypass' && targetComponent ? (
        <div className="experiment-control">
          <button
            type="button"
            className={`bypass-toggle ${componentBypasses[targetComponent.id] ? 'is-bypassed' : 'is-active'}`}
            onClick={() => {
              const nextBypassed = !componentBypasses[targetComponent.id]
              setComponentBypass(targetComponent.id, nextBypassed)
              audioEngine.bypassWdfComponent(targetComponent.id, nextBypassed)
            }}
          >
            <span className="bypass-dot" />
            <span>{componentBypasses[targetComponent.id] ? 'BYPASSED' : 'ACTIVE'}</span>
          </button>
          <div className="experiment-target">{targetComponent.name}</div>
        </div>
      ) : null}

      {experiment.type === 'value' && targetComponent && targetComponent.valueRange ? (
        <div className="experiment-control">
          <input
            className={`value-slider ${Math.abs((componentMultipliers[targetComponent.id] ?? 1) - 1) > 1e-6 ? 'modified' : ''}`}
            type="range"
            min={targetComponent.valueRange.min}
            max={targetComponent.valueRange.max}
            step={0.01}
            value={componentMultipliers[targetComponent.id] ?? 1}
            onChange={(event) => {
              const next = nearestStep(Number(event.target.value), targetComponent.valueRange?.steps ?? [1])
              setComponentMultiplier(targetComponent.id, next)
              audioEngine.setWdfComponentMultiplier(targetComponent.id, next)
            }}
          />
          <div className="value-slider-steps">
            {(experiment.suggestedValues ?? targetComponent.valueRange.steps).map((value) => (
              <button
                key={value}
                type="button"
                className={Math.abs((componentMultipliers[targetComponent.id] ?? 1) - value) < 1e-6 ? 'step-btn active' : 'step-btn'}
                onClick={() => {
                  setComponentMultiplier(targetComponent.id, value)
                  audioEngine.setWdfComponentMultiplier(targetComponent.id, value)
                }}
              >
                {value}x
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {experiment.type === 'knob' && targetParameter ? (
        <div className="experiment-control">
          <input
            className="value-slider"
            type="range"
            min={targetParameter.min}
            max={targetParameter.max}
            step={targetParameter.curve === 'logarithmic' ? 0.01 : 0.001}
            value={parameterValues[targetParameter.id] ?? targetParameter.default}
            onChange={(event) => {
              const nextValue = Number(event.target.value)
              setParameter(circuitId, targetParameter.id, nextValue)
              audioEngine.setParameter(circuitId, targetParameter.id, nextValue)
            }}
          />
          <div className="experiment-knob-readout">
            {targetParameter.label}: {formatParamValue(parameterValues[targetParameter.id] ?? targetParameter.default)}
            {targetParameter.unit}
          </div>
          {experiment.paramValues ? (
            <div className="value-slider-steps">
              {experiment.paramValues.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={Math.abs((parameterValues[targetParameter.id] ?? targetParameter.default) - value) < 1e-6 ? 'step-btn active' : 'step-btn'}
                  onClick={() => {
                    setParameter(circuitId, targetParameter.id, value)
                    audioEngine.setParameter(circuitId, targetParameter.id, value)
                  }}
                >
                  {formatParamValue(value)}
                </button>
              ))}
            </div>
          ) : null}
          {experiment.explanation ? <p className="experiment-explanation">{experiment.explanation}</p> : null}
        </div>
      ) : null}
    </aside>
  )
}
