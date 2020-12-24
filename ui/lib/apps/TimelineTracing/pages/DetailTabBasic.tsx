import React from 'react'
import { useNavigate } from 'react-router'

import { CardTable, DateTime } from '@lib/components'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { valueColumns } from '@lib/utils/tableColumns'

import { IFullSpan } from '../utils'

export interface ITabBasicProps {
  data: IFullSpan
}

export default function TabBasic({ data }: ITabBasicProps) {
  // Here it is fine to not use useMemo() to cache data,
  // because the detail data won't be refreshed after loaded
  const items = [
    {
      key: 'event',
      value: data.event,
    },
    {
      key: 'span_id',
      value: data.span_id,
    },
    {
      key: 'parent_id',
      value: data.parent_id,
    },
    {
      key: 'absolute_start_time',
      value: getValueFormat('ns')(data.begin_unix_time_ns!, 2),
    },
    {
      key: 'relative_start_time',
      value: getValueFormat('ns')(data.begin_unix_time_ns!, 2),
    },
    {
      key: 'duration',
      value: getValueFormat('ns')(data.duration_ns!, 2),
    },
  ]
  const columns = valueColumns('timeline.fields.')
  return (
    <CardTable cardNoMargin columns={columns} items={items} extendLastColumn />
  )
}
