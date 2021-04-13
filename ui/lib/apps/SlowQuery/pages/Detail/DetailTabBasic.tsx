import React from 'react'
import { SlowqueryModel } from '@lib/client'
import { CardTable, DateTime } from '@lib/components'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { valueColumns } from '@lib/utils/tableColumns'

export interface ITabBasicProps {
  data: SlowqueryModel
}

export default function TabBasic({ data }: ITabBasicProps) {
  // Here it is fine to not use useMemo() to cache data,
  // because the detail data won't be refreshed after loaded
  const items = [
    {
      key: 'timestamp',
      value: (
        <DateTime.Calendar unixTimestampMs={(data.timestamp ?? 0) * 1000} />
      ),
    },
    { key: 'digest', value: data.digest },
    { key: 'is_internal', value: data.is_internal },
    { key: 'is_success', value: data.success },
    { key: 'db', value: data.db },
    { key: 'index_names', value: data.index_names },
    { key: 'stats', value: data.stats },
    { key: 'backoff_types', value: data.backoff_types },
    {
      key: 'memory_max',
      value: getValueFormat('bytes')(data.memory_max || 0, 1),
    },
    {
      key: 'disk_max',
      value: getValueFormat('bytes')(data.disk_max || 0, 1),
    },
    { key: 'instance', value: data.instance },
    { key: 'connection_id', value: data.connection_id },
    { key: 'user', value: data.user },
    { key: 'host', value: data.host },
  ]
  const columns = valueColumns('slow_query.fields.')
  return (
    <CardTable cardNoMargin columns={columns} items={items} extendLastColumn />
  )
}
