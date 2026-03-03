interface CircuitDiagramProps {
  highlightedBlock: string | null
}

const BLOCKS = [
  { id: 'gain', label: 'GAIN STAGE', x: 18 },
  { id: 'drive', label: 'CLIPPING', x: 132 },
  { id: 'distortion', label: 'CLIPPING', x: 132 },
  { id: 'sustain', label: 'CLIPPING', x: 132 },
  { id: 'fuzz', label: 'CLIPPING', x: 132 },
  { id: 'tone', label: 'TONE', x: 246 },
  { id: 'filter', label: 'TONE', x: 246 },
  { id: 'treble', label: 'TONE', x: 246 },
  { id: 'speed', label: 'LFO MOD', x: 246 },
  { id: 'level', label: 'OUTPUT', x: 360 },
  { id: 'volume', label: 'OUTPUT', x: 360 },
  { id: 'output', label: 'OUTPUT', x: 360 },
]

const getActiveX = (highlightedBlock: string | null) => BLOCKS.find((block) => block.id === highlightedBlock)?.x

export function CircuitDiagram({ highlightedBlock }: CircuitDiagramProps) {
  const activeX = getActiveX(highlightedBlock)

  return (
    <section className="panel diagram-panel">
      <div className="panel-title">SIGNAL PATH</div>
      <svg viewBox="0 0 470 90" className="diagram-svg">
        <path d="M8 45H460" className="diagram-trace" />
        <rect x="8" y="28" width="88" height="34" className="diagram-block" />
        <text x="52" y="50" textAnchor="middle">INPUT</text>

        {activeX !== undefined ? <rect x={activeX - 6} y="20" width="104" height="50" className="diagram-active" /> : null}

        <rect x="126" y="28" width="88" height="34" className="diagram-block" />
        <text x="170" y="50" textAnchor="middle">CLIP</text>

        <rect x="240" y="28" width="88" height="34" className="diagram-block" />
        <text x="284" y="50" textAnchor="middle">TONE</text>

        <rect x="354" y="28" width="88" height="34" className="diagram-block" />
        <text x="398" y="50" textAnchor="middle">OUTPUT</text>
      </svg>
    </section>
  )
}
