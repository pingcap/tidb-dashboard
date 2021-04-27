import { useEffect, useState } from 'react'
import { useRequest } from 'ahooks'

import client from '@lib/client'

const statementsTableColumnsGet = client
  .getInstance()
  .statementsTableColumnsGet.bind(client.getInstance())

export const useSchemaColumns = () => {
  const [schemaColumns, setSchemaColumns] = useState<string[]>([])
  const { data: resp, loading } = useRequest(statementsTableColumnsGet, {
    cacheKey: 'stmt_schema',
    staleTime: 300000,
  })

  useEffect(() => {
    if (!resp) {
      return
    }
    const { data } = resp
    setSchemaColumns(data.map((d) => d.toLowerCase()))
  }, [resp])

  return {
    schemaColumns,
    isLoading: loading,
  }
}
