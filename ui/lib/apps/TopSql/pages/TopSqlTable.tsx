import React, { useMemo } from 'react'
import { Tooltip } from 'antd'
import { getValueFormat } from '@baurine/grafana-value-formats'

import { TopsqlCPUTimeItem } from '@lib/client'
import { Card, CardTable, Bar, TextWrap } from '@lib/components'
import { OTHERS_LABEL } from './useOthers'

interface TopSqlTableProps {
  topN: string
  data: TopsqlCPUTimeItem[]
  timeRange: [number, number] | undefined
}

interface TableData {
  query: string
  digest: string
  cpuTime: number
}

export function TopSqlTable({ topN, data, timeRange }: TopSqlTableProps) {
  const { data: tableData, totalCpuTime } = useTableData(data, timeRange)
  const tableColumns = useMemo(
    () => [
      {
        name: 'Query Template ID',
        key: 'digest',
        minWidth: 150,
        maxWidth: 250,
        onRender: (rec) =>
          rec.digest === OTHERS_LABEL ? (
            <i style={{ color: '#888' }}>{rec.digest}</i>
          ) : (
            <Tooltip title={rec.digest}>
              <TextWrap>{rec.digest}</TextWrap>
            </Tooltip>
          ),
      },
      {
        name: 'Query',
        key: 'query',
        minWidth: 150,
        maxWidth: 250,
        onRender: (rec) => {
          const text = rec.query
            ? rec.query === OTHERS_LABEL
              ? ''
              : rec.query
            : 'Unknown'
          return (
            <Tooltip
              title={text}
              overlayStyle={{ maxHeight: 500, overflow: 'scroll' }}
            >
              <TextWrap>{text}</TextWrap>
            </Tooltip>
          )
        },
      },
      {
        name: 'CPU',
        key: 'cpuTime',
        minWidth: 150,
        maxWidth: 250,
        onRender: (rec) => (
          <Bar textWidth={70} value={rec.cpuTime!} capacity={totalCpuTime}>
            {getValueFormat('ms')(rec.cpuTime, 0, 0)}
          </Bar>
        ),
      },
    ],
    [totalCpuTime]
  )
  return (
    <Card title={`Top ${topN} Queries`}>
      <CardTable
        cardNoMarginTop
        items={tableData || []}
        columns={tableColumns}
      />
    </Card>
  )
}

function useTableData(
  records: TopsqlCPUTimeItem[],
  timeRange: [number, number] | undefined
) {
  const tableData: { data: TableData[]; totalCpuTime: number } = useMemo(() => {
    if (!records) {
      return { data: [], totalCpuTime: 0 }
    }
    let totalCpuTime = 0
    const d = records
      .map((r) => {
        let cpuTime = 0
        r.plans?.forEach((plan) => {
          plan.timestamp_secs?.forEach((t, i) => {
            if (timeRange && (t < timeRange[0] || t > timeRange[1])) {
              return
            }
            cpuTime += plan.cpu_time_millis![i]
          })
        })
        totalCpuTime += cpuTime
        return { cpuTime, query: r.sql_text!, digest: r.sql_digest! }
      })
      .filter((r) => !!r.cpuTime)
      .sort((a, b) => b.cpuTime - a.cpuTime)
      .sort((a, b) => (b.digest === OTHERS_LABEL ? -1 : 0))
    return { data: d, totalCpuTime }
  }, [records, timeRange])

  return tableData
}
