import React, { useContext } from 'react'
import { fromTimeRangeValue } from '@lib/components'
import useSlowQueryTableController, {
  DEF_SLOW_QUERY_OPTIONS
} from '@lib/apps/SlowQuery/utils/useSlowQueryTableController'
import SlowQueriesTable from '@lib/apps/SlowQuery/components/SlowQueriesTable'

import { IQuery } from './PlanDetail'
import { StatementContext } from '../../context'

export interface ISlowQueryTabProps {
  query: IQuery
}

export default function SlowQueryTab({ query }: ISlowQueryTabProps) {
  const ctx = useContext(StatementContext)

  const controller = useSlowQueryTableController({
    initialQueryOptions: {
      ...DEF_SLOW_QUERY_OPTIONS,
      timeRange: fromTimeRangeValue([query.beginTime!, query.endTime!]),
      limit: 100,
      digest: query.digest!,
      plans: query.plans
    },
    persistQueryInSession: false,
    fetchSchemas: false,

    ds: ctx!.ds
  })

  return <SlowQueriesTable cardNoMargin controller={controller} />
}
