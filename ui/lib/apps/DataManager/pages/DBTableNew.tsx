import React from 'react'
import useQueryParams from '@lib/utils/useQueryParams'

// route: /data/table_new?db=xxx
export default function DBTableNew() {
  const { db } = useQueryParams()

  return (
    <div>
      <h1>DBTableNewPage</h1>
      <p>{`db: ${db}`}</p>
    </div>
  )
}
