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
    name: t('diagnose.list_table.diagnose_create_time'),
    key: 'created_at',
    minWidth: 160,
    maxWidth: 220,
    isResizable: true,
    onRender: (rec) => (
      <DateTime.Calendar unixTimeStampMs={dayjs(rec.CreatedAt).unix() * 1000} />
    ),
  },
  {
    name: t('diagnose.list_table.status'),
    key: 'progress',
    minWidth: 80,
    maxWidth: 120,
    isResizable: true,
    onRender: (rec: DiagnoseReport) => {
      if (rec.progress! < 100) {
        return (
          <Badge
            status="processing"
            text={t('diagnose.list_table.status_running')}
          />
        )
      } else {
        return (
          <Badge
            status="success"
            text={t('diagnose.list_table.status_finish')}
          />
        )
      }
    },
  },
  {
    name: t('diagnose.list_table.diagnose_start_time'),
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
    name: t('diagnose.list_table.diagnose_end_time'),
    key: 'end_time',
    minWidth: 160,
    maxWidth: 220,
    isResizable: true,
    onRender: (rec: DiagnoseReport) => (
      <DateTime.Calendar unixTimeStampMs={dayjs(rec.end_time).unix() * 1000} />
    ),
  },
  {
    name: t('diagnose.list_table.compare_start_time'),
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
    name: t('diagnose.list_table.diagnose_end_time'),
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
