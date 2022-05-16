import React from 'react'
import SlowQueriesTable from '@lib/apps/SlowQuery/components/SlowQueriesTable'
import { IQuery } from './PlanDetail'
import useSlowQueryTableController, {
  DEF_SLOW_QUERY_OPTIONS,
} from '@lib/apps/SlowQuery/utils/useSlowQueryTableController'
import { fromTimeRangeValue } from '@lib/components'

export interface ISlowQueryTabProps {
  query: IQuery
}

export default function SlowQueryTab({ query }: ISlowQueryTabProps) {
  const controller = useSlowQueryTableController({
    initialQueryOptions: {
      ...DEF_SLOW_QUERY_OPTIONS,
      timeRange: fromTimeRangeValue([query.beginTime!, query.endTime!]),
      limit: 100,
      digest: query.digest!,
      plans: query.plans,
    },
    persistQueryInSession: false,
  })

  return <SlowQueriesTable cardNoMargin controller={controller} />
}
