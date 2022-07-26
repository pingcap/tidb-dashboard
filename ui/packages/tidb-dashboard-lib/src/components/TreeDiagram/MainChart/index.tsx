import React from 'react'

import { nodeMarginType, Translate, TreeNodeDatum, rectBound } from '../types'
import { Trees } from '../MemorizedTrees'

interface MainChartProps {
  treeNodeDatum: TreeNodeDatum[]
  classNamePrefix: string
  translate: Translate
  viewport: rectBound
  customLinkElement: JSX.Element
  customNodeElement: JSX.Element
  onNodeExpandBtnToggle: (nodeId: string) => void
  onNodeDetailClick: (node: TreeNodeDatum) => void
  getTreePosition: (treeIdx: number) => any
  nodeMargin?: nodeMarginType
  adjustPosition: rectBound
  zoomToFitViewportScale: number
}

const MainChart = ({
  treeNodeDatum,
  classNamePrefix,
  translate,
  viewport,
  customLinkElement,
  customNodeElement,
  onNodeExpandBtnToggle,
  onNodeDetailClick,
  nodeMargin,
  adjustPosition,
  zoomToFitViewportScale,
  getTreePosition
}: MainChartProps) => {
  return (
    <svg
      className={`${classNamePrefix}SVG`}
      width={viewport.width}
      height={viewport.height}
    >
      <g
        className={`${classNamePrefix}GroupWrapper`}
        transform={`translate(${translate.x}, ${translate.y}) scale(${translate.k})`}
      >
        <g
          className={`${classNamePrefix}Group`}
          transform={`translate(${adjustPosition.width}, ${adjustPosition.height}) scale(1)`}
        >
          <Trees
            {...{
              treeNodeDatum,
              nodeMargin: nodeMargin!,
              zoomToFitViewportScale,
              customLinkElement,
              customNodeElement,
              onNodeExpandBtnToggle,
              onNodeDetailClick,
              getTreePosition
            }}
          />
        </g>
      </g>
    </svg>
  )
}

export default MainChart
