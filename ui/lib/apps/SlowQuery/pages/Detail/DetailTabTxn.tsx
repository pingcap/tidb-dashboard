import React from 'react'
import { getValueFormat } from '@baurine/grafana-value-formats'

import { SlowqueryModel } from '@lib/client'
import { CardTable, ValueWithTooltip } from '@lib/components'
import { valueColumns } from '@lib/utils/tableColumns'

export interface ITabTxnProps {
  data: SlowqueryModel
}

export default function TabCopr({ data }: ITabTxnProps) {
  const items = [
    {
      key: 'txn_start_ts',
      value: data.txn_start_ts,
    },
    {
      key: 'write_keys',
      value: <ValueWithTooltip.Short value={data.write_keys} />,
    },
    {
      key: 'write_size',
      value: getValueFormat('bytes')(data.write_size || 0, 1),
    },
    {
      key: 'prewrite_region',
      value: <ValueWithTooltip.Short value={data.prewrite_region} />,
    },
    {
      key: 'txn_retry',
      value: <ValueWithTooltip.Short value={data.txn_retry} />,
    },
  ]
  const columns = valueColumns('slow_query.fields.')
  return (
    <CardTable cardNoMargin columns={columns} items={items} extendLastColumn />
  )
}
