import React from 'react'
import { Tooltip } from 'antd'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { IDateTimeProps } from '.'

import localizedFormat from 'dayjs/plugin/localizedFormat'

dayjs.extend(localizedFormat)

function Long({ unixTimestampMs, ...rest }: IDateTimeProps) {
  useTranslation() // Re-render when language changes
  return (
    <Tooltip title={format(unixTimestampMs)} {...rest}>
      <span>{format(unixTimestampMs)}</span>
    </Tooltip>
  )
}

export function format(unixTimestampMs: number) {
  return dayjs(unixTimestampMs).format('ll LTS (z)')
}

export default React.memo(Long)
