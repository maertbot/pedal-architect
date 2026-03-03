import { bigMuff } from '../audio/circuits/bigMuff'
import { fuzzFace } from '../audio/circuits/fuzzFace'
import { klonCentaur } from '../audio/circuits/klonCentaur'
import { phaseNinety } from '../audio/circuits/phaseNinety'
import { rat } from '../audio/circuits/rat'
import { tubeScreamer } from '../audio/circuits/tubeScreamer'
import type { CircuitModel } from '../audio/types'

export const CIRCUITS: CircuitModel[] = [
  tubeScreamer,
  bigMuff,
  klonCentaur,
  rat,
  fuzzFace,
  phaseNinety,
]

export const CIRCUIT_MAP = Object.fromEntries(CIRCUITS.map((circuit) => [circuit.id, circuit])) as Record<string, CircuitModel>

export const getCircuitDefaults = (circuitId: string) => {
  const circuit = CIRCUIT_MAP[circuitId] ?? CIRCUITS[0]
  return Object.fromEntries(circuit.parameters.map((param) => [param.id, param.default]))
}
