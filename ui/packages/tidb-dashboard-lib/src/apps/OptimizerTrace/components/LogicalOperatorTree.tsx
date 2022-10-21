import React, { useEffect, useRef } from 'react'
import { graphviz } from 'd3-graphviz'

import styles from './OperatorTree.module.less'

interface LogicalOperatorTreeProps {
  data: LogicalOperatorNode[]
  labels?: any
  className?: string
}

export interface LogicalOperatorNode {
  id: number
  children: number[] // children id
  type: string
  cost: number
  selected: boolean
  property: string
  info: string
}

export default function LogicalOperatorTree({
  data,
  labels = {},
  className
}: LogicalOperatorTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const containerEl = containerRef.current
    if (!containerEl) {
      return
    }

    const define = data
      .map(
        (n) =>
          `${n.id} ${createLabels({
            label: `${n.type}_${n.id}`,
            color: labels.color || '',
            tooltip: `info: ${n.info}`
          })};\n`
      )
      .join('')
    // console.log('define:', define)
    const link = data
      .map((n) =>
        (n.children || [])
          .map((c) => `${n.id} -> ${c} ${createLabels(labels)};\n`)
          .join('')
      )
      .join('')
    // console.log('link:', link)

    graphviz(containerEl).renderDot(
      `digraph {
node [shape=ellipse fontsize=8 fontname="Verdana"];
${define}\n${link}\n}`
    )
  }, [containerRef, data, labels])

  function handleClick(e) {
    console.log(e.target)
    console.log(e.target.parentNode)
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.operator_tree} ${className || ''}`}
      onClick={handleClick}
    ></div>
  )
}

export function createLabels(labels: { [props: string]: string } = {}): string {
  const ls = Object.entries(labels).filter(([k, v]) => !!v)
  if (!ls.length) {
    return ''
  }
  return `[${ls.map(([k, v]) => `${k}="${v}"`).join(' ')}]`
}
