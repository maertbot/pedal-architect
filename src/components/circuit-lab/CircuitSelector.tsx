import { CIRCUITS } from '../../data/circuits'

interface CircuitSelectorProps {
  currentCircuit: string
  onSelect: (circuitId: string) => void
}

export function CircuitSelector({ currentCircuit, onSelect }: CircuitSelectorProps) {
  return (
    <section className="panel circuit-selector">
      <div className="panel-title">CIRCUIT BANK</div>
      <div className="circuit-grid">
        {CIRCUITS.map((circuit) => (
          <button
            key={circuit.id}
            className={circuit.id === currentCircuit ? 'circuit-card active' : 'circuit-card'}
            onClick={() => onSelect(circuit.id)}
            type="button"
          >
            <svg viewBox="0 0 44 32" className="circuit-icon">
              <path d={circuit.iconPath} />
            </svg>
            <div className="circuit-name-row">
              <span className="circuit-name">{circuit.name}</span>
              {circuit.engine === 'wdf' ? <span className="wdf-badge">COMPONENT-LEVEL</span> : null}
            </div>
            <div className="circuit-meta">
              <span>{circuit.year}</span>
              <span>{circuit.category}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
