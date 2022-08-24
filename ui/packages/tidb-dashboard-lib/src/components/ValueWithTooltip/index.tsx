import React from 'react'
import { Tooltip } from 'antd'
import { getValueFormat, scaledUnits } from '@baurine/grafana-value-formats'

interface IValueWithTooltip extends IInternalValueWithTooltip {
  Short: typeof ShortValueWithTooltip
  ScaledBytes: typeof ScaledBytesWithTooltip
}

interface IInternalValueWithTooltip {
  title: string
  value: any
}

function InternalValueWithTooltip({ title, value }: IValueWithTooltip) {
  return (
    <Tooltip title={title}>
      <span>{value}</span>
    </Tooltip>
  )
}

export interface IValueWithTooltipProps {
  value?: number
  scaledDecimal?: number
}

function ShortValueWithTooltip({
  value = 0,
  scaledDecimal = 1
}: IValueWithTooltipProps) {
  return (
    <Tooltip title={value}>
      <span>{getValueFormat('short')(value || 0, 0, scaledDecimal)}</span>
    </Tooltip>
  )
}

const bytesScaler = scaledUnits(1024, ['', 'K', 'M', 'G', 'T'])

function ScaledBytesWithTooltip({
  value = 0,
  scaledDecimal = 2
}: IValueWithTooltipProps) {
  return (
    <Tooltip title={getValueFormat('bytes')(value || 0, 0, scaledDecimal)}>
      <span>{bytesScaler(value || 0, 0, scaledDecimal)}</span>
    </Tooltip>
  )
}

const ValueWithTooltip =
  InternalValueWithTooltip as unknown as IValueWithTooltip

ValueWithTooltip.Short = ShortValueWithTooltip
ValueWithTooltip.ScaledBytes = ScaledBytesWithTooltip

export { ValueWithTooltip }
