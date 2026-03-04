import { useEffect, useMemo, useState } from 'react'
import type { AudioEngine } from '../../audio/AudioEngine'
import { bigMuffWDFComponents } from '../../audio/wdf/circuits/bigMuffWDF'
import { klonCentaurWDFComponents } from '../../audio/wdf/circuits/klonCentaurWDF'
import { tubeScreamerWDFComponents } from '../../audio/wdf/circuits/tubeScreamerWDF'
import { getTopology } from '../../audio/wdf/topology'
import type { WDFComponentMeta } from '../../audio/wdf/types'
import { LESSONS } from '../../data/learn'
import { syncCircuitSelection } from '../../audio/syncCircuitSelection'
import { useStore } from '../../store/useStore'
import { CircuitTopology } from '../circuit-lab/CircuitTopology'
import { ExperimentPanel } from './ExperimentPanel'
import { LessonPicker } from './LessonPicker'
import { LearnStepper } from './LearnStepper'

interface LearnTabProps {
  audioEngine: AudioEngine
}

function getWdfComponents(circuitId: string): WDFComponentMeta[] {
  if (circuitId === 'tube-screamer-wdf') return tubeScreamerWDFComponents
  if (circuitId === 'big-muff-wdf') return bigMuffWDFComponents
  if (circuitId === 'klon-centaur-wdf') return klonCentaurWDFComponents
  return []
}

