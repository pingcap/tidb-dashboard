import React, { useCallback } from 'react'
import { Skeleton } from 'antd'
import classNames from 'classnames'
import { Card } from '@pingcap-incubator/dashboard_components'
import {
  DetailsList,
  DetailsListLayoutMode,
  SelectionMode,
  IDetailsListProps,
} from 'office-ui-fabric-react/lib/DetailsList'
import { Sticky, StickyPositionType } from 'office-ui-fabric-react/lib/Sticky'

import styles from './index.module.less'

export interface ICardTableV2Props extends IDetailsListProps {
  title?: React.ReactNode
  className?: string
  style?: object
  loading?: boolean
  loadingSkeletonRows?: number
  cardExtra?: React.ReactNode
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

export default function CardTableV2(props: ICardTableV2Props) {
  const {
    title,
    className,
    style,
    loading = false,
    loadingSkeletonRows = 5,
    cardExtra,
    onRowClicked,
    ...restProps
  } = props

  const renderClickableRow = useRenderClickableRow(onRowClicked)

  return (
    <Card
      title={title}
      style={style}
      className={classNames(styles.cardTable, className)}
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
            {...restProps}
          />
        </div>
      )}
    </Card>
  )
}
