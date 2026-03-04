import { useMemo } from 'react'
import type { CircuitTopologyData, TopologyConnection, TopologyNode } from '../../audio/wdf/topology'
import type { WDFComponentMeta } from '../../audio/wdf/types'
import { ComponentNode } from './ComponentNode'

interface CircuitTopologyProps {
  topology: CircuitTopologyData
  components: WDFComponentMeta[]
  bypasses: Record<string, boolean>
  multipliers: Record<string, number>
  selectedComponent: string | null
  levels: Record<string, number>
  onSelectComponent: (componentId: string | null) => void
}

interface Point {
  x: number
  y: number
}

const TRACE_Y = 110
const GROUND_Y = 196

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
  const toMeta = toNode ? componentMap.get(toNode.componentId) : undefined

  const fromPoint: Point = connection.from === 'INPUT'
    ? { x: signalInputX, y: TRACE_Y }
    : fromNode
      ? {
          x: fromNode.x + fromNode.width / 2,
          y: connection.to === 'GROUND' || toMeta?.circuitRole === 'shunt' ? fromNode.y + fromNode.height / 2 : fromNode.y,
        }
      : { x: signalInputX, y: TRACE_Y }

  const toPoint: Point = connection.to === 'OUTPUT'
    ? { x: signalOutputX, y: TRACE_Y }
    : connection.to === 'GROUND'
      ? { x: fromPoint.x, y: GROUND_Y }
      : toNode
        ? {
            x: toNode.x - toNode.width / 2,
            y: toMeta?.circuitRole === 'feedback' ? toNode.y : toNode.y,
          }
        : { x: signalOutputX, y: TRACE_Y }

  if (Math.abs(fromPoint.y - toPoint.y) < 1) {
    return `M${fromPoint.x} ${fromPoint.y} L${toPoint.x} ${toPoint.y}`
  }

  const midX = Math.round((fromPoint.x + toPoint.x) / 2)
  return `M${fromPoint.x} ${fromPoint.y} L${midX} ${fromPoint.y} L${midX} ${toPoint.y} L${toPoint.x} ${toPoint.y}`
}

export function CircuitTopology({
  topology,
  components,
  bypasses,
  multipliers,
  selectedComponent,
  levels,
  onSelectComponent,
}: CircuitTopologyProps) {
  const componentMap = useMemo(() => new Map(components.map((component) => [component.id, component])), [components])

  return (
    <section className="panel topology-panel">
      <div className="panel-title">SIGNAL TOPOLOGY</div>
      <div className="topology-scroll">
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
            <text key={stage.id} x={(stage.startX + stage.endX) / 2} y={26} textAnchor="middle" className="stage-label">
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
