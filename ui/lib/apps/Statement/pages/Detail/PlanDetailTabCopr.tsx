import React from 'react'

import { StatementModel } from '@lib/client'
import { CardTable, ShortValueWithTooltip } from '@lib/components'
import { valueColumns } from '@lib/utils/tableColumns'

export interface ITabCoprProps {
  data: StatementModel
}

export default function TabCopr({ data }: ITabCoprProps) {
  const items = [
    { key: 'sum_cop_task_num', value: data.sum_cop_task_num },
    {
      key: 'avg_processed_keys',
      value: <ShortValueWithTooltip value={data.avg_processed_keys} />,
    },
    {
      key: 'max_processed_keys',
      value: <ShortValueWithTooltip value={data.max_processed_keys} />,
    },
    {
      key: 'avg_total_keys',
      value: <ShortValueWithTooltip value={data.avg_total_keys} />,
    },
    {
      key: 'max_total_keys',
      value: <ShortValueWithTooltip value={data.max_total_keys} />,
    },
  ]
  const columns = valueColumns('statement.fields.')
  return (
    <CardTable cardNoMargin columns={columns} items={items} extendLastColumn />
  )
}
