import { useMemoizedFn } from 'ahooks'
import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTheme } from 'office-ui-fabric-react/lib/Styling'
import openLink from '@lib/utils/openLink'
import { CardTable, ICardTableProps } from '@lib/components'
import DetailPage from '../pages/Detail'
import { IStatementTableController } from '../utils/useStatementTableController'
import {
  DetailsRow,
  IDetailsListProps,
  IDetailsRowStyles
} from 'office-ui-fabric-react/lib/DetailsList'

interface Props extends Partial<ICardTableProps> {
  controller: IStatementTableController
}

const theme = getTheme()

export default function StatementsTable({ controller, ...restPrpos }: Props) {
  const navigate = useNavigate()
  const handleRowClick = useMemoizedFn(
    (rec, idx, ev: React.MouseEvent<HTMLElement>) => {
      // the evicted record's digest is empty string
      if (!rec.digest) {
        return
      }
      controller.saveClickedItemIndex(idx)
      const qs = DetailPage.buildQuery({
        digest: rec.digest,
        schema: rec.schema_name,
        beginTime: controller.data!.timeRange[0],
        endTime: controller.data!.timeRange[1]
      })
      openLink(`/statement/detail?${qs}`, ev, navigate)
    }
  )

  const getKey = useCallback((row) => `${row.digest}_${row.schema_name}`, [])

  return (
    <CardTable
      {...restPrpos}
      loading={controller.isLoading}
      columns={controller.availableColumnsInTable}
      items={controller.data?.list ?? []}
      orderBy={controller.orderOptions.orderBy}
      desc={controller.orderOptions.desc}
      onChangeOrder={controller.changeOrder}
      errors={controller.errors}
      visibleColumnKeys={controller.queryOptions.visibleColumnKeys}
      onRowClicked={handleRowClick}
      getKey={getKey}
      clickedRowIndex={controller.getClickedItemIndex()}
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
      cursor: 'not-allowed'
    }
  }

  return <DetailsRow {...props} styles={customStyles} />
}
