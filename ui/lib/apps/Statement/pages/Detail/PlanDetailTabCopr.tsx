import React from 'react'
import { StatementPlanDetailModel } from '@lib/client'
import { CardTableV2 } from '@lib/components'
import { getValueFormat } from '@baurine/grafana-value-formats'
import * as useColumn from '@lib/utils/useColumn'

export interface ITabCoprProps {
  data: StatementPlanDetailModel
}

export default function TabCopr({ data }: ITabCoprProps) {
  const items = [
    { key: 'sum_cop_task_num', value: data.sum_cop_task_num },
    {
      key: 'avg_processed_keys',
      value: getValueFormat('short')(data.avg_processed_keys || 0, 1),
    },
    {
      key: 'max_processed_keys',
      value: getValueFormat('short')(data.max_processed_keys || 0, 1),
    },
    {
      key: 'avg_total_keys',
      value: getValueFormat('short')(data.avg_total_keys || 0, 1),
    },
    {
      key: 'max_total_keys',
      value: getValueFormat('short')(data.max_total_keys || 0, 1),
    },
  ]
  const columns = [
    useColumn.useFieldsKeyColumn('statement.common.columns.'),
    useColumn.useFieldsValueColumn(),
    useColumn.useFieldsDescriptionColumn('statement.common.columns.'),
  ]
  return <CardTableV2 cardNoMargin columns={columns} items={items} />
}
