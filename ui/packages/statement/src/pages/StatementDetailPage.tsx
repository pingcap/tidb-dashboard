import React from 'react'
import { StatementDetail } from '../components'
import { useLocation } from 'react-router-dom'
import { DefaultApi } from '@pingcap-incubator/dashboard_client'

type Props = {
  dashboardClient: DefaultApi
}

export default function StatementDetailPage({ dashboardClient }: Props) {
  const params = new URLSearchParams(useLocation().search)
  const digest = params.get('digest')
  const schemaName = params.get('schema')
  const beginTime = params.get('begin_time')
  const endTime = params.get('end_time')

  function queryDetail(digest, schemaName, beginTime, endTime) {
    return dashboardClient
      .statementsDetailGet(schemaName, beginTime, endTime, digest)
      .then(res => res.data)
  }

  function queryNodes(digest, schemaName, beginTime, endTime) {
    return dashboardClient
      .statementsNodesGet(schemaName, beginTime, endTime, digest)
      .then(res => res.data)
  }

  return digest ? (
    <StatementDetail
      digest={digest}
      schemaName={schemaName || ''}
      beginTime={beginTime || ''}
      endTime={endTime || ''}
      onFetchDetail={queryDetail}
      onFetchNodes={queryNodes}
    />
  ) : (
    <p>No sql digest</p>
  )
}
