import React, { useEffect, useMemo, useState } from 'react'
import { CardTable } from '@lib/components'
import { Button, message } from 'antd'
import client, { DiagnoseTableDef, DiagnoseTableRowDef } from '@lib/client'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'

export interface IDiagnosisTableProps {
  timeRange: [number, number]
  kind: string
}

export default function DiagnosisTable({
  timeRange,
  kind,
}: IDiagnosisTableProps) {
  const [columns, setColumns] = useState<IColumn[]>([])
  const [items, setItems] = useState<any[]>([])

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

        const _columns: IColumn[] =
          res?.data?.column?.map((col) => ({
            key: col,
            name: col,
            fieldName: col,
            minWidth: 100,
          })) || []
        setColumns(_columns)

        const _items: any[] =
          res?.data?.rows?.map((row) => {
            let obj = {}
            row.values?.forEach((v, idx) => {
              const key = _columns[idx].name
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
  }, [timeRange])

  return (
    <CardTable
      title={`${kind} diagnosis`}
      cardExtra={<Button>Start</Button>}
      columns={columns}
      items={items}
    />
  )
}
