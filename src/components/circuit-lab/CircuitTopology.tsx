import { useEffect, useMemo, useRef, useState } from 'react'
import type { CircuitTopologyData, TopologyConnection, TopologyNode } from '../../audio/wdf/topology'
import type { WDFComponentMeta } from '../../audio/wdf/types'
import { ComponentNode } from './ComponentNode'

interface CircuitTopologyProps {
  topology: CircuitTopologyData
  components: WDFComponentMeta[]
  bypasses: Record<string, boolean>
  multipliers: Record<string, number>
  selectedComponent: string | null
  highlightedComponents?: string[]
  dimOthers?: boolean
  levels: Record<string, number>
  onSelectComponent: (componentId: string | null) => void
}

interface Point {
  x: number
  y: number
}

const TRACE_Y = 210
const GROUND_Y = 394
const FEEDBACK_LOOP_Y = 108
const SHUNT_BRANCH_Y = 306

function getNodeById(nodes: TopologyNode[], componentId: string): TopologyNode | undefined {
  return nodes.find((node) => node.componentId === componentId)
}

function buildConnectionPath(
  connection: TopologyConnection,
  nodes: TopologyNode[],
  componentMap: Map<string, WDFComponentMeta>,
  signalInputX: number,
  signalOutputX: number,
): string {
  const fromNode = getNodeById(nodes, connection.from)
  const toNode = getNodeById(nodes, connection.to)
  const fromMeta = fromNode ? componentMap.get(fromNode.componentId) : undefined
  const toMeta = toNode ? componentMap.get(toNode.componentId) : undefined

  const fromPoint: Point = connection.from === 'INPUT'
    ? { x: signalInputX, y: TRACE_Y }
    : fromNode
      ? {
          x: fromNode.x + fromNode.width / 2,
          y: connection.to === 'GROUND' || toMeta?.circuitRole === 'shunt'
            ? fromNode.y + fromNode.height / 2
            : fromNode.y,
        }
      : { x: signalInputX, y: TRACE_Y }

  const toPoint: Point = connection.to === 'OUTPUT'
    ? { x: signalOutputX, y: TRACE_Y }
    : connection.to === 'GROUND'
      ? { x: fromPoint.x, y: GROUND_Y }
      : toNode
        ? { x: toNode.x - toNode.width / 2, y: toNode.y }
        : { x: signalOutputX, y: TRACE_Y }

  if (connection.to === 'GROUND') {
    return `M${fromPoint.x} ${fromPoint.y} L${fromPoint.x} ${GROUND_Y}`
  }

  const fromRole = fromMeta?.circuitRole
  const toRole = toMeta?.circuitRole

  if (fromRole === 'series' && toRole === 'feedback') {
    return `M${fromPoint.x} ${fromPoint.y} L${fromPoint.x} ${FEEDBACK_LOOP_Y} L${toPoint.x} ${FEEDBACK_LOOP_Y} L${toPoint.x} ${toPoint.y}`
  }

  if (fromRole === 'feedback' && toRole === 'feedback') {
    if (Math.abs(fromPoint.y - toPoint.y) < 1) {
      return `M${fromPoint.x} ${fromPoint.y} L${toPoint.x} ${toPoint.y}`
    }
    return `M${fromPoint.x} ${fromPoint.y} L${fromPoint.x} ${FEEDBACK_LOOP_Y} L${toPoint.x} ${FEEDBACK_LOOP_Y} L${toPoint.x} ${toPoint.y}`
  }

  if (fromRole === 'feedback' && toRole === 'series') {
    return `M${fromPoint.x} ${fromPoint.y} L${fromPoint.x} ${FEEDBACK_LOOP_Y} L${toPoint.x} ${FEEDBACK_LOOP_Y} L${toPoint.x} ${toPoint.y}`
  }

  if (toRole === 'shunt') {
    return `M${fromPoint.x} ${fromPoint.y} L${fromPoint.x} ${SHUNT_BRANCH_Y} L${toPoint.x} ${SHUNT_BRANCH_Y} L${toPoint.x} ${toPoint.y}`
  }

  if (Math.abs(fromPoint.y - toPoint.y) < 1) {
    return `M${fromPoint.x} ${fromPoint.y} L${toPoint.x} ${toPoint.y}`
  }

  const midX = fromPoint.x < toPoint.x
    ? Math.round(fromPoint.x + (toPoint.x - fromPoint.x) * 0.5)
    : Math.round(toPoint.x + (fromPoint.x - toPoint.x) * 0.5)
  return `M${fromPoint.x} ${fromPoint.y} L${midX} ${fromPoint.y} L${midX} ${toPoint.y} L${toPoint.x} ${toPoint.y}`
}

