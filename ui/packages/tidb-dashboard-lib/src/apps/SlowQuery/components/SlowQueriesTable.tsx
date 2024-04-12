import { useMemoizedFn } from 'ahooks'
import React, { useCallback, useContext } from 'react'
import { CardTable, ICardTableProps } from '@lib/components'
import { ISlowQueryTableController } from '../utils/useSlowQueryTableController'
import openLink from '@lib/utils/openLink'
import { useNavigate } from 'react-router-dom'

import { SlowQueryContext } from '../context'

interface Props extends Partial<ICardTableProps> {
  controller: ISlowQueryTableController
  detailPathPrefix?: string
}

function SlowQueriesTable({
  controller,
  detailPathPrefix = '/slow_query/detail',
  ...restProps
}: Props) {
  const ctx = useContext(SlowQueryContext)
  const navigate = useNavigate()
  const handleRowClick = useMemoizedFn(
    (rec, idx, ev: React.MouseEvent<HTMLElement>) => {
      ctx?.event?.selectSlowQueryItem(rec)
      controller.saveClickedItemIndex(idx)
      openLink(
        `/slow_query/detail?digest=${rec.digest}&connection_id=${rec.connection_id}&timestamp=${rec.timestamp}`,
        ev,
        navigate
      )
    }
  )

  const getKey = useCallback((row) => `${row.digest}_${row.timestamp}`, [])

  return (
    <CardTable
      {...restProps}
      loading={controller.isLoading}
      columns={controller.availableColumnsInTable}
      items={controller.data ?? []}
      orderBy={controller.orderOptions.orderBy}
      desc={controller.orderOptions.desc}
      onChangeOrder={controller.changeOrder}
      errors={controller.errors}
      visibleColumnKeys={controller.queryOptions.visibleColumnKeys}
      onRowClicked={handleRowClick}
      clickedRowIndex={controller.getClickedItemIndex()}
      getKey={getKey}
      data-e2e="detail_tabs_slow_query"
    />
  )
}

export default SlowQueriesTable
