import React, { useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CardTableV2, ICardTableV2Props } from '@lib/components'
import { SlowqueryBase } from '@lib/client'

import { slowQueryColumns } from '../utils/tableColumns'
import DetailPage from '../pages/Detail'
import { usePersistFn } from '@umijs/hooks'

interface Props extends Partial<ICardTableV2Props> {
  loading: boolean
  slowQueries: SlowqueryBase[]
  showFullSQL?: boolean
}

function SlowQueriesTable({
  loading,
  slowQueries,
  showFullSQL,
  ...restProps
}: Props) {
  const navigate = useNavigate()

  const columns = useMemo(() => slowQueryColumns(slowQueries, showFullSQL), [
    slowQueries,
    showFullSQL,
  ])

  const handleRowClick = usePersistFn((rec) => {
    const qs = DetailPage.buildQuery({
      digest: rec.digest,
      connectId: rec.connection_id,
      time: rec.timestamp,
    })
    navigate(`/slow_query/detail?${qs}`)
  })

  const getKey = useCallback((row) => `${row.digest}_${row.timestamp}`, [])

  return (
    <CardTableV2
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
