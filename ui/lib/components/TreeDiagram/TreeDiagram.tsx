import React, { useEffect, useState, useRef } from 'react'
import _ from 'lodash'
import { AssignInternalProperties } from './utlis'
import styles from './index.module.less'
import { TreeDiagramProps, TreeNodeDatum } from './types'

import Minimap from './Minimap'
import MainChart from './MainChart'
import NodeWrapperDetail from './NodeDetailWrapper'

import { Drawer } from 'antd'

// imports d3 APIs
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom'
import { brush as d3Brush } from 'd3-brush'
import { select, event } from 'd3-selection'
import { scaleLinear } from 'd3-scale'

interface boundType {
  [k: string]: {
    x: number
    y: number
    width: number
    height: number
  }
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
  customNodeDetailElement,
  isThumbnail,
}: TreeDiagramProps) => {
  const [treeNodeDatum, setTreeNodeDatum] = useState<TreeNodeDatum[]>([])
  const [showNodeDetail, setShowNodeDetail] = useState(false)
  const [selectedNodeDetail, setSelectedNodeDetail] = useState<TreeNodeDatum>()
  const [zoomToFitViewPort, setZoomToFitViewPort] = useState(0)
  // const multiTreeBounds: boundType[] = []
  const boundsMap: boundType = {}

  // Inits tree translate, the default position is on the top-middle of canvas
  const [treeTranslate, setTreeTranslate] = useState({
    x: 0,
    y: 0,
    k: 1,
  })

  // Sets the bound of entire tree
  const [treeBound, setTreeBound] = useState({
    width: 0,
    height: 0,
  })

  const treeDiagramContainerRef = useRef<HTMLDivElement>(null)

  // A SVG container for main chart
  const mainChartSVGSelection = select('.mainChartSVG')

  const brushRef = useRef<SVGGElement>(null)
  const brushSelection = select(brushRef.current!)

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

  // const handleUpdateTreeTranslate = (zoomScale, brushX, brushY) => {
  //   setTreeTranslate({
  //     x: minimapScaleX(zoomScale.k)(-treeBound.x - brushX),
  //     y: minimapScaleY(zoomScale.k)(-brushY),
  //     k: zoomScale.k,
  //   })
  // }

  // Limits brush move extent
  // const brushBehavior = d3Brush().extent([
  //   [
  //     minimapScaleX(treeTranslate.k)(-viewPort.width / 2),
  //     minimapScaleY(treeTranslate.k)(-viewPort.height / 2),
  //   ],
  //   [
  //     minimapScaleX(treeTranslate.k)(treeBound.width + viewPort.width / 2),
  //     minimapScaleY(treeTranslate.k)(treeBound.height + viewPort.height / 2),
  //   ],
  // ])

  const onZoom = () => {
    const t = event.transform
    console.log('onzoom.........', t)

    setTreeTranslate(t)

    // Moves brush on minimap when zoom behavior is triggered.
    // brushBehavior.move(brushSelection, [
    //   [
    //     -treeBound.x + minimapScaleX(t.k).invert(-t.x),
    //     minimapScaleY(t.k).invert(-t.y),
    //   ],
    //   [
    //     -treeBound.x + minimapScaleX(t.k).invert(-t.x + viewPort.width),
    //     minimapScaleY(t.k).invert(-t.y + viewPort.height),
    //   ],
    // ])
  }

  const zoomBehavior = d3Zoom()
    // .scaleExtent([0.5, 2])
    // Limits the zoom translate extent
    // .translateExtent([
    //   [treeBound.x - viewPort.width / 2, -viewPort.height / 2],
    //   [
    //     treeBound.x + treeBound.width + viewPort.width / 2,
    //     treeBound.height + viewPort.height / 2,
    //   ],
    // ])
    .on('zoom', () => onZoom())

  // Binds MainChart container
  const bindZoomListener = () => {
    mainChartSVGSelection.call(zoomBehavior as any)

    // mainChartSelection.call(
    //   d3Zoom().transform as any,
    //   zoomIdentity
    //     .scale(zoomToFitViewPort)
    // )
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

  function handleOnNodeDetailClick(node) {
    setShowNodeDetail(true)
    setSelectedNodeDetail(node)
  }

  // Sets init bound value and returns offset of current tree to original point [0,0].
  const getInitTreeBound = (treeIdx) => {
    let offset = 0
    let boundWidth = 0,
      boundHeight = 0
    const gap = 100
    const treeGroupNode = select(
      `.mainChartGroup-${treeIdx}`
    ).node() as SVGGraphicsElement

    const { x, y, width, height } = treeGroupNode.getBBox()

    boundsMap[`mainChartGroup-${treeIdx}`] = {
      x: x,
      y: y,
      width: width,
      height: height,
    }

    for (let i = treeIdx; i > 0; i--) {
      offset = offset + boundsMap[`mainChartGroup-${i - 1}`].width + gap
      boundWidth = boundWidth + boundsMap[`mainChartGroup-${i - 1}`].width + gap
      boundHeight =
        boundsMap[`mainChartGroup-${i - 1}`].height > boundHeight
          ? boundsMap[`mainChartGroup-${i - 1}`].height
          : boundHeight
    }

    setTreeBound({
      width: boundWidth + width,
      height: boundHeight > height ? boundHeight : height,
    })

    return { x, y, offset }
  }

  const getZoomToFitViewPort = (vw) => {
    const k = Math.min(vw / treeBound.width, viewPort.height / treeBound.height)
    setZoomToFitViewPort(k)
    console.log('k', k)
  }

  useEffect(() => {
    // Assigns all internal properties to tree node
    const treeNodes = AssignInternalProperties(data, nodeSize!)
    setTreeNodeDatum(treeNodes)
  }, [data, nodeSize])

  useEffect(() => {
    if (isThumbnail) {
      return
    }
    if (treeDiagramContainerRef.current) {
      getZoomToFitViewPort(treeDiagramContainerRef.current?.clientWidth)
      bindZoomListener()
    }
    console.log('treeBound', treeBound)
  }, [treeBound])

  return (
    <div className={styles.treeDiagramContainer} ref={treeDiagramContainerRef}>
      <svg
        className="mainChartSVG"
        width={treeDiagramContainerRef.current?.clientWidth}
        height={viewPort.height}
      >
        <g
          className={`mainChartGroup`}
          transform={`translate(${treeTranslate.x}, ${treeTranslate.y}) scale(${treeTranslate.k})`}
        >
          {treeNodeDatum.map((d, treeIdx) => (
            <MainChart
              key={treeIdx}
              treeIdx={treeIdx}
              datum={d}
              nodeMargin={nodeMargin}
              treeTranslate={treeTranslate}
              customLinkElement={customLinkElement}
              customNodeElement={customNodeElement}
              onNodeExpandBtnToggle={handleNodeExpandBtnToggle}
              onNodeDetailClick={handleOnNodeDetailClick}
              // onInit={getInitTreeDiagramBound}
              getOffset={getInitTreeBound}
              zoomToFitViewPort={zoomToFitViewPort}
            />
          ))}
        </g>
      </svg>
      {/* {showMinimap && (
        <Minimap
          datum={treeNodeDatum}
          treeBound={treeBound}
          viewPort={viewPort}
          nodeMargin={nodeMargin}
          customLinkElement={customLinkElement}
          customNodeElement={customNodeElement}
          minimapScale={minimapScale!}
          brushRef={brushRef}
          minimapScaleX={minimapScaleX}
          minimapScaleY={minimapScaleY}
          mainChartSVG={mainChartSelection}
          updateTreeTranslate={handleUpdateTreeTranslate}
          brushBehavior={brushBehavior}
        />
      )} */}
      {selectedNodeDetail && !isThumbnail && (
        <Drawer
          title={selectedNodeDetail!.name}
          placement="right"
          width={450}
          closable={false}
          onClose={() => {
            setShowNodeDetail(false)
          }}
          visible={showNodeDetail}
          destroyOnClose={true}
          key="right"
        >
          <NodeWrapperDetail
            data={selectedNodeDetail}
            renderCustomNodeDetailElement={customNodeDetailElement}
          />
        </Drawer>
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
