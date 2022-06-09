import { useState, useEffect, useContext } from 'react'

import { useClientRequest } from '@lib/utils/useClientRequest'

import { SlowQueryContext } from '../context'

export const useSchemaColumns = () => {
  const ctx = useContext(SlowQueryContext)
  const [schemaColumns, setSchemaColumns] = useState<string[]>([])
  const { data, isLoading } = useClientRequest((options) => {
    return ctx?.ds.slowQueryAvailableFieldsGet(options)!
  })

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
