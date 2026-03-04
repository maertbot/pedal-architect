import { bigMuffLesson } from './bigMuff'
import { klonCentaurLesson } from './klonCentaur'
import { tubeScreamerLesson } from './tubeScreamer'
import type { CircuitLesson } from './types'

export const LESSONS: Record<string, CircuitLesson> = {
  [tubeScreamerLesson.circuitId]: tubeScreamerLesson,
  [bigMuffLesson.circuitId]: bigMuffLesson,
  [klonCentaurLesson.circuitId]: klonCentaurLesson,
}

export function getLesson(circuitId: string): CircuitLesson | null {
  return LESSONS[circuitId] ?? null
}
