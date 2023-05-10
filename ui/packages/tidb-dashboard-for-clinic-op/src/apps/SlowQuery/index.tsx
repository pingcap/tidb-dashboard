import React, { useMemo, useState, useEffect } from 'react'
import { SlowQueryApp, SlowQueryProvider } from '@pingcap/tidb-dashboard-lib'
import { ctx, DsExtra } from './context'

function getDsExtra(): DsExtra {
  const searchParams = new URLSearchParams(window.location.search)
  const oid = searchParams.get('oid') || ''
  const cid = searchParams.get('cid') || ''
  const itemID = searchParams.get('item_id') || ''

  const urlHashParmasStr = window.location.hash.slice(
    window.location.hash.indexOf('?')
  )
  const params = new URLSearchParams(urlHashParmasStr)
  const beginTime = parseInt(params.get('from') || '0')
  const endTime = parseInt(params.get('to') || '0')

  return {
    oid,
    cid,
    itemID,
    beginTime,
    endTime,
    curQueryID: ''
  }
}

export default function () {
  const dsExtra = useMemo(() => getDsExtra(), [])
  const [ready, setReady] = useState(false)

  // TODO: remove hack
  useEffect(() => {
    sessionStorage.setItem(
      'slow_query.query_options',
      JSON.stringify({
        visibleColumnKeys: {
          query: true,
          timestamp: true,
          query_time: true,
          memory_max: true
        },
        timeRange: {
          type: 'absolute',
          value: [dsExtra.beginTime, dsExtra.endTime]
        },
        schemas: [],
        searchText: '',
        limit: 100,

        digest: '',
        plans: []
      })
    )
    setReady(true)
  }, [dsExtra.beginTime, dsExtra.endTime])

  if (ready) {
    return (
      <SlowQueryProvider value={ctx(dsExtra)}>
        <SlowQueryApp />
      </SlowQueryProvider>
    )
  }
  return <div>loading...</div>
}
