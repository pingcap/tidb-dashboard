import React, { useEffect, useRef, useMemo, useState } from 'react'
import { graphviz } from 'd3-graphviz'

import { createLabels } from './LogicalOperatorTree'

import styles from './OperatorTree.module.less'

export interface PhyscialCostParam {
  id: number // for generate graphviz

  name: string
  desc: string
  cost: number
  // null means this node can be replaced by a root node
  // undefined means this node is a leaf node, it is converted from a number leaf node
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
      // convert the leaf node
      // its orignal type is number
      // convert to leaf PhysicalCostParam with `params: undefined`
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

interface BoolMap {
  [x: string]: boolean
}

type Expands = BoolMap

/////////////

function genGraphvizNodeParam(
  param: PhyscialCostParam,
  strArr: string[],
  expands: Expands
) {
  let str = ''
  if (param.params === undefined) {
    // leaf node
    str = `${param.id} ${createLabels({
      label: `${param.name}\n${param.cost.toFixed(4)}`,
      fillcolor: '#cffafe',
      tooltip: `${param.id}`
    })};\n`
  } else {
    str = `${param.id} ${createLabels({
      label: `${param.name}\ncost: ${param.cost.toFixed(4)}\ndesc: ${
        param.desc
      }`,
      fillcolor: 'white',
      tooltip: `${param.id}`
    })};\n`
  }
  strArr.push(str)

  if (param.params === null || param.params === undefined) {
    return
  }
  if (expands[param.id] !== true) {
    // not expand
    return
  }
  genGraphvizNodeParams(param.params, strArr, expands)
}

function genGraphvizNodeParams(
  params: { [x: string]: number | PhyscialCostParam },
  strArr: string[],
  expands: Expands
) {
  Object.values(params).forEach((p) => {
    // number has already converted to PhyscialCostParam
    // it doesn't exist alreay in fact
    if (typeof p !== 'number') {
      genGraphvizNodeParam(p, strArr, expands)
    }
  })
}

function genGraphvizNodes(root: PhysicalCostRoot, expands: Expands) {
  const strArr: string[] = []

  strArr.push(
    `${root.id} ${createLabels({
      label: `${root.type}_${root.id}\ncost: ${root.cost.toFixed(4)}\ndesc: ${
        root.desc
      }`,
      fillcolor: 'white',
      tooltip: `${root.id}`
    })};\n`
  )
  if (expands[root.id] === true) {
    genGraphvizNodeParams(root.params, strArr, expands)
  }

  return strArr
}

//////////////////////

function genGraphvizLineParam(
  parentId: number,
  param: PhyscialCostParam,
  strArr: string[],
  expands: Expands
) {
  if (expands[parentId] !== true) {
    return
  }

  strArr.push(`${parentId} -> ${param.id};\n`)

  if (param.params === null || param.params === undefined) {
    return
  }

  genGraphvizLineParams(param.id, param.params, strArr, expands)
}

function genGraphvizLineParams(
  parentId: number,
  params: { [x: string]: number | PhyscialCostParam },
  strArr: string[],
  expands: Expands
) {
  Object.values(params).forEach((p) => {
    // number has already converted to PhyscialCostParam
    // it doesn't exist alreay in fact
    if (typeof p !== 'number') {
      genGraphvizLineParam(parentId, p, strArr, expands)
    }
  })
}

function genGraphvizLines(root: PhysicalCostRoot, expands: Expands) {
  const strArr: string[] = []
  genGraphvizLineParams(root.id, root.params, strArr, expands)
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

    return root
  }, [costs, name])

  const [nodeExpands, setNodeExpands] = useState<Expands>({})

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setNodeExpands({})
  }, [name])

  useEffect(() => {
    if (!costRoot) {
      return
    }
    const containerEl = containerRef.current
    if (!containerEl) {
      return
    }

    const define = genGraphvizNodes(costRoot, nodeExpands).join('')
    const link = genGraphvizLines(costRoot, nodeExpands).join('')
    graphviz(containerEl).renderDot(
      `digraph {
  node [shape=ellipse fontsize=8 fontname="Verdana" style="filled"];
  ${define}\n${link}\n}`
    )
  }, [containerRef, costRoot, nodeExpands])

  function handleClick(e) {
    const trigger = e.target
    const parent = e.target.parentNode
    // find clicked node
    if (
      (trigger?.tagName === 'text' || trigger?.tagName === 'ellipse') &&
      parent?.tagName === 'a'
    ) {
      console.log('title:', parent.getAttribute('title'))
      const id = parent.getAttribute('title')

      // toggle
      setNodeExpands({
        ...nodeExpands,
        [id]: !(nodeExpands[id] ?? false)
      })
    }
  }

  return (
    <div>
      {costRoot ? (
        <div
          ref={containerRef}
          className={`${styles.operator_tree} ${styles.cost_tree} ${
            className || ''
          }`}
          onClick={handleClick}
        ></div>
      ) : (
        <p>Not exist</p>
      )}
    </div>
  )
}
