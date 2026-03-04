export interface TopologyNode {
  componentId: string
  x: number
  y: number
  width: number
  height: number
  shape: 'resistor' | 'capacitor' | 'diode' | 'opamp' | 'pot' | 'buffer'
}

export interface TopologyConnection {
  from: string
  to: string
}

export interface TopologyStage {
  id: string
  name: string
  startX: number
  endX: number
}

export interface CircuitTopologyData {
  circuitId: string
  viewBox: { width: number; height: number }
  nodes: TopologyNode[]
  connections: TopologyConnection[]
  stages: TopologyStage[]
  signalInputX: number
  signalOutputX: number
}

export const TUBE_SCREAMER_TOPOLOGY: CircuitTopologyData = {
  circuitId: 'tube-screamer-wdf',
  viewBox: { width: 800, height: 220 },
  signalInputX: 20,
  signalOutputX: 780,
  stages: [
    { id: 'input', name: 'INPUT', startX: 20, endX: 170 },
    { id: 'clipping', name: 'CLIPPING', startX: 170, endX: 430 },
    { id: 'tone', name: 'TONE', startX: 430, endX: 650 },
    { id: 'output', name: 'OUTPUT', startX: 650, endX: 780 },
  ],
  nodes: [
    { componentId: 'ts-input-cap', x: 90, y: 110, width: 54, height: 24, shape: 'capacitor' },
    { componentId: 'ts-input-resistor', x: 200, y: 110, width: 62, height: 24, shape: 'resistor' },
    { componentId: 'ts-clipping-diodes', x: 295, y: 52, width: 54, height: 26, shape: 'diode' },
    { componentId: 'ts-drive-pot', x: 350, y: 52, width: 62, height: 26, shape: 'pot' },
    { componentId: 'ts-feedback-cap', x: 410, y: 52, width: 54, height: 26, shape: 'capacitor' },
    { componentId: 'ts-tone-resistor', x: 500, y: 110, width: 62, height: 24, shape: 'resistor' },
    { componentId: 'ts-tone-cap', x: 570, y: 166, width: 54, height: 24, shape: 'capacitor' },
    { componentId: 'ts-tone-pot', x: 620, y: 110, width: 62, height: 24, shape: 'pot' },
    { componentId: 'ts-volume', x: 720, y: 110, width: 62, height: 24, shape: 'pot' },
  ],
  connections: [
    { from: 'INPUT', to: 'ts-input-cap' },
    { from: 'ts-input-cap', to: 'ts-input-resistor' },
    { from: 'ts-input-resistor', to: 'ts-tone-resistor' },
    { from: 'ts-tone-resistor', to: 'ts-tone-pot' },
    { from: 'ts-tone-pot', to: 'ts-volume' },
    { from: 'ts-volume', to: 'OUTPUT' },
    { from: 'ts-input-resistor', to: 'ts-clipping-diodes' },
    { from: 'ts-clipping-diodes', to: 'ts-drive-pot' },
    { from: 'ts-drive-pot', to: 'ts-feedback-cap' },
    { from: 'ts-feedback-cap', to: 'ts-tone-resistor' },
    { from: 'ts-tone-resistor', to: 'ts-tone-cap' },
    { from: 'ts-tone-cap', to: 'GROUND' },
  ],
}

export function getTopology(circuitId: string): CircuitTopologyData | null {
  if (circuitId === TUBE_SCREAMER_TOPOLOGY.circuitId) {
    return TUBE_SCREAMER_TOPOLOGY
  }
  return null
}
