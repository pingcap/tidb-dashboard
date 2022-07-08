import React, { FC, memo } from 'react'

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
  getTreePosition,
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
              nodeMargin,
              zoomToFitViewportScale,
              customLinkElement,
              customNodeElement,
              onNodeExpandBtnToggle,
              onNodeDetailClick,
              getTreePosition,
            }}
          />
        </g>
      </g>
    </svg>
  )
}

const _Trees: FC<
  Omit<
    MainChartProps,
    'classNamePrefix' | 'translate' | 'viewport' | 'adjustPosition'
  >
> = ({
  treeNodeDatum,
  nodeMargin,
  zoomToFitViewportScale,
  customLinkElement,
  customNodeElement,
  onNodeExpandBtnToggle,
  onNodeDetailClick,
  getTreePosition,
}) => (
  <>
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
  </>
)

const Trees = memo(_Trees)

export default MainChart
