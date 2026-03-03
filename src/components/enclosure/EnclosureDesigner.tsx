import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { useMemo, useState } from 'react'
import { componentByType, ENCLOSURES, getEnclosureById } from '../../data/enclosures'
import { useStore } from '../../store/useStore'
import { exportDrillTemplate } from '../../utils/pdfExport'
import { ComponentLibrary } from './ComponentLibrary'
import { CLEARANCE_MM, EnclosureCanvas, GRID_MM } from './EnclosureCanvas'
import type { PlacedComponent } from '../../audio/types'

const PX_PER_MM = 4

const snapMm = (value: number) => Math.round(value / GRID_MM) * GRID_MM

const distance = (a: PlacedComponent, b: PlacedComponent) => {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

const isValidPlacement = (candidate: PlacedComponent, all: PlacedComponent[], enclosureId: string) => {
  const enclosure = getEnclosureById(enclosureId)
  const def = componentByType(candidate.componentType)
  if (!def) return false

  const radius = Math.max(def.widthMm, def.heightMm) / 2
  const minX = radius + CLEARANCE_MM
  const maxX = enclosure.widthMm - radius - CLEARANCE_MM
  const minY = radius + CLEARANCE_MM
  const maxY = enclosure.heightMm - radius - CLEARANCE_MM
  if (candidate.x < minX || candidate.x > maxX || candidate.y < minY || candidate.y > maxY) return false

  if (def.edgeConstraint === 'side') {
    const edgeDistance = Math.min(candidate.x, enclosure.widthMm - candidate.x)
    if (edgeDistance > 6) return false
  }

  if (def.edgeConstraint === 'top' && candidate.y > 8) return false

  for (const placed of all) {
    if (placed.id === candidate.id) continue
    const other = componentByType(placed.componentType)
    if (!other) continue
    const required = Math.max(def.holeMm, def.widthMm) / 2 + Math.max(other.holeMm, other.widthMm) / 2 + CLEARANCE_MM
    if (distance(candidate, placed) < required) return false
  }

  return true
}

export function EnclosureDesigner() {
  const enclosureSize = useStore((state) => state.enclosureSize)
  const placedComponents = useStore((state) => state.placedComponents)
  const selectedComponentId = useStore((state) => state.selectedComponentId)
  const setEnclosureSize = useStore((state) => state.setEnclosureSize)
  const addPlacedComponent = useStore((state) => state.addPlacedComponent)
  const updatePlacedComponent = useStore((state) => state.updatePlacedComponent)
  const removePlacedComponent = useStore((state) => state.removePlacedComponent)
  const setSelectedComponentId = useStore((state) => state.setSelectedComponentId)

  const [invalidId, setInvalidId] = useState<string | null>(null)

  const selected = useMemo(
    () => placedComponents.find((component) => component.id === selectedComponentId) ?? null,
    [placedComponents, selectedComponentId],
  )

  const handleDrop = (event: DragEndEvent) => {
    const { active, over, delta } = event
    if (!over || over.id !== 'enclosure-canvas') return

    const enclosure = getEnclosureById(enclosureSize)
    if (String(active.id).startsWith('library:')) {
      const componentType = active.data.current?.componentType as string
      const startX = enclosure.widthMm / 2
      const startY = enclosure.heightMm / 2
      const next: PlacedComponent = {
        id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        componentType,
        x: snapMm(startX + delta.x / PX_PER_MM),
        y: snapMm(startY + delta.y / PX_PER_MM),
      }
      if (isValidPlacement(next, placedComponents, enclosureSize)) {
        addPlacedComponent(next)
        setInvalidId(null)
      } else {
        setInvalidId(next.id)
      }
      return
    }

    if (String(active.id).startsWith('placed:')) {
      const componentId = active.data.current?.componentId as string
      const source = placedComponents.find((item) => item.id === componentId)
      if (!source) return
      const next: PlacedComponent = {
        ...source,
        x: snapMm(source.x + delta.x / PX_PER_MM),
        y: snapMm(source.y + delta.y / PX_PER_MM),
      }
      if (isValidPlacement(next, placedComponents, enclosureSize)) {
        updatePlacedComponent(componentId, next.x, next.y)
        setInvalidId(null)
      } else {
        setInvalidId(componentId)
      }
    }
  }

  const handleChangeEnclosure = (sizeId: string) => {
    if (placedComponents.length === 0 || window.confirm('Changing enclosure clears placed components. Continue?')) {
      setEnclosureSize(sizeId, true)
      setInvalidId(null)
    }
  }

  return (
    <DndContext onDragEnd={handleDrop}>
      <div className="enclosure-shell">
        <section className="panel enclosure-controls">
          <div className="panel-title">ENCLOSURE CONTROL</div>
          <div className="enclosure-size-row">
            <label htmlFor="enclosure-size">Size</label>
            <select id="enclosure-size" value={enclosureSize} onChange={(event) => handleChangeEnclosure(event.target.value)}>
              {ENCLOSURES.map((size) => (
                <option key={size.id} value={size.id}>{`${size.name} (${size.widthMm} x ${size.heightMm} mm)`}</option>
              ))}
            </select>
          </div>
          <button className="action-btn" onClick={() => exportDrillTemplate(enclosureSize, placedComponents)} type="button">
            EXPORT PDF
          </button>
          {selected ? (
            <div className="selected-box">
              <div>
                Selected: {selected.componentType} @ ({selected.x.toFixed(1)}mm, {selected.y.toFixed(1)}mm)
              </div>
              <button className="danger-btn" onClick={() => removePlacedComponent(selected.id)} type="button">
                DELETE
              </button>
            </div>
          ) : (
            <div className="selected-box muted">Select a component to view position and delete.</div>
          )}
        </section>

        <ComponentLibrary />

        <EnclosureCanvas
          enclosureId={enclosureSize}
          components={placedComponents}
          selectedId={selectedComponentId}
          invalidId={invalidId}
          onSelect={setSelectedComponentId}
        />
      </div>
    </DndContext>
  )
}
