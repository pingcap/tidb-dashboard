import React from 'react'
import { getValueFormat } from '@baurine/grafana-value-formats'

import { SlowquerySlowQuery } from '@lib/client'
import { CardTableV2, ShortValueWithTooltip } from '@lib/components'
import { valueColumns } from '@lib/utils/tableColumns'

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
      value: <ShortValueWithTooltip value={data.write_keys} />,
    },
    {
      key: 'write_size',
      value: getValueFormat('bytes')(data.write_size || 0, 1),
    },
    {
      key: 'prewrite_regions',
      value: <ShortValueWithTooltip value={data.prewrite_region} />,
    },
    {
      key: 'txn_retry',
      value: <ShortValueWithTooltip value={data.txn_retry} />,
    },
  ]
  const columns = valueColumns('slow_query.fields.')
  return (
    <CardTableV2
      cardNoMargin
      columns={columns}
      items={items}
      extendLastColumn
    />
  )
}
