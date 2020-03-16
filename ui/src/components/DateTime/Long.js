import React from 'react'
import { Tooltip } from 'antd'
import dayjs from 'dayjs'
import { withTranslation } from 'react-i18next'

@withTranslation() // Re-render when language changes
class Long extends React.PureComponent {
  render() {
    const { unixTimeStampMs, ...rest } = this.props
    return (
      <Tooltip title={format(unixTimeStampMs)} {...rest}>
        {format(unixTimeStampMs)}
      </Tooltip>
    )
  }
}

export function format(unixTimeStampMs) {
  return dayjs(unixTimeStampMs).format('ll LTS')
}

export default Long
