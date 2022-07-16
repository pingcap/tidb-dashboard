import React from 'react'
import { getValueFormat } from '@baurine/grafana-value-formats'

import { SlowqueryModel } from '@lib/client'
import { ValueWithTooltip } from '@lib/components'

export const tabTxnItems = (data: SlowqueryModel) => [
  {
    key: 'txn_start_ts',
    value: data.txn_start_ts
  },
  {
    key: 'write_keys',
    value: <ValueWithTooltip.Short value={data.write_keys} />
  },
  {
    key: 'write_size',
    value: getValueFormat('bytes')(data.write_size || 0, 1)
  },
  {
    key: 'prewrite_region',
    value: <ValueWithTooltip.Short value={data.prewrite_region} />
  },
  {
    key: 'txn_retry',
    value: <ValueWithTooltip.Short value={data.txn_retry} />
  }
]
