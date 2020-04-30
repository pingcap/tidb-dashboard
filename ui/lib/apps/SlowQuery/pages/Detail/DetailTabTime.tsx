import React from 'react'
import { SlowquerySlowQuery } from '@lib/client'
import { CardTableV2 } from '@lib/components'
import * as useColumn from '@lib/utils/useColumn'
import { useTranslation } from 'react-i18next'
import { Typography } from 'antd'

export interface ITabTimeProps {
  data: SlowquerySlowQuery
}

export default function TabBasic({ data }: ITabTimeProps) {
  const { t } = useTranslation()
  const items = [
    {
      key: 'parse_time',
      value: data.parse_time! * 10e8,
    },
    {
      key: 'compile_time',
      value: data.compile_time! * 10e8,
    },
    {
      key: 'wait_time',
      value: data.wait_time! * 10e8,
    },
    {
      key: 'process_time',
      value: data.process_time! * 10e8,
    },
    {
      key: 'backoff_time',
      value: data.backoff_time! * 10e8,
    },
    {
      key: 'get_commit_ts_time',
      value: data.get_commit_ts_time! * 10e8,
    },
    {
      key: 'local_latch_wait_time',
      value: data.local_latch_wait_time! * 10e8,
    },
    {
      key: 'resolve_lock_time',
      value: data.resolve_lock_time! * 10e8,
    },
    {
      key: 'prewrite_time',
      value: data.prewrite_time! * 10e8,
    },
    {
      key: 'commit_time',
      value: data.commit_time! * 10e8,
    },
    {
      key: 'commit_backoff_time',
      value: data.commit_backoff_time! * 10e8,
    },
    {
      key: 'query_time2',
      keyDisplay: (
        <Typography.Text strong>
          {t('slow_query.common.columns.query_time2')}
        </Typography.Text>
      ),
      value: data.query_time! * 10e8,
    },
  ]
  const columns = [
    useColumn.useFieldsKeyColumn('slow_query.common.columns.'),
    useColumn.useFieldsTimeValueColumn(items),
    useColumn.useFieldsDescriptionColumn('slow_query.common.columns.'),
  ]
  return <CardTableV2 cardNoMargin columns={columns} items={items} />
}
