import React from 'react'
import { StatementPlanDetailModel } from '@lib/client'
import { CardTableV2, DateTime } from '@lib/components'
import { getValueFormat } from '@baurine/grafana-value-formats'
import * as useColumn from '@lib/utils/useColumn'

export interface ITabBasicProps {
  data: StatementPlanDetailModel
}

export default function TabBasic({ data }: ITabBasicProps) {
  const items = [
    { key: 'index_names', value: data.index_names },
    {
      key: 'first_seen',
      value: data.first_seen && (
        <DateTime.Calendar unixTimestampMs={data.first_seen * 1000} />
      ),
    },
    {
      key: 'last_seen',
      value: data.last_seen && (
        <DateTime.Calendar unixTimestampMs={data.last_seen * 1000} />
      ),
    },
    { key: 'exec_count', value: data.exec_count },
    {
      key: 'sum_latency',
      value: getValueFormat('ns')(data.sum_latency || 0, 1),
    },
    { key: 'sample_user', value: data.sample_user },
    { key: 'sum_errors', value: data.sum_errors },
    { key: 'sum_warnings', value: data.sum_warnings },
    {
      key: 'avg_mem',
      value: getValueFormat('bytes')(data.avg_mem || 0, 1),
    },
    {
      key: 'max_mem',
      value: getValueFormat('bytes')(data.max_mem || 0, 1),
    },
  ]
  const columns = [
    useColumn.useFieldsKeyColumn('statement.common.columns.'),
    useColumn.useFieldsValueColumn(),
    useColumn.useFieldsDescriptionColumn('statement.common.columns.'),
  ]
  return <CardTableV2 cardNoMargin columns={columns} items={items} />
}
