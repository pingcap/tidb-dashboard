import React from 'react'
import useQueryParams from '@lib/utils/useQueryParams'

// route: /data/table_structure?db=xxx&table=yyy
export default function DBTableStructure() {
  const { db, table } = useQueryParams()

  return (
    <div>
      <h1>DBTableStructurePage</h1>
      <p>{`db: ${db} , table: ${table}`}</p>
    </div>
  )
}
