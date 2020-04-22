import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from 'antd'
import { useTranslation } from 'react-i18next'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import dayjs from 'dayjs'
import { CardTableV2, DateTime } from '@lib/components'
import client, { DiagnoseReport } from '@lib/client'
import { useClientRequest } from '@lib/utils/useClientRequest'
import type { TFunction } from 'i18next'

const tableColumns = (t: TFunction): IColumn[] => [
  {
    name: t('diagnose.list_table.id'),
    key: 'id',
    fieldName: 'id',
    minWidth: 200,
    maxWidth: 350,
    isResizable: true,
  },
  {
    name: t('diagnose.list_table.diagnose_create_time'),
    key: 'created_at',
    minWidth: 100,
    maxWidth: 200,
    isResizable: true,
    onRender: (rec) => (
      <DateTime.Calendar unixTimestampMs={dayjs(rec.CreatedAt).unix() * 1000} />
    ),
  },
  {
    name: t('diagnose.list_table.status'),
    key: 'progress',
    minWidth: 100,
    maxWidth: 150,
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
    name: t('diagnose.list_table.range'),
    key: 'start_time',
    minWidth: 200,
    maxWidth: 350,
    isResizable: true,
    onRender: (rec: DiagnoseReport) => {
      return (
        <span>
          <DateTime.Calendar
            unixTimestampMs={dayjs(rec.start_time).unix() * 1000}
          />{' '}
          ~{' '}
          <DateTime.Calendar
            unixTimestampMs={dayjs(rec.end_time).unix() * 1000}
          />
        </span>
      )
    },
  },
  {
    name: t('diagnose.list_table.compare_range'),
    key: 'compare_start_time',
    minWidth: 200,
    maxWidth: 350,
    isResizable: true,
    onRender: (rec: DiagnoseReport) =>
      rec.compare_start_time && (
        <span>
          <DateTime.Calendar
            unixTimestampMs={dayjs(rec.compare_start_time).unix() * 1000}
          />{' '}
          ~{' '}
          <DateTime.Calendar
            unixTimestampMs={dayjs(rec.compare_end_time).unix() * 1000}
          />
        </span>
      ),
  },
]

export default function DiagnoseHistory() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data, isLoading } = useClientRequest((cancelToken) =>
    client.getInstance().diagnoseReportsGet({ cancelToken })
  )
  const columns = useMemo(() => tableColumns(t), [t])

  function handleRowClick(rec) {
    navigate(`/diagnose/${rec.id}`)
  }

  return (
    <CardTableV2
      loading={isLoading}
      items={data || []}
      columns={columns}
      onRowClicked={handleRowClick}
    />
  )
}
