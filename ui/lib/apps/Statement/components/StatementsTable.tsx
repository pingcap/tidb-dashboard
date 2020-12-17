import { usePersistFn } from 'ahooks'
import React, { useCallback } from 'react'
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
  } = controller

  const handleRowClick = usePersistFn((rec) => {
    const qs = DetailPage.buildQuery({
      digest: rec.digest,
      schema: rec.schema_name,
      beginTime: begin_time,
      endTime: end_time,
    })
    window.open(`#/statement/detail?${qs}`, '_blank')
  })

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
    />
  )
}
