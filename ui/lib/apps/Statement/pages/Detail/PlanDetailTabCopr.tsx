import React from 'react'

import { StatementModel } from '@lib/client'
import {
  CardTable,
  ShortValueWithTooltip,
  ScaledBytesWithTooltip,
} from '@lib/components'
import { valueColumns } from '@lib/utils/tableColumns'

import { useSchemaColumns } from '../../utils/useSchemaColumns'

export interface ITabCoprProps {
  data: StatementModel
}

export default function TabCopr({ data }: ITabCoprProps) {
  const { schemaColumns } = useSchemaColumns()
  const columnsSet = new Set(schemaColumns)
  const items = [
    { key: 'sum_cop_task_num', value: data.sum_cop_task_num },
    genShortValueTooltipValueItem(data, 'avg_processed_keys'),
    genShortValueTooltipValueItem(data, 'max_processed_keys'),
    genShortValueTooltipValueItem(data, 'avg_total_keys'),
    genShortValueTooltipValueItem(data, 'max_total_keys'),
    genShortValueTooltipValueItem(data, 'avg_rocksdb_block_cache_hit_count'),
    genShortValueTooltipValueItem(data, 'max_rocksdb_block_cache_hit_count'),
    genScaledBytesTooltipValueItem(data, 'avg_rocksdb_block_read_byte'),
    genScaledBytesTooltipValueItem(data, 'max_rocksdb_block_read_byte'),
    genShortValueTooltipValueItem(data, 'avg_rocksdb_block_read_count'),
    genShortValueTooltipValueItem(data, 'max_rocksdb_block_read_count'),
    genShortValueTooltipValueItem(data, 'avg_rocksdb_delete_skipped_count'),
    genShortValueTooltipValueItem(data, 'max_rocksdb_delete_skipped_count'),
    genShortValueTooltipValueItem(data, 'avg_rocksdb_key_skipped_count'),
    genShortValueTooltipValueItem(data, 'max_rocksdb_key_skipped_count'),
  ].filter((item) => columnsSet.has(item.key))
  const columns = valueColumns('statement.fields.')
  return (
    <CardTable cardNoMargin columns={columns} items={items} extendLastColumn />
  )
}

// TODO: refactor items code gen for all DetailsList
function genShortValueTooltipValueItem(
  data: StatementModel,
  key: keyof StatementModel
) {
  return {
    key,
    value: <ShortValueWithTooltip value={Number(data[key])} />,
  }
}

function genScaledBytesTooltipValueItem(
  data: StatementModel,
  key: keyof StatementModel
) {
  return {
    key,
    value: <ScaledBytesWithTooltip value={Number(data[key])} />,
  }
}
