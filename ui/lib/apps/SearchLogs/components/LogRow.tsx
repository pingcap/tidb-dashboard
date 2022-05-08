import cx from 'classnames'
import { ModelRequestTargetNode } from '@lib/client'
import {
  IColumn,
  IDetailsRowProps,
} from 'office-ui-fabric-react/lib/DetailsList'
import React, { useCallback, useState } from 'react'
import TextHighlighter from 'react-highlight-words'
import styles from './LogRow.module.less'
import { Pre } from '@lib/components'
import { InstanceKindName } from '@lib/utils/instanceTable'
import { hsluvToHex } from 'hsluv'

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

export interface IRowProps extends Omit<IDetailsRowProps, 'item'> {
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
      <Pre>
        {props.columns.map((column, columnIdx) => {
          const colProps: IColProps = {
            column,
            columnIdx,
            ...props,
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
    </div>
  )
}

interface IColProps extends IRowProps {
  column: IColumn
  columnIdx: number
  children?: React.ReactNode
  htmlAttributes?: React.HTMLAttributes<HTMLDivElement>
}

function BaseInfoColumn_({
  column,
  columnIdx,
  children,
  htmlAttributes,
  cellStyleProps,
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

const BaseInfoColumn = React.memo(BaseInfoColumn_)

function BaseTextColumn_({ column, children, htmlAttributes }: IColProps) {
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

const BaseTextColumn = React.memo(BaseTextColumn_)

function ColumnMessage_(props: IColProps) {
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

export const ColumnMessage = React.memo(ColumnMessage_)

function ColumnComponent_(props: IColProps) {
  const { item } = props
  if (!item.component) {
    return null
  }
  return (
    <BaseInfoColumn
      {...props}
      htmlAttributes={{
        style: {
          borderColor: hsluvToHex([item.component.sortIndex * 360, 60, 85]),
        },
      }}
    >
      {item.component.kind ? InstanceKindName[item.component.kind] : '?'}{' '}
      {item.component.display_name}
    </BaseInfoColumn>
  )
}

export const ColumnComponent = React.memo(ColumnComponent_)
