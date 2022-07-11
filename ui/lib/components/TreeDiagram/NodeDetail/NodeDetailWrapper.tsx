import React from 'react'
import { TreeNodeDatum } from '../types'

interface NodeWrapperProps {
  data: TreeNodeDatum
  renderCustomNodeDetailElement: (nodeProps: any) => JSX.Element
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
