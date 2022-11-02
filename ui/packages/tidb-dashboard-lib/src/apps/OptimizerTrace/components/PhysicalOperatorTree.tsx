import React, { useEffect, useRef } from 'react'
import { graphviz } from 'd3-graphviz'
import { FullscreenOutlined } from '@ant-design/icons'

import { LogicalOperatorNode, createLabels } from './LogicalOperatorTree'

import styles from './OperatorTree.module.less'

export interface PhysicalOperatorNode extends LogicalOperatorNode {
  parentNode: null | PhysicalOperatorNode
  childrenNodes: PhysicalOperatorNode[]
  mapping: string
}

interface PhysicalOperatorTreeProps {
  data: PhysicalOperatorNode
  className?: string
  onSelect?: (name: string) => void
  nodeName: string
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
  className,
  onSelect,
  nodeName
}: PhysicalOperatorTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const containerEl = containerRef.current
    if (!containerEl) {
      return
    }

    let allDatas: PhysicalOperatorNode[] = []
    convertTreeToArry(data, allDatas)
    const define = allDatas
      .map(
        (n) =>
          `${n.id} ${createLabels({
            label: `${n.type}_${n.id}\ncost: ${n.cost.toFixed(4)}`,
            color: n.selected ? '#4169E1' : '',
            fillcolor: `${n.type}_${n.id}` === nodeName ? '#7dd3fc' : 'white',
            tooltip: `info: ${n.info}`
          })};\n`
      )
      .join('')
    const link = allDatas
      .map((n) =>
        (n.children || [])
          .map(
            (c) =>
              `${n.id} -> ${c} ${createLabels({
                color: n.selected ? '#4169E1' : ''
              })};\n`
          )
          .join('')
      )
      .join('')

    graphviz(containerEl).renderDot(
      `digraph {
  node [shape=ellipse fontsize=8 fontname="Verdana" style="filled"];
  ${define}\n${link}\n}`
    )
  }, [containerRef, data, nodeName])

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

export function PhysicalOperatorTreeWithFullScreen({
  onFullScreen,
  ...rest
}: PhysicalOperatorTreeProps & {
  onFullScreen: () => void
}) {
  return (
    <div className={styles.tree_container}>
      <div className={styles.fullscreen_icon_box}>
        <FullscreenOutlined onClick={() => onFullScreen()} />
      </div>
      <PhysicalOperatorTree {...rest} />
    </div>
  )
}
