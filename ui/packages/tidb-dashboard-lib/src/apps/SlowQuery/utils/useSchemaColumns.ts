import { useState, useEffect } from 'react'

import { useClientRequest } from '@lib/utils/useClientRequest'
import { ISlowQueryDataSource } from '../context'

export const useSchemaColumns = (
  availableFieldsFetcher: ISlowQueryDataSource['slowQueryAvailableFieldsGet']
) => {
  const [schemaColumns, setSchemaColumns] = useState<string[]>([])
  const { data, isLoading } = useClientRequest(availableFieldsFetcher)

  useEffect(() => {
    if (!data) {
      return
    }
    setSchemaColumns(data.map((d) => d.toLowerCase()))
  }, [data])

  return {
    schemaColumns,
    isLoading
  }
}
