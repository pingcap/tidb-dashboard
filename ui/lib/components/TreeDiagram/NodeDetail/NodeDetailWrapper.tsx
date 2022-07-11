import React from 'react'

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
