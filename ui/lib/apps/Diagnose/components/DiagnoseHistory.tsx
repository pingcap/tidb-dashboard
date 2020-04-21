import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from 'antd'
import { useTranslation } from 'react-i18next'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import dayjs from 'dayjs'
import { CardTableV2, DateTime } from '@lib/components'
import client, { DiagnoseReport } from '@lib/client'
import { useClientRequest } from '@lib/utils/useClientRequest'

const tableColumns = (t: (string) => string): IColumn[] => [
  {
    name: '报告创建时间',
    key: 'created_at',
    minWidth: 160,
    maxWidth: 220,
    isResizable: true,
    onRender: (rec) => (
      <DateTime.Calendar unixTimeStampMs={dayjs(rec.CreatedAt).unix() * 1000} />
    ),
  },
  {
    name: '状态',
    key: 'progress',
    minWidth: 80,
    maxWidth: 120,
    isResizable: true,
    onRender: (rec: DiagnoseReport) => {
      if (rec.progress! < 100) {
        return <Badge status="processing" text="running" />
      } else {
        return <Badge status="success" text="finish" />
      }
    },
  },
  {
    name: '诊断起始时间',
    key: 'start_time',
    minWidth: 160,
    maxWidth: 220,
    isResizable: true,
    onRender: (rec: DiagnoseReport) => (
      <DateTime.Calendar
        unixTimeStampMs={dayjs(rec.start_time).unix() * 1000}
      />
    ),
  },
  {
    name: '诊断结束时间',
    key: 'end_time',
    minWidth: 160,
    maxWidth: 220,
    isResizable: true,
    onRender: (rec: DiagnoseReport) => (
      <DateTime.Calendar unixTimeStampMs={dayjs(rec.end_time).unix() * 1000} />
    ),
  },
  {
    name: '诊断对比开始时间',
    key: 'compare_start_time',
    minWidth: 160,
    maxWidth: 220,
    isResizable: true,
    onRender: (rec: DiagnoseReport) =>
      rec.compare_start_time && (
        <DateTime.Calendar
          unixTimeStampMs={dayjs(rec.compare_start_time).unix() * 1000}
        />
      ),
  },
  {
    name: '诊断对比开始时间',
    key: 'compare_end_time',
    minWidth: 160,
    maxWidth: 220,
    isResizable: true,
    onRender: (rec: DiagnoseReport) =>
      rec.compare_start_time && (
        <DateTime.Calendar
          unixTimeStampMs={dayjs(rec.compare_end_time).unix() * 1000}
        />
      ),
  },
]

export default function DiagnoseHistory() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const {
    data: historyTable,
    isLoading: listLoading,
  } = useClientRequest((cancelToken) =>
    client.getInstance().diagnoseReportsGet({ cancelToken })
  )
  const historyTableColumns = useMemo(() => tableColumns(t), [t])

  function handleRowClick(rec) {
    navigate(`/diagnose/${rec.ID}`)
  }

  return (
    <CardTableV2
      loading={listLoading}
      items={historyTable || []}
      columns={historyTableColumns}
      onRowClicked={handleRowClick}
    />
  )
}
