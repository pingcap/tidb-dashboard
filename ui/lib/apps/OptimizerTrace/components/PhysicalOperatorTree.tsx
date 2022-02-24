import React, { useEffect, useRef, useMemo } from 'react'
import Viz from 'viz.js'
import workerURL from 'viz.js/full.render'

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
  const viz = useMemo(() => new Viz(workerURL), [])

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
            label: n.type,
            color: n.selected ? 'blue' : '',
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

    viz
      .renderSVGElement(
        `digraph {
  node [shape=ellipse fontsize=8 fontname="Verdana"];
  ${define}\n${link}\n}`
      )
      .then((el) => {
        if (!containerEl) {
          return
        }
        while (containerEl.firstChild) {
          containerEl.removeChild(containerEl.firstChild)
        }
        containerEl.appendChild(el)
      })
  }, [containerRef, data, viz])

  return (
    <div
      ref={containerRef}
      className={`${styles.operator_tree} ${className || ''}`}
    ></div>
  )
}
