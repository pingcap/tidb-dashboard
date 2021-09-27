import { usePersistFn } from 'ahooks'
import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DetailsRow,
  IDetailsListProps,
  IDetailsRowStyles,
} from 'office-ui-fabric-react'
import { getTheme } from 'office-ui-fabric-react/lib/Styling'

import openLink from '@lib/utils/openLink'
import { CardTable, ICardTableProps } from '@lib/components'

import DetailPage from '../pages/Detail'
import { IStatementTableController } from '../utils/useStatementTableController'

interface Props extends Partial<ICardTableProps> {
  controller: IStatementTableController
}

const theme = getTheme()

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
      // the evicted record's digest is empty string
      if (!rec.digest) {
        return
      }
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
      onRenderRow={renderRow}
    />
  )
}

const renderRow: IDetailsListProps['onRenderRow'] = (props) => {
  if (!props) {
    return null
  }

  const customStyles: Partial<IDetailsRowStyles> = {}
  // the evicted record's digest is empty string
  if (!props.item.digest) {
    customStyles.root = {
      backgroundColor: theme.palette.neutralLighter,
      cursor: 'not-allowed',
    }
  }

  return <DetailsRow {...props} styles={customStyles} />
}
