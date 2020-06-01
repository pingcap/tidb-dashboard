import React from 'react'
import { getValueFormat } from '@baurine/grafana-value-formats'

import { StatementModel } from '@lib/client'
import { CardTableV2, ShortValueWithTooltip } from '@lib/components'
import { valueColumns } from '@lib/utils/tableColumns'

export interface ITabTxnProps {
  data: StatementModel
}

export default function TabCopr({ data }: ITabTxnProps) {
  const items = [
    {
      key: 'avg_affected_rows',
      value: <ShortValueWithTooltip value={data.avg_affected_rows} />,
    },
    {
      key: 'sum_backoff_times',
      value: <ShortValueWithTooltip value={data.sum_backoff_times} />,
    },
    {
      key: 'avg_write_keys',
      value: <ShortValueWithTooltip value={data.avg_write_keys} />,
    },
    {
      key: 'max_write_keys',
      value: <ShortValueWithTooltip value={data.max_write_keys} />,
    },
    {
      key: 'avg_write_size',
      value: getValueFormat('bytes')(data.avg_write_size || 0, 1),
    },
    {
      key: 'max_write_size',
      value: getValueFormat('bytes')(data.max_write_size || 0, 1),
    },
    {
      key: 'avg_prewrite_regions',
      value: <ShortValueWithTooltip value={data.avg_prewrite_regions} />,
    },
    {
      key: 'max_prewrite_regions',
      value: <ShortValueWithTooltip value={data.max_prewrite_regions} />,
    },
    {
      key: 'avg_txn_retry',
      value: <ShortValueWithTooltip value={data.avg_txn_retry} />,
    },
    {
      key: 'max_txn_retry',
      value: <ShortValueWithTooltip value={data.max_txn_retry} />,
    },
  ]
  const columns = valueColumns('statement.fields.')
  return (
    <CardTableV2
      cardNoMargin
      columns={columns}
      items={items}
      extendLastColumn
    />
  )
}
