import React, { useState, useEffect } from 'react'
import SlowQueriesTable from '@lib/apps/SlowQuery/components/SlowQueriesTable'
import { getDefQueryOptions } from '@lib/apps/SlowQuery/components/List'
import client, { SlowqueryBase } from '@lib/client'
import { IQuery } from './PlanDetail'

function useSlowQueries(query: IQuery) {
  const [searchOptions, setSearchOptions] = useState(getDefQueryOptions)
  const [slowQueries, setSlowQueries] = useState<SlowqueryBase[]>([])
  const [loadingSlowQueries, setLoadingSlowQueries] = useState(true)

  function changeSort(orderBy: string, desc: boolean) {
    setSearchOptions({
      ...searchOptions,
      orderBy,
      desc,
    })
  }

  useEffect(() => {
    async function getSlowQueryList() {
      setLoadingSlowQueries(true)
      const res = await client
        .getInstance()
        .slowQueryListGet(
          [query.schema!],
          searchOptions.desc,
          query.digest,
          100,
          query.endTime,
          query.beginTime,
          searchOptions.orderBy,
          query.plans,
          searchOptions.searchText
        )
      setLoadingSlowQueries(false)
      setSlowQueries(res.data || [])
    }
    getSlowQueryList()
  }, [searchOptions, query])

  return {
    slowQueries,
    loadingSlowQueries,
    changeSort,
    searchOptions,
  }
}

export interface ISlowQueryTabProps {
  query: IQuery
}

export default function SlowQueryTab({ query }: ISlowQueryTabProps) {
  const {
    slowQueries,
    loadingSlowQueries,
    changeSort,
    searchOptions,
  } = useSlowQueries(query)

  return (
    <SlowQueriesTable
      cardNoMargin
      key={`slow_query_${slowQueries.length}`}
      loading={loadingSlowQueries}
      slowQueries={slowQueries}
      visibleColumnKeys={{
        sql: true,
        Time: true,
        Query_time: true,
        Mem_max: true,
      }}
      onChangeSort={changeSort}
      orderBy={searchOptions.orderBy}
      desc={searchOptions.desc}
    />
  )
}
