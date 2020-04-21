import React from 'react'
import { StatementModel } from '@lib/client'
import { CardTableV2 } from '@lib/components'
import * as useColumn from '@lib/utils/useColumn'
import { useTranslation } from 'react-i18next'
import { Typography } from 'antd'

export interface ITabTimeProps {
  data: StatementModel
}

export default function TabBasic({ data }: ITabTimeProps) {
  const { t } = useTranslation()
  const items = [
    {
      key: 'parse_latency',
      avg: data.avg_parse_latency,
      max: data.max_parse_latency,
    },
    {
      key: 'compile_latency',
      avg: data.avg_compile_latency,
      max: data.max_compile_latency,
    },
    { key: 'wait_time', avg: data.avg_wait_time, max: data.max_wait_time },
    {
      key: 'process_time',
      avg: data.avg_process_time,
      max: data.max_process_time,
    },
    {
      key: 'backoff_time',
      avg: data.avg_backoff_time,
      max: data.max_backoff_time,
    },
    {
      key: 'get_commit_ts_time',
      avg: data.avg_get_commit_ts_time,
      max: data.max_get_commit_ts_time,
    },
    {
      key: 'local_latch_wait_time',
      avg: data.avg_local_latch_wait_time,
      max: data.max_local_latch_wait_time,
    },
    {
      key: 'resolve_lock_time',
      avg: data.avg_resolve_lock_time,
      max: data.max_resolve_lock_time,
    },
    {
      key: 'prewrite_time',
      avg: data.avg_prewrite_time,
      max: data.max_prewrite_time,
    },
    {
      key: 'commit_time',
      avg: data.avg_commit_time,
      max: data.max_commit_time,
    },
    {
      key: 'commit_backoff_time',
      avg: data.avg_commit_backoff_time,
      max: data.max_commit_backoff_time,
    },
    {
      key: 'latency',
      keyDisplay: (
        <Typography.Text strong>
          {t('statement.fields.latency')}
        </Typography.Text>
      ),
      avg: data.avg_latency,
      min: data.min_latency,
      max: data.max_latency,
    },
  ]
  const columns = [
    useColumn.useFieldsKeyColumn('statement.fields.'),
    useColumn.useFieldsTimeValueColumn(items),
    useColumn.useFieldsDescriptionColumn('statement.fields.'),
  ]
  return <CardTableV2 cardNoMargin columns={columns} items={items} />
}
