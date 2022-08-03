import React, { useMemo } from 'react'
import { DeadlockModel } from '@lib/client'

interface NodeMeta {
  x: number
  y: number
  connectInX: number
  connectInY: number
  connectOutX: number
  connectOutY: number
}

function calcCircularLayout(
  center: { x: number; y: number },
  circularRadius: number,
  nodeSize: number,
  nodeRadius: number
): Array<NodeMeta> {
  let result: Array<NodeMeta> = []
  const outAngle = (2 * Math.PI) / nodeSize
  const halfInnerAngle = (Math.PI * (nodeSize - 2)) / nodeSize / 2
  let currentNodeConnectInX = center.x - Math.sin(halfInnerAngle) * nodeRadius
  let currentNodeConnectInY =
    center.y + circularRadius - Math.cos(halfInnerAngle) * nodeRadius
  let currentNodeConnectOutX = center.x + Math.sin(halfInnerAngle) * nodeRadius
  let currentNodeConnectOutY =
    center.y + circularRadius - Math.cos(halfInnerAngle) * nodeRadius
  let angle = 0
  for (let i = 0; i < nodeSize; ++i) {
    angle += outAngle
    const x = center.x + circularRadius * Math.sin(angle)
    const y = center.y + circularRadius * Math.cos(angle)

    result.push({
      x: x,
      y: y,
      connectInX: currentNodeConnectInX,
      connectInY: currentNodeConnectInY,
      connectOutX: currentNodeConnectOutX,
      connectOutY: currentNodeConnectOutY
    })

    const newNodeConnectInX =
      (currentNodeConnectInX - center.x) * Math.cos(outAngle) -
      (currentNodeConnectInY - center.y) * Math.sin(outAngle) +
      center.x
    const newNodeConnectInY =
      (currentNodeConnectInX - center.x) * Math.sin(outAngle) +
      (currentNodeConnectInY - center.y) * Math.cos(outAngle) +
      center.y
    currentNodeConnectInX = newNodeConnectInX
    currentNodeConnectInY = newNodeConnectInY

    const newNodeConnectOutX =
      (currentNodeConnectOutX - center.x) * Math.cos(outAngle) -
      (currentNodeConnectOutY - center.y) * Math.sin(outAngle) +
      center.x
    const newNodeConnectOutY =
      (currentNodeConnectOutX - center.x) * Math.sin(outAngle) +
      (currentNodeConnectOutY - center.y) * Math.cos(outAngle) +
      center.y
    currentNodeConnectOutX = newNodeConnectOutX
    currentNodeConnectOutY = newNodeConnectOutY
  }
  return result
}

interface Prop {
  deadlockChain: DeadlockModel[]
}

function DeadlockChainGraph(prop: Prop) {
  const data = useMemo(() => {
    return {
      nodes: prop.deadlockChain.map((it) => {
        return { id: it.try_lock_trx_id }
      }),
      links: prop.deadlockChain.map((d, i) => ({
        source: i,
        target: prop.deadlockChain.findIndex(
          (it) => it.trx_holding_lock === d.try_lock_trx_id
        ),
        type: 'blocked',
        key: d.key
      }))
    }
  }, [prop.deadlockChain])
  const nodeRadius = 30
  const layout = useMemo(
    () => calcCircularLayout({ x: 150, y: 150 }, 100, data.nodes.length, 30),
    [data.nodes.length]
  )
  return (
    <svg className="container" height={300} width={300}>
      <defs>
        <marker
          id="triangle"
          markerUnits="strokeWidth"
          markerWidth="5"
          markerHeight="4"
          refX="5"
          refY="2"
          orient="auto"
        >
          <path d="M 0 0 L 5 2 L 0 4 z" />
        </marker>
      </defs>
      {data.links.map((link, index) => (
        <path
          d={`M ${layout[link.source].connectOutX},${
            layout[link.source].connectOutY
          } A 100,100 ${-360 / data.nodes.length} 0,0 ${
            layout[link.target].connectInX
          },${layout[link.target].connectInY}`}
          key={`line-${index}`}
          fill="none"
          stroke="#4679BD"
          markerEnd="url(#triangle)"
        />
      ))}
      {data.nodes.map((n, i) => (
        <g key={n.id}>
          <circle
            cx={layout[i].x}
            cy={layout[i].y}
            r={nodeRadius}
            fill="white"
            stroke="#000"
          />
          <text textAnchor="middle" x={layout[i].x} y={layout[i].y + 5}>
            {n.id?.toString().slice(n.id.toString().length - 6)}
          </text>
        </g>
      ))}
    </svg>
  )
}

export default DeadlockChainGraph
