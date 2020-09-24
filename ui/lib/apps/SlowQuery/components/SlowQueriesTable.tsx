import { usePersistFn } from '@umijs/hooks'
import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { CardTable, ICardTableProps } from '@lib/components'
import openLink from '@lib/utils/openLink'

import DetailPage from '../pages/Detail'
import { ISlowQueryTableController } from '../utils/useSlowQueryTableController'

interface Props extends Partial<ICardTableProps> {
  controller: ISlowQueryTableController
}

function SlowQueriesTable({ controller, ...restProps }: Props) {
  const navigate = useNavigate()

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

  const {
    loadingSlowQueries,
    tableColumns,
    slowQueries,
    orderOptions: { orderBy, desc },
    changeOrder,
    errors,
    visibleColumnKeys,
  } = controller

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
      getKey={getKey}
    />
  )
}

export default SlowQueriesTable
