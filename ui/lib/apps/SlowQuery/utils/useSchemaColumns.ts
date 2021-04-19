import { useState, useEffect } from 'react'

import client from '@lib/client'
import { cache } from '@lib/utils/callableCache'

const slowQueryTableColumnsGet = client
  .getInstance()
  .slowQueryTableColumnsGet.bind(client.getInstance())

export const useSchemaColumns = () => {
  const [isLoading, setLoading] = useState(true)
  const [schemaColumns, setSchemaColumns] = useState<string[]>([])

  useEffect(() => {
    const fetchSchemaColumns = async () => {
      const { data } = await cache(slowQueryTableColumnsGet).call()
      setSchemaColumns(data.map((d) => d.toLowerCase()))
      setLoading(false)
    }

    fetchSchemaColumns()
  }, [])

  return {
    schemaColumns,
    isLoading,
  }
}
