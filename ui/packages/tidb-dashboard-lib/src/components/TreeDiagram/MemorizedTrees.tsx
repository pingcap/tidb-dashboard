import React, { memo } from 'react'
import SingleTree from './SingleTree'

import { TreeNodeDatum, nodeMarginType } from './types'

interface MultiTreesProps {
  treeNodeDatum: TreeNodeDatum[]
  nodeMargin: nodeMarginType
  zoomToFitViewportScale: number
  customLinkElement: JSX.Element
  customNodeElement: JSX.Element
  onNodeExpandBtnToggle?: (nodeId: string) => void
  onNodeDetailClick?: (node: TreeNodeDatum) => void
  getTreePosition: (treeIdx: number) => any
}

const _Trees = ({
  treeNodeDatum,
  nodeMargin,
  zoomToFitViewportScale,
  customLinkElement,
  customNodeElement,
  onNodeExpandBtnToggle,
  onNodeDetailClick,
  getTreePosition
}: MultiTreesProps) => (
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
        onNodeExpandBtnToggle={onNodeExpandBtnToggle!}
        onNodeDetailClick={onNodeDetailClick!}
        getTreePosition={getTreePosition}
      />
    ))}
  </>
)

export const Trees = memo(_Trees)
