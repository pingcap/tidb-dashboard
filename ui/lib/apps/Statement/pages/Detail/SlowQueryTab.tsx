import React from 'react'
import SlowQueriesTable from '@lib/apps/SlowQuery/components/SlowQueriesTable'
import { IQuery } from './PlanDetail'
import useSlowQuery, {
  getDefQueryOptions,
} from '@lib/apps/SlowQuery/utils/useSlowQuery'
import { defSlowQueryColumnKeys } from '@lib/apps/SlowQuery/components/List'

export interface ISlowQueryTabProps {
  query: IQuery
}

export default function SlowQueryTab({ query }: ISlowQueryTabProps) {
  const {
    queryOptions,
    setQueryOptions,
    slowQueries,
    loadingSlowQueries,
  } = useSlowQuery(
    {
      ...getDefQueryOptions(),
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
      visibleColumnKeys={defSlowQueryColumnKeys}
      onChangeSort={(orderBy, desc) =>
        setQueryOptions({ ...queryOptions, orderBy, desc })
      }
      orderBy={queryOptions.orderBy}
      desc={queryOptions.desc}
    />
  )
}
