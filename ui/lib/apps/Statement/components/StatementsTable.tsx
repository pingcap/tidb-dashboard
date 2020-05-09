import React, { useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CardTableV2, ICardTableV2Props } from '@lib/components'
import { StatementTimeRange, StatementModel } from '@lib/client'
import { statementColumns } from '../utils/tableColumns'
import DetailPage from '../pages/Detail'
import { usePersistFn } from '@umijs/hooks'

interface Props extends Partial<ICardTableV2Props> {
  loading: boolean
  statements: StatementModel[]
  timeRange: StatementTimeRange
  showFullSQL?: boolean
}

export default function StatementsTable({
  loading,
  statements,
  timeRange,
  showFullSQL,

  ...restPrpos
}: Props) {
  const navigate = useNavigate()

  const columns = useMemo(() => statementColumns(statements, showFullSQL), [
    statements,
    showFullSQL,
  ])

  const handleRowClick = usePersistFn((rec) => {
    const qs = DetailPage.buildQuery({
      digest: rec.digest,
      schema: rec.schema_name,
      beginTime: timeRange.begin_time,
      endTime: timeRange.end_time,
    })
    navigate(`/statement/detail?${qs}`)
  })

  const getKey = useCallback((row) => `${row.digest}_${row.schema_name}`, [])

  return (
    <CardTableV2
      {...restPrpos}
      loading={loading}
      columns={columns}
      items={statements}
      onRowClicked={handleRowClick}
      getKey={getKey}
    />
  )
}