export function CircuitTopology({
  topology,
  components,
  bypasses,
  multipliers,
  selectedComponent,
  highlightedComponents = [],
  dimOthers = false,
  levels,
  onSelectComponent,
}: CircuitTopologyProps) {
  const componentMap = useMemo(() => new Map(components.map((component) => [component.id, component])), [components])
  const highlightedSet = useMemo(() => new Set(highlightedComponents), [highlightedComponents])
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [showOverflowHint, setShowOverflowHint] = useState(false)

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    const updateOverflowHint = () => {
      const overflows = element.scrollWidth - element.clientWidth > 1
      const atRightEdge = element.scrollLeft + element.clientWidth >= element.scrollWidth - 1
      setShowOverflowHint(overflows && !atRightEdge)
    }

    updateOverflowHint()
    element.addEventListener('scroll', updateOverflowHint, { passive: true })
    window.addEventListener('resize', updateOverflowHint)

    return () => {
      element.removeEventListener('scroll', updateOverflowHint)
      window.removeEventListener('resize', updateOverflowHint)
    }
  }, [topology.viewBox.width, topology.nodes.length, selectedComponent, highlightedComponents.length])

  return (
    <section className="panel topology-panel">
      <div className="panel-title">SIGNAL TOPOLOGY</div>
      <div ref={scrollRef} className={showOverflowHint ? 'topology-scroll has-overflow' : 'topology-scroll'}>
        <svg
          className="topology-svg"
          viewBox={`0 0 ${topology.viewBox.width} ${topology.viewBox.height}`}
          onClick={() => onSelectComponent(null)}
        >
          <line x1={topology.signalInputX} y1={TRACE_Y} x2={topology.signalOutputX} y2={TRACE_Y} className="topology-baseline" />
          <line x1={topology.signalInputX} y1={TRACE_Y} x2={topology.signalOutputX} y2={TRACE_Y} className="signal-trace" />

          {topology.connections.map((connection) => (
            <path
              key={`${connection.from}-${connection.to}`}
              d={buildConnectionPath(connection, topology.nodes, componentMap, topology.signalInputX, topology.signalOutputX)}
              className="topology-connection"
            />
          ))}

          {topology.stages.map((stage) => (
            <text key={stage.id} x={(stage.startX + stage.endX) / 2} y={30} textAnchor="middle" className="stage-label">
              {stage.name}
            </text>
          ))}

          {topology.nodes.map((node) => {
            const component = componentMap.get(node.componentId)
            if (!component) return null

            return (
              <ComponentNode
                key={node.componentId}
                node={node}
                meta={component}
                selected={selectedComponent === node.componentId}
                highlighted={highlightedSet.has(node.componentId)}
                dimmed={dimOthers && highlightedSet.size > 0 && !highlightedSet.has(node.componentId)}
                bypassed={Boolean(bypasses[node.componentId])}
                multiplier={multipliers[node.componentId] ?? 1}
                level={levels[node.componentId] ?? 0}
                onSelect={onSelectComponent}
              />
            )
          })}

          <circle cx={topology.signalInputX} cy={TRACE_Y} r={2.6} className="topology-io-dot" />
          <circle cx={topology.signalOutputX} cy={TRACE_Y} r={2.6} className="topology-io-dot" />
          <line x1={topology.signalInputX} y1={GROUND_Y} x2={topology.signalOutputX} y2={GROUND_Y} className="topology-ground" />
        </svg>
      </div>
    </section>
  )
}
