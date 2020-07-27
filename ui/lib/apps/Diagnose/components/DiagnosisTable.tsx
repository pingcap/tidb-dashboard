import React, { useEffect, useState, useMemo } from 'react'
import { CardTable } from '@lib/components'
import { Button, message } from 'antd'
import client from '@lib/client'

import { diagnosisColumns } from '../utils/tableColumns'

export interface IDiagnosisTableProps {
  timeRange: [number, number]
  kind: string
}

export default function DiagnosisTable({
  timeRange,
  kind,
}: IDiagnosisTableProps) {
  const [items, setItems] = useState<any[]>([])
  const columns = useMemo(() => diagnosisColumns(items), [items])

  useEffect(() => {
    async function getData() {
      if (timeRange[0] === 0 || timeRange[1] === 0) {
        return
      }
      try {
        const res = await client.getInstance().diagnoseDiagnosisPost({
          start_time: timeRange[0],
          end_time: timeRange[1],
          kind,
        })
        console.log('res.data:', res.data)

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
  }, [timeRange, kind])

  return (
    <CardTable
      title={`${kind} diagnosis`}
      cardExtra={<Button>Start</Button>}
      columns={columns}
      items={items}
    />
  )
}
