import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import React, { useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePersistFn } from '@umijs/hooks'

import { StatementModel, StatementTimeRange } from '@lib/client'
import { CardTableV2, ICardTableV2Props } from '@lib/components'
import openLink from '@lib/utils/openLink'

import DetailPage from '../pages/Detail'
import { statementColumns } from '../utils/tableColumns'

interface Props extends Partial<ICardTableV2Props> {
  loading: boolean
  statements: StatementModel[]
  timeRange: StatementTimeRange
  showFullSQL?: boolean
  onGetColumns?: (columns: IColumn[]) => void
}

export default function StatementsTable({
  loading,
  statements,
  timeRange,
  showFullSQL,
  onGetColumns,

  ...restPrpos
}: Props) {
  const navigate = useNavigate()

  const columns = useMemo(() => statementColumns(statements, showFullSQL), [
    statements,
    showFullSQL,
  ])

  useEffect(() => {
    onGetColumns && onGetColumns(columns || [])
  }, [onGetColumns, columns])

  const handleRowClick = usePersistFn(
    (rec, _idx, ev: React.MouseEvent<HTMLElement>) => {
      const qs = DetailPage.buildQuery({
        digest: rec.digest,
        schema: rec.schema_name,
        beginTime: timeRange.begin_time,
        endTime: timeRange.end_time,
      })
      openLink(`/statement/detail?${qs}`, ev, navigate)
    }
  )

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
