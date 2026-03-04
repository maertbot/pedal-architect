import { bigMuffLesson } from './bigMuffLesson'
import { klonCentaurLesson } from './klonCentaurLesson'
import { tubeScreamerLesson } from './tubeScreamerLesson'
import type { CircuitLesson } from './types'

export const LESSONS: Record<string, CircuitLesson> = {
  [tubeScreamerLesson.circuitId]: tubeScreamerLesson,
  [bigMuffLesson.circuitId]: bigMuffLesson,
  [klonCentaurLesson.circuitId]: klonCentaurLesson,
}

export const LESSON_LIST: CircuitLesson[] = [tubeScreamerLesson, bigMuffLesson, klonCentaurLesson]
