import { usePersistFn } from 'ahooks'
import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import openLink from '@lib/utils/openLink'
import { CardTable, ICardTableProps } from '@lib/components'

import DetailPage from '../pages/Detail'
import { IStatementTableController } from '../utils/useStatementTableController'

interface Props extends Partial<ICardTableProps> {
  controller: IStatementTableController
}

export default function StatementsTable({ controller, ...restPrpos }: Props) {
  const {
    orderOptions,
    changeOrder,
    validTimeRange: { begin_time, end_time },
    loadingStatements,
    statements,
    errors,
    tableColumns,
    visibleColumnKeys,

    getClickedItemIndex,
    saveClickedItemIndex,
  } = controller

  const navigate = useNavigate()
  const handleRowClick = usePersistFn(
    (rec, idx, ev: React.MouseEvent<HTMLElement>) => {
      saveClickedItemIndex(idx)
      const qs = DetailPage.buildQuery({
        digest: rec.digest,
        schema: rec.schema_name,
        beginTime: begin_time,
        endTime: end_time,
      })
      openLink(`/statement/detail?${qs}`, ev, navigate)
    }
  )

  const getKey = useCallback((row) => `${row.digest}_${row.schema_name}`, [])

  return (
    <CardTable
      {...restPrpos}
      loading={loadingStatements}
      columns={tableColumns}
      items={statements}
      orderBy={orderOptions.orderBy}
      desc={orderOptions.desc}
      onChangeOrder={changeOrder}
      errors={errors}
      visibleColumnKeys={visibleColumnKeys}
      onRowClicked={handleRowClick}
      getKey={getKey}
      clickedRowIndex={getClickedItemIndex()}
    />
  )
}
