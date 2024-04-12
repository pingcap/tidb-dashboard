import React from 'react'
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
  return (
    <SlowQueryProvider value={ctx(getDsExtra())}>
      <SlowQueryApp />
    </SlowQueryProvider>
  )
}
