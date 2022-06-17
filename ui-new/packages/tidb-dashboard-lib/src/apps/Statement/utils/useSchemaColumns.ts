import { useMemo } from 'react'
// import client from '@lib/client'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { AxiosPromise } from 'axios'
import { ReqConfig } from '@lib/utils'

export function useSchemaColumns(
  getAvaiableFields: (options?: ReqConfig) => AxiosPromise<Array<string>>
) {
  const { data, isLoading } = useClientRequest((options) => {
    return getAvaiableFields(options)
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
