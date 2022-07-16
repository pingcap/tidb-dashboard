import { IRenderFunction } from '@uifabric/utilities'
import { useMemoizedFn } from 'ahooks'
import { Checkbox } from 'antd'
import cx from 'classnames'
import {
  ColumnActionsMode,
  ConstrainMode,
  DetailsList,
  DetailsListLayoutMode,
  IColumn,
  IDetailsList,
  IDetailsListProps,
  IDetailsRowProps,
  SelectionMode
} from 'office-ui-fabric-react/lib/DetailsList'
import { ScrollToMode } from 'office-ui-fabric-react/lib/List'
import { Sticky, StickyPositionType } from 'office-ui-fabric-react/lib/Sticky'
import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react'

import AnimatedSkeleton from '../AnimatedSkeleton'
import Card from '../Card'
import ErrorBar from '../ErrorBar'

import styles from './index.module.less'

export { AntCheckboxGroupHeader } from './GroupHeader'

DetailsList['whyDidYouRender'] = {
  customName: 'DetailsList'
}

function renderStickyHeader(props, defaultRender) {
  if (!props) {
    return null
  }
  return (
    <Sticky stickyPosition={StickyPositionType.Header} isScrollSynced>
      <div className={styles.tableHeader}>{defaultRender!(props)}</div>
    </Sticky>
  )
}

function renderCheckbox(props) {
  return <Checkbox checked={props?.checked} />
}

export function ImprovedDetailsList(props: IDetailsListProps) {
  return (
    <DetailsList
      onRenderDetailsHeader={renderStickyHeader}
      onRenderCheckbox={renderCheckbox}
      {...props}
    />
  )
}

ImprovedDetailsList.whyDidYouRender = true

export const MemoDetailsList = React.memo(ImprovedDetailsList)

function copyAndSort<T>(
  items: T[],
  columnKey: string,
  isSortedDescending?: boolean
): T[] {
  const key = columnKey as keyof T
  return items
    .slice(0)
    .sort((a: T, b: T) =>
      (isSortedDescending ? a[key] < b[key] : a[key] > b[key]) ? 1 : -1
    )
}

export interface ICardTableProps extends IDetailsListProps {
  title?: React.ReactNode
  subTitle?: React.ReactNode
  className?: string
  style?: object
  loading?: boolean
  hideLoadingWhenNotEmpty?: boolean // Whether loading animation should not show when data is not empty
  errors?: any[]

  cardExtra?: React.ReactNode
  cardNoMargin?: boolean
  cardNoMarginTop?: boolean
  cardNoMarginBottom?: boolean
  extendLastColumn?: boolean

  // The keys of visible columns. If null, all columns will be shown.
  visibleColumnKeys?: { [key: string]: boolean }
  visibleItemsCount?: number

  // Handle sort
  orderBy?: string
  desc?: boolean
  onChangeOrder?: (orderBy: string, desc: boolean) => void

  // Event triggered when a row is clicked.
  onRowClicked?: (
    item: any,
    itemIndex: number,
    ev: React.MouseEvent<HTMLElement>
  ) => void
  clickedRowIndex?: number
}

function useRenderClickableRow(
  onRowClicked,
  clickedRowIdx,
  customRender?: IRenderFunction<IDetailsRowProps> | undefined
) {
  return useCallback(
    (props, defaultRender) => {
      if (!props) {
        return null
      }
      return (
        <div
          className={cx(styles.clickableTableRow, {
            [styles.highlightRow]: clickedRowIdx === props.itemIndex
          })}
          onClick={(ev) => onRowClicked?.(props.item, props.itemIndex, ev)}
        >
          {customRender ? customRender(props) : defaultRender!(props)}
        </div>
      )
    },
    [onRowClicked, clickedRowIdx, customRender]
  )
}

function dummyColumn(): IColumn {
  return {
    name: '',
    key: 'dummy',
    minWidth: 28,
    maxWidth: 28,
    onRender: (_rec) => null
  }
}

