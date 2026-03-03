import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { Ref } from 'react'
import { componentByType, getEnclosureById } from '../../data/enclosures'
import type { PlacedComponent } from '../../audio/types'

export const GRID_MM = 2
export const CLEARANCE_MM = 5

interface EnclosureCanvasProps {
  enclosureId: string
  components: PlacedComponent[]
  selectedId: string | null
  invalidId: string | null
  onSelect: (id: string | null) => void
}

const PX_PER_MM = 4

function PlacedNode({
  component,
  selected,
  invalid,
  onSelect,
}: {
  component: PlacedComponent
  selected: boolean
  invalid: boolean
  onSelect: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `placed:${component.id}`,
    data: { source: 'canvas', componentId: component.id },
  })

  const def = componentByType(component.componentType)
  if (!def) return null

  const x = component.x * PX_PER_MM
  const y = component.y * PX_PER_MM
  const bodyClass = invalid ? 'placed-shape invalid' : selected ? 'placed-shape selected' : 'placed-shape'

  return (
    <g
      ref={setNodeRef as unknown as Ref<SVGGElement>}
      transform={`translate(${x + (transform?.x ?? 0)}, ${y + (transform?.y ?? 0)})`}
      onMouseDown={() => onSelect(component.id)}
      className={isDragging ? 'placed-node dragging' : 'placed-node'}
      {...listeners}
      {...attributes}
    >
      {def.shape === 'circle' ? (
        <circle r={(def.widthMm / 2) * PX_PER_MM} className={bodyClass} />
      ) : (
        <rect
          x={(-def.widthMm / 2) * PX_PER_MM}
          y={(-def.heightMm / 2) * PX_PER_MM}
          width={def.widthMm * PX_PER_MM}
          height={def.heightMm * PX_PER_MM}
          className={bodyClass}
        />
      )}
      <text y="3" textAnchor="middle" className="placed-label">
        {def.holeMm}
      </text>
    </g>
  )
}

export function EnclosureCanvas({ enclosureId, components, selectedId, invalidId, onSelect }: EnclosureCanvasProps) {
  const enclosure = getEnclosureById(enclosureId)
  const { setNodeRef, isOver } = useDroppable({ id: 'enclosure-canvas' })

  return (
    <section className="panel enclosure-canvas-panel">
      <div className="panel-title">ENCLOSURE LAYOUT</div>
      <div className="enclosure-meta">
        {enclosure.name} - {enclosure.widthMm}mm x {enclosure.heightMm}mm - 2mm grid
      </div>
      <div className="enclosure-canvas-wrap" onMouseDown={() => onSelect(null)}>
        <svg
          ref={setNodeRef as unknown as Ref<SVGSVGElement>}
          className={isOver ? 'enclosure-canvas over' : 'enclosure-canvas'}
          viewBox={`0 0 ${enclosure.widthMm * PX_PER_MM} ${enclosure.heightMm * PX_PER_MM}`}
        >
          <defs>
            <pattern id="gridDots" x="0" y="0" width={GRID_MM * PX_PER_MM} height={GRID_MM * PX_PER_MM} patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="rgba(220,255,220,0.2)" />
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#gridDots)" />
          <rect x="1" y="1" width={enclosure.widthMm * PX_PER_MM - 2} height={enclosure.heightMm * PX_PER_MM - 2} rx="12" className="enclosure-outline" />

          {components.map((component) => (
            <PlacedNode
              key={component.id}
              component={component}
              selected={selectedId === component.id}
              invalid={invalidId === component.id}
              onSelect={onSelect}
            />
          ))}
        </svg>
      </div>
    </section>
  )
}
