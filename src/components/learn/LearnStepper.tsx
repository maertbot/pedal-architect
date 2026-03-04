import type { LearnStep } from '../../data/learn/types'

interface LearnStepperProps {
  steps: LearnStep[]
  currentStepIndex: number
  onStepSelect: (index: number) => void
  onPrev: () => void
  onNext: () => void
}

export function LearnStepper({ steps, currentStepIndex, onStepSelect, onPrev, onNext }: LearnStepperProps) {
  const isFirst = currentStepIndex <= 0
  const isLast = currentStepIndex >= steps.length - 1

  return (
    <div className="learn-stepper panel">
      <div className="learn-stepper-meta">
        <div className="learn-stepper-title">{steps[currentStepIndex]?.title ?? ''}</div>
        <div className="learn-stepper-count">Step {currentStepIndex + 1} of {steps.length}</div>
      </div>

      <div className="learn-stepper-dots" role="tablist" aria-label="Lesson steps">
        {steps.map((step, index) => {
          const stateClass = index === currentStepIndex ? 'current' : index < currentStepIndex ? 'completed' : 'upcoming'
          return (
            <button
              key={step.id}
              type="button"
              className={`learn-step-dot ${stateClass}`}
              onClick={() => onStepSelect(index)}
              aria-label={`Go to step ${index + 1}: ${step.title}`}
            />
          )
        })}
      </div>

      <div className="learn-stepper-actions">
        <button type="button" className="mode-btn" onClick={onPrev} disabled={isFirst}>BACK</button>
        <button type="button" className="mode-btn" onClick={onNext} disabled={isLast}>NEXT</button>
      </div>
    </div>
  )
}
