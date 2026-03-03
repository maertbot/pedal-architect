export interface CircuitSelectionSyncEngine {
  setCircuit: (circuitId: string) => void
  setParameter: (circuitId: string, parameterId: string, value: number) => void
}

export function syncCircuitSelection(
  engine: CircuitSelectionSyncEngine,
  circuitId: string,
  parameters: Record<string, Record<string, number>>,
): void {
  engine.setCircuit(circuitId)

  const circuitParams = parameters[circuitId]
  if (!circuitParams) return

  Object.entries(circuitParams).forEach(([parameterId, value]) => {
    engine.setParameter(circuitId, parameterId, value)
  })
}
