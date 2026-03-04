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
  viewBox: { width: 780, height: 440 },
  signalInputX: 36,
  signalOutputX: 744,
  stages: [
    { id: 'input', name: 'INPUT', startX: 36, endX: 210 },
    { id: 'clipping', name: 'CLIPPING', startX: 210, endX: 470 },
    { id: 'tone', name: 'TONE', startX: 470, endX: 650 },
    { id: 'output', name: 'OUTPUT', startX: 650, endX: 744 },
  ],
  nodes: [
    { componentId: 'ts-input-cap', x: 124, y: 210, width: 58, height: 24, shape: 'capacitor' },
    { componentId: 'ts-input-resistor', x: 244, y: 210, width: 68, height: 24, shape: 'resistor' },
    { componentId: 'ts-clipping-diodes', x: 322, y: 108, width: 62, height: 26, shape: 'diode' },
    { componentId: 'ts-drive-pot', x: 414, y: 108, width: 74, height: 26, shape: 'pot' },
    { componentId: 'ts-feedback-cap', x: 506, y: 108, width: 62, height: 26, shape: 'capacitor' },
    { componentId: 'ts-tone-resistor', x: 542, y: 210, width: 68, height: 24, shape: 'resistor' },
    { componentId: 'ts-tone-cap', x: 542, y: 306, width: 58, height: 24, shape: 'capacitor' },
    { componentId: 'ts-tone-pot', x: 650, y: 210, width: 70, height: 24, shape: 'pot' },
    { componentId: 'ts-volume', x: 700, y: 210, width: 70, height: 24, shape: 'pot' },
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

export const BIG_MUFF_TOPOLOGY: CircuitTopologyData = {
  circuitId: 'big-muff-wdf',
  viewBox: { width: 1100, height: 440 },
  signalInputX: 36,
  signalOutputX: 1060,
  stages: [
    { id: 'input', name: 'INPUT', startX: 36, endX: 180 },
    { id: 'clip-1', name: 'CLIP 1', startX: 180, endX: 330 },
    { id: 'clip-2', name: 'CLIP 2', startX: 330, endX: 480 },
    { id: 'clip-3', name: 'CLIP 3', startX: 480, endX: 630 },
    { id: 'clip-4', name: 'CLIP 4', startX: 630, endX: 780 },
    { id: 'tone', name: 'TONE', startX: 780, endX: 960 },
    { id: 'output', name: 'OUTPUT', startX: 960, endX: 1060 },
  ],
  nodes: [
    { componentId: 'bm-input-cap', x: 120, y: 210, width: 58, height: 24, shape: 'capacitor' },
    { componentId: 'bm-input-resistor', x: 198, y: 210, width: 70, height: 24, shape: 'resistor' },

    { componentId: 'bm-clip1-cap', x: 278, y: 210, width: 58, height: 24, shape: 'capacitor' },
    { componentId: 'bm-clip1-diodes', x: 278, y: 112, width: 62, height: 26, shape: 'diode' },

    { componentId: 'bm-clip2-cap', x: 408, y: 210, width: 58, height: 24, shape: 'capacitor' },
    { componentId: 'bm-clip2-diodes', x: 408, y: 112, width: 62, height: 26, shape: 'diode' },

    { componentId: 'bm-clip3-cap', x: 538, y: 210, width: 58, height: 24, shape: 'capacitor' },
    { componentId: 'bm-clip3-diodes', x: 538, y: 112, width: 62, height: 26, shape: 'diode' },

    { componentId: 'bm-clip4-cap', x: 668, y: 210, width: 58, height: 24, shape: 'capacitor' },
    { componentId: 'bm-clip4-diodes', x: 668, y: 112, width: 62, height: 26, shape: 'diode' },

    { componentId: 'bm-tone-lp-cap', x: 818, y: 306, width: 58, height: 24, shape: 'capacitor' },
    { componentId: 'bm-tone-hp-cap', x: 818, y: 108, width: 58, height: 24, shape: 'capacitor' },
    { componentId: 'bm-tone-pot', x: 918, y: 210, width: 74, height: 24, shape: 'pot' },
    { componentId: 'bm-volume', x: 1002, y: 210, width: 70, height: 24, shape: 'pot' },
  ],
  connections: [
    { from: 'INPUT', to: 'bm-input-cap' },
    { from: 'bm-input-cap', to: 'bm-input-resistor' },
    { from: 'bm-input-resistor', to: 'bm-clip1-cap' },
    { from: 'bm-clip1-cap', to: 'bm-clip1-diodes' },
    { from: 'bm-clip1-diodes', to: 'bm-clip2-cap' },
    { from: 'bm-clip2-cap', to: 'bm-clip2-diodes' },
    { from: 'bm-clip2-diodes', to: 'bm-clip3-cap' },
    { from: 'bm-clip3-cap', to: 'bm-clip3-diodes' },
    { from: 'bm-clip3-diodes', to: 'bm-clip4-cap' },
    { from: 'bm-clip4-cap', to: 'bm-clip4-diodes' },
    { from: 'bm-clip4-diodes', to: 'bm-tone-pot' },
    { from: 'bm-tone-pot', to: 'bm-volume' },
    { from: 'bm-volume', to: 'OUTPUT' },
    { from: 'bm-clip4-diodes', to: 'bm-tone-lp-cap' },
    { from: 'bm-tone-lp-cap', to: 'bm-tone-pot' },
    { from: 'bm-clip4-diodes', to: 'bm-tone-hp-cap' },
    { from: 'bm-tone-hp-cap', to: 'bm-tone-pot' },
  ],
}

export const KLON_CENTAUR_TOPOLOGY: CircuitTopologyData = {
  circuitId: 'klon-centaur-wdf',
  viewBox: { width: 900, height: 440 },
  signalInputX: 36,
  signalOutputX: 864,
  stages: [
    { id: 'input', name: 'INPUT', startX: 36, endX: 170 },
    { id: 'clean', name: 'CLEAN PATH', startX: 170, endX: 420 },
    { id: 'drive', name: 'DRIVE PATH', startX: 170, endX: 560 },
    { id: 'mix', name: 'MIX', startX: 560, endX: 700 },
    { id: 'tone', name: 'TONE', startX: 700, endX: 790 },
    { id: 'output', name: 'OUTPUT', startX: 790, endX: 864 },
  ],
  nodes: [
    { componentId: 'kl-input-buffer', x: 132, y: 210, width: 70, height: 26, shape: 'buffer' },
    { componentId: 'kl-clean-path', x: 280, y: 140, width: 74, height: 26, shape: 'opamp' },
    { componentId: 'kl-gain-stage', x: 280, y: 280, width: 74, height: 26, shape: 'pot' },
    { componentId: 'kl-clipping-diodes', x: 390, y: 280, width: 62, height: 26, shape: 'diode' },
    { componentId: 'kl-post-filter-r', x: 500, y: 280, width: 74, height: 24, shape: 'resistor' },
    { componentId: 'kl-post-filter-c', x: 500, y: 360, width: 58, height: 24, shape: 'capacitor' },
    { componentId: 'kl-summing', x: 620, y: 210, width: 74, height: 26, shape: 'opamp' },
    { componentId: 'kl-treble-control', x: 736, y: 210, width: 74, height: 24, shape: 'pot' },
    { componentId: 'kl-output-volume', x: 828, y: 210, width: 74, height: 24, shape: 'pot' },
  ],
  connections: [
    { from: 'INPUT', to: 'kl-input-buffer' },
    { from: 'kl-input-buffer', to: 'kl-clean-path' },
    { from: 'kl-input-buffer', to: 'kl-gain-stage' },
    { from: 'kl-clean-path', to: 'kl-summing' },
    { from: 'kl-gain-stage', to: 'kl-clipping-diodes' },
    { from: 'kl-clipping-diodes', to: 'kl-post-filter-r' },
    { from: 'kl-post-filter-r', to: 'kl-summing' },
    { from: 'kl-post-filter-r', to: 'kl-post-filter-c' },
    { from: 'kl-post-filter-c', to: 'GROUND' },
    { from: 'kl-summing', to: 'kl-treble-control' },
    { from: 'kl-treble-control', to: 'kl-output-volume' },
    { from: 'kl-output-volume', to: 'OUTPUT' },
  ],
}

export function getTopology(circuitId: string): CircuitTopologyData | null {
  if (circuitId === TUBE_SCREAMER_TOPOLOGY.circuitId) {
    return TUBE_SCREAMER_TOPOLOGY
  }
  if (circuitId === BIG_MUFF_TOPOLOGY.circuitId) {
    return BIG_MUFF_TOPOLOGY
  }
  if (circuitId === KLON_CENTAUR_TOPOLOGY.circuitId) {
    return KLON_CENTAUR_TOPOLOGY
  }
  return null
}
