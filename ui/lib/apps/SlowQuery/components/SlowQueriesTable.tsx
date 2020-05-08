import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CardTableV2, ICardTableV2Props } from '@lib/components'
import { SlowqueryBase } from '@lib/client'

import { slowQueryColumns } from '../utils/tableColumns'
import DetailPage from '../pages/Detail'

interface Props extends Partial<ICardTableV2Props> {
  loading: boolean
  slowQueries: SlowqueryBase[]
  showFullSQL?: boolean
}

export default function SlowQueriesTable({
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

  function handleRowClick(rec) {
    const qs = DetailPage.buildQuery({
      digest: rec.digest,
      connectId: rec.connection_id,
      time: rec.timestamp,
    })
    navigate(`/slow_query/detail?${qs}`)
  }

  return (
    <CardTableV2
      {...restProps}
      loading={loading}
      columns={columns}
      items={slowQueries}
      onRowClicked={handleRowClick}
      getKey={(row) => row && `${row.digest}_${row.timestamp}`}
    />
  )
}
