import React, { useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import { CardTableV2, ICardTableV2Props } from '@lib/components'
import { StatementTimeRange, StatementModel } from '@lib/client'
import * as useColumn from '@lib/utils/useColumn'

import * as useStatementColumn from '../utils/useColumn'
import DetailPage from '../pages/Detail'
import { usePersistFn } from '@umijs/hooks'

const tableColumns = (
  rows: StatementModel[],
  showFullSQL?: boolean
): IColumn[] => {
  return [
    useStatementColumn.useDigestColumn(rows, showFullSQL),
    useStatementColumn.useSumLatencyColumn(rows),
    useStatementColumn.useAvgMinMaxLatencyColumn(rows),
    useStatementColumn.useExecCountColumn(rows),
    useStatementColumn.useAvgMaxMemColumn(rows),
    useStatementColumn.useErrorsWarningsColumn(rows),
    useStatementColumn.useAvgParseLatencyColumn(rows),
    useStatementColumn.useAvgCompileLatencyColumn(rows),
    useStatementColumn.useAvgCoprColumn(rows),
    useStatementColumn.useRelatedSchemasColumn(rows),
    useColumn.useDummyColumn(),
  ]
}

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

  const columns = useMemo(() => tableColumns(statements, showFullSQL), [
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
