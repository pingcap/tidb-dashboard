import React, { useRef } from 'react'
import { TreeNodeDatum } from './types'
import { HierarchyPointNode } from 'd3-hierarchy'

interface NodeWrapperProps {
  data: TreeNodeDatum
  renderCustomNodeElement: any
  hierarchyPointNode: HierarchyPointNode<TreeNodeDatum>
  zoomScale?: number
  onNodeExpandBtnToggle?: any
}

const NodeWrapper = ({
  data,
  renderCustomNodeElement,
  hierarchyPointNode,
  zoomScale,
  onNodeExpandBtnToggle,
}: NodeWrapperProps) => {
  const renderNode = () => {
    const nodeProps = {
      hierarchyPointNode: hierarchyPointNode,
      nodeDatum: data,
      zoomScale: zoomScale,
      onNodeExpandBtnToggle: onNodeExpandBtnToggle,
    }

    return renderCustomNodeElement(nodeProps)
  }

  return <>{renderNode()}</>
}

export default NodeWrapper
