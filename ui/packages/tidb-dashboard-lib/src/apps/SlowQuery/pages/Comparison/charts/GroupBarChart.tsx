import React, { useContext, useEffect, useMemo, useState } from 'react'
import { Bar, BarConfig } from '@ant-design/plots'
import { TimeRange, TimeRangeValue, toTimeRangeValue } from '@lib/components'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { SlowQueryContext } from '@lib/apps/SlowQuery/context'

interface GroupBarChartProps {
  promql: string
  timeRange: TimeRange
  label: string
  unit: string
  height?: number
  diff?: GroupData[]
  onDataChange?: (d: GroupData[]) => void
}

export interface GroupData {
  label: string
  value: number
  type?: 'Value' | 'Diff'
}

export const GroupBarChart: React.FC<GroupBarChartProps> = ({
  promql,
  timeRange,
  label,
  unit,
  height,
  diff,
  onDataChange
}) => {
  const ctx = useContext(SlowQueryContext)
  const dataFormatter = (v: any) => {
    if (v === null) {
      return v
    }
    let _unit = unit || 'none'
    if (['short', 'none'].includes(_unit) && v < 1) {
      return v.toPrecision(3)
    }
    return getValueFormat(_unit)(v, 2)
  }
  const [data, setData] = useState<GroupData[]>([])
  const config = useMemo(
    () =>
      ({
        data: diff ? transformDiffData(data, diff) : data,
        height,
        isGroup: !!diff,
        label: !!diff ? {} : undefined,
        xField: 'value',
        yField: 'label',
        seriesField: !!diff ? 'type' : undefined,
        yAxis: {
          label: {
            autoEllipsis: true
          }
        },
        slider:
          data.length > 20
            ? {
                formatter: () => ''
              }
            : false,
        legend: false,
        meta: {
          value: {
            sync: true,
            alias: 'Value',
            formatter: dataFormatter
          }
        }
      } as BarConfig),
    [data, height, diff]
  )

  useEffect(() => {
    const timeRangeValue = toTimeRangeValue(timeRange)
    const time = timeRangeValue[1]
    const timeout = `${timeRangeValue[1] - timeRangeValue[0]}s`
    ctx?.ds.promqlQuery(promql, time, timeout).then((res) => {
      const result = (res?.data as any)?.result
      if (!result) {
        return
      }

      const d = result.map((r) => ({
        label: r.metric[label],
        value: parseFloat(r.value[1])
      }))
      setData(d)
      onDataChange?.(d)
    })
  }, [timeRange, promql])

  return <Bar {...config}></Bar>
}

const transformDiffData = (
  data: GroupData[],
  diffData: GroupData[]
): GroupData[] => {
  const newData: GroupData[] = data.map((d) => ({ ...d, type: 'Value' }))
  const dataMap = new Map(newData.map((d) => [d.label, d]))

  diffData.forEach((d) => {
    if (dataMap.has(d.label)) {
      newData.push({
        type: 'Diff',
        value: dataMap.get(d.label)?.value! - d.value,
        label: d.label
      })
      dataMap.delete(d.label)
    } else {
      newData.push({ type: 'Value', value: 0, label: d.label })
      newData.push({ type: 'Diff', value: -d.value, label: d.label })
    }
  })
  dataMap.forEach((d) => {
    newData.push({ type: 'Diff', value: d.value, label: d.label })
  })

  return newData
}
