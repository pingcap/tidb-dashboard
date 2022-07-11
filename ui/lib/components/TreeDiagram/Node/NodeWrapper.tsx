import React from 'react'
import { TreeNodeDatum } from '../types'
import { HierarchyPointNode } from 'd3-hierarchy'

interface NodeWrapperProps {
  data: TreeNodeDatum
  renderCustomNodeElement: any
  hierarchyPointNode: HierarchyPointNode<TreeNodeDatum>
  zoomScale?: number
  onNodeExpandBtnToggle?: any
  onNodeDetailClick?: any
}

const NodeWrapper = ({
  data,
  renderCustomNodeElement,
  hierarchyPointNode,
  onNodeExpandBtnToggle,
  onNodeDetailClick,
}: NodeWrapperProps) => {
  const renderNode = () => {
    const nodeProps = {
      hierarchyPointNode: hierarchyPointNode,
      nodeDatum: data,
      onNodeExpandBtnToggle: onNodeExpandBtnToggle,
      onNodeDetailClick: onNodeDetailClick,
    }

    return renderCustomNodeElement(nodeProps)
  }

  return <>{renderNode()}</>
}

export default NodeWrapper
