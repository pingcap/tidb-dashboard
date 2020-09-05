import { usePersistFn } from '@umijs/hooks'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import React, { useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { SlowquerySlowQuery } from '@lib/client'
import { CardTable, ICardTableProps } from '@lib/components'
import openLink from '@lib/utils/openLink'

import DetailPage from '../pages/Detail'
import { slowQueryColumns } from '../utils/tableColumns'

interface Props extends Partial<ICardTableProps> {
  loading: boolean
  slowQueries: SlowquerySlowQuery[]
  showFullSQL?: boolean
  onGetColumns?: (columns: IColumn[]) => void
}

function SlowQueriesTable({
  loading,
  slowQueries,
  showFullSQL,
  onGetColumns,
  ...restProps
}: Props) {
  const navigate = useNavigate()

  const columns = useMemo(() => slowQueryColumns(slowQueries, showFullSQL), [
    slowQueries,
    showFullSQL,
  ])

  useEffect(() => {
    onGetColumns && onGetColumns(columns || [])
  }, [onGetColumns, columns])

  const handleRowClick = usePersistFn(
    (rec, _idx, ev: React.MouseEvent<HTMLElement>) => {
      const qs = DetailPage.buildQuery({
        digest: rec.digest,
        connectId: rec.connection_id,
        timestamp: rec.timestamp,
      })
      openLink(`/slow_query/detail?${qs}`, ev, navigate)
    }
  )

  const getKey = useCallback((row) => `${row.digest}_${row.timestamp}`, [])

  return (
    <CardTable
      {...restProps}
      loading={loading}
      columns={columns}
      items={slowQueries}
      onRowClicked={handleRowClick}
      getKey={getKey}
    />
  )
}

export default SlowQueriesTable
