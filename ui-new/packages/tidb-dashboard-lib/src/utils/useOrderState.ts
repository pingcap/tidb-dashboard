import { useState, useMemo } from 'react'

import { useVersionedLocalStorageState } from './useVersionedLocalStorageState'

export interface IOrderOptions {
  orderBy: string
  desc: boolean
}

export default function useOrderState(
  storeKeyPrefix: string,
  needSave: boolean,
  options: IOrderOptions
) {
  const storeKey = `${storeKeyPrefix}.order_options`
  const [memoryOrderOptions, setMemoryOrderOptions] = useState(options)
  const [localOrderOptions, setLocalOrderOptions] =
    useVersionedLocalStorageState(storeKey, { defaultValue: options })
  const orderOptions = useMemo(
    () => (needSave ? localOrderOptions : memoryOrderOptions),
    [needSave, memoryOrderOptions, localOrderOptions]
  )

  function changeOrder(orderBy: string, desc: boolean) {
    if (needSave) {
      setLocalOrderOptions({
        orderBy,
        desc
      })
    } else {
      setMemoryOrderOptions({
        orderBy,
        desc
      })
    }
  }

  return {
    orderOptions,
    changeOrder
  }
}
