import React, { useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import { CardTableV2, ICardTableV2Props } from '@lib/components'
import { SlowqueryBase } from '@lib/client'
import * as useColumn from '@lib/utils/useColumn'

import * as useSlowQueryColumn from '../utils/useColumn'
import DetailPage from '../pages/Detail'
import { usePersistFn } from '@umijs/hooks'

function tableColumns(rows: SlowqueryBase[], showFullSQL?: boolean): IColumn[] {
  return [
    useSlowQueryColumn.useSqlColumn(rows, showFullSQL),
    useSlowQueryColumn.useDigestColumn(rows),
    useSlowQueryColumn.useInstanceColumn(rows),
    useSlowQueryColumn.useDBColumn(rows),
    useSlowQueryColumn.useSuccessColumn(rows),
    useSlowQueryColumn.useTimestampColumn(rows),
    useSlowQueryColumn.useQueryTimeColumn(rows),
    useSlowQueryColumn.useParseTimeColumn(rows),
    useSlowQueryColumn.useCompileTimeColumn(rows),
    useSlowQueryColumn.useProcessTimeColumn(rows),
    useSlowQueryColumn.useMemoryColumn(rows),
    useSlowQueryColumn.useTxnStartTsColumn(rows),
    useColumn.useDummyColumn(),
  ]
}

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

  const columns = useMemo(() => tableColumns(slowQueries, showFullSQL), [
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

SlowQueriesTable.whyDidYouRender = true

export default SlowQueriesTable
