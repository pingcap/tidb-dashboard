import React from 'react'
import { SlowquerySlowQuery } from '@lib/client'
import { CardTableV2 } from '@lib/components'
import { getValueFormat } from '@baurine/grafana-value-formats'
import * as useColumn from '@lib/utils/useColumn'

export interface ITabBasicProps {
  data: SlowquerySlowQuery
}

export default function TabBasic({ data }: ITabBasicProps) {
  const items = [
    { key: 'digest', value: data.digest },
    { key: 'is_internal', value: data.is_internal },
    { key: 'is_success', value: data.success },
    { key: 'index_names', value: data.index_names },
    { key: 'stats', value: data.stats },
    { key: 'backoff_types', value: data.backoff_types },
    {
      key: 'max_mem',
      value: getValueFormat('bytes')(data.memory_max || 0, 1),
    },
    { key: 'user', value: data.user },
    { key: 'host', value: data.host },
    { key: 'db', value: data.db },
  ]
  const columns = [
    useColumn.useFieldsKeyColumn('slow_query.common.columns.'),
    useColumn.useFieldsValueColumn(),
    useColumn.useFieldsDescriptionColumn('slow_query.common.columns.'),
  ]
  return <CardTableV2 cardNoMargin columns={columns} items={items} />
}
