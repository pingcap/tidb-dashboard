import React, { useEffect, useRef } from 'react'
import { graphviz } from 'd3-graphviz'

import styles from './OperatorTree.module.less'

interface LogicalOperatorTreeProps {
  data: LogicalOperatorNode[]
  labels?: any
  className?: string

  nodeName?: string
  onSelect?: (name: string) => void
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
  className,

  nodeName,
  onSelect
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
            fillcolor: `${n.type}_${n.id}` === nodeName ? '#bfdbfe' : 'white',
            tooltip: `info: ${n.info}`
          })};\n`
      )
      .join('')
    const link = data
      .map((n) =>
        (n.children || [])
          .map((c) => `${n.id} -> ${c} ${createLabels(labels)};\n`)
          .join('')
      )
      .join('')

    graphviz(containerEl).renderDot(
      `digraph {
node [shape=ellipse fontsize=8 fontname="Verdana" style="filled"];
${define}\n${link}\n}`
    )
  }, [containerRef, data, labels, nodeName])

  // find clicked node
  function handleClick(e) {
    const trigger = e.target
    const parent = e.target.parentNode
    if (
      (trigger?.tagName === 'text' || trigger?.tagName === 'ellipse') &&
      parent?.tagName === 'a'
    ) {
      for (const el of parent.children) {
        if (el.tagName === 'text') {
          onSelect?.(el.innerHTML)
          break
        }
      }
    }
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
