import React from 'react'
import {
  IColumn,
  ColumnActionsMode,
} from 'office-ui-fabric-react/lib/DetailsList'
import {
  TextWithInfo,
  HighlightSQL,
  TextWrap,
  Bar,
  DateTime,
  Pre,
} from '@lib/components'
import { Tooltip } from 'antd'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { max } from 'lodash'

function useCommonColumnName(fieldName: string): any {
  return (
    <TextWithInfo.TransKey
      transKey={`slow_query.common.columns.${fieldName}`}
    />
  )
}

export function useInstanceColumn(
  _rows?: { instance?: string }[] // used for type check only
): IColumn {
  return {
    name: useCommonColumnName('instance'),
    key: 'instance',
    fieldName: 'instance',
    minWidth: 100,
    maxWidth: 140,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
    onRender: (rec) => (
      <Tooltip title={rec.instance}>
        <TextWrap>{rec.instance}</TextWrap>
      </Tooltip>
    ),
  }
}

export function useConnectionIDColumn(
  _rows?: { connection_id?: number }[] // used for type check only
): IColumn {
  return {
    name: useCommonColumnName('connection_id'),
    key: 'connection_id',
    fieldName: 'connection_id',
    minWidth: 100,
    maxWidth: 120,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
  }
}

export function useSqlColumn(
  _rows?: { query?: string }[] // used for type check only
): IColumn {
  return {
    name: useCommonColumnName('sql'),
    key: 'sql',
    fieldName: 'sql',
    minWidth: 200,
    maxWidth: 500,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
    onRender: (rec) => (
      <Tooltip
        title={<HighlightSQL sql={rec.query} theme="dark" />}
        placement="right"
      >
        <TextWrap>
          <Pre>{rec.query}</Pre>
        </TextWrap>
      </Tooltip>
    ),
  }
}

export function useTimestampColumn(
  _rows?: { timestamp?: number }[] // used for type check only
): IColumn {
  return {
    name: useCommonColumnName('timestamp'),
    key: 'Time',
    fieldName: 'timestamp',
    minWidth: 100,
    maxWidth: 150,
    isResizable: true,
    onRender: (rec) => (
      <TextWrap>
        <DateTime.Calendar unixTimestampMs={rec.timestamp * 1000} />
      </TextWrap>
    ),
  }
}

export function useQueryTimeColumn(rows?: { query_time?: number }[]): IColumn {
  const capacity = rows ? max(rows.map((v) => v.query_time)) ?? 0 : 0
  return {
    name: useCommonColumnName('query_time'),
    key: 'Query_time',
    fieldName: 'query_time',
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    onRender: (rec) => (
      <Bar textWidth={70} value={rec.query_time} capacity={capacity}>
        {getValueFormat('s')(rec.query_time, 1)}
      </Bar>
    ),
  }
}

export function useMemoryColumn(rows?: { memory_max?: number }[]): IColumn {
  const capacity = rows ? max(rows.map((v) => v.memory_max)) ?? 0 : 0
  return {
    name: useCommonColumnName('memory_max'),
    key: 'Mem_max',
    fieldName: 'memory_max',
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    onRender: (rec) => (
      <Bar textWidth={70} value={rec.memory_max} capacity={capacity}>
        {getValueFormat('bytes')(rec.memory_max, 1)}
      </Bar>
    ),
  }
}
