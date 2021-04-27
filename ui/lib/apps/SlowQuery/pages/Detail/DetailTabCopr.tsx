import React from 'react'

import { SlowqueryModel } from '@lib/client'
import { CardTable, ValueWithTooltip } from '@lib/components'
import { valueColumns } from '@lib/utils/tableColumns'
import { useSchemaColumns } from '../../utils/useSchemaColumns'

export interface ITabCoprProps {
  data: SlowqueryModel
}

export default function TabCopr({ data }: ITabCoprProps) {
  const { schemaColumns } = useSchemaColumns()
  const columnsSet = new Set(schemaColumns)
  const items = [
    {
      key: 'request_count',
      value: <ValueWithTooltip.Short value={data.request_count} />,
    },
    {
      key: 'process_keys',
      value: <ValueWithTooltip.Short value={data.process_keys} />,
    },
    {
      key: 'total_keys',
      value: <ValueWithTooltip.Short value={data.total_keys} />,
    },
    {
      key: 'cop_proc_addr',
      value: data.cop_proc_addr,
    },
    {
      key: 'cop_wait_addr',
      value: data.cop_wait_addr,
    },
    {
      key: 'rocksdb_block_cache_hit_count',
      value: (
        <ValueWithTooltip.Short value={data.rocksdb_block_cache_hit_count} />
      ),
    },
    {
      key: 'rocksdb_block_read_byte',
      value: (
        <ValueWithTooltip.ScaledBytes value={data.rocksdb_block_read_byte} />
      ),
    },
    {
      key: 'rocksdb_block_read_count',
      value: <ValueWithTooltip.Short value={data.rocksdb_block_read_count} />,
    },
    {
      key: 'rocksdb_delete_skipped_count',
      value: (
        <ValueWithTooltip.Short value={data.rocksdb_delete_skipped_count} />
      ),
    },
    {
      key: 'rocksdb_key_skipped_count',
      value: <ValueWithTooltip.Short value={data.rocksdb_key_skipped_count} />,
    },
  ].filter((item) => columnsSet.has(item.key))
  const columns = valueColumns('slow_query.fields.')
  return (
    <CardTable cardNoMargin columns={columns} items={items} extendLastColumn />
  )
}
