import React, { useEffect, useState, useMemo } from 'react'
import { CardTable } from '@lib/components'
import { Button, message } from 'antd'
import client from '@lib/client'

import { diagnosisColumns } from '../utils/tableColumns'

// stableTimeRange: used to start diagnosing when triggering by clicking "Start All" outside this component
// unstableTimeRange: used to start diagnosing when triggering by clicking "Start" inside this component
export interface IDiagnosisTableProps {
  stableTimeRange: [number, number]
  unstableTimeRange: [number, number]
  kind: string
}

export default function DiagnosisTable({
  stableTimeRange,
  unstableTimeRange,
  kind,
}: IDiagnosisTableProps) {
  const [internalTimeRange, setInternalTimeRange] = useState<[number, number]>([
    0,
    0,
  ])
  useEffect(() => setInternalTimeRange(stableTimeRange), [stableTimeRange])
  function handleStart() {
    setInternalTimeRange(unstableTimeRange)
  }
  const timeChanged = useMemo(
    () => internalTimeRange[0] !== unstableTimeRange[0],
    [internalTimeRange, unstableTimeRange]
  )

  const [items, setItems] = useState<any[]>([])
  const columns = useMemo(() => diagnosisColumns(items), [items])

  useEffect(() => {
    async function getData() {
      if (internalTimeRange[0] === 0 || internalTimeRange[1] === 0) {
        return
      }
      try {
        const res = await client.getInstance().diagnoseDiagnosisPost({
          start_time: internalTimeRange[0],
          end_time: internalTimeRange[1],
          kind,
        })
        const _columns =
          res?.data?.column?.map((col) => col.toLocaleLowerCase()) || []
        const _items: any[] =
          res?.data?.rows?.map((row) => {
            let obj = {}
            row.values?.forEach((v, idx) => {
              const key = _columns[idx]
              obj[key] = v
            })
            return obj
          }) || []
        setItems(_items)
      } catch (error) {
        message.error(error.message)
      }
    }
    getData()
  }, [internalTimeRange, kind])

  return (
    <CardTable
      title={`${kind} diagnosis`}
      cardExtra={timeChanged && <Button onClick={handleStart}>Start</Button>}
      columns={columns}
      items={items}
      extendLastColumn
    />
  )
}
