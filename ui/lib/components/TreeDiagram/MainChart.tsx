import React, { useEffect, useMemo, useRef, useState } from 'react'
import { HierarchyPointLink, HierarchyPointNode, select } from 'd3'

import { nodeMarginType, Translate, TreeNodeDatum } from './types'
import NodeWrapper from './NodeWrapper'
import LinkWrapper from './LinkWrapper'
import { generateNodesAndLinks } from './utlis'

interface MainChartProps {
  datum: TreeNodeDatum[]
  viewPort: {
    width: number
    height: number
  }
  treeTranslate: Translate
  customLinkElement: any
  customNodeElement: any
  onNodeExpandBtnToggle: any
  onInit?: () => void

  nodeMargin?: nodeMarginType
}

const MainChart = ({
  datum,
  nodeMargin,
  viewPort,
  treeTranslate,
  customLinkElement,
  customNodeElement,
  onNodeExpandBtnToggle,
  onInit,
}: MainChartProps) => {
  const inited = useRef(false)
  const [nodes, setNodes] = useState<HierarchyPointNode<TreeNodeDatum>[]>([])
  const [links, setLinks] = useState<HierarchyPointLink<TreeNodeDatum>[]>([])
  const margin: nodeMarginType = useMemo(
    () =>
      nodeMargin || {
        siblingMargin: 40,
        childrenMargin: 60,
      },
    [nodeMargin]
  )

  useEffect(() => {
    if (!datum.length) {
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
    onInit?.()
  }, [nodes, onInit])

  return (
    <svg
      className="mainChartSVG"
      width={viewPort.width}
      height={viewPort.height}
    >
      <g
        className="mainChartGroup"
        transform={`translate(${treeTranslate.x}, ${treeTranslate.y}) scale(${treeTranslate.k})`}
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
                />
              )
            })}
        </g>
      </g>
    </svg>
  )
}

export default MainChart
