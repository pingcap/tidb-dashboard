import React from 'react'
import useQueryParams from '@lib/utils/useQueryParams'

// route: /data/tables?db=xxx
export default function DBTableList() {
  const { db } = useQueryParams()

  return (
    <div>
      <h1>DBTableListPage</h1>
      <p>{`db: ${db}`}</p>
    </div>
  )
}
