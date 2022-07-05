import React, { useEffect, useState, useMemo } from 'react'
import { AssignInternalProperties } from './utlis'
import { TreeNodeDatum, Translate, nodeMarginType } from './types'
import { generateNodesAndLinks } from './utlis'

import NodeWrapper from './NodeWrapper'
import LinkWrapper from './LinkWrapper'

// imports d3 APIs
import { select } from 'd3-selection'
import { HierarchyPointLink, HierarchyPointNode } from 'd3'

const TreeDiagramThumbnail = ({
  data,
  nodeSize,
  nodeMargin,
  viewport,
  customNodeElement,
  customLinkElement,
}) => {
  const [treeNodeDatum, setTreeNodeDatum] = useState<TreeNodeDatum[]>([])
  const [nodes, setNodes] = useState<HierarchyPointNode<TreeNodeDatum>[]>([])
  const [links, setLinks] = useState<HierarchyPointLink<TreeNodeDatum>[]>([])
  const [translate, setTranslate] = useState<Translate>({ x: 0, y: 0, k: 1 })
  // Sets the bound of entire tree
  const [treeBound, setTreeBound] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  })

  const margin: nodeMarginType = useMemo(
    () => ({
      siblingMargin: nodeMargin?.childrenMargin || 40,
      childrenMargin: nodeMargin?.siblingMargin || 60,
    }),
    [nodeMargin?.childrenMargin, nodeMargin?.siblingMargin]
  )
  const thumbnailContainerWidth = viewport.width
  const thumbnailContainerHeight = viewport.height

  // A SVG container for main chart
  const thumbnailSVGSelection = select('.thumbnailSVG')
  const thumbnailGroupSelection = select('.thumbnailGroup')

  // TODO: what will happen if data changes?
  const getInitTreeDiagramBound = () => {
    const thumbnailGroupNode =
      thumbnailGroupSelection.node() as SVGGraphicsElement
    const { x, y, width, height } = thumbnailGroupNode.getBBox()
    setTreeBound({ x: x, y: y, width: width, height: height })
    setTranslate({ x: -x, y: 0, k: 1 })
  }

  const drawThumbnail = () => {
    thumbnailSVGSelection
      .attr('width', thumbnailContainerWidth)
      .attr('height', thumbnailContainerHeight)
      .attr(
        'viewBox',
        [treeBound.x, treeBound.y, treeBound.width, treeBound.height].join(' ')
      )
      .attr('preserveAspectRatio', 'xMidYMid meet')

    select('.minimap-rect')
      .attr('width', treeBound.width)
      .attr('height', treeBound.height)
      .attr('fill', 'white')

    thumbnailGroupSelection
      .attr('width', treeBound.width)
      .attr('height', treeBound.height)
  }

  useEffect(() => {
    // Assigns all internal properties to tree node
    const treeNodes = AssignInternalProperties(data, nodeSize!)
    setTreeNodeDatum(treeNodes)
  }, [data, nodeSize])

  useEffect(() => {
    if (!treeNodeDatum.length) {
      return
    }
    const { nodes, links } = generateNodesAndLinks(treeNodeDatum[0], margin)
    setNodes(nodes)
    setLinks(links)
  }, [treeNodeDatum, margin])

  // TODO: may be better to use svg event to emit render inited event
  useEffect(() => {
    if (nodes.length === 0) {
      return
    }
    getInitTreeDiagramBound()
  }, [nodes])

  useEffect(() => {
    drawThumbnail()
  }, [treeBound])

  return (
    <div>
      <svg className="thumbnailSVG">
        <rect className="thumbnail-rect"></rect>
        <g className="thumbnailGroup" transform={`translate(0,0) scale(1)`}>
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
                    zoomScale={translate.k}
                  />
                )
              })}
          </g>
        </g>
      </svg>
    </div>
  )
}

TreeDiagramThumbnail.defaultProps = {
  nodeSize: { width: 250, height: 150 },
  nodeMargin: {
    siblingMargin: 40,
    childrenMargin: 60,
  },
}

export default TreeDiagramThumbnail
