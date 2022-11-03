import { ZoomOutOutlined } from '@ant-design/icons'
import { useMemoizedFn } from 'ahooks'
import { Button } from 'antd'
import React from 'react'
import TimeRangeSelector, {
  fromTimeRangeValue,
  toTimeRangeValue,
  ITimeRangeSelectorProps
} from '.'

export interface ITimeRangeSelectorWithZoomOutProps
  extends ITimeRangeSelectorProps {
  zoomOutRate?: number
  minRange?: number
  onZoomOutClick?: (start: number, end: number) => void
}

export function WithZoomOut({
  zoomOutRate = 0.5,
  minRange = 5 * 60,
  onZoomOutClick,
  ...rest
}: ITimeRangeSelectorWithZoomOutProps) {
  const handleZoomOut = useMemoizedFn(() => {
    if (!rest.onChange) {
      return
    }
    const [start, end] = toTimeRangeValue(rest.value)
    let expand = (end - start) * zoomOutRate
    if (expand < minRange) {
      expand = minRange
    }

    let computedStart = start - expand
    let computedEnd = end + expand
    const newRange = fromTimeRangeValue([computedStart, computedEnd])
    onZoomOutClick!(computedStart, computedEnd)
    rest.onChange?.(newRange)
  })

  return (
    <Button.Group>
      <Button
        icon={<ZoomOutOutlined />}
        onClick={handleZoomOut}
        disabled={rest.disabled}
      />
      <TimeRangeSelector {...rest} />
    </Button.Group>
  )
}
