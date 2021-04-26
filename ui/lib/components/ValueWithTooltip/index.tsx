import React from 'react'
import { Tooltip } from 'antd'
import { getValueFormat, scaledUnits } from '@baurine/grafana-value-formats'

export interface IValueWithTooltipProps {
  value?: number
  scaledDecimal?: number
}

export default function ShortValueWithTooltip({
  value = 0,
  scaledDecimal = 1,
}: IValueWithTooltipProps) {
  return (
    <Tooltip title={value}>
      <span>{getValueFormat('short')(value || 0, 0, scaledDecimal)}</span>
    </Tooltip>
  )
}

const bytesScaler = scaledUnits(1024, ['', 'K', 'M', 'B', 'T'])

export function ScaledBytesWithTooltip({
  value = 0,
  scaledDecimal = 2,
}: IValueWithTooltipProps) {
  return (
    <Tooltip title={getValueFormat('bytes')(value || 0, 0, scaledDecimal)}>
      <span>{bytesScaler(value || 0, 0, scaledDecimal)}</span>
    </Tooltip>
  )
}
