import React, { useCallback, useMemo } from 'react'
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
  columnsWidth?: { [key: string]: number }
  // Event triggered when a row is clicked.
  onRowClicked?: (item: any, itemIndex: number) => void
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
    columnsWidth,
    onRowClicked,
    columns,
    items,
    selectionMode,
    ...restProps
  } = props

  const renderClickableRow = useRenderClickableRow(onRowClicked)

  const finalColumns = useMemo(() => {
    let newColumns: IColumn[] = columns || []
    if (visibleColumnKeys != null) {
      newColumns = newColumns.filter((c) => visibleColumnKeys[c.key])
    }
    // https://github.com/microsoft/fluentui/issues/9287
    // ms doesn't support initial the columns width
    if (columnsWidth != null) {
      newColumns = newColumns.map((c) =>
        columnsWidth[c.key]
          ? {
              ...c,
              style: {
                width: `${columnsWidth[c.key]}px`,
              }, // doesn't work
              currentWidth: columnsWidth[c.key], // doesn't work
              calculatedWidth: columnsWidth[c.key], // doesn't work
            }
          : c
      )
    }
    return newColumns
  }, [columns, visibleColumnKeys, columnsWidth])

  const filteredItems = useMemo(() => {
    if (visibleItemsCount == null) {
      return items
    }
    return items.slice(0, visibleItemsCount)
  }, [items, visibleItemsCount])

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
          selectionMode={selectionMode ?? SelectionMode.none}
          layoutMode={DetailsListLayoutMode.justified}
          onRenderDetailsHeader={renderStickyHeader}
          onRenderRow={onRowClicked ? renderClickableRow : undefined}
          onRenderCheckbox={(props) => {
            return <Checkbox checked={props?.checked} />
          }}
          columns={finalColumns}
          items={filteredItems}
          enableShimmer={filteredItems.length > 0 ? false : loading}
          {...restProps}
        />
      </div>
    </Card>
  )
}

export default CardTableV2
