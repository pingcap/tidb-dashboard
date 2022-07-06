import React, { useEffect, useState, useMemo, useRef } from 'react'
import { HierarchyPointLink, HierarchyPointNode } from 'd3'

import NodeWrapper from './NodeWrapper'
import LinkWrapper from './LinkWrapper'
import { TreeNodeDatum, nodeMarginType } from './types'
import { generateNodesAndLinks } from './utlis'
import { rectBound } from './types'

interface SingleTreeProps {
  datum: TreeNodeDatum
  treeIdx: number
  nodeMargin?: nodeMarginType
  zoomToFitViewportScale: number
  customLinkElement: any
  customNodeElement: any
  onNodeExpandBtnToggle?: any
  onNodeDetailClick?: any
  adjustPosition: rectBound
  getTreePosition: (number) => any
}

const SingleTree = ({
  datum,
  treeIdx,
  nodeMargin,
  zoomToFitViewportScale,
  customLinkElement,
  customNodeElement,
  onNodeExpandBtnToggle,
  onNodeDetailClick,
  adjustPosition,
  getTreePosition,
}: SingleTreeProps) => {
  const singleTreeGroupRef = useRef(null)
  const inited = useRef(false)
  const [nodes, setNodes] = useState<HierarchyPointNode<TreeNodeDatum>[]>([])
  const [links, setLinks] = useState<HierarchyPointLink<TreeNodeDatum>[]>([])
  const [treePosition, setTreePosition] = useState({
    x: 0,
    y: 0,
    offset: 0,
  })

  const margin: nodeMarginType = useMemo(
    () => ({
      siblingMargin: nodeMargin?.childrenMargin || 40,
      childrenMargin: nodeMargin?.siblingMargin || 60,
    }),
    [nodeMargin?.childrenMargin, nodeMargin?.siblingMargin]
  )

  useEffect(() => {
    if (!datum) {
      return
    }
    const { nodes, links } = generateNodesAndLinks(datum, margin)
    setNodes(nodes)
    setLinks(links)
  }, [datum, margin])

  useEffect(() => {
    if (!nodes.length || inited.current) {
      return
    }

    inited.current = true
    const position = getTreePosition(treeIdx)
    setTreePosition(position)
  }, [nodes, getTreePosition])

  return (
    // tranform is the relative position to the original point [0,0] when initiated.
    <g
      className={`singleTreeGroup-${treeIdx}`}
      ref={singleTreeGroupRef}
      transform={`translate(${
        zoomToFitViewportScale * (-treePosition.x + treePosition.offset) +
        adjustPosition.width
      }, ${
        zoomToFitViewportScale * treePosition.y + adjustPosition.height
      }) scale(${zoomToFitViewportScale})`}
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

export default SingleTree
