import React from 'react'
import { SlowquerySlowQuery } from '@lib/client'
import { CardTableV2 } from '@lib/components'
import { getValueFormat } from '@baurine/grafana-value-formats'
import * as useColumn from '@lib/utils/useColumn'

export interface ITabTxnProps {
  data: SlowquerySlowQuery
}

export default function TabCopr({ data }: ITabTxnProps) {
  const items = [
    {
      key: 'txn_start_ts',
      value: data.txn_start_ts,
    },
    {
      key: 'write_keys',
      value: getValueFormat('short')(data.write_keys || 0, 1),
    },
    {
      key: 'write_size',
      value: getValueFormat('bytes')(data.write_size || 0, 1),
    },
    {
      key: 'prewrite_regions',
      value: getValueFormat('short')(data.prewrite_region || 0, 1),
    },
    {
      key: 'txn_retry',
      value: data.txn_retry,
    },
  ]
  const columns = [
    useColumn.useFieldsKeyColumn('slow_query.common.columns.'),
    useColumn.useFieldsValueColumn(),
    useColumn.useFieldsDescriptionColumn('slow_query.common.columns.'),
  ]
  return <CardTableV2 cardNoMargin columns={columns} items={items} />
}
