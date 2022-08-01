import React, { useMemo, useState, useEffect } from 'react'
import { SlowQueryApp, SlowQueryProvider } from '@pingcap/tidb-dashboard-lib'
import { ctx, DsExtra } from './context'

function getDsExtra(): DsExtra {
  const urlHashParmasStr = window.location.hash.slice(
    window.location.hash.indexOf('?')
  )
  const params = new URLSearchParams(urlHashParmasStr)
  return {
    oid: params.get('oid')!,
    cid: params.get('cid')!,
    itemID: params.get('item_id')!,
    beginTime: params.get('begin_time')!,
    endTime: params.get('end_time')!,
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
        timeRange: {
          type: 'absolute',
          value: [dsExtra.beginTime, dsExtra.endTime]
        }
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
