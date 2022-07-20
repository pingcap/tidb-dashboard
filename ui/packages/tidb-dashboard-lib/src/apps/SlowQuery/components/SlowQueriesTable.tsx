import { useMemoizedFn } from 'ahooks'
import React, { useCallback } from 'react'
import { CardTable, ICardTableProps } from '@lib/components'
import DetailPage from '../pages/Detail'
import { ISlowQueryTableController } from '../utils/useSlowQueryTableController'
import openLink from '@lib/utils/openLink'
import { useNavigate } from 'react-router-dom'

interface Props extends Partial<ICardTableProps> {
  controller: ISlowQueryTableController
}

function SlowQueriesTable({ controller, ...restProps }: Props) {
  const navigate = useNavigate()
  const handleRowClick = useMemoizedFn(
    (rec, idx, ev: React.MouseEvent<HTMLElement>) => {
      controller.saveClickedItemIndex(idx)
      const qs = DetailPage.buildQuery({
        digest: rec.digest,
        connectId: rec.connection_id,
        timestamp: rec.timestamp
      })
      openLink(`/slow_query/detail?${qs}`, ev, navigate)
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
