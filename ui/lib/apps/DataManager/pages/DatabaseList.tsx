import React, { useState, useEffect } from 'react'
// import { Link } from 'react-router-dom'
// import { Space } from 'antd'
import { CardTable } from '@lib/components'
import * as Database from '@lib/utils/xcClient/database'

// route: /data
export default function DatabaseList() {
  const [databaseList, setDatabaseList] = useState<string[]>([])

  useEffect(() => {
    async function fetchDatabaseList() {
      const data = (await Database.getDatabases()).databases
      setDatabaseList(data)
    }
    fetchDatabaseList()
  }, [])

  const columns = [
    {
      name: 'DATABASE',
      key: 'database',
      minWidth: 100,
      maxWidth: 300,
      onRender: (database) => {
        return database
      },
    },
  ]

  return <CardTable columns={columns} items={databaseList || []} />
}
