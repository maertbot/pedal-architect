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
  viewBox: { width: 620, height: 380 },
  signalInputX: 30,
  signalOutputX: 590,
  stages: [
    { id: 'input', name: 'INPUT', startX: 30, endX: 165 },
    { id: 'clipping', name: 'CLIPPING', startX: 165, endX: 370 },
    { id: 'tone', name: 'TONE', startX: 370, endX: 505 },
    { id: 'output', name: 'OUTPUT', startX: 505, endX: 590 },
  ],
  nodes: [
    { componentId: 'ts-input-cap', x: 92, y: 170, width: 54, height: 24, shape: 'capacitor' },
    { componentId: 'ts-input-resistor', x: 184, y: 170, width: 62, height: 24, shape: 'resistor' },
    { componentId: 'ts-clipping-diodes', x: 248, y: 88, width: 54, height: 26, shape: 'diode' },
    { componentId: 'ts-drive-pot', x: 320, y: 88, width: 62, height: 26, shape: 'pot' },
    { componentId: 'ts-feedback-cap', x: 392, y: 88, width: 54, height: 26, shape: 'capacitor' },
    { componentId: 'ts-tone-resistor', x: 430, y: 170, width: 62, height: 24, shape: 'resistor' },
    { componentId: 'ts-tone-cap', x: 430, y: 258, width: 54, height: 24, shape: 'capacitor' },
    { componentId: 'ts-tone-pot', x: 504, y: 170, width: 62, height: 24, shape: 'pot' },
    { componentId: 'ts-volume', x: 560, y: 170, width: 62, height: 24, shape: 'pot' },
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
