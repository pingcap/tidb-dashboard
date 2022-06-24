import cx from 'classnames'
import { ModelRequestTargetNode } from '@lib/client'
import {
  ICellStyleProps,
  IColumn,
  IDetailsRowProps
} from 'office-ui-fabric-react/lib/DetailsList'
import React, { useCallback, useState } from 'react'
import TextHighlighter from 'react-highlight-words'
import styles from './LogRow.module.less'
import { Pre } from '@lib/components'
import { InstanceKind, instanceKindName } from '@lib/utils/instanceTable'
import { hsluvToHex } from 'hsluv'
import moize from 'moize'

export interface ComponentWithSortIndex extends ModelRequestTargetNode {
  sortIndex: number // range from [0, 1), used to determine component color
}

export interface ILogItem {
  key: number
  time?: string
  level?: string
  component?: ComponentWithSortIndex
  log?: string
}

export interface IRowProps extends IDetailsRowProps {
  item: ILogItem

  patterns: string[]
}

export function LogRow(props: IRowProps) {
  const [expanded, setExpanded] = useState(false)
  const handleClick = useCallback(() => {
    setExpanded((v) => !v)
  }, [])

  return (
    <div
      onClick={handleClick}
      key={props.item.key}
      className={cx(styles.logRow, { [styles.isExpanded]: expanded })}
      data-level={props.item.level}
    >
      <LogRowCacheable
        item={props.item}
        patterns={props.patterns}
        cellStyleProps={props.cellStyleProps}
        columns={props.columns}
      />
    </div>
  )
}

interface IRowCacheableProps {
  // A subset of IRowProps for better caching
  item: ILogItem
  patterns: string[]
  cellStyleProps?: ICellStyleProps
  columns: IColumn[]
}

// This component is cached globally (instead of per-instance as React.memo) so that
// it will work in virtualized lists.
// When the props are unchanged, this function will always return the same vDOM.
function LogRowCacheable_(props: IRowCacheableProps) {
  return (
    <Pre>
      {props.columns.map((column, columnIdx) => {
        const colProps: IColProps = {
          column,
          columnIdx,
          ...props
        }
        switch (column.key) {
          case 'component':
            return <ColumnComponent {...colProps} key={column.key} />
          case 'log':
            return <ColumnMessage {...colProps} key={column.key} />
          default:
            return (
              <BaseInfoColumn {...colProps} key={column.key}>
                {props.item[column.key]}
              </BaseInfoColumn>
            )
        }
      })}
    </Pre>
  )
}

const LogRowCacheable = moize(LogRowCacheable_, {
  isShallowEqual: true,
  maxArgs: 2,
  maxSize: 1000
})

interface IColProps extends IRowCacheableProps {
  column: IColumn
  columnIdx: number
  children?: React.ReactNode
  htmlAttributes?: React.HTMLAttributes<HTMLDivElement>
}

function BaseInfoColumn({
  column,
  columnIdx,
  children,
  htmlAttributes,
  cellStyleProps
}: IColProps) {
  let maxWidth
  if (column.calculatedWidth) {
    maxWidth =
      column.calculatedWidth +
      (cellStyleProps?.cellLeftPadding ?? 0) +
      (cellStyleProps?.cellRightPadding ?? 0)
    if (columnIdx === 0) {
      maxWidth -= 48 // hardcoded @padding-page
    }
  }
  const { style, className, ...restHtmlAttributes } = htmlAttributes ?? {}

  return (
    <div
      className={cx(styles.cell, styles.infoCell, className)}
      style={{ maxWidth, ...style }}
      data-column-name={column.key}
      {...restHtmlAttributes}
    >
      {children}
    </div>
  )
}

function BaseTextColumn({ column, children, htmlAttributes }: IColProps) {
  const { className, ...restHtmlAttributes } = htmlAttributes ?? {}
  return (
    <div
      className={cx(styles.cell, styles.textCell, className)}
      data-column-name={column.key}
      {...restHtmlAttributes}
    >
      {children}
    </div>
  )
}

function ColumnMessage(props: IColProps) {
  return (
    <BaseTextColumn {...props}>
      <TextHighlighter
        highlightClassName={styles.highlight}
        searchWords={props.patterns.map((p) => new RegExp(p, 'gi'))}
        textToHighlight={props.item.log}
      />
    </BaseTextColumn>
  )
}

function ColumnComponent(props: IColProps) {
  const { item } = props
  if (!item.component) {
    return null
  }
  return (
    <BaseInfoColumn
      {...props}
      htmlAttributes={{
        style: {
          borderColor: hsluvToHex([item.component.sortIndex * 360, 60, 85])
        }
      }}
    >
      {item.component.kind
        ? instanceKindName(item.component.kind as InstanceKind)
        : '?'}{' '}
      {item.component.display_name}
    </BaseInfoColumn>
  )
}
