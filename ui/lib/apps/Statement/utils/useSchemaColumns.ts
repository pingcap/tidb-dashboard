import { useEffect, useState } from 'react'

import client from '@lib/client'
import { cache } from '@lib/utils/callableCache'

const statementsTableColumnsGet = client
  .getInstance()
  .statementsTableColumnsGet.bind(client.getInstance())

export const useSchemaColumns = () => {
  const [isLoading, setLoading] = useState(true)
  const [schemaColumns, setSchemaColumns] = useState<string[]>([])

  useEffect(() => {
    const fetchSchemaColumns = async () => {
      const { data } = await cache(statementsTableColumnsGet).call()
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
