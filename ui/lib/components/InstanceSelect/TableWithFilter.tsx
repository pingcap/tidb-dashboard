import React, { useMemo, useCallback } from 'react'
import cx from 'classnames'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { MarqueeSelection } from 'office-ui-fabric-react/lib/MarqueeSelection'
import { SelectionMode } from 'office-ui-fabric-react/lib/Selection'
import { useSize } from '@umijs/hooks'
import {
  DetailsListLayoutMode,
  ISelection,
  IDetailsListProps,
} from 'office-ui-fabric-react/lib/DetailsList'
import { Input } from 'antd'
import { MemoDetailsList } from '../'

import styles from './TableWithFilter.module.less'

export interface ITableWithFilter extends IDetailsListProps {
  selection: ISelection
  filterPlaceholder?: string
  filter?: string
  onFilterChange?: (value: string) => void
  tableMaxHeight?: number
  tableWidth?: number
  containerClassName?: string
  containerStyle?: React.CSSProperties
}

function TableWithFilter({
  selection,
  filterPlaceholder,
  filter,
  onFilterChange,
  tableMaxHeight,
  tableWidth,
  containerClassName,
  containerStyle,
  ...restProps
}: ITableWithFilter) {
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFilterChange?.(e.target.value)
    },
    [onFilterChange]
  )

  // FIXME: We should put Input inside ScrollablePane after https://github.com/microsoft/fluentui/issues/13557 is resolved

  const [containerState, containerRef] = useSize<HTMLDivElement>()

  const paneStyle = useMemo(
    () =>
      ({
        position: 'relative',
        height: containerState.height,
        maxHeight: tableMaxHeight ?? 400,
        width: tableWidth ?? 400,
      } as React.CSSProperties),
    [containerState.height, tableMaxHeight, tableWidth]
  )

  return (
    <div
      className={cx(styles.tableWithFilterContainer, containerClassName)}
      style={containerStyle}
    >
      <Input
        placeholder={filterPlaceholder}
        allowClear
        onChange={handleInputChange}
        value={filter}
      />
      <ScrollablePane style={paneStyle}>
        <div ref={containerRef}>
          <MarqueeSelection selection={selection} isDraggingConstrainedToRoot>
            <MemoDetailsList
              selectionMode={SelectionMode.multiple}
              selection={selection}
              selectionPreservedOnEmptyClick
              layoutMode={DetailsListLayoutMode.justified}
              setKey="set"
              compact
              {...restProps}
            />
          </MarqueeSelection>
        </div>
      </ScrollablePane>
    </div>
  )
}

export default React.memo(TableWithFilter)
