import React from 'react'

import { StatementModel } from '@lib/client'
import { ValueWithTooltip } from '@lib/components'

export const tabCoprItems = (data: StatementModel) => [
  { key: 'sum_cop_task_num', value: data.sum_cop_task_num },
  {
    key: 'avg_processed_keys',
    value: <ValueWithTooltip.Short value={data.avg_processed_keys} />
  },
  {
    key: 'max_processed_keys',
    value: <ValueWithTooltip.Short value={data.max_processed_keys} />
  },
  {
    key: 'avg_total_keys',
    value: <ValueWithTooltip.Short value={data.avg_total_keys} />
  },
  {
    key: 'max_total_keys',
    value: <ValueWithTooltip.Short value={data.max_total_keys} />
  },
  {
    key: 'avg_rocksdb_block_cache_hit_count',
    value: (
      <ValueWithTooltip.Short value={data.avg_rocksdb_block_cache_hit_count} />
    )
  },
  {
    key: 'max_rocksdb_block_cache_hit_count',
    value: (
      <ValueWithTooltip.Short value={data.max_rocksdb_block_cache_hit_count} />
    )
  },
  {
    key: 'avg_rocksdb_block_read_byte',
    value: (
      <ValueWithTooltip.ScaledBytes value={data.avg_rocksdb_block_read_byte} />
    )
  },
  {
    key: 'max_rocksdb_block_read_byte',
    value: (
      <ValueWithTooltip.ScaledBytes value={data.max_rocksdb_block_read_byte} />
    )
  },
  {
    key: 'avg_rocksdb_block_read_count',
    value: <ValueWithTooltip.Short value={data.avg_rocksdb_block_read_count} />
  },
  {
    key: 'max_rocksdb_block_read_count',
    value: <ValueWithTooltip.Short value={data.max_rocksdb_block_read_count} />
  },
  {
    key: 'avg_rocksdb_delete_skipped_count',
    value: (
      <ValueWithTooltip.Short value={data.avg_rocksdb_delete_skipped_count} />
    )
  },
  {
    key: 'max_rocksdb_delete_skipped_count',
    value: (
      <ValueWithTooltip.Short value={data.max_rocksdb_delete_skipped_count} />
    )
  },
  {
    key: 'avg_rocksdb_key_skipped_count',
    value: <ValueWithTooltip.Short value={data.avg_rocksdb_key_skipped_count} />
  },
  {
    key: 'max_rocksdb_key_skipped_count',
    value: <ValueWithTooltip.Short value={data.max_rocksdb_key_skipped_count} />
  }
]
