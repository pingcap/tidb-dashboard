import { useState, useEffect } from 'react'

import client from '@lib/client'
import { useClientRequest } from '@lib/utils/useClientRequest'

export const useSchemaColumns = () => {
  const [schemaColumns, setSchemaColumns] = useState<string[]>([])
  const { data, isLoading } = useClientRequest((options) => {
    return client.getInstance().slowQueryAvailableFieldsGet(options)
  })

  useEffect(() => {
    if (!data) {
      return
    }
    setSchemaColumns(data.map((d) => d.toLowerCase()))
  }, [data])

  return {
    schemaColumns,
    isLoading,
  }
}
