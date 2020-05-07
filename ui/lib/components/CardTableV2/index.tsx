import React, { useCallback, useMemo, useEffect } from 'react'
import { Checkbox } from 'antd'
import cx from 'classnames'
import {
  DetailsListLayoutMode,
  SelectionMode,
  IDetailsListProps,
  IColumn,
} from 'office-ui-fabric-react/lib/DetailsList'
import { ShimmeredDetailsList } from 'office-ui-fabric-react/lib/ShimmeredDetailsList'
import { Sticky, StickyPositionType } from 'office-ui-fabric-react/lib/Sticky'

import Card from '../Card'
import styles from './index.module.less'

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
  onChangeSort?: (orderBy: string, desc: boolean) => void

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
    onChangeSort,
    onRowClicked,
    onGetColumns,
    columns,
    items,
    ...restProps
  } = props

  const renderClickableRow = useRenderClickableRow(onRowClicked)

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
    // (ignore onColumnClick)
    // eslint-disable-next-line
  }, [columns, visibleColumnKeys, orderBy, desc])

  const finalItems = useMemo(() => {
    let newItems = items || []
    if (visibleItemsCount != null) {
      newItems = newItems.slice(0, visibleItemsCount)
    }
    const curColumn = finalColumns.find((col) => col.key === orderBy)
    if (curColumn) {
      newItems = copyAndSort(
        newItems,
        curColumn.fieldName!,
        curColumn.isSortedDescending
      )
    }
    return newItems
  }, [items, visibleItemsCount, orderBy, finalColumns])

  useEffect(() => {
    onGetColumns && onGetColumns(columns || [])
    // (ignore onGetColumns)
    // eslint-disable-next-line
  }, [columns])

  function onColumnClick(_ev: React.MouseEvent<HTMLElement>, column: IColumn) {
    if (!onChangeSort) {
      return
    }

    if (column.key === orderBy) {
      onChangeSort(orderBy, !desc)
    } else {
      onChangeSort(column.key, true)
    }
  }

  return (
    <Card
      title={title}
      subTitle={subTitle}
      style={style}
      className={cx(styles.cardTable, className)}
      noMargin={cardNoMargin}
      extra={cardExtra}
    >
      <div className={styles.cardTableContent}>
        <ShimmeredDetailsList
          selectionMode={SelectionMode.none}
          layoutMode={DetailsListLayoutMode.justified}
          onRenderDetailsHeader={renderStickyHeader}
          onRenderRow={onRowClicked ? renderClickableRow : undefined}
          onRenderCheckbox={(props) => {
            return <Checkbox checked={props?.checked} />
          }}
          columns={finalColumns}
          items={finalItems}
          enableShimmer={finalItems.length > 0 ? false : loading}
          {...restProps}
        />
      </div>
    </Card>
  )
}

export default CardTableV2
