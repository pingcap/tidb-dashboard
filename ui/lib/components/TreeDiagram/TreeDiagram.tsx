import React, { useEffect, useState, useRef } from 'react'
import _ from 'lodash'
import { AssignInternalProperties } from './utlis'
import styles from './index.module.less'
import { TreeDiagramProps, TreeNodeDatum, nodeMarginType } from './types'

import Minimap from './Minimap'
import MainChart from './MainChart'

// imports d3 APIs
import { flextree } from 'd3-flextree'
import { hierarchy, HierarchyPointNode, HierarchyPointLink } from 'd3-hierarchy'
import { zoom as d3Zoom, zoomIdentity, zoomTransform } from 'd3-zoom'
import { brush as d3Brush } from 'd3-brush'
import { select, event } from 'd3-selection'
import { scaleLinear } from 'd3-scale'

const BrushGroup = (gBrushRef) => {
  return (
    <React.Fragment>
      <g ref={gBrushRef}></g>
    </React.Fragment>
  )
}

const TreeDiagram = ({
  data,
  nodeSize,
  nodeMargin,
  showMinimap,
  minimapScale,
  viewPort,
  customNodeElement,
  customLinkElement,
}: TreeDiagramProps) => {
  const [treeNodeDatum, setTreeNodeDatum] = useState<TreeNodeDatum[]>([])
  const [nodes, setNodes] = useState<HierarchyPointNode<TreeNodeDatum>[]>([])
  const [links, setLinks] = useState<HierarchyPointLink<TreeNodeDatum>[]>([])

  // Inits tree translate, the default position is on the top-middle of canvas
  const [treeTranslate, setTreeTranslate] = useState({
    x: viewPort.width / 2,
    y: 0,
    k: 1,
  })

  // Sets the bound of entire tree
  const [treeBound, setTreeBound] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  })

  // Sets initDraw to avoid re-calcuate the bound of entire tree
  const [initDraw, setInitDraw] = useState(true)
  const [minimapTranslate, setMinimapTranslate] = useState({
    x: 0,
    y: 0,
    k: 1,
  })

  const treeDiagramContainerRef = useRef<HTMLDivElement>(null)

  // A SVG container for main chart
  const mainChartSVG = select('.mainChartSVG')
  const mainChartGroup = select('.mainChartGroup')

  const gBrushRef = useRef(null)
  const gBrush = select(gBrushRef.current)

  // Generates nodes and links
  const generateNodesAndLinks = (
    treeNodeDatum: TreeNodeDatum[],
    nodeMargin: nodeMarginType
  ) => {
    const tree = flextree({
      nodeSize: (node) => {
        const _nodeSize = node.data.__node_attrs.nodeFlexSize

        return [
          _nodeSize.width + nodeMargin.siblingMargin,
          _nodeSize.height + nodeMargin.childrenMargin,
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

    return { nodes, links }
  }

  /**
   *
   * @param zoomScale
   * @returns a continuous linear scale function to calculate the corresponding width in mainChart or minimap
   *
   * minimapScaleX(zoomScale)(widthOnMinimap) will return corresponding widthOnMainChart
   * minimapScaleX(zoomScale).invert(widthOnMainChart) will return corresponding widthOnMinimap
   */
  const minimapScaleX = (zoomScale) => {
    return scaleLinear()
      .domain([0, treeBound.width])
      .range([0, treeBound.width * zoomScale])
  }

  // Creates a continuous linear scale to calculate the corresponse height in mainChart or minimap
  const minimapScaleY = (zoomScale) => {
    return scaleLinear()
      .domain([0, treeBound.height])
      .range([0, treeBound.height * zoomScale])
  }

  const brushBehavior = d3Brush()
    .extent([
      [
        minimapScaleX(1)(-viewPort.width / 2),
        minimapScaleY(1)(-viewPort.height / 2),
      ],
      [
        minimapScaleX(1)(treeBound.width + viewPort.width / 2),
        minimapScaleY(1)(treeBound.height + viewPort.height / 2),
      ],
    ])
    .on('brush', () => onBrush())

  const onBrush = () => {
    if (event.sourceEvent && event.sourceEvent.type === 'zoom') return null
    if (Array.isArray(event.selection)) {
      const [[brushX, brushY], [brushX2, brushY2]] = event.selection

      const zoomScale = zoomTransform(mainChartSVG.node() as any)

      // Sets initial offset, so that first pan and zoom does not jump back to default [0,0] coords.
      // @ts-ignore
      mainChartSVG.call(
        d3Zoom().transform as any,
        zoomIdentity
          .translate(
            minimapScaleX(zoomScale.k)(-treeBound.x - brushX),
            minimapScaleY(zoomScale.k)(-brushY)
          )
          .scale(zoomScale.k)
      )

      setTreeTranslate({
        x: minimapScaleX(zoomScale.k)(-treeBound.x - brushX),
        y: minimapScaleY(zoomScale.k)(-brushY),
        k: zoomScale.k,
      })
    }
  }

  const bindBrushListener = () => {
    gBrush.call(brushBehavior as any)

    // init brush seletion
    brushBehavior.move(gBrush as any, [
      [-treeBound.x - minimapScaleX(1)(treeTranslate.x), 0],
      [
        -treeBound.x - minimapScaleX(1)(treeTranslate.x) + viewPort.width,
        viewPort.height,
      ],
    ])
  }

  const zoomBehavior = d3Zoom()
    .scaleExtent([0.5, 2])
    .translateExtent([
      [treeBound.x - viewPort.width / 2, -viewPort.height / 2],
      [
        treeBound.x + treeBound.width + viewPort.width / 2,
        treeBound.height + viewPort.height / 2,
      ],
    ])
    .on('zoom', () => onZoom())

  const onZoom = () => {
    const t = event.transform
    setTreeTranslate(t)

    brushBehavior.move(gBrush as any, [
      [
        -treeBound.x + minimapScaleX(t.k).invert(-t.x),
        minimapScaleY(t.k).invert(-t.y),
      ],
      [
        -treeBound.x + minimapScaleX(t.k).invert(-t.x + viewPort.width),
        minimapScaleY(t.k).invert(-t.y + viewPort.height),
      ],
    ])
  }

  // Binds MainChart container
  const bindZoomListener = () => {
    mainChartSVG.call(zoomBehavior as any)
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

  function handleNodeExpandBtnToggle(nodeId: string) {
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
  }

  const getInitTreeDiagramBound = () => {
    const mainChartGroupNode = mainChartGroup.node() as SVGGraphicsElement
    const { x, y, width, height } = mainChartGroupNode.getBBox()
    setTreeBound({ x: x, y: y, width: width, height: height })

    const minimapTranslate = {
      x: -x,
      y: y,
      k: 1,
    }

    setMinimapTranslate(minimapTranslate)
    setInitDraw(false)
  }

  useEffect(() => {
    // Assigns all internal properties to tree node
    const treeNodes = AssignInternalProperties(data, nodeSize!)
    setTreeNodeDatum(treeNodes)
  }, [data, nodeSize])

  useEffect(() => {
    if (treeNodeDatum.length > 0) {
      const { nodes, links } = generateNodesAndLinks(treeNodeDatum, nodeMargin!)
      setNodes(nodes)
      setLinks(links)
    }
  }, [nodeMargin, treeNodeDatum])

  useEffect(() => {
    if (links.length > 0 && nodes.length > 0 && initDraw) {
      getInitTreeDiagramBound()
    }
  }, [links, nodes, initDraw])

  useEffect(() => {
    bindZoomListener()
    bindBrushListener()
  }, [treeBound])

  return (
    <div className={styles.treeDiagramContainer} ref={treeDiagramContainerRef}>
      <MainChart
        viewPort={viewPort}
        treeTranslate={treeTranslate}
        links={links}
        nodes={nodes}
        customLinkElement={customLinkElement}
        customNodeElement={customNodeElement}
        handleNodeExpandBtnToggle={handleNodeExpandBtnToggle}
      />
      {showMinimap && (
        <Minimap
          treeBound={treeBound}
          viewPort={viewPort}
          links={links}
          nodes={nodes}
          minimapTranslate={minimapTranslate}
          customLinkElement={customLinkElement}
          customNodeElement={customNodeElement}
          minimapScale={minimapScale!}
          brushGroup={() => BrushGroup(gBrushRef)}
        />
      )}
    </div>
  )
}

TreeDiagram.defaultProps = {
  nodeSize: { width: 250, height: 150 },
  showMinimap: false,
  minimapScale: 0.1,
  nodeMargin: {
    siblingMargin: 40,
    childrenMargin: 60,
  },
}

export default TreeDiagram
