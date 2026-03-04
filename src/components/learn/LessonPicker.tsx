import { LESSON_LIST } from '../../data/learn'

interface LessonPickerProps {
  onStartLesson: (circuitId: string) => void
}

export function LessonPicker({ onStartLesson }: LessonPickerProps) {
  return (
    <section className="learn-picker panel">
      <div className="panel-title">LEARN MODE</div>
      <h3 className="learn-picker-title">Choose A Circuit Lesson</h3>
      <p className="learn-picker-copy">Guided walkthroughs for each WDF model with interactive listening experiments.</p>

      <div className="learn-picker-grid">
        {LESSON_LIST.map((lesson) => (
          <button key={lesson.circuitId} type="button" className="learn-picker-card" onClick={() => onStartLesson(lesson.circuitId)}>
            <div className="learn-picker-card-title">{lesson.title}</div>
            <div className="learn-picker-card-meta">{lesson.steps.length} steps</div>
            <div className="learn-picker-card-copy">{lesson.intro}</div>
          </button>
        ))}
      </div>
    </section>
  )
}
