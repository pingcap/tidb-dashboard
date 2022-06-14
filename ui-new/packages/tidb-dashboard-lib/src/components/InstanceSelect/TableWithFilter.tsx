import React, { useMemo, useCallback, useRef } from 'react'
import cx from 'classnames'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { MarqueeSelection } from 'office-ui-fabric-react/lib/MarqueeSelection'
import { SelectionMode } from 'office-ui-fabric-react/lib/Selection'
import { useSize } from 'ahooks'
import {
  DetailsListLayoutMode,
  ISelection,
  IDetailsListProps
} from 'office-ui-fabric-react/lib/DetailsList'
import { Input, InputRef } from 'antd'
import { MemoDetailsList } from '../'

import styles from './TableWithFilter.module.less'

export interface ITableWithFilterProps extends IDetailsListProps {
  selection: ISelection
  filterPlaceholder?: string
  filter?: string
  onFilterChange?: (value: string) => void
  tableMaxHeight?: number
  tableWidth?: number
  containerProps?: React.HTMLAttributes<HTMLDivElement>
}

export interface ITableWithFilterRefProps {
  focusFilterInput: () => void
}

function TableWithFilter(
  {
    selection,
    filterPlaceholder,
    filter,
    onFilterChange,
    tableMaxHeight,
    tableWidth,
    containerProps,
    ...restProps
  }: ITableWithFilterProps,
  ref: React.Ref<ITableWithFilterRefProps>
) {
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFilterChange?.(e.target.value)
    },
    [onFilterChange]
  )

  const inputRef = useRef<InputRef>(null)

  React.useImperativeHandle(ref, () => ({
    focusFilterInput() {
      inputRef.current?.focus()
    }
  }))

  // FIXME: We should put Input inside ScrollablePane after https://github.com/microsoft/fluentui/issues/13557 is resolved

  const containerRef = useRef(null)
  const containerSize = useSize(containerRef)

  const paneStyle = useMemo(
    () =>
      ({
        position: 'relative',
        height: containerSize?.height,
        maxHeight: tableMaxHeight ?? 400,
        width: tableWidth ?? 400
      } as React.CSSProperties),
    [containerSize?.height, tableMaxHeight, tableWidth]
  )

  const {
    className: containerClassName,
    style: containerStyle,
    ...containerRestProps
  } = containerProps ?? {}

  return (
    <div
      className={cx(styles.tableWithFilterContainer, containerClassName)}
      style={containerStyle}
      {...containerRestProps}
    >
      <Input
        placeholder={filterPlaceholder}
        allowClear
        onChange={handleInputChange}
        value={filter}
        ref={inputRef}
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

export default React.memo(React.forwardRef(TableWithFilter))
