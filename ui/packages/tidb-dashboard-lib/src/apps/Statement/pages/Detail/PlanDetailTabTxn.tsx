import React from 'react'
import { getValueFormat } from '@baurine/grafana-value-formats'

import { StatementModel } from '@lib/client'
import { ValueWithTooltip } from '@lib/components'

export const tabTxnItems = (data: StatementModel) => [
  {
    key: 'avg_affected_rows',
    value: <ValueWithTooltip.Short value={data.avg_affected_rows} />
  },
  {
    key: 'sum_backoff_times',
    value: <ValueWithTooltip.Short value={data.sum_backoff_times} />
  },
  {
    key: 'avg_write_keys',
    value: <ValueWithTooltip.Short value={data.avg_write_keys} />
  },
  {
    key: 'max_write_keys',
    value: <ValueWithTooltip.Short value={data.max_write_keys} />
  },
  {
    key: 'avg_write_size',
    value: getValueFormat('bytes')(data.avg_write_size || 0, 1)
  },
  {
    key: 'max_write_size',
    value: getValueFormat('bytes')(data.max_write_size || 0, 1)
  },
  {
    key: 'avg_prewrite_regions',
    value: <ValueWithTooltip.Short value={data.avg_prewrite_regions} />
  },
  {
    key: 'max_prewrite_regions',
    value: <ValueWithTooltip.Short value={data.max_prewrite_regions} />
  },
  {
    key: 'avg_txn_retry',
    value: <ValueWithTooltip.Short value={data.avg_txn_retry} />
  },
  {
    key: 'max_txn_retry',
    value: <ValueWithTooltip.Short value={data.max_txn_retry} />
  }
]
