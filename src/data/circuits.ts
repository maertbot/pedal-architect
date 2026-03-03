import { bigMuff } from '../audio/circuits/bigMuff'
import { bossBd2 } from '../audio/circuits/bossBd2'
import { bossDs1 } from '../audio/circuits/bossDs1'
import { bossMt2 } from '../audio/circuits/bossMt2'
import { bossSd1 } from '../audio/circuits/bossSd1'
import { fuzzFace } from '../audio/circuits/fuzzFace'
import { ibanezTs9 } from '../audio/circuits/ibanezTs9'
import { klonCentaur } from '../audio/circuits/klonCentaur'
import { mxrDistortionPlus } from '../audio/circuits/mxrDistortionPlus'
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
  bossDs1,
  bossSd1,
  bossBd2,
  bossMt2,
  ibanezTs9,
  mxrDistortionPlus,
]

export const CIRCUIT_MAP = Object.fromEntries(CIRCUITS.map((circuit) => [circuit.id, circuit])) as Record<string, CircuitModel>

export const getCircuitDefaults = (circuitId: string) => {
  const circuit = CIRCUIT_MAP[circuitId] ?? CIRCUITS[0]
  return Object.fromEntries(circuit.parameters.map((param) => [param.id, param.default]))
}
