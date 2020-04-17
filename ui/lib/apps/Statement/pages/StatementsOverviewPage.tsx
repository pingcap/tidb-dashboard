import React from 'react'
import { StatementsOverview, StatementConfig } from '../components'
import { DefaultApi } from '@lib/client'

function fakeReq<T>(res: T): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(res), 2000)
  })
}

type Props = {
  dashboardClient: DefaultApi
  detailPagePath: string
}

export default function StatementsOverviewPage({
  dashboardClient,
  detailPagePath,
}: Props) {
  function queryInstance() {
    return Promise.resolve([{ uuid: 'current', name: 'current cluster' }])
  }

  function querySchemas() {
    return dashboardClient.statementsSchemasGet().then((res) => res.data)
  }

  function queryTimeRanges() {
    return dashboardClient.statementsTimeRangesGet().then((res) => res.data)
  }

  function queryStmtTypes() {
    return dashboardClient.statementsStmtTypesGet().then((res) => res.data)
  }

  function queryStatements(
    _instanceId,
    beginTime,
    endTime,
    schemas,
    stmtTypes
  ) {
    return dashboardClient
      .statementsOverviewsGet(
        beginTime,
        endTime,
        schemas.join(','),
        stmtTypes.join(',')
      )
      .then((res) => res.data)
  }

  function queryStatementStatus() {
    return fakeReq('ok')
  }

  function updateStatementStatus() {
    return fakeReq('ok')
  }

  const queryConfig = () =>
    fakeReq({
      refresh_interval: 100,
      keep_duration: 100,
      max_sql_count: 1000,
      max_sql_length: 100,
    } as StatementConfig)

  const updateConfig = () => fakeReq('ok')

  return (
    <StatementsOverview
      onFetchInstances={queryInstance}
      onFetchSchemas={querySchemas}
      onFetchTimeRanges={queryTimeRanges}
      onFetchStmtTypes={queryStmtTypes}
      onFetchStatements={queryStatements}
      onGetStatementStatus={queryStatementStatus}
      onSetStatementStatus={updateStatementStatus}
      onFetchConfig={queryConfig}
      onUpdateConfig={updateConfig}
      detailPagePath={detailPagePath}
    />
  )
}
