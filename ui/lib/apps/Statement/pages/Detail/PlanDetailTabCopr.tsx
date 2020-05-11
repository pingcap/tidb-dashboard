import React from 'react'

import { StatementModel } from '@lib/client'
import { CardTableV2 } from '@lib/components'
import friendFormatShortValue from '@lib/utils/friendFormatShortValue'
import { valueColumns } from '@lib/utils/tableColumns'

export interface ITabCoprProps {
  data: StatementModel
}

export default function TabCopr({ data }: ITabCoprProps) {
  const items = [
    { key: 'sum_cop_task_num', value: data.sum_cop_task_num },
    {
      key: 'avg_processed_keys',
      value: friendFormatShortValue(data.avg_processed_keys || 0, 1),
    },
    {
      key: 'max_processed_keys',
      value: friendFormatShortValue(data.max_processed_keys || 0, 1),
    },
    {
      key: 'avg_total_keys',
      value: friendFormatShortValue(data.avg_total_keys || 0, 1),
    },
    {
      key: 'max_total_keys',
      value: friendFormatShortValue(data.max_total_keys || 0, 1),
    },
  ]
  const columns = valueColumns('statement.fields.')
  return <CardTableV2 cardNoMargin columns={columns} items={items} />
}
