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
          res?.data?.column?.map((col) => ({
            key: col,
            name: col,
            fieldName: col,
            minWidth: 100,
          })) || []
        console.log('_columns:', _columns)
        setColumns(_columns)
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
      items={[]}
    />
  )
}
