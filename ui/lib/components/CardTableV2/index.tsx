import { Checkbox } from 'antd'
import cx from 'classnames'
import {
  DetailsList,
  DetailsListLayoutMode,
  IColumn,
  IDetailsListProps,
  SelectionMode,
} from 'office-ui-fabric-react/lib/DetailsList'
import { Sticky, StickyPositionType } from 'office-ui-fabric-react/lib/Sticky'
import React, { useCallback, useEffect, useMemo } from 'react'
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
  cardExtra?: React.ReactNode
  cardNoMargin?: boolean

  // The keys of visible columns. If null, all columns will be shown.
  visibleColumnKeys?: { [key: string]: boolean }
  visibleItemsCount?: number

  // Handle sort
  orderBy?: string
  desc?: boolean
  onChangeOrder?: (orderBy: string, desc: boolean) => void

  // Event triggered when a row is clicked.
  onRowClicked?: (item: any, itemIndex: number) => void

  onGetColumns?: (columns: IColumn[]) => void
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

function CardTableV2(props: ICardTableV2Props) {
  const {
    title,
    subTitle,
    className,
    style,
    loading = false,
    cardExtra,
    cardNoMargin,
    visibleColumnKeys,
    visibleItemsCount,
    orderBy,
    desc = true,
    onChangeOrder,
    onRowClicked,
    onGetColumns,
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
      isSorted: c.key === orderBy,
      isSortedDescending: desc,
      onColumnClick,
    }))
    return newColumns
  }, [onColumnClick, columns, visibleColumnKeys, orderBy, desc])

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

  useEffect(() => {
    onGetColumns && onGetColumns(columns || [])
    // (ignore onGetColumns)
    // eslint-disable-next-line
  }, [columns])

  const onRenderCheckbox = useCallback((props) => {
    return <Checkbox checked={props?.checked} />
  }, [])

  return (
    <Card
      title={title}
      subTitle={subTitle}
      style={style}
      className={cx(styles.cardTable, className)}
      noMargin={cardNoMargin}
      extra={cardExtra}
    >
      <AnimatedSkeleton showSkeleton={items.length === 0 && loading}>
        <div className={styles.cardTableContent}>
          <MemoDetailsList
            selectionMode={SelectionMode.none}
            layoutMode={DetailsListLayoutMode.justified}
            onRenderDetailsHeader={renderStickyHeader}
            onRenderRow={onRowClicked ? renderClickableRow : undefined}
            onRenderCheckbox={onRenderCheckbox}
            columns={finalColumns}
            items={finalItems}
            {...restProps}
          />
        </div>
      </AnimatedSkeleton>
    </Card>
  )
}

export default CardTableV2
