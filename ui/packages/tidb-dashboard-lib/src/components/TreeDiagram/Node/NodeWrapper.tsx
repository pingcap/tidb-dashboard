import React from 'react'
import { TreeNodeDatum } from '../types'
import { HierarchyPointNode } from 'd3'

interface NodeWrapperProps {
  data: TreeNodeDatum
  renderCustomNodeElement: any
  hierarchyPointNode: HierarchyPointNode<TreeNodeDatum>
  zoomScale?: number
  onNodeExpandBtnToggle?: (nodeId: string) => void
  onNodeDetailClick?: (node: TreeNodeDatum) => void
}

const NodeWrapper = ({
  data,
  renderCustomNodeElement,
  hierarchyPointNode,
  onNodeExpandBtnToggle,
  onNodeDetailClick
}: NodeWrapperProps) => {
  const renderNode = () => {
    const nodeProps = {
      hierarchyPointNode: hierarchyPointNode,
      nodeDatum: data,
      onNodeExpandBtnToggle: onNodeExpandBtnToggle,
      onNodeDetailClick: onNodeDetailClick
    }

    return renderCustomNodeElement(nodeProps)
  }

  return <>{renderNode()}</>
}

export default NodeWrapper
