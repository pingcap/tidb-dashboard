import React, { useEffect, useState, useRef, useCallback } from 'react'
import styles from './index.module.less'
import { AssignInternalProperties } from '../utlis'
import { TreeDiagramProps, TreeNodeDatum } from '../types'

import { Trees } from '../MemorizedTrees'
// imports d3 APIs
import { select } from 'd3'
import { rectBound } from '../types'
import { DefaultNode } from '../Node/DefaultNode'
import { DefaultLink } from '../Link/DefaultLink'

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
  gapBetweenTrees
}: TreeDiagramProps) => {
  const [treeNodeDatum, setTreeNodeDatum] = useState<TreeNodeDatum[]>([])
  const singleTreeBoundsMap = useRef<TreeBoundType>({})

  const thumbnailContainerGRef = useRef(null)
  const thumbnaiSVGSelection = select('.thumbnailSVG')

  // Sets the bound of entire tree
  const [multiTreesBound, setMultiTreesBound] = useState({
    width: 0,
    height: 0
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
        height: height
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
          multiTreesBound.height > height ? multiTreesBound.height : height
      })

      return { x, y, offset }
    },
    [singleTreeBoundsMap, gapBetweenTrees]
  )

  const drawMinimap = () => {
    const widthRatio = viewport.width / multiTreesBound.width
    const heightRation = viewport.height / multiTreesBound.height
    const k =
      Math.min(widthRatio, heightRation) > 0.5
        ? 0.5
        : Math.min(widthRatio, heightRation)

    select(thumbnailContainerGRef.current)
      .attr('width', multiTreesBound.width * k)
      .attr('height', multiTreesBound.height * k)

    thumbnaiSVGSelection
      .attr('width', multiTreesBound.width * k)
      .attr('height', multiTreesBound.height * k)
      .attr(
        'viewBox',
        [0, 0, multiTreesBound.width, multiTreesBound.height].join(' ')
      )
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('background', 'white')
  }

  useEffect(() => {
    // Assigns all internal properties to tree node
    const treeNodes = AssignInternalProperties(data, nodeSize!)
    setTreeNodeDatum(treeNodes)
  }, [data, nodeSize])

  useEffect(() => {
    if (thumbnailContainerGRef.current) drawMinimap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thumbnailContainerGRef.current, multiTreesBound])

  return (
    <div className={styles.ThumbnailContainer} ref={thumbnailContainerGRef}>
      <svg className="thumbnailSVG">
        <g className="thumbnailGroup">
          <Trees
            {...{
              treeNodeDatum,
              nodeMargin: nodeMargin!,
              zoomToFitViewportScale: 1,
              customLinkElement,
              customNodeElement,
              getTreePosition: getInitSingleTreeBound
            }}
          />
        </g>
      </svg>
    </div>
  )
}

TreeDiagramThumbnail.defaultProps = {
  nodeSize: { width: 250, height: 150 },
  showMinimap: false,
  minimapScale: 1,
  nodeMargin: {
    siblingMargin: 40,
    childrenMargin: 60
  },
  gapBetweenTrees: 100
}

export default TreeDiagramThumbnail
