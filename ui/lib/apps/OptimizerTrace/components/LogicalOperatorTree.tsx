import React, { useEffect, useRef, useMemo } from 'react'
import Viz from 'viz.js'
import workerURL from 'viz.js/full.render'

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
  className,
}: LogicalOperatorTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viz = useMemo(() => new Viz(workerURL), [])

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
            tooltip: n.info,
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
  }, [containerRef, data, viz, labels])

  return (
    <div
      ref={containerRef}
      className={`${styles.operator_tree} ${className || ''}`}
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
