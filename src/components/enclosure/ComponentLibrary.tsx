import { useDraggable } from '@dnd-kit/core'
import { COMPONENT_LIBRARY } from '../../data/enclosures'

interface LibraryItemProps {
  type: string
  name: string
  holeMm: number
}

function DraggableLibraryItem({ type, name, holeMm }: LibraryItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library:${type}`,
    data: { source: 'library', componentType: type },
  })

  return (
    <button
      ref={setNodeRef}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={isDragging ? 'library-item dragging' : 'library-item'}
      type="button"
      {...listeners}
      {...attributes}
    >
      <span>{name}</span>
      <span className="library-hole">{holeMm}mm</span>
    </button>
  )
}

export function ComponentLibrary() {
  return (
    <section className="panel component-library">
      <div className="panel-title">COMPONENTS</div>
      <div className="library-list">
        {COMPONENT_LIBRARY.map((component) => (
          <DraggableLibraryItem
            key={component.type}
            type={component.type}
            name={component.name}
            holeMm={component.holeMm}
          />
        ))}
      </div>
    </section>
  )
}
