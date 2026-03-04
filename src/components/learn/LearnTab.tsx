import { useEffect, useMemo, useRef, useState } from 'react'
import type { AudioEngine } from '../../audio/AudioEngine'
import { bigMuffWDFComponents } from '../../audio/wdf/circuits/bigMuffWDF'
import { klonCentaurWDFComponents } from '../../audio/wdf/circuits/klonCentaurWDF'
import { tubeScreamerWDFComponents } from '../../audio/wdf/circuits/tubeScreamerWDF'
import { getTopology } from '../../audio/wdf/topology'
import { CIRCUIT_MAP } from '../../data/circuits'
import { getLesson } from '../../data/learn'
import { useStore } from '../../store/useStore'
import { CircuitTopology } from '../circuit-lab/CircuitTopology'
import { ExperimentPanel } from './ExperimentPanel'
import { LearnStepper } from './LearnStepper'

interface LearnTabProps {
  audioEngine: AudioEngine
}

function getWdfComponents(circuitId: string) {
  if (circuitId === 'tube-screamer-wdf') return tubeScreamerWDFComponents
  if (circuitId === 'big-muff-wdf') return bigMuffWDFComponents
  if (circuitId === 'klon-centaur-wdf') return klonCentaurWDFComponents
  return []
}

export function LearnTab({ audioEngine }: LearnTabProps) {
  const [levelSnapshot, setLevelSnapshot] = useState<Record<string, number>>({})
  const learnCircuitId = useStore((state) => state.learnCircuitId)
  const learnStepIndex = useStore((state) => state.learnStepIndex)
  const currentCircuit = useStore((state) => state.currentCircuit)
  const componentBypasses = useStore((state) => state.componentBypasses)
  const componentMultipliers = useStore((state) => state.componentMultipliers)
  const selectedWdfComponent = useStore((state) => state.selectedWdfComponent)

  const nextLearnStep = useStore((state) => state.nextLearnStep)
  const prevLearnStep = useStore((state) => state.prevLearnStep)
  const exitLesson = useStore((state) => state.exitLesson)
  const setActiveTab = useStore((state) => state.setActiveTab)
  const applyLearnStepState = useStore((state) => state.applyLearnStepState)
  const setSelectedWdfComponent = useStore((state) => state.setSelectedWdfComponent)
  const resetAllWdfComponents = useStore((state) => state.resetAllWdfComponents)

  const levelsRef = useRef<Record<string, number>>({})
  const lastLevelUiSyncRef = useRef(0)

  const circuitId = learnCircuitId ?? currentCircuit
  const lesson = useMemo(() => getLesson(circuitId), [circuitId])
  const topology = useMemo(() => getTopology(circuitId), [circuitId])
  const wdfComponents = useMemo(() => getWdfComponents(circuitId), [circuitId])
  const circuit = useMemo(() => CIRCUIT_MAP[circuitId], [circuitId])
  const currentStep = lesson?.steps[learnStepIndex] ?? null

  useEffect(() => {
    if (!currentStep) return
    applyLearnStepState(currentStep)
  }, [applyLearnStepState, currentStep])

  useEffect(() => {
    if (!currentStep) return
    setSelectedWdfComponent(currentStep.highlightComponents[0] ?? null)
  }, [currentStep, setSelectedWdfComponent])

  useEffect(() => {
    wdfComponents.forEach((component) => {
      audioEngine.bypassWdfComponent(component.id, Boolean(componentBypasses[component.id]))
      audioEngine.setWdfComponentMultiplier(component.id, componentMultipliers[component.id] ?? 1)
    })
  }, [audioEngine, componentBypasses, componentMultipliers, wdfComponents])

  useEffect(() => {
    const incomingLevels = audioEngine.getWdfComponentLevels()
    Object.entries(incomingLevels).forEach(([componentId, value]) => {
      levelsRef.current[componentId] = value
    })

    let rafId = 0
    const tick = () => {
      const nextLevels = audioEngine.getWdfComponentLevels()
      Object.keys(levelsRef.current).forEach((componentId) => {
        if (!(componentId in nextLevels)) {
          delete levelsRef.current[componentId]
        }
      })
      Object.entries(nextLevels).forEach(([componentId, value]) => {
        levelsRef.current[componentId] = value
      })

      const now = performance.now()
      if (now - lastLevelUiSyncRef.current > 120) {
        lastLevelUiSyncRef.current = now
        setLevelSnapshot({ ...levelsRef.current })
      }

      rafId = window.requestAnimationFrame(tick)
    }

    rafId = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(rafId)
    }
  }, [audioEngine, circuitId])

  useEffect(() => () => exitLesson(), [exitLesson])

  if (!lesson || !topology || !currentStep || !circuit) {
    return <div className="panel learn-missing">No lesson is available for this circuit.</div>
  }

  const handleExit = () => {
    exitLesson()
    setActiveTab('circuit')
  }

  return (
    <div className="learn-shell">
      <div className="learn-topbar panel">
        <div className="learn-step-dots" aria-label="Lesson progress">
          {lesson.steps.map((step, index) => {
            const state = index < learnStepIndex ? 'completed' : index === learnStepIndex ? 'current' : 'upcoming'
            return <span key={step.id} className={`learn-step-dot ${state}`} aria-hidden="true" />
          })}
        </div>

        <div className="learn-topbar-actions">
          <button
            type="button"
            className="learn-reset-btn"
            onClick={() => {
              resetAllWdfComponents()
              wdfComponents.forEach((component) => {
                audioEngine.bypassWdfComponent(component.id, false)
                audioEngine.setWdfComponentMultiplier(component.id, 1)
              })
              setSelectedWdfComponent(currentStep.highlightComponents[0] ?? null)
            }}
          >
            RESET ALL
          </button>
          <button type="button" className="learn-exit-btn" onClick={handleExit} aria-label="Exit learn mode">
            ×
          </button>
        </div>
      </div>

      <div className="learn-container">
        <div className="learn-left panel">
          <LearnStepper
            steps={lesson.steps}
            currentIndex={learnStepIndex}
            onPrev={() => {
              prevLearnStep()
              const nextStep = lesson.steps[Math.max(learnStepIndex - 1, 0)]
              setSelectedWdfComponent(nextStep.highlightComponents[0] ?? null)
            }}
            onNext={() => {
              nextLearnStep()
              const nextStep = lesson.steps[Math.min(learnStepIndex + 1, lesson.steps.length - 1)]
              setSelectedWdfComponent(nextStep.highlightComponents[0] ?? null)
            }}
          />
        </div>

        <div className="learn-center">
          <CircuitTopology
            topology={topology}
            components={wdfComponents}
            bypasses={componentBypasses}
            multipliers={componentMultipliers}
            selectedComponent={selectedWdfComponent}
            levels={levelSnapshot}
            onSelectComponent={setSelectedWdfComponent}
          />
        </div>

        <div className="learn-right">
          <ExperimentPanel
            experiment={currentStep.experiment}
            components={wdfComponents}
            parameters={circuit.parameters}
            circuitId={circuitId}
            audioEngine={audioEngine}
          />
        </div>
      </div>
    </div>
  )
}
