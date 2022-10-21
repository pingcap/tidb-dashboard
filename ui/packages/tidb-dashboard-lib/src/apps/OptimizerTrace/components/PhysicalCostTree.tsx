import React, { useEffect, useRef, useState, useMemo } from 'react'
import { graphviz } from 'd3-graphviz'

import styles from './OperatorTree.module.less'
import { createLabels } from './LogicalOperatorTree'

export interface PhyscialCostParam {
  id: number // for generate graphviz

  name: string
  desc: string
  cost: number
  params: null | undefined | { [x: string]: number | PhyscialCostParam }
}

export interface PhysicalCostRoot {
  id: number
  type: string
  cost: number
  desc: string
  params: { [x: string]: number | PhyscialCostParam }
}

export interface PhysicalCostMap {
  [x: string]: PhysicalCostRoot
}

interface PhysicalCostTreeProps {
  costs: PhysicalCostMap
  name: string
  className?: string
}

let globalId = 1

function buildCostParam(costs: PhysicalCostMap, param: PhyscialCostParam) {
  param.id = globalId++
  if (param.params === null) {
    // if null, means this cost is a PhysicalCostRoot
    const root = costs[param.name]
    if (!root) {
      throw new Error(`cost for ${param.name} not exist`)
    }
    param.params = root.params
    // nested operator desc may be not correct, let's fix it by root.desc
    param.desc = root.desc
  }
  if (param.params === undefined) {
    // reach leaf node
    return
  }
  // traverse
  buildCostParams(costs, param.params)
}

function buildCostParams(
  costs: PhysicalCostMap,
  params: { [x: string]: number | PhyscialCostParam }
) {
  Object.keys(params).forEach((k) => {
    const v = params[k]
    if (typeof v === 'number') {
      params[k] = {
        id: globalId++,
        name: k,
        desc: '',
        params: undefined,
        cost: v
      }
    } else {
      buildCostParam(costs, v)
    }
  })
}

function buildCostTree(costs: PhysicalCostMap, root: PhysicalCostRoot) {
  globalId = root.id + 1
  buildCostParams(costs, root.params)
}

/////////////

function genGraphvizNodeParam(param: PhyscialCostParam, strArr: string[]) {
  let str = ''
  if (param.params === undefined) {
    try {
      // leaf node
      str = `${param.id} ${createLabels({
        label: `${param.name}\n${param.cost.toFixed(4)}\n`
      })};\n`
    } catch (err) {
      console.log('err:', err, param)
    }
  } else {
    str = `${param.id} ${createLabels({
      label: `${param.name}\ncost: ${param.cost.toFixed(4)}\ndesc: ${
        param.desc
      }`
    })};\n`
  }
  strArr.push(str)

  if (param.params === null || param.params === undefined) {
    return
  }
  genGraphvizNodeParams(param.params, strArr)
}

function genGraphvizNodeParams(
  params: { [x: string]: number | PhyscialCostParam },
  strArr: string[]
) {
  Object.values(params).forEach((p) => {
    // number has already converted to PhyscialCostParam
    // it doesn't exist alreay in fact
    if (typeof p !== 'number') {
      genGraphvizNodeParam(p, strArr)
    }
  })
}

function genGraphvizNodes(root: PhysicalCostRoot) {
  const strArr: string[] = []

  strArr.push(
    `${root.id} ${createLabels({
      label: `${root.type}_${root.id}\ncost: ${root.cost.toFixed(4)}\ndesc: ${
        root.desc
      }`
    })};\n`
  )
  genGraphvizNodeParams(root.params, strArr)

  return strArr
}

//////////////////////

function genGraphvizLineParam(
  parentId: number,
  param: PhyscialCostParam,
  strArr: string[]
) {
  strArr.push(`${parentId} -> ${param.id};\n`)

  if (param.params === null || param.params === undefined) {
    return
  }

  genGraphvizLineParams(param.id, param.params, strArr)
}

function genGraphvizLineParams(
  parentId: number,
  params: { [x: string]: number | PhyscialCostParam },
  strArr: string[]
) {
  Object.values(params).forEach((p) => {
    // number has already converted to PhyscialCostParam
    // it doesn't exist alreay in fact
    if (typeof p !== 'number') {
      genGraphvizLineParam(parentId, p, strArr)
    }
  })
}

function genGraphvizLines(root: PhysicalCostRoot) {
  const strArr: string[] = []
  genGraphvizLineParams(root.id, root.params, strArr)
  return strArr
}

//////////////////////

export default function PhysicalCostTree({
  costs,
  name,
  className
}: PhysicalCostTreeProps) {
  const costRoot = useMemo(() => {
    const root = costs[name]

    if (root) {
      buildCostTree(costs, root)
    }

    console.log('==========root:', root)

    return root
  }, [costs, name])

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!costRoot) {
      return
    }
    const containerEl = containerRef.current
    if (!containerEl) {
      return
    }

    const define = genGraphvizNodes(costRoot).join('')
    console.log('define:', define)
    const link = genGraphvizLines(costRoot).join('')
    console.log('link:', link)
    graphviz(containerEl).renderDot(
      `digraph {
  node [shape=ellipse fontsize=8 fontname="Verdana"];
  ${define}\n${link}\n}`
    )
  }, [containerRef, costRoot])

  return (
    <div>
      <h2>Cost for {name}</h2>
      {costRoot ? (
        <div
          ref={containerRef}
          className={`${styles.operator_tree} ${styles.cost_tree} ${
            className || ''
          }`}
        ></div>
      ) : (
        <p>Not exist</p>
      )}
    </div>
  )
}
