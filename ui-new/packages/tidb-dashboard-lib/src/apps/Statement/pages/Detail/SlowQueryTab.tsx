import React from 'react'
import { fromTimeRangeValue } from '@lib/components'
import useSlowQueryTableController, {
  DEF_SLOW_QUERY_OPTIONS
} from '@lib/apps/SlowQuery/utils/useSlowQueryTableController'
import SlowQueriesTable from '@lib/apps/SlowQuery/components/SlowQueriesTable'

import { IQuery } from './PlanDetail'

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
      plans: query.plans
    },
    persistQueryInSession: false
  })

  return <SlowQueriesTable cardNoMargin controller={controller} />
}
