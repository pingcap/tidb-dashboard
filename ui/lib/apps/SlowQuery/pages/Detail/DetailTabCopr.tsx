import React from 'react'

import { SlowquerySlowQuery } from '@lib/client'
import { CardTableV2, ShortValueWithTooltip } from '@lib/components'
import { valueColumns } from '@lib/utils/tableColumns'

export interface ITabCoprProps {
  data: SlowquerySlowQuery
}

export default function TabCopr({ data }: ITabCoprProps) {
  const items = [
    {
      key: 'request_count',
      value: <ShortValueWithTooltip value={data.request_count} />,
    },
    {
      key: 'process_keys',
      value: <ShortValueWithTooltip value={data.process_keys} />,
    },
    {
      key: 'total_keys',
      value: <ShortValueWithTooltip value={data.total_keys} />,
    },
    {
      key: 'cop_proc_addr',
      value: data.cop_proc_addr,
    },
    {
      key: 'cop_wait_addr',
      value: data.cop_wait_addr,
    },
  ]
  const columns = valueColumns('slow_query.fields.')
  return (
    <CardTableV2
      cardNoMargin
      columns={columns}
      items={items}
      extendLastColumn
    />
  )
}
