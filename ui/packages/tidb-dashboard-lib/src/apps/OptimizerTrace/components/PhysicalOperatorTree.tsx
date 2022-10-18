import React, { useEffect, useRef } from 'react'
import { graphviz } from 'd3-graphviz'

import styles from './OperatorTree.module.less'
import { LogicalOperatorNode, createLabels } from './LogicalOperatorTree'

export interface PhysicalOperatorNode extends LogicalOperatorNode {
  parentNode: null | PhysicalOperatorNode
  childrenNodes: PhysicalOperatorNode[]
  mapping: string
}

interface PhysicalOperatorTreeProps {
  data: PhysicalOperatorNode
  className?: string
}

function convertTreeToArry(
  node: PhysicalOperatorNode,
  arr: PhysicalOperatorNode[]
) {
  arr.push(node)
  if (node.childrenNodes) {
    node.childrenNodes.forEach((n) => convertTreeToArry(n, arr))
  }
}

export default function PhysicalOperatorTree({
  data,
  className
}: PhysicalOperatorTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const containerEl = containerRef.current
    if (!containerEl) {
      return
    }

    console.log('physcial data:', data)

    // const allDatas = [data, ...(data.childrenNodes || [])]
    let allDatas: PhysicalOperatorNode[] = []
    convertTreeToArry(data, allDatas)
    const define = allDatas
      .map(
        (n) =>
          `${n.id} ${createLabels({
            label: `${n.type}_${n.id}\ncost: ${n.cost.toFixed(4)}`,
            color: n.selected ? 'blue' : '',
            tooltip: `info: ${n.info}`
          })};\n`
      )
      .join('')
    console.log('define:', define)
    const link = allDatas
      .map((n) =>
        (n.children || [])
          .map(
            (c) =>
              `${n.id} -- ${c} ${createLabels({
                color: n.selected ? 'blue' : ''
              })};\n`
          )
          .join('')
      )
      .join('')
    console.log('link:', link)

    graphviz(containerEl).renderDot(
      `graph {
  node [shape=ellipse fontsize=8 fontname="Verdana"];
  ${define}\n${link}\n}`
    )
  }, [containerRef, data])

  return (
    <div
      ref={containerRef}
      className={`${styles.operator_tree} ${className || ''}`}
    ></div>
  )
}
