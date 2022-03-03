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

export default function PhysicalOperatorTree({
  data,
  className,
}: PhysicalOperatorTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const containerEl = containerRef.current
    if (!containerEl) {
      return
    }

    const allDatas = [data, ...(data.childrenNodes || [])]
    const define = allDatas
      .map(
        (n) =>
          `${n.id} ${createLabels({
            label: `${n.type}_${n.id}\ncost: ${n.cost}`,
            color: n.selected ? 'blue' : '',
            tooltip: `info: ${n.info}`,
          })};\n`
      )
      .join('')
    const link = allDatas
      .map((n) =>
        (n.children || [])
          .map(
            (c) =>
              `${n.id} -- ${c} ${createLabels({
                color: n.selected ? 'blue' : '',
              })};\n`
          )
          .join('')
      )
      .join('')

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
