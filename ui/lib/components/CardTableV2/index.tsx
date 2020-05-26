import { Checkbox, Alert } from 'antd'
import cx from 'classnames'
import {
  ColumnActionsMode,
  ConstrainMode,
  DetailsList,
  DetailsListLayoutMode,
  IColumn,
  IDetailsListProps,
  SelectionMode,
} from 'office-ui-fabric-react/lib/DetailsList'
import { Sticky, StickyPositionType } from 'office-ui-fabric-react/lib/Sticky'
import React, { useCallback, useMemo } from 'react'
import { usePersistFn } from '@umijs/hooks'

import AnimatedSkeleton from '../AnimatedSkeleton'
import Card from '../Card'
import styles from './index.module.less'

DetailsList.whyDidYouRender = {
  customName: 'DetailsList',
} as any

const MemoDetailsList = React.memo(DetailsList)

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

export interface ICardTableV2Props extends IDetailsListProps {
  title?: React.ReactNode
  subTitle?: React.ReactNode
  className?: string
  style?: object
  loading?: boolean
  errorMsg?: string

  cardExtra?: React.ReactNode
  cardNoMargin?: boolean
  cardNoMarginTop?: boolean
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

function useRenderClickableRow(onRowClicked) {
  return useCallback(
    (props, defaultRender) => {
      if (!props) {
        return null
      }
      return (
        <div
          className={styles.clickableTableRow}
          onClick={(ev) => onRowClicked?.(props.item, props.itemIndex, ev)}
        >
          {defaultRender!(props)}
        </div>
      )
    },
    [onRowClicked]
  )
}

function dummyColumn(): IColumn {
  return {
    name: '',
    key: 'dummy',
    minWidth: 28,
    maxWidth: 28,
    onRender: (_rec) => null,
  }
}

function CardTableV2(props: ICardTableV2Props) {
  const {
    title,
    subTitle,
    className,
    style,
    loading = false,
    errorMsg,
    cardExtra,
    cardNoMargin,
    cardNoMarginTop,
    extendLastColumn,
    visibleColumnKeys,
    visibleItemsCount,
    orderBy,
    desc = true,
    onChangeOrder,
    onRowClicked,
    columns,
    items,
    ...restProps
  } = props
  const renderClickableRow = useRenderClickableRow(onRowClicked)

  const onColumnClick = usePersistFn(
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
      isResizable: c.isResizable === false ? false : true,
      isSorted: c.key === orderBy,
      isSortedDescending: desc,
      onColumnClick,
      columnActionsMode: c.columnActionsMode || ColumnActionsMode.disabled,
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
    extendLastColumn,
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

  const onRenderCheckbox = useCallback((props) => {
    return <Checkbox checked={props?.checked} />
  }, [])

  return (
    <Card
      title={title}
      subTitle={subTitle}
      style={style}
      className={cx(styles.cardTable, className, {
        [styles.contentExtended]: extendLastColumn,
      })}
      noMargin={cardNoMargin}
      noMarginTop={cardNoMarginTop}
      extra={cardExtra}
    >
      <AnimatedSkeleton showSkeleton={items.length === 0 && loading && !errorMsg}>
        {errorMsg ? (
          <Alert message={errorMsg} type="error" showIcon />
        ) : (
          <div className={styles.cardTableContent}>
            <MemoDetailsList
              selectionMode={SelectionMode.none}
              constrainMode={ConstrainMode.unconstrained}
              layoutMode={DetailsListLayoutMode.justified}
              onRenderDetailsHeader={renderStickyHeader}
              onRenderRow={onRowClicked ? renderClickableRow : undefined}
              onRenderCheckbox={onRenderCheckbox}
              columns={finalColumns}
              items={finalItems}
              {...restProps}
            />
          </div>
        )}
      </AnimatedSkeleton>
    </Card>
  )
}

export default CardTableV2
