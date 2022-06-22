import React from 'react'
import { TreeNodeDatum } from './types'
import { HierarchyPointNode } from 'd3-hierarchy'

interface NodeWrapperProps {
  data
  renderCustomNodeDetailElement
}

const NodeDetailWrapper = ({
  data,
  renderCustomNodeDetailElement,
}: NodeWrapperProps) => {
  const renderNodeDetail = () => {
    const nodeProps = {
      data,
    }

    return renderCustomNodeDetailElement(nodeProps)
  }

  return <>{renderNodeDetail()}</>
}

export default NodeDetailWrapper
