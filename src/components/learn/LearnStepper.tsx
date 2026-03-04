import { useMemo } from 'react'
import type { LearnStep } from '../../data/learn/types'

interface LearnStepperProps {
  steps: LearnStep[]
  currentIndex: number
  onPrev: () => void
  onNext: () => void
}

export function LearnStepper({ steps, currentIndex, onPrev, onNext }: LearnStepperProps) {
  const currentStep = steps[currentIndex]
  const narrationKey = useMemo(() => `${currentStep.id}-${currentIndex}`, [currentIndex, currentStep.id])

  return (
    <section className="learn-stepper">
      <div className="learn-step-dots" aria-label="Lesson progress">
        {steps.map((step, index) => {
          const state = index < currentIndex ? 'completed' : index === currentIndex ? 'current' : 'upcoming'
          return <span key={step.id} className={`learn-step-dot ${state}`} aria-hidden="true" />
        })}
      </div>

      <h3 className="learn-step-title">{currentStep.title}</h3>

      <div key={narrationKey} className="learn-step-narration">
        {currentStep.narration}
      </div>

      <div className="learn-step-nav">
        <button type="button" className="mode-btn" onClick={onPrev} disabled={currentIndex === 0}>
          ◄ PREV
        </button>
        <button type="button" className="mode-btn" onClick={onNext} disabled={currentIndex === steps.length - 1}>
          NEXT ►
        </button>
      </div>
    </section>
  )
}
