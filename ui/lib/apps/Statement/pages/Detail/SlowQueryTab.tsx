import React from 'react'
import SlowQueriesTable from '@lib/apps/SlowQuery/components/SlowQueriesTable'
import { IQuery } from './PlanDetail'
import useSlowQueryTableController, {
  DEF_SLOW_QUERY_OPTIONS,
} from '@lib/apps/SlowQuery/utils/useSlowQueryTableController'
import { DEF_SLOW_QUERY_COLUMN_KEYS } from '@lib/apps/SlowQuery/utils/tableColumns'

export interface ISlowQueryTabProps {
  query: IQuery
}

export default function SlowQueryTab({ query }: ISlowQueryTabProps) {
  const {
    orderOptions,
    changeOrder,

    slowQueries,
    loadingSlowQueries,

    tableColumns,
  } = useSlowQueryTableController(
    DEF_SLOW_QUERY_COLUMN_KEYS,
    false,
    {
      ...DEF_SLOW_QUERY_OPTIONS,
      timeRange: {
        type: 'absolute',
        value: [query.beginTime!, query.endTime!],
      },
      schemas: [query.schema!],
      limit: 100,
      digest: query.digest!,
      plans: query.plans,
    },
    false
  )

  return (
    <SlowQueriesTable
      cardNoMargin
      key={`slow_query_${slowQueries.length}`}
      loading={loadingSlowQueries}
      slowQueries={slowQueries}
      columns={tableColumns}
      visibleColumnKeys={DEF_SLOW_QUERY_COLUMN_KEYS}
      orderBy={orderOptions.orderBy}
      desc={orderOptions.desc}
      onChangeOrder={changeOrder}
    />
  )
}
