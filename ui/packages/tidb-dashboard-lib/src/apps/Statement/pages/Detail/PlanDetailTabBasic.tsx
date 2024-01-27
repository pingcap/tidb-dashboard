import { Tooltip } from 'antd'
import React from 'react'
import { getValueFormat } from '@baurine/grafana-value-formats'

import { StatementModel } from '@lib/client'
import { DateTime, Pre, ValueWithTooltip, TextWrap } from '@lib/components'

export const tabBasicItems = (data: StatementModel) => [
  {
    key: 'table_names',
    value: (
      <Tooltip title={data.table_names}>
        <TextWrap>
          <Pre>{data.table_names}</Pre>
        </TextWrap>
      </Tooltip>
    )
  },
  { key: 'index_names', value: data.index_names },
  {
    key: 'first_seen',
    value: data.first_seen && (
      <DateTime.Calendar unixTimestampMs={data.first_seen * 1000} />
    )
  },
  {
    key: 'last_seen',
    value: data.last_seen && (
      <DateTime.Calendar unixTimestampMs={data.last_seen * 1000} />
    )
  },
  {
    key: 'exec_count',
    value: <ValueWithTooltip.Short value={data.exec_count} />
  },
  {
    key: 'plan_cache_hits',
    value: <ValueWithTooltip.Short value={data.plan_cache_hits} />
  },
  {
    key: 'sum_latency',
    value: getValueFormat('ns')(data.sum_latency || 0, 1)
  },
  { key: 'sample_user', value: data.sample_user },
  {
    key: 'sum_errors',
    value: <ValueWithTooltip.Short value={data.sum_errors} />
  },
  {
    key: 'sum_warnings',
    value: <ValueWithTooltip.Short value={data.sum_warnings} />
  },
  {
    key: 'avg_mem',
    value: getValueFormat('bytes')(data.avg_mem || 0, 1)
  },
  {
    key: 'max_mem',
    value: getValueFormat('bytes')(data.max_mem || 0, 1)
  },
  {
    key: 'avg_disk',
    value: getValueFormat('bytes')(data.avg_disk || 0, 1)
  },
  {
    key: 'max_disk',
    value: getValueFormat('bytes')(data.max_disk || 0, 1)
  },
  {
    key: 'avg_ru',
    value: getValueFormat('short')(data.avg_ru || 0, 1)
  },
  {
    key: 'max_ru',
    value: getValueFormat('short')(data.max_ru || 0, 1)
  },
  {
    key: 'resource_group',
    value: data.resource_group
  }
]
