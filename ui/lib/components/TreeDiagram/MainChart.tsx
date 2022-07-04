import React, { useEffect, useMemo, useRef, useState } from 'react'
import { HierarchyPointLink, HierarchyPointNode } from 'd3'

import { nodeMarginType, Translate, TreeNodeDatum } from './types'
import NodeWrapper from './NodeWrapper'
import LinkWrapper from './LinkWrapper'
import { generateNodesAndLinks } from './utlis'

interface MainChartProps {
  treeIdx: number
  datum: TreeNodeDatum
  treeTranslate: Translate
  customLinkElement: any
  customNodeElement: any

  onNodeExpandBtnToggle: any
  onNodeDetailClick: any
  // onInit?: () => void
  getOffset?: (number) => any

  nodeMargin?: nodeMarginType
}

const MainChart = ({
  treeIdx,
  datum,
  nodeMargin,
  treeTranslate,
  customLinkElement,
  customNodeElement,
  onNodeExpandBtnToggle,
  onNodeDetailClick,
  // onInit,
  getOffset,
}: MainChartProps) => {
  const inited = useRef(false)
  const [nodes, setNodes] = useState<HierarchyPointNode<TreeNodeDatum>[]>([])
  const [links, setLinks] = useState<HierarchyPointLink<TreeNodeDatum>[]>([])
  const [bound, setBound] = useState({ x: 0, height: 0 })
  const margin: nodeMarginType = useMemo(
    () => ({
      siblingMargin: nodeMargin?.childrenMargin || 40,
      childrenMargin: nodeMargin?.siblingMargin || 60,
    }),
    [nodeMargin?.childrenMargin, nodeMargin?.siblingMargin]
  )
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (!datum) {
      return
    }
    const { nodes, links } = generateNodesAndLinks(datum, margin)
    setNodes(nodes)
    setLinks(links)
  }, [datum, margin])

  // TODO: may be better to use svg event to emit render inited event
  useEffect(() => {
    if (!nodes.length || inited.current) {
      return
    }
    inited.current = true
    const res = getOffset?.(treeIdx)
    console.log('h', res)
    setOffset(res.offset)
    setBound({ x: res.x, y: res.y })
  }, [nodes, getOffset])

  return (
    <g
      className={`mainChartGroup-${treeIdx}`}
      transform={`translate(${treeTranslate.k * (-bound.x + offset)}, ${
        treeTranslate.k * bound.y
      }) scale(${treeTranslate.k})`}
    >
      <g className="linksWrapper">
        {links &&
          links.map((link, i) => {
            return (
              <LinkWrapper
                key={i}
                data={link}
                collapsiableButtonSize={{ width: 60, height: 30 }}
                renderCustomLinkElement={customLinkElement}
              />
            )
          })}
      </g>

      <g className="nodesWrapper">
        {nodes &&
          nodes.map((hierarchyPointNode, i) => {
            const { data } = hierarchyPointNode
            return (
              <NodeWrapper
                data={data}
                key={data.name}
                renderCustomNodeElement={customNodeElement}
                hierarchyPointNode={hierarchyPointNode}
                onNodeExpandBtnToggle={onNodeExpandBtnToggle}
                onNodeDetailClick={onNodeDetailClick}
              />
            )
          })}
      </g>
    </g>
  )
}

export default MainChart
