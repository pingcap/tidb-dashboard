import { Badge } from 'antd'
import dayjs from 'dayjs'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import React, { useContext, useMemo } from 'react'
import { useTranslation, TFunction } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useMemoizedFn } from 'ahooks'

import { DiagnoseReport } from '@lib/client'
import { CardTable, DateTime } from '@lib/components'
import openLink from '@lib/utils/openLink'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { SystemReportContext } from '../context'

const tableColumns = (t: TFunction): IColumn[] => [
  {
    name: t('system_report.list_table.id'),
    key: 'id',
    fieldName: 'id',
    minWidth: 200,
    maxWidth: 350
  },
  {
    name: t('system_report.list_table.report_create_time'),
    key: 'created_at',
    minWidth: 100,
    maxWidth: 200,
    onRender: (rec: DiagnoseReport) => (
      <DateTime.Calendar
        unixTimestampMs={dayjs(rec.created_at).unix() * 1000}
      />
    )
  },
  {
    name: t('system_report.list_table.status'),
    key: 'progress',
    minWidth: 100,
    maxWidth: 150,
    onRender: (rec: DiagnoseReport) => {
      if (rec.progress! < 100) {
        return (
          <Badge
            status="processing"
            text={t('system_report.list_table.status_running')}
          />
        )
      } else {
        return (
          <Badge
            status="success"
            text={t('system_report.list_table.status_finish')}
          />
        )
      }
    }
  },
  {
    name: t('system_report.list_table.range'),
    key: 'start_time',
    minWidth: 200,
    maxWidth: 350,
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
    }
  },
  {
    name: t('system_report.list_table.compare_range'),
    key: 'compare_start_time',
    minWidth: 200,
    maxWidth: 350,
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
      )
  }
]

export default function ReportHistory() {
  const ctx = useContext(SystemReportContext)

  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data, isLoading, error } = useClientRequest(
    ctx!.ds.diagnoseReportsGet
  )
  const columns = useMemo(() => tableColumns(t), [t])

  const handleRowClick = useMemoizedFn(
    (rec, _idx, ev: React.MouseEvent<HTMLElement>) => {
      openLink(`/system_report/detail?id=${rec.id}`, ev, navigate)
    }
  )

  return (
    <CardTable
      cardNoMarginTop
      loading={isLoading}
      items={data || []}
      columns={columns}
      errors={[error]}
      onRowClicked={handleRowClick}
    />
  )
}
