import React from 'react'

import { SlowqueryModel } from '@lib/client'
import { ValueWithTooltip } from '@lib/components'

export const tabCoprItems = (data: SlowqueryModel) => [
  {
    key: 'request_count',
    value: <ValueWithTooltip.Short value={data.request_count} />
  },
  {
    key: 'process_keys',
    value: <ValueWithTooltip.Short value={data.process_keys} />
  },
  {
    key: 'total_keys',
    value: <ValueWithTooltip.Short value={data.total_keys} />
  },
  {
    key: 'cop_proc_addr',
    value: data.cop_proc_addr
  },
  {
    key: 'cop_wait_addr',
    value: data.cop_wait_addr
  },
  {
    key: 'rocksdb_block_cache_hit_count',
    value: <ValueWithTooltip.Short value={data.rocksdb_block_cache_hit_count} />
  },
  {
    key: 'rocksdb_block_read_byte',
    value: <ValueWithTooltip.ScaledBytes value={data.rocksdb_block_read_byte} />
  },
  {
    key: 'rocksdb_block_read_count',
    value: <ValueWithTooltip.Short value={data.rocksdb_block_read_count} />
  },
  {
    key: 'rocksdb_delete_skipped_count',
    value: <ValueWithTooltip.Short value={data.rocksdb_delete_skipped_count} />
  },
  {
    key: 'rocksdb_key_skipped_count',
    value: <ValueWithTooltip.Short value={data.rocksdb_key_skipped_count} />
  }
]
