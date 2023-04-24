import React, { useMemo } from 'react'
import { Configuration, EstimateCapacity, Metrics } from '../components'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { useResourceManagerContext } from '../context'

export const Home: React.FC = () => {
  const ctx = useResourceManagerContext()

  const { data: info, isLoading: loadingInfo } = useClientRequest(
    ctx.ds.getInformation
  )

  const totalRU = useMemo(() => {
    return (info ?? [])
      .filter((item) => item.name !== 'default')
      .reduce((acc, cur) => {
        const ru = Number(cur.ru_per_sec)
        if (!isNaN(ru)) {
          return acc + ru
        }
        return acc
      }, 0)
  }, [info])

  return (
    <div>
      <Configuration info={info ?? []} loadingInfo={loadingInfo} />
      <EstimateCapacity totalRU={totalRU} />
      <Metrics />
    </div>
  )
}
