import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CardTableV2, ICardTableV2Props } from '@lib/components'
import { SlowqueryBase } from '@lib/client'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import * as useColumn from '@lib/utils/useColumn'

import * as useSlowQueryColumn from '../utils/useColumn'
import DetailPage from './Detail'

export type OrderBy = 'Query_time' | 'Mem_max' | 'Time'

function tableColumns(
  rows: SlowqueryBase[],
  onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) => void,
  orderBy: OrderBy,
  desc: boolean,
  showFullSQL?: boolean
): IColumn[] {
  return [
    useSlowQueryColumn.useSqlColumn(rows, showFullSQL),
    {
      ...useSlowQueryColumn.useTimestampColumn(rows),
      isSorted: orderBy === 'Time',
      isSortedDescending: desc,
      onColumnClick: onColumnClick,
    },
    {
      ...useSlowQueryColumn.useQueryTimeColumn(rows),
      isSorted: orderBy === 'Query_time',
      isSortedDescending: desc,
      onColumnClick: onColumnClick,
    },
    {
      ...useSlowQueryColumn.useMemoryColumn(rows),
      isSorted: orderBy === 'Mem_max',
      isSortedDescending: desc,
      onColumnClick: onColumnClick,
    },
    useColumn.useDummyColumn(),
  ]
}

interface Props extends Partial<ICardTableV2Props> {
  loading: boolean
  slowQueries: SlowqueryBase[]
  orderBy: OrderBy
  desc: boolean
  showFullSQL?: boolean
  onChangeSort: (orderBy: OrderBy, desc: boolean) => void
  onGetColumns?: (columns: IColumn[]) => void
}

export default function SlowQueriesTable({
  loading,
  slowQueries,
  orderBy,
  desc,
  onChangeSort,
  showFullSQL,
  onGetColumns,
  ...restProps
}: Props) {
  const navigate = useNavigate()

  const columns = tableColumns(
    slowQueries,
    onColumnClick,
    orderBy,
    desc,
    showFullSQL
  )

  useEffect(() => {
    onGetColumns && onGetColumns(columns)
    // eslint-disable-next-line
  }, [])

  function onColumnClick(_ev: React.MouseEvent<HTMLElement>, column: IColumn) {
    if (column.key === orderBy) {
      onChangeSort(orderBy, !desc)
    } else {
      onChangeSort(column.key as OrderBy, true)
    }
  }

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
      loading={loading}
      columns={columns}
      onRowClicked={handleRowClick}
      {...restProps}
      items={slowQueries}
    />
  )
}
