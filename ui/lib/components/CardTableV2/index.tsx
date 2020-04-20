import React, { useCallback, useMemo } from 'react'
import { Skeleton, Checkbox } from 'antd'
import cx from 'classnames'
import {
  DetailsList,
  DetailsListLayoutMode,
  SelectionMode,
  IDetailsListProps,
  IColumn,
} from 'office-ui-fabric-react/lib/DetailsList'
import { Sticky, StickyPositionType } from 'office-ui-fabric-react/lib/Sticky'

import Card from '../Card'
import styles from './index.module.less'

export interface ICardTableV2Props extends IDetailsListProps {
  title?: React.ReactNode
  className?: string
  style?: object
  loading?: boolean
  loadingSkeletonRows?: number
  cardExtra?: React.ReactNode
  cardNoMargin?: boolean
  // The keys of visible columns. If null, all columns will be shown.
  visibleColumnKeys?: { [key: string]: boolean }
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

function renderColumnVisibilitySelection(
  columns?: IColumn[],
  visibleColumnKeys?: { [key: string]: boolean },
  onChange?: (visibleKeys: { [key: string]: boolean }) => void
) {
  if (columns == null) {
    return null
  }
  if (visibleColumnKeys == null) {
    visibleColumnKeys = {}
    columns.forEach((c) => {
      visibleColumnKeys![c.key] = true
    })
  }
  return (
    <>
      {columns.map((column) => (
        <div key={column.key}>
          <Checkbox
            checked={visibleColumnKeys![column.key]}
            onChange={(e) => {
              if (!onChange) {
                return
              }
              onChange({
                ...visibleColumnKeys!,
                [column.key]: e.target.checked,
              })
            }}
          >
            {column.name}
          </Checkbox>
        </div>
      ))}
    </>
  )
}

function CardTableV2(props: ICardTableV2Props) {
  const {
    title,
    className,
    style,
    loading = false,
    loadingSkeletonRows = 5,
    cardExtra,
    cardNoMargin,
    visibleColumnKeys,
    onRowClicked,
    columns,
    ...restProps
  } = props

  const renderClickableRow = useRenderClickableRow(onRowClicked)
  const filteredColumns = useMemo(() => {
    if (columns == null || visibleColumnKeys == null) {
      return columns
    }
    return columns.filter((c) => visibleColumnKeys[c.key])
  }, [columns, visibleColumnKeys])

  return (
    <Card
      title={title}
      style={style}
      className={cx(styles.cardTable, className)}
      noMargin={cardNoMargin}
      extra={cardExtra}
    >
      {loading ? (
        <Skeleton
          active
          title={false}
          paragraph={{ rows: loadingSkeletonRows }}
        />
      ) : (
        <div className={styles.cardTableContent}>
          <DetailsList
            selectionMode={SelectionMode.none}
            layoutMode={DetailsListLayoutMode.justified}
            onRenderDetailsHeader={renderStickyHeader}
            onRenderRow={onRowClicked ? renderClickableRow : undefined}
            onRenderCheckbox={(props) => {
              return <Checkbox checked={props?.checked} />
            }}
            columns={filteredColumns}
            {...restProps}
          />
        </div>
      )}
    </Card>
  )
}

CardTableV2.renderColumnVisibilitySelection = renderColumnVisibilitySelection

export default CardTableV2