export default function CardTable(props: ICardTableProps) {
  const {
    title,
    subTitle,
    className,
    style,
    loading = false,
    hideLoadingWhenNotEmpty,
    errors = [],
    cardExtra,
    cardNoMargin,
    cardNoMarginTop,
    cardNoMarginBottom,
    extendLastColumn,
    visibleColumnKeys,
    visibleItemsCount,
    orderBy,
    desc = true,
    onChangeOrder,
    onRowClicked,
    clickedRowIndex,
    columns,
    items,
    onRenderRow,
    selectionMode = SelectionMode.none,
    ...restProps
  } = props
  const renderClickableRow = useRenderClickableRow(
    onRowClicked,
    clickedRowIndex || -1,
    onRenderRow
  )

  const activeIdx = useRef<number>(-1)
  const handleActiveItemChange = useCallback((_, index?: number) => {
    activeIdx.current = index ?? -1
  }, [])

  const onColumnClick = useMemoizedFn(
    (_ev: React.MouseEvent<HTMLElement>, column: IColumn) => {
      if (!onChangeOrder) {
        return
      }
      if (column.key === orderBy) {
        onChangeOrder(orderBy, !desc)
      } else {
        onChangeOrder(column.key, true)
      }
    }
  )

  const finalColumns = useMemo(() => {
    let newColumns: IColumn[] = columns || []
    if (visibleColumnKeys != null) {
      newColumns = newColumns.filter((c) => visibleColumnKeys[c.key])
    }
    newColumns = newColumns.map((c) => ({
      ...c,
      isResizable: c.isResizable ?? true,
      isSorted: c.key === orderBy,
      isSortedDescending: desc,
      onColumnClick,
      columnActionsMode: c.columnActionsMode || ColumnActionsMode.disabled
    }))
    if (!extendLastColumn) {
      newColumns.push(dummyColumn())
    }
    return newColumns
  }, [
    onColumnClick,
    columns,
    visibleColumnKeys,
    orderBy,
    desc,
    extendLastColumn
  ])

  const finalItems = useMemo(() => {
    let newItems = items || []
    const curColumn = finalColumns.find((col) => col.key === orderBy)
    if (curColumn) {
      newItems = copyAndSort(
        newItems,
        curColumn.fieldName!,
        curColumn.isSortedDescending
      )
    }
    if (visibleItemsCount != null) {
      newItems = newItems.slice(0, visibleItemsCount)
    }
    return newItems
  }, [visibleItemsCount, items, orderBy, finalColumns])

  const tableRef = useRef<IDetailsList>(null)

  useLayoutEffect(() => {
    if (activeIdx.current === -1 && (clickedRowIndex ?? -1) >= 0) {
      setTimeout(() => {
        tableRef.current?.focusIndex(
          clickedRowIndex!,
          true,
          undefined,
          ScrollToMode.center
        )
      }, 50)
    }
  }, [clickedRowIndex, finalItems])

  return (
    <Card
      title={title}
      subTitle={subTitle}
      style={style}
      className={cx(styles.cardTable, className, {
        [styles.contentExtended]: extendLastColumn
      })}
      noMargin={cardNoMargin}
      noMarginTop={cardNoMarginTop}
      noMarginBottom={cardNoMarginBottom}
      extra={cardExtra}
      {...restProps}
    >
      <ErrorBar errors={errors} />
      <AnimatedSkeleton
        showSkeleton={
          (!hideLoadingWhenNotEmpty && loading) ||
          (items.length === 0 && loading)
        }
      >
        <div className={styles.cardTableContent}>
          <MemoDetailsList
            constrainMode={ConstrainMode.unconstrained}
            layoutMode={DetailsListLayoutMode.justified}
            onRenderRow={onRowClicked ? renderClickableRow : onRenderRow}
            columns={finalColumns}
            items={finalItems}
            componentRef={tableRef}
            selectionMode={selectionMode}
            onActiveItemChanged={handleActiveItemChange}
            {...restProps}
          />
        </div>
      </AnimatedSkeleton>
    </Card>
  )
}
