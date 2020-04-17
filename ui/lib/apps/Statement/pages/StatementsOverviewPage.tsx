import React from 'react'
import { StatementsOverview } from '../components'
import { DefaultApi, StatementConfig } from '@lib/client'

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

  const queryConfig = () => {
    return dashboardClient.statementsConfigGet().then((res) => res.data)
  }

  const updateConfig = (_instanceId: string, config: StatementConfig) => {
    return dashboardClient.statementsConfigPost(config).then((res) => res.data)
  }

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
