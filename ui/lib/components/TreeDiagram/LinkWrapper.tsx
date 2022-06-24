import React from 'react'

const LinksWrapper = (props) => {
  const { data, renderCustomLinkElement } = props

  const renderLink = () => {
    const linkProps = {
      data: data,
    }

    return renderCustomLinkElement(linkProps)
  }
  return <>{renderLink()}</>
}

export default LinksWrapper
