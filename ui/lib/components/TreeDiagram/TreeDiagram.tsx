import React, { useEffect, useState, useRef } from 'react'
import { TreeProps } from './types'
import { RawNodeDatum, TreeNodeDatum, Translate } from './types'
import { hierarchy, HierarchyPointNode, HierarchyPointLink } from 'd3-hierarchy'

import { flextree } from 'd3-flextree'

import * as d3 from 'd3'
import _ from 'lodash'
import { select, event } from 'd3-selection'
import { zoom as d3zoom, zoomIdentity } from 'd3-zoom'
import { v4 as uuidv4 } from 'uuid'

import LinksWrapper from './LinksWrapper'
import NodesWrapper from './NodesWrapper'

import styles from './index.module.less'
import { Button } from 'antd'

const TreeDiagram = (props: TreeProps) => {
  const {
    data,
    dimensions,
    scaleExtent,
    nodeSize,
    collapsiableButtonSize,
    nodeMargin,
    minimapScale,
  } = props

  const { width: viewPortWidth, height: viewPortHeight } = dimensions!
  const { width: nodeSizeWidth, height: nodeSizeHeight } = nodeSize!

  const [treeNodeDatum, setTreeNodeDatum] = useState<TreeNodeDatum[]>()
  const [nodes, setNodes] = useState<HierarchyPointNode<TreeNodeDatum>[]>([])
  const [links, setLinks] = useState<HierarchyPointLink<TreeNodeDatum>[]>([])
  const [initTreeRectBound, setInitTreeRectBound] = useState({
    width: 0,
    height: 0,
  })
  const [translate, setTranslate] = useState<Translate>({
    x: viewPortWidth / 2,
    y: 0,
    k: 1,
  })
  const [isAllNodesExpanded, setIsAllNodesExpanded] = useState(true)
  const [worldSize, setWorldSize] = useState([viewPortWidth, viewPortHeight])

  const treeRef = useRef(null)
  const mainChartContainerSVGRef = useRef(null)
  const mainChartGroupRef = useRef(null)
  const minimapContainerSVGRef = useRef(null)
  const minimapChartGroupRef = useRef(null)
  const gBrushRef = useRef(null)

  const mainChartContainerSVG = select(mainChartContainerSVGRef.current)
  const mainChartGroup = select(mainChartGroupRef.current)
  const gBrush = select(gBrushRef.current)
  const nodeSizeWithDetails = {
    width: 250,
    height: 200,
  }

  const totalTime = Array.isArray(data) ? data[0].time_us : data.time_us

  const assignInternalProperties = (
    data: RawNodeDatum[] | RawNodeDatum
  ): TreeNodeDatum[] => {
    const d = Array.isArray(data) ? data : [data]
    return d.map((n) => {
      const nodeDatum = n as TreeNodeDatum
      nodeDatum.__node_attrs = {
        id: '',
        collapsed: false,
        collapsiable: false,
        isNodeDetailVisible: false,
        nodeFlexSize: {
          width: nodeSizeWidth,
          height: nodeSizeHeight,
        },
      }
      nodeDatum.__node_attrs.id = uuidv4()

      // If there are children, recursively assign properties to them too.
      if (nodeDatum.children && nodeDatum.children.length > 0) {
        nodeDatum.__node_attrs.collapsiable = true
        nodeDatum.children = assignInternalProperties(nodeDatum.children)
      }
      return nodeDatum
    })
  }

  // Generates nodes and links
  const generateNodesAndLinks = () => {
    const tree = flextree({
      nodeSize: (node) => {
        const _nodeSize = node.data.__node_attrs.nodeFlexSize

        return [
          _nodeSize.width + nodeMargin!.siblingMargin,
          _nodeSize.height + nodeMargin!.childrenMargin,
        ]
      },
    })

    const rootNode = tree(
      // @ts-ignore
      hierarchy(treeNodeDatum[0], (d) =>
        d.__node_attrs.collapsed ? null : d.children
      )
    )

    const nodes = rootNode.descendants()

    const links = rootNode.links()

    setNodes(nodes)
    setLinks(links)
  }

  // Gets main chart bound by calculating dx and dy
  const getInitTreeRectBound = () => {
    const calcHeight = (nodes) => {
      let y0 = Infinity
      let y1 = -y0
      let x0 = Infinity
      let x1 = -x0

      nodes.forEach((d) => {
        if (d.y > y1) y1 = d.y
        if (d.y < y0) y0 = d.y
        if (d.x > x1) x1 = d.x
        if (d.x < x0) x0 = d.x
      })

      const boundRect = {
        width: x1 - x0,
        height: y1 - y0,
      }

      return boundRect
    }

    const boundRect = calcHeight(nodes)
    const boundRectWidth = boundRect.width + nodeSizeWidth
    const boundRectHeight = boundRect.height + nodeSizeHeight

    // WARNING: *world size* should be larger than or equal to *viewport size*
    // if the world is smaller than viewport, the zoom action will yield weird coordinates.
    const worldWidth =
      boundRectWidth > viewPortWidth ? boundRectWidth : viewPortWidth
    const worldHeight =
      boundRectHeight > viewPortHeight ? boundRectHeight : viewPortHeight

    setWorldSize([worldWidth, worldHeight])
    setInitTreeRectBound({ width: boundRectWidth, height: boundRectHeight })
  }

  const zoomBehavior = d3zoom()
    .scaleExtent([scaleExtent!.min!, scaleExtent!.max!])
    // .translateExtent([0,0], [initTreeRectBound.width, initTreeRectBound.height])
    // .translateExtent([[0, 0], [worldSize[0], worldSize[1]]]) // world extent
    .extent([
      [0, 0],
      [viewPortWidth, viewPortHeight],
    ]) // viewport extent
    .on('zoom', () => onZoom())

  const onZoom = () => {
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'brush')
      return null

    const t = event.transform
    setTranslate({ x: t.x, y: t.y, k: t.k })

    const scaleX = minimapScaleX(t.k)
    const scaleY = minimapScaleY(t.k)

    brushBehavior.move(gBrush as any, [
      [scaleX.invert(-t.x + viewPortWidth / 2), scaleY.invert(-t.y)],
      [
        scaleX.invert(-t.x + viewPortWidth / 2 + viewPortWidth),
        scaleY.invert(-t.y + viewPortHeight),
      ],
    ])
  }

  const bindZoomListener = () => {
    // Sets initial offset, so that first pan and zoom does not jump back to default [0,0] coords.
    mainChartContainerSVG.call(
      d3zoom().transform as any,
      zoomIdentity.translate(translate.x, translate.y).scale(translate.k)
    )

    mainChartContainerSVG.call(zoomBehavior as any)
  }

  const onBrush = () => {
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'zoom')
      return null

    if (Array.isArray(d3.event.selection)) {
      const [[brushX, brushY], [brushX2, brushY2]] = d3.event.selection
      const zoomScale = d3.zoomTransform(mainChartContainerSVG.node() as any).k

      const scaleX = minimapScaleX(zoomScale)
      const scaleY = minimapScaleY(zoomScale)

      mainChartContainerSVG.call(
        zoomBehavior.transform as any,
        d3.zoomIdentity
          // .translate(attrs.svgWidth, attrs.svgHeight)
          .translate(-brushX + viewPortWidth / 2, -brushY)
          .scale(zoomScale)
      )

      mainChartGroup.attr(
        'transform',
        `translate(${scaleX(-brushX + viewPortWidth / 2)}, ${scaleY(
          -brushY
        )}) scale(${zoomScale})`
      )
    }
  }

  const brushBehavior = d3
    .brush()
    .extent([
      [0, 0],
      [worldSize[0], worldSize[1]],
    ])
    .on('brush', onBrush)

  const bindBrushListener = () => {
    gBrush.call(brushBehavior as any)

    drawMinimap()

    brushBehavior.move(gBrush as any, [
      [0, 0],
      [worldSize[0], worldSize[1]],
    ])
  }

  const findNodesById = (
    nodeId: string,
    nodeSet: TreeNodeDatum[],
    hits: TreeNodeDatum[]
  ) => {
    if (hits.length > 0) {
      return hits
    }
    hits = hits.concat(
      nodeSet.filter((node) => node.__node_attrs.id === nodeId)
    )

    nodeSet.forEach((node) => {
      if (node.children && node.children.length > 0) {
        hits = findNodesById(nodeId, node.children, hits)
      }
    })
    return hits
  }

  const expandSpecificNode = (nodeDatum: TreeNodeDatum) => {
    nodeDatum.__node_attrs.collapsed = false
  }

  const collapseAllDescententNodes = (nodeDatum: TreeNodeDatum) => {
    nodeDatum.__node_attrs.collapsed = true
    if (nodeDatum.children && nodeDatum.children.length > 0) {
      nodeDatum.children.forEach((child) => {
        collapseAllDescententNodes(child)
      })
    }
  }

  const expandAllDescentantNodes = (nodeDatum: TreeNodeDatum) => {
    nodeDatum.__node_attrs.collapsed = false
    if (nodeDatum.children && nodeDatum.children.length > 0) {
      nodeDatum.children.forEach((child) => {
        expandAllDescentantNodes(child)
      })
    }
  }

  const handleNodeExpandBtnToggle = (nodeId: string) => {
    const data = _.clone(treeNodeDatum)

    // @ts-ignore
    const matches = findNodesById(nodeId, data, [])
    const targetNodeDatum = matches[0]

    if (targetNodeDatum.__node_attrs.collapsed) {
      expandSpecificNode(targetNodeDatum)
    } else {
      collapseAllDescententNodes(targetNodeDatum)
    }

    setTreeNodeDatum(data)
    // setTargetNode(targetNodeDatum)
  }

  const handleExpandNodeToggle = (nodeId: string) => {
    const data = _.clone(treeNodeDatum)

    // @ts-ignore
    const matches = findNodesById(nodeId, data, [])
    const targetNodeDatum = matches[0]

    targetNodeDatum.__node_attrs.isNodeDetailVisible =
      !targetNodeDatum.__node_attrs.isNodeDetailVisible

    if (targetNodeDatum.__node_attrs.isNodeDetailVisible) {
      targetNodeDatum.__node_attrs.nodeFlexSize = nodeSizeWithDetails
    } else {
      targetNodeDatum.__node_attrs.nodeFlexSize = nodeSize
    }

    setTreeNodeDatum(data)
  }

  const centerNode = (
    hierarchyPointNode: HierarchyPointNode<TreeNodeDatum>
  ) => {
    const scale = translate.k
    const x = -hierarchyPointNode.x * scale + viewPortWidth / 2
    const y = -hierarchyPointNode.y * scale + viewPortHeight / 2

    mainChartGroup.attr('transform', `translate(${x}, ${y}) scale(${scale})`)

    mainChartContainerSVG.call(
      d3zoom().transform as any,
      zoomIdentity.translate(x, y).scale(scale)
    )
  }

  const minimapScaleX = (zoomScale) => {
    return d3
      .scaleLinear()
      .domain([0, worldSize[0]])
      .range([0, worldSize[0] * zoomScale])
  }

  const minimapScaleY = (zoomScale) => {
    return d3
      .scaleLinear()
      .domain([0, worldSize[1]])
      .range([0, worldSize[1] * zoomScale])
  }

  const drawMinimap = () => {
    const minimapChartContainerSVG = select(minimapContainerSVGRef.current)
    const minimapChartGroup = select(minimapChartGroupRef.current)

    const worldWidth = worldSize[0]
    const worldHeight = worldSize[1]

    minimapChartContainerSVG
      .attr('width', minimapScaleX(minimapScale)(worldWidth))
      .attr('height', minimapScaleX(minimapScale)(worldHeight))
      .attr('viewBox', [0, 0, worldWidth, worldHeight].join(' '))
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('position', 'absolute')
      .style('top', 0)
      .style('right', 20)
      .style('border', '1px solid grey')
      .style('background', 'white')

    select('.minimap-rect')
      .attr('width', worldWidth)
      .attr('height', worldHeight)
      .attr('fill', 'white')

    minimapChartGroup
      .attr('transform', `translate(${worldWidth / 2}, 0) scale(1)`)
      .attr('width', worldWidth)
      .attr('height', worldHeight)
  }

  const expandAllNodes = (node: TreeNodeDatum) => {
    expandAllDescentantNodes(node)
  }

  const collapseAllNodes = (node: TreeNodeDatum) => {
    collapseAllDescententNodes(node)
  }

  const handleToggleAllNodesOnClick = () => {
    const targetNodeDatum = _.clone(treeNodeDatum)

    if (isAllNodesExpanded) {
      collapseAllNodes(targetNodeDatum![0])
      setIsAllNodesExpanded(false)
    } else {
      expandAllNodes(targetNodeDatum![0])
      setIsAllNodesExpanded(true)
    }

    setTreeNodeDatum(targetNodeDatum!)
  }

  useEffect(() => {
    if (treeNodeDatum) {
      generateNodesAndLinks()
      bindZoomListener()
    }
  }, [treeNodeDatum])

  useEffect(() => {
    if (nodes.length > 0 && initTreeRectBound.width === 0) {
      getInitTreeRectBound()
    }
  }, [nodes])

  useEffect(() => {
    // init minimap
    if (initTreeRectBound.width > 0) {
      bindBrushListener()
      // drawMinimap()
    }
  }, [initTreeRectBound])

  useEffect(() => {
    const d = assignInternalProperties(data)
    setTreeNodeDatum(d)
  }, [])

  return (
    <>
      <div className={styles.shortCuts}>
        <Button onClick={handleToggleAllNodesOnClick}>
          {isAllNodesExpanded ? 'Collapse all nodes' : 'Expand all nodes'}
        </Button>
        {/* <Button>{isAllExpandedNodesShowDetails ? 'Collapse details': 'Expand details'}</Button> */}
      </div>
      <div
        ref={treeRef}
        style={{ overflow: 'hidden' }}
        className={styles.treeContainer}
      >
        <svg
          ref={mainChartContainerSVGRef}
          className={styles.mainChartContainerSVG}
          width={viewPortWidth}
          height={viewPortHeight}
        >
          <g
            ref={mainChartGroupRef}
            className="main-chart-group"
            transform={`translate(${translate.x}, ${translate.y}) scale(${translate.k})`}
          >
            <g className="links-wrapper">
              {links.length > 0 &&
                links.map((link, i) => (
                  <LinksWrapper
                    key={i}
                    data={link}
                    collapsiableButtonSize={collapsiableButtonSize}
                  ></LinksWrapper>
                ))}
            </g>
            <g className="nodes-wrapper">
              {nodes.length > 0 &&
                nodes.map((node) => (
                  <NodesWrapper
                    key={node.data.name}
                    data={node}
                    collapsiableButtonSize={collapsiableButtonSize}
                    handleNodeExpandBtnToggle={handleNodeExpandBtnToggle}
                    centerNode={centerNode}
                    handleExpandNodeToggle={handleExpandNodeToggle}
                    totalTime={totalTime}
                  ></NodesWrapper>
                ))}
            </g>
          </g>
        </svg>

        <svg
          ref={minimapContainerSVGRef}
          className={styles.minimapChartContainer}
        >
          <rect className="minimap-rect"></rect>
          <g ref={minimapChartGroupRef} className="minimap-chart-group">
            <g className="links-wrapper">
              {links.length > 0 &&
                links.map((link, i) => (
                  <LinksWrapper
                    key={i}
                    data={link}
                    collapsiableButtonSize={collapsiableButtonSize}
                  ></LinksWrapper>
                ))}
            </g>
            <g className="nodes-wrapper">
              {nodes.length > 0 &&
                nodes.map((node) => (
                  <NodesWrapper
                    key={node.data.name}
                    data={node}
                    collapsiableButtonSize={collapsiableButtonSize}
                    totalTime={totalTime}
                    isMinimap={true}
                  ></NodesWrapper>
                ))}
            </g>
          </g>
          <g ref={gBrushRef} className="g-brush"></g>
        </svg>
      </div>
    </>
  )
}

TreeDiagram.defaultProps = {
  dimensions: {
    width: window.innerWidth,
    height: window.innerHeight - 150,
  },
  scaleExtent: { min: 0.5, max: 2 },
  nodeSize: { width: 250, height: 150 },
  collapsiableButtonSize: { width: 60, height: 30 },
  nodeMargin: {
    siblingMargin: 40,
    childrenMargin: 60,
  },
  transitionDuration: 800,
  minimapScale: 0.2,
}

export default TreeDiagram
