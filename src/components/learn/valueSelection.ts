const DEFAULT_SELECTION_EPSILON = 0.005

export function isSelectionActive(currentValue: number, candidateValue: number, epsilon = DEFAULT_SELECTION_EPSILON): boolean {
  return Math.abs(currentValue - candidateValue) <= epsilon
}
