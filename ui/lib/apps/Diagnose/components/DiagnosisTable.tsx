import { LoadingOutlined } from '@ant-design/icons'
import { Button, message } from 'antd'
import React, { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { CardTable, DateTime } from '@lib/components'
import client from '@lib/client'

import { diagnosisColumns } from '../utils/tableColumns'

// FIXME: use better naming
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
  const { t } = useTranslation()
  const [internalTimeRange, setInternalTimeRange] = useState<[number, number]>([
    0,
    0,
  ])
  useEffect(() => setInternalTimeRange(stableTimeRange), [stableTimeRange])
  function handleStart() {
    setInternalTimeRange(unstableTimeRange)
  }
  const timeChanged = useMemo(
    () =>
      internalTimeRange[0] !== unstableTimeRange[0] ||
      internalTimeRange[1] !== unstableTimeRange[1],
    [internalTimeRange, unstableTimeRange]
  )

  const [items, setItems] = useState<any[]>([])
  const columns = useMemo(() => diagnosisColumns(items), [items])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function getData() {
      if (internalTimeRange[0] === 0 || internalTimeRange[1] === 0) {
        return
      }
      setLoading(true)
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
      setLoading(false)
    }
    getData()
  }, [internalTimeRange, kind])

  function cardExtra() {
    if (loading) {
      return <LoadingOutlined />
    }
    if (timeChanged) {
      return <Button onClick={handleStart}>Start</Button>
    }
    return null
  }

  return (
    <CardTable
      title={t(`diagnose.table_title.${kind}_diagnosis`)}
      subTitle={
        internalTimeRange[0] > 0 && (
          <span>
            <DateTime.Calendar unixTimestampMs={internalTimeRange[0] * 1000} />{' '}
            ~{' '}
            <DateTime.Calendar unixTimestampMs={internalTimeRange[1] * 1000} />
          </span>
        )
      }
      cardExtra={cardExtra()}
      columns={columns}
      items={items}
      extendLastColumn
    />
  )
}
