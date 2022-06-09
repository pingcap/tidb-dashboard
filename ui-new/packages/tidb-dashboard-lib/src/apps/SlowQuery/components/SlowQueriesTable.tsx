import { useMemoizedFn } from 'ahooks'
import React, { useCallback, useContext } from 'react'
import { CardTable, ICardTableProps } from '@lib/components'
import DetailPage from '../pages/Detail'
import { ISlowQueryTableController } from '../utils/useSlowQueryTableController'
import openLink from '@lib/utils/openLink'
import { useNavigate } from 'react-router-dom'
import { SlowQueryContext } from '../context'

interface Props extends Partial<ICardTableProps> {
  controller: ISlowQueryTableController
}

function SlowQueriesTable({ controller, ...restProps }: Props) {
  const ctx = useContext(SlowQueryContext)

  const {
    loadingSlowQueries,
    tableColumns,
    slowQueries,
    orderOptions: { orderBy, desc },
    changeOrder,
    errors,
    visibleColumnKeys,

    saveClickedItemIndex,
    getClickedItemIndex
  } = controller

  const navigate = useNavigate()
  const handleRowClick = useMemoizedFn(
    (rec, idx, ev: React.MouseEvent<HTMLElement>) => {
      saveClickedItemIndex(idx)
      const qs = DetailPage.buildQuery({
        digest: rec.digest,
        connectId: rec.connection_id,
        timestamp: rec.timestamp
      })
      ctx?.ds.selectSlowQuery(rec)
      openLink(`/slow_query/detail?${qs}`, ev, navigate)
    }
  )

  const getKey = useCallback((row) => `${row.digest}_${row.timestamp}`, [])

  return (
    <CardTable
      {...restProps}
      loading={loadingSlowQueries}
      columns={tableColumns}
      items={slowQueries}
      orderBy={orderBy}
      desc={desc}
      onChangeOrder={changeOrder}
      errors={errors}
      visibleColumnKeys={visibleColumnKeys}
      onRowClicked={handleRowClick}
      clickedRowIndex={getClickedItemIndex()}
      getKey={getKey}
    />
  )
}

export default SlowQueriesTable
