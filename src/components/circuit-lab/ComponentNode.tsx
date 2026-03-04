import type { TopologyNode } from '../../audio/wdf/topology'
import type { WDFComponentMeta } from '../../audio/wdf/types'

interface ComponentNodeProps {
  node: TopologyNode
  meta: WDFComponentMeta
  selected: boolean
  bypassed: boolean
  multiplier: number
  level: number
  onSelect: (componentId: string) => void
}

const formatMultiplier = (value: number): string => `${value.toFixed(2).replace(/\.00$/, '')}x`

function splitLabel(name: string): string[] {
  const words = name.trim().split(/\s+/)
  if (words.length <= 2) return [name]

  const midpoint = Math.ceil(words.length / 2)
  const first = words.slice(0, midpoint).join(' ')
  const second = words.slice(midpoint).join(' ')
  return [first, second]
}

function renderSymbol(node: TopologyNode) {
  const left = node.x - node.width / 2
  const right = node.x + node.width / 2
  const top = node.y - node.height / 2
  const bottom = node.y + node.height / 2

  if (node.shape === 'resistor') {
    return (
      <path
        d={`M${left} ${node.y} L${left + 8} ${node.y} L${left + 14} ${top} L${left + 22} ${bottom} L${left + 30} ${top} L${left + 38} ${bottom} L${left + 46} ${top} L${right - 8} ${node.y} L${right} ${node.y}`}
        fill="none"
        strokeWidth="1.8"
      />
    )
  }

  if (node.shape === 'capacitor') {
    return (
      <>
        <line x1={left} y1={node.y} x2={node.x - 7} y2={node.y} strokeWidth="1.8" />
        <line x1={node.x - 7} y1={top} x2={node.x - 7} y2={bottom} strokeWidth="1.8" />
        <line x1={node.x + 7} y1={top} x2={node.x + 7} y2={bottom} strokeWidth="1.8" />
        <line x1={node.x + 7} y1={node.y} x2={right} y2={node.y} strokeWidth="1.8" />
      </>
    )
  }

  if (node.shape === 'diode') {
    return (
      <>
        <line x1={left} y1={node.y} x2={node.x - 12} y2={node.y} strokeWidth="1.8" />
        <path d={`M${node.x - 12} ${top} L${node.x + 4} ${node.y} L${node.x - 12} ${bottom} Z`} strokeWidth="1.8" fill="none" />
        <line x1={node.x + 8} y1={top} x2={node.x + 8} y2={bottom} strokeWidth="1.8" />
        <line x1={node.x + 8} y1={node.y} x2={right} y2={node.y} strokeWidth="1.8" />
      </>
    )
  }

  if (node.shape === 'pot') {
    return (
      <>
        <path
          d={`M${left} ${node.y} L${left + 8} ${node.y} L${left + 14} ${top} L${left + 22} ${bottom} L${left + 30} ${top} L${left + 38} ${bottom} L${left + 46} ${top} L${right - 8} ${node.y} L${right} ${node.y}`}
          fill="none"
          strokeWidth="1.8"
        />
        <line x1={node.x + 8} y1={top - 7} x2={node.x - 2} y2={node.y - 1} strokeWidth="1.4" />
        <path d={`M${node.x + 8} ${top - 7} L${node.x + 3} ${top - 4} L${node.x + 8} ${top - 1}`} fill="none" strokeWidth="1.4" />
      </>
    )
  }

  if (node.shape === 'opamp' || node.shape === 'buffer') {
    return (
      <>
        <line x1={left} y1={node.y} x2={node.x - 15} y2={node.y} strokeWidth="1.8" />
        <path d={`M${node.x - 15} ${top} L${node.x - 15} ${bottom} L${node.x + 16} ${node.y} Z`} fill="none" strokeWidth="1.8" />
        <line x1={node.x + 16} y1={node.y} x2={right} y2={node.y} strokeWidth="1.8" />
      </>
    )
  }

  return <line x1={left} y1={node.y} x2={right} y2={node.y} strokeWidth="1.8" />
}

export function ComponentNode({ node, meta, selected, bypassed, multiplier, level, onSelect }: ComponentNodeProps) {
  const isModified = Math.abs(multiplier - 1) > 1e-6
  const className = ['topology-component', selected ? 'selected' : '', bypassed ? 'bypassed' : '', isModified ? 'modified' : '']
    .filter(Boolean)
    .join(' ')
  const labelLines = splitLabel(meta.name)
  const labelBaseY = node.y + node.height / 2 + 14
  const valueY = labelBaseY + (labelLines.length - 1) * 10 + 12
  const multiplierY = valueY + 11

  const meterHeight = Math.max(0, Math.min(1, level)) * 20

  return (
    <g className={className} onClick={(event) => { event.stopPropagation(); onSelect(node.componentId) }}>
      <g className="topology-symbol">{renderSymbol(node)}</g>
      <rect className="signal-meter" x={node.x + node.width / 2 + 6} y={node.y - 10} width={3} height={20} rx={1} />
      <rect
        className="signal-meter-fill"
        x={node.x + node.width / 2 + 6}
        y={node.y + 10 - meterHeight}
        width={3}
        height={meterHeight}
        rx={1}
      />
      <text className="component-label" x={node.x} y={labelBaseY} textAnchor="middle">
        {labelLines.map((line, index) => (
          <tspan key={`${node.componentId}-line-${index}`} x={node.x} dy={index === 0 ? 0 : 10}>
            {line}
          </tspan>
        ))}
      </text>
      {meta.realWorldValue ? (
        <text className="component-value" x={node.x} y={valueY} textAnchor="middle">{meta.realWorldValue}</text>
      ) : null}
      {isModified ? (
        <text className="multiplier-label" x={node.x} y={multiplierY} textAnchor="middle">
          {formatMultiplier(multiplier)}
        </text>
      ) : null}
    </g>
  )
}
