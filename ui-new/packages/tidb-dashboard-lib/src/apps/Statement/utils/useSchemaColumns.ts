import { useMemo } from 'react'
import client from '@lib/client'
import { useClientRequest } from '@lib/utils/useClientRequest'

export function useSchemaColumns() {
  const { data, isLoading } = useClientRequest((options) => {
    return client.getInstance().statementsAvailableFieldsGet(options)
  })

  const schemaColumns = useMemo(() => {
    if (!data) {
      return []
    }
    return data.map((d) => d.toLowerCase())
  }, [data])

  return {
    schemaColumns,
    isLoading
  }
}
