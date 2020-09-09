import { usePersistFn } from '@umijs/hooks'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { StatementModel, StatementTimeRange } from '@lib/client'
import { CardTable, ICardTableProps } from '@lib/components'
import openLink from '@lib/utils/openLink'

import DetailPage from '../pages/Detail'

interface Props extends Partial<ICardTableProps> {
  loading: boolean
  statements: StatementModel[]
  timeRange: StatementTimeRange
  columns: IColumn[]
}

export default function StatementsTable({
  loading,
  statements,
  timeRange,
  columns,
  ...restPrpos
}: Props) {
  const navigate = useNavigate()

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
    <CardTable
      {...restPrpos}
      loading={loading}
      columns={columns}
      items={statements}
      onRowClicked={handleRowClick}
      getKey={getKey}
    />
  )
}
