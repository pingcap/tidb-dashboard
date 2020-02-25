import React from 'react'
import { StatementsOverview } from './components'
import client from '../../utils/client'

function fakeReq(res) {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(res), 2000)
  })
}

export default function StatementsOverviewPage() {
  function queryInstance() {
    return Promise.resolve([{ uuid: 'current', name: 'current cluster' }])
  }

  function querySchemas() {
    return client.dashboard.statementsSchemasGet().then(res => res.data)
  }

  function queryTimeRanges() {
    return client.dashboard.statementsTimeRangesGet().then(res => res.data)
  }

  function queryStatements(_instanceId, schemas, beginTime, endTime) {
    return client.dashboard
      .statementsOverviewsGet(beginTime, endTime, schemas.join(','))
      .then(res => res.data)
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
      max_sql_length: 100
    })

  const updateConfig = () => fakeReq('ok')

  return (
    <StatementsOverview
      onFetchInstances={queryInstance}
      onFetchSchemas={querySchemas}
      onFetchTimeRanges={queryTimeRanges}
      onFetchStatements={queryStatements}
      onGetStatementStatus={queryStatementStatus}
      onSetStatementStatus={updateStatementStatus}
      onFetchConfig={queryConfig}
      onUpdateConfig={updateConfig}
    />
  )
}
