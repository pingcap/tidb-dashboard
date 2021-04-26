import React from 'react'

import { SlowqueryModel } from '@lib/client'
import {
  CardTable,
  ShortValueWithTooltip,
  ScaledBytesWithTooltip,
} from '@lib/components'
import { valueColumns } from '@lib/utils/tableColumns'

export interface ITabCoprProps {
  data: SlowqueryModel
}

export default function TabCopr({ data }: ITabCoprProps) {
  const items = [
    genShortValueTooltipValueItem(data, 'request_count'),
    genShortValueTooltipValueItem(data, 'process_keys'),
    genShortValueTooltipValueItem(data, 'total_keys'),
    {
      key: 'cop_proc_addr',
      value: data.cop_proc_addr,
    },
    {
      key: 'cop_wait_addr',
      value: data.cop_wait_addr,
    },
    genShortValueTooltipValueItem(data, 'rocksdb_block_cache_hit_count'),
    genScaledBytesTooltipValueItem(data, 'rocksdb_block_read_byte'),
    genShortValueTooltipValueItem(data, 'rocksdb_block_read_count'),
    genShortValueTooltipValueItem(data, 'rocksdb_delete_skipped_count'),
    genShortValueTooltipValueItem(data, 'rocksdb_key_skipped_count'),
  ]
  const columns = valueColumns('slow_query.fields.')
  return (
    <CardTable cardNoMargin columns={columns} items={items} extendLastColumn />
  )
}

// TODO: refactor items code gen for all DetailsList
function genShortValueTooltipValueItem(
  data: SlowqueryModel,
  key: keyof SlowqueryModel
) {
  return {
    key,
    value: <ShortValueWithTooltip value={Number(data[key])} />,
  }
}

function genScaledBytesTooltipValueItem(
  data: SlowqueryModel,
  key: keyof SlowqueryModel
) {
  return {
    key,
    value: <ScaledBytesWithTooltip value={Number(data[key])} />,
  }
}
