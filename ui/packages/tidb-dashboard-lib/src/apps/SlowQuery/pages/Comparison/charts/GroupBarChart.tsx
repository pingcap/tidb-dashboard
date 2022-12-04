import React, { useEffect, useMemo, useState } from 'react'
import { Bar, BarConfig } from '@ant-design/plots'
import { TimeRange, TimeRangeValue, toTimeRangeValue } from '@lib/components'
import { getValueFormat } from '@baurine/grafana-value-formats'

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
    fetchData(promql, toTimeRangeValue(timeRange)).then((res) => {
      const result = res?.data?.result
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

const fetchData = (promql: string, timeRange: TimeRangeValue) => {
  const time = timeRange[1]
  const timeout = `${timeRange[1] - timeRange[0]}s`
  return fetch(
    `http://127.0.0.1:8428/api/v1/query?query=${promql}&time=${time}&timeout=${timeout}`
    // `http://127.0.0.1:8428/api/v1/query?query=${promql}&time=${1668938500}&timeout=${
    //   1668938500 - 1668936700
    // }s`
  ).then((resp) => resp.json())
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
