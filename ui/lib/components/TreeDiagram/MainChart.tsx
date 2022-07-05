import React, { useEffect, useMemo, useRef, useState } from 'react'

import { nodeMarginType, Translate, TreeNodeDatum, rectBound } from './types'
import SingleTree from './SingleTree'

interface MainChartProps {
  treeNodeDatum: TreeNodeDatum[]
  classNamePrefix: string
  translate: Translate
  viewport: rectBound
  customLinkElement: any
  customNodeElement: any
  onNodeExpandBtnToggle: any
  onNodeDetailClick: any
  getTreePosition: (number) => any
  nodeMargin?: nodeMarginType
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
  zoomToFitViewportScale,
  getTreePosition,
}: MainChartProps) => {
  return (
    <svg
      className={`${classNamePrefix}SVG`}
      width={viewport.width}
      height={viewport.height}
    >
      <g
        className={`${classNamePrefix}Group}`}
        transform={`translate(${translate.x}, ${translate.y}) scale(${translate.k})`}
      >
        {treeNodeDatum.map((datum, idx) => (
          <SingleTree
            key={datum.name}
            datum={datum}
            treeIdx={idx}
            nodeMargin={nodeMargin}
            zoomToFitViewportScale={zoomToFitViewportScale}
            customLinkElement={customLinkElement}
            customNodeElement={customNodeElement}
            onNodeExpandBtnToggle={onNodeExpandBtnToggle}
            onNodeDetailClick={onNodeDetailClick}
            getTreePosition={getTreePosition}
          />
        ))}
      </g>
    </svg>
  )
}

export default MainChart
