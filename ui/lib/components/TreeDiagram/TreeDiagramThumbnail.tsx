import React, { useEffect, useState, useRef, useCallback } from 'react'
import _ from 'lodash'
import { AssignInternalProperties } from './utlis'
import styles from './index.module.less'
import { TreeDiagramProps, TreeNodeDatum } from './types'

import Minimap from './Minimap'
import SingleTree from './SingleTree'

// imports d3 APIs
import { select } from 'd3-selection'
import { rectBound } from '../TreeDiagramView/types'
import { DefaultNode } from './DefaultNode'
import { DefaultLink } from './DefaultLink'

interface TreeBoundType {
  [k: string]: {
    x: number
    y: number
    width: number
    height: number
  }
}

const TreeDiagramThumbnail = ({
  data,
  nodeSize,
  nodeMargin,
  viewport,
  customNodeElement = DefaultNode,
  customLinkElement = DefaultLink,
  gapBetweenTrees,
}: TreeDiagramProps) => {
  const [treeNodeDatum, setTreeNodeDatum] = useState<TreeNodeDatum[]>([])
  const [zoomToFitViewportScale, setZoomToFitViewportScale] = useState(0)
  const singleTreeBoundsMap = useRef<TreeBoundType>({})
  const [adjustPosition, setAdjustPosition] = useState({ width: 0, height: 0 })

  const thumbnailSVGRef = useRef(null)

  const thumbnaiSVGSelection = select('.thumbnaiSVG')
  const thumbnailGroupSelection = select('thumbnailGroup')

  // Sets the bound of entire tree
  const [multiTreesBound, setMultiTreesBound] = useState({
    width: 0,
    height: 0,
  })

  // Updates multiTrees bound and returns single tree position, which contains root point and offset to original point [0,0].
  const getInitSingleTreeBound = useCallback(
    (treeIdx) => {
      let offset = 0
      let multiTreesBound: rectBound = { width: 0, height: 0 }
      const singleTreeGroupNode = select(
        `.singleTreeGroup-${treeIdx}`
      ).node() as SVGGraphicsElement

      const { x, y, width, height } = singleTreeGroupNode.getBBox()

      singleTreeBoundsMap.current[`singleTreeGroup-${treeIdx}`] = {
        x: x,
        y: y,
        width: width,
        height: height,
      }

      for (let i = treeIdx; i > 0; i--) {
        const preSingleTreeGroupBoundWidth =
          singleTreeBoundsMap.current[`singleTreeGroup-${i - 1}`].width

        const preSingleTreeGroupBoundHeight =
          singleTreeBoundsMap.current[`singleTreeGroup-${i - 1}`].height

        offset = offset + preSingleTreeGroupBoundWidth + gapBetweenTrees!

        multiTreesBound.width =
          multiTreesBound.width +
          preSingleTreeGroupBoundWidth +
          gapBetweenTrees!

        multiTreesBound.height =
          preSingleTreeGroupBoundHeight > multiTreesBound.height
            ? preSingleTreeGroupBoundHeight
            : multiTreesBound.height
      }

      setMultiTreesBound({
        width: multiTreesBound.width + width,
        height:
          multiTreesBound.height > height ? multiTreesBound.height : height,
      })

      return { x, y, offset }
    },
    [singleTreeBoundsMap, gapBetweenTrees]
  )

  const getZoomToFitViewPortScale = () => {
    const widthRatio = viewport.width / multiTreesBound.width
    const heightRation = viewport.height / multiTreesBound.height
    const k = Math.min(widthRatio, heightRation)
    console.log('k', widthRatio, widthRatio, viewport)
    setZoomToFitViewportScale(k > 1 ? 1 : k)

    // if (heightRation > 2 && widthRatio > 2) {
    //   setAdjustPosition({
    //     width: viewport.width / widthRatio,
    //     height: viewport.height / heightRation,
    //   })
    // } else if (widthRatio > 2) {
    //   setAdjustPosition({
    //     ...adjustPosition,
    //     width: viewport.width / widthRatio,
    //   })
    // } else if (heightRation > 2) {
    //   setAdjustPosition({
    //     ...adjustPosition,
    //     height: viewport.height / heightRation,
    //   })
    // }
  }

  const drawMinimap = () => {
    console.log('multiTreesBound', multiTreesBound)
    thumbnaiSVGSelection
      .attr('width', viewport.width * zoomToFitViewportScale)
      .attr('height', viewport.height * zoomToFitViewportScale)
      .attr(
        'viewBox',
        [0, 0, multiTreesBound.width, multiTreesBound.height].join(' ')
      )
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('position', 'absolute')
      .style('border', '1px solid grey')
      .style('background', 'white')

    select('.thumbnail-rect')
      .attr('width', viewport.width)
      .attr('height', viewport.height)
      .attr('fill', 'white')

    thumbnailGroupSelection
      .attr('width', multiTreesBound.width)
      .attr('height', multiTreesBound.height)
  }

  useEffect(() => {
    // Assigns all internal properties to tree node
    const treeNodes = AssignInternalProperties(data, nodeSize!)
    setTreeNodeDatum(treeNodes)
  }, [data, nodeSize])

  useEffect(() => {
    if (thumbnailSVGRef.current) {
      drawMinimap()
      getZoomToFitViewPortScale()
    }
  }, [thumbnailSVGRef.current, multiTreesBound])

  return (
    <svg
      ref={thumbnailSVGRef}
      className={'thumbnailSVG'}
      width={viewport.width}
      height={viewport.height}
    >
      <rect className="thumbnail-rect"></rect>
      <g className="thumbnailGroup">
        {treeNodeDatum.map((datum, idx) => (
          <SingleTree
            key={datum.name}
            datum={datum}
            treeIdx={idx}
            nodeMargin={nodeMargin}
            zoomToFitViewportScale={zoomToFitViewportScale}
            customLinkElement={customLinkElement}
            customNodeElement={customNodeElement}
            getTreePosition={getInitSingleTreeBound}
            adjustPosition={adjustPosition}
          />
        ))}
      </g>
    </svg>
  )
}

TreeDiagramThumbnail.defaultProps = {
  nodeSize: { width: 250, height: 150 },
  showMinimap: false,
  minimapScale: 1,
  nodeMargin: {
    siblingMargin: 40,
    childrenMargin: 60,
  },
  gapBetweenTrees: 100,
}

export default TreeDiagramThumbnail
