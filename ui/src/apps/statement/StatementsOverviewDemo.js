import React from 'react'
import { StatementsOverview } from './components'

function fakeReq(res) {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(res), 2000)
  })
}

export default function StatementsOverviewDemo() {
  function queryInstance() {
    return fakeReq([
      { uuid: 'ins-1', name: 'ins-1' },
      { uuid: 'ins-2', name: 'ins-2' },
      { uuid: 'ins-3', name: 'ins-3' },
      { uuid: 'ins-4', name: 'ins-4' }
    ])
  }

  function querySchemas() {
    return fakeReq(['schema-1', 'schema-2', 'schema-3', 'schema-4'])
  }

  function queryTimeRanges() {
    return fakeReq(['10:00~11:00', '11:00~12:00', '12:00~'])
  }

  function queryStatements() {
    return fakeReq([
      {
        sql_category: 'select from table1',
        total_duration: 97,
        total_times: 10000,
        avg_affect_lines: 13748,
        avg_duration: 20,
        avg_cost_mem: 20
      },
      {
        sql_category: 'select from table2',
        total_duration: 99,
        total_times: 10000,
        avg_affect_lines: 13748,
        avg_duration: 10,
        avg_cost_mem: 10
      },
      {
        sql_category: 'update table1',
        total_duration: 98,
        total_times: 8000,
        avg_affect_lines: 13748,
        avg_duration: 20,
        avg_cost_mem: 20
      },
      {
        sql_category: 'select from table3',
        total_duration: 100,
        total_times: 1000,
        avg_affect_lines: 13748,
        avg_duration: 20,
        avg_cost_mem: 20
      }
    ])
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