export function LearnTab({ audioEngine }: LearnTabProps) {
  const [narrationKey, setNarrationKey] = useState(0)

  const learnCircuitId = useStore((state) => state.learnCircuitId)
  const learnStepIndex = useStore((state) => state.learnStepIndex)
  const currentCircuit = useStore((state) => state.currentCircuit)
  const parameters = useStore((state) => state.parameters)
  const componentBypasses = useStore((state) => state.componentBypasses)
  const componentMultipliers = useStore((state) => state.componentMultipliers)

  const setCircuit = useStore((state) => state.setCircuit)
  const setLearnCircuit = useStore((state) => state.setLearnCircuit)
  const setLearnStep = useStore((state) => state.setLearnStep)
  const nextLearnStep = useStore((state) => state.nextLearnStep)
  const prevLearnStep = useStore((state) => state.prevLearnStep)
  const setComponentBypass = useStore((state) => state.setComponentBypass)
  const setComponentMultiplier = useStore((state) => state.setComponentMultiplier)
  const resetAllWdfComponents = useStore((state) => state.resetAllWdfComponents)
  const setParameter = useStore((state) => state.setParameter)

  const lesson = learnCircuitId ? LESSONS[learnCircuitId] : null
  const safeStepIndex = lesson ? Math.min(learnStepIndex, lesson.steps.length - 1) : 0
  const currentStep = lesson?.steps[safeStepIndex] ?? null
  const topology = learnCircuitId ? getTopology(learnCircuitId) : null
  const wdfComponents = useMemo(() => (learnCircuitId ? getWdfComponents(learnCircuitId) : []), [learnCircuitId])

  const experimentComponent = useMemo(() => {
    if (!currentStep?.experiment?.targetComponent) return null
    return wdfComponents.find((component) => component.id === currentStep.experiment?.targetComponent) ?? null
  }, [currentStep?.experiment?.targetComponent, wdfComponents])

  const resetEngineComponents = () => {
    wdfComponents.forEach((component) => {
      audioEngine.bypassWdfComponent(component.id, false)
      audioEngine.setWdfComponentMultiplier(component.id, 1)
    })
    resetAllWdfComponents()
  }

  const applyStepOverrides = () => {
    if (!currentStep) return

    Object.entries(currentStep.autoBypass ?? {}).forEach(([componentId, bypassed]) => {
      setComponentBypass(componentId, bypassed)
      audioEngine.bypassWdfComponent(componentId, bypassed)
    })

    Object.entries(currentStep.autoValueOverrides ?? {}).forEach(([componentId, multiplier]) => {
      setComponentMultiplier(componentId, multiplier)
      audioEngine.setWdfComponentMultiplier(componentId, multiplier)
    })

    if (!currentStep.experiment) return

    if (currentStep.experiment.type === 'bypass' && currentStep.experiment.targetComponent) {
      const componentId = currentStep.experiment.targetComponent
      const bypassed = componentBypasses[componentId] ?? false
      setComponentBypass(componentId, bypassed)
      audioEngine.bypassWdfComponent(componentId, bypassed)
    }

    if (currentStep.experiment.type === 'value' && currentStep.experiment.targetComponent) {
      const componentId = currentStep.experiment.targetComponent
      const multiplier = componentMultipliers[componentId] ?? 1
      setComponentMultiplier(componentId, multiplier)
      audioEngine.setWdfComponentMultiplier(componentId, multiplier)
    }
  }

  useEffect(() => {
    if (!lesson) return

    if (safeStepIndex !== learnStepIndex) {
      setLearnStep(safeStepIndex)
    }
  }, [lesson, learnStepIndex, safeStepIndex, setLearnStep])

  useEffect(() => {
    if (!lesson) return
    setNarrationKey((key) => key + 1)
  }, [lesson, safeStepIndex])

  useEffect(() => {
    if (!lesson) return
    resetEngineComponents()
    applyStepOverrides()
    // step-driven behavior only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson, safeStepIndex])

  const startLesson = (circuitId: string) => {
    // Explicit-play rule: entering Learn mode should not auto-start audio.
    audioEngine.stop()
    setLearnCircuit(circuitId)
    setCircuit(circuitId)
    syncCircuitSelection(audioEngine, circuitId, parameters)
  }

  const exitLesson = () => {
    resetEngineComponents()
    setLearnCircuit(null)
  }

  const handleResetLesson = () => {
    resetEngineComponents()
    setLearnStep(0)
  }

  const handleToggleBypass = (componentId: string) => {
    const next = !(componentBypasses[componentId] ?? false)
    setComponentBypass(componentId, next)
    audioEngine.bypassWdfComponent(componentId, next)
  }

  const handleSetMultiplier = (componentId: string, multiplier: number) => {
    setComponentMultiplier(componentId, multiplier)
    audioEngine.setWdfComponentMultiplier(componentId, multiplier)
  }

  const handleSetKnob = (paramId: string, value: number) => {
    if (!lesson) return
    setParameter(lesson.circuitId, paramId, value)
    audioEngine.setParameter(lesson.circuitId, paramId, value)
  }

  if (!lesson) {
    return <LessonPicker onStartLesson={(circuitId) => { void startLesson(circuitId) }} />
  }

  return (
    <div className="learn-shell">
      <div className="learn-toolbar panel">
        <div className="learn-toolbar-title">{lesson.title}</div>
        <div className="learn-toolbar-actions">
          <button type="button" className="mode-btn" onClick={handleResetLesson}>RESET LESSON</button>
          <button type="button" className="mode-btn" onClick={exitLesson}>EXIT LESSON</button>
        </div>
      </div>

      <div className="learn-grid">
        <section className="learn-narration panel" key={narrationKey}>
          <div className="panel-title">NARRATION</div>
          <h3 className="learn-step-title">{currentStep?.title}</h3>
          <p className="learn-step-copy">{currentStep?.narration}</p>
          {safeStepIndex === 0 ? <p className="learn-intro">{lesson.intro}</p> : null}
          {safeStepIndex === lesson.steps.length - 1 ? <p className="learn-conclusion">{lesson.conclusion}</p> : null}
        </section>

        <div className="learn-topology-panel">
          {topology ? (
            <CircuitTopology
              topology={topology}
              components={wdfComponents}
              bypasses={componentBypasses}
              multipliers={componentMultipliers}
              selectedComponent={null}
              highlightedComponents={currentStep?.highlightComponents ?? []}
              dimOthers={true}
              levels={{}}
              onSelectComponent={() => undefined}
            />
          ) : null}
        </div>

        <ExperimentPanel
          step={currentStep!}
          component={experimentComponent}
          currentBypassed={Boolean(currentStep?.experiment?.targetComponent && componentBypasses[currentStep.experiment.targetComponent])}
          currentMultiplier={currentStep?.experiment?.targetComponent ? (componentMultipliers[currentStep.experiment.targetComponent] ?? 1) : 1}
          currentKnobValue={currentStep?.experiment?.paramId ? parameters[learnCircuitId ?? currentCircuit]?.[currentStep.experiment.paramId] : undefined}
          onToggleBypass={handleToggleBypass}
          onSetMultiplier={handleSetMultiplier}
          onSetKnob={handleSetKnob}
        />
      </div>

      <LearnStepper
        steps={lesson.steps}
        currentStepIndex={safeStepIndex}
        onStepSelect={setLearnStep}
        onPrev={prevLearnStep}
        onNext={nextLearnStep}
      />

      {currentCircuit !== lesson.circuitId ? (
        <div className="learn-warning panel">Lesson switched to another circuit. Return to {lesson.circuitId} for consistent results.</div>
      ) : null}
    </div>
  )
}
