import React from 'react'
import useQueryParams from '@lib/utils/useQueryParams'

// route: /data/table_detail?db=xxx&table=yyy
export default function DBTableDetail() {
  const { db, table } = useQueryParams()

  return (
    <div>
      <h1>DBTableDetailPage</h1>
      <p>{`db: ${db} , table: ${table}`}</p>
    </div>
  )
}
