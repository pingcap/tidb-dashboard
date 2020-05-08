import { Tooltip } from 'antd'
import { max } from 'lodash'
import {
  ColumnActionsMode,
  IColumn,
} from 'office-ui-fabric-react/lib/DetailsList'
import React from 'react'
import { orange, red } from '@ant-design/colors'
import { getValueFormat } from '@baurine/grafana-value-formats'

import { StatementModel } from '@lib/client'
import { Bar, HighlightSQL, Pre, TextWithInfo, TextWrap } from '@lib/components'
import * as useColumn from '@lib/utils/useColumn'

function commonColumnName(fieldName: string): any {
  return <TextWithInfo.TransKey transKey={`statement.fields.${fieldName}`} />
}

function planDigestColumn(
  _rows?: { plan_digest?: string }[] // used for type check only
): IColumn {
  return {
    name: commonColumnName('plan_digest'),
    key: 'plan_digest',
    fieldName: 'plan_digest',
    minWidth: 100,
    maxWidth: 300,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
    onRender: (rec) => (
      <Tooltip title={rec.plan_digest}>
        <TextWrap>{rec.plan_digest || '(none)'}</TextWrap>
      </Tooltip>
    ),
  }
}

function digestColumn(
  _rows?: { digest_text?: string }[], // used for type check only
  showFullSQL?: boolean
): IColumn {
  return {
    name: commonColumnName('digest_text'),
    key: 'digest_text',
    fieldName: 'digest_text',
    minWidth: 100,
    maxWidth: 500,
    isResizable: true,
    isMultiline: showFullSQL,
    columnActionsMode: ColumnActionsMode.disabled,
    onRender: (rec) => (
      <Tooltip
        title={<HighlightSQL sql={rec.digest_text} theme="dark" />}
        placement="right"
      >
        <TextWrap multiline={showFullSQL}>
          {showFullSQL ? (
            <HighlightSQL sql={rec.digest_text} />
          ) : (
            <Pre>{rec.digest_text}</Pre>
          )}
        </TextWrap>
      </Tooltip>
    ),
  }
}

function sumLatencyColumn(rows?: { sum_latency?: number }[]): IColumn {
  const capacity = rows ? max(rows.map((v) => v.sum_latency)) ?? 0 : 0
  const key = 'sum_latency'
  return {
    name: commonColumnName(key),
    key,
    fieldName: key,
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    onRender: (rec) => (
      <Bar textWidth={70} value={rec.sum_latency} capacity={capacity}>
        {getValueFormat('ns')(rec.sum_latency, 1)}
      </Bar>
    ),
  }
}

function avgMinMaxLatencyColumn(
  rows?: { max_latency?: number; min_latency?: number; avg_latency?: number }[]
): IColumn {
  const capacity = rows ? max(rows.map((v) => v.max_latency)) ?? 0 : 0
  const key = 'avg_latency'
  return {
    name: commonColumnName(key),
    key,
    fieldName: key,
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    onRender: (rec) => {
      const tooltipContent = `
Mean: ${getValueFormat('ns')(rec.avg_latency, 1)}
Min:  ${getValueFormat('ns')(rec.min_latency, 1)}
Max:  ${getValueFormat('ns')(rec.max_latency, 1)}`
      return (
        <Tooltip title={<Pre>{tooltipContent.trim()}</Pre>}>
          <Bar
            textWidth={70}
            value={rec.avg_latency}
            max={rec.max_latency}
            min={rec.min_latency}
            capacity={capacity}
          >
            {getValueFormat('ns')(rec.avg_latency, 1)}
          </Bar>
        </Tooltip>
      )
    },
  }
}

function execCountColumn(rows?: { exec_count?: number }[]): IColumn {
  const capacity = rows ? max(rows.map((v) => v.exec_count)) ?? 0 : 0
  const key = 'exec_count'
  return {
    name: commonColumnName(key),
    key,
    fieldName: key,
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    onRender: (rec) => (
      <Bar textWidth={70} value={rec.exec_count} capacity={capacity}>
        {getValueFormat('short')(rec.exec_count, 0, 1)}
      </Bar>
    ),
  }
}

function avgMaxMemColumn(
  rows?: { avg_mem?: number; max_mem?: number }[]
): IColumn {
  const capacity = rows ? max(rows.map((v) => v.max_mem)) ?? 0 : 0
  const key = 'avg_mem'
  return {
    name: commonColumnName(key),
    key,
    fieldName: key,
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    onRender: (rec) => {
      const tooltipContent = `
Mean: ${getValueFormat('bytes')(rec.avg_mem, 1)}
Max:  ${getValueFormat('bytes')(rec.max_mem, 1)}`
      return (
        <Tooltip title={<Pre>{tooltipContent.trim()}</Pre>}>
          <Bar
            textWidth={70}
            value={rec.avg_mem}
            max={rec.max_mem}
            capacity={capacity}
          >
            {getValueFormat('bytes')(rec.avg_mem, 1)}
          </Bar>
        </Tooltip>
      )
    },
  }
}

function errorsWarningsColumn(
  rows?: { sum_errors?: number; sum_warnings?: number }[]
): IColumn {
  const capacity = rows
    ? max(rows.map((v) => v.sum_errors! + v.sum_warnings!)) ?? 0
    : 0
  const key = 'sum_errors'
  return {
    name: commonColumnName('errors_warnings'),
    key,
    fieldName: key,
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    onRender: (rec) => {
      const tooltipContent = `
Errors:   ${getValueFormat('short')(rec.sum_errors, 0)}
Warnings: ${getValueFormat('short')(rec.sum_warnings, 0)}`
      return (
        <Tooltip title={<Pre>{tooltipContent.trim()}</Pre>}>
          <Bar
            textWidth={70}
            value={[rec.sum_errors, rec.sum_warnings]}
            colors={[red[4], orange[4]]}
            capacity={capacity}
          >
            {getValueFormat('short')(rec.sum_errors, 0)}
            {' / '}
            {getValueFormat('short')(rec.sum_warnings, 0)}
          </Bar>
        </Tooltip>
      )
    },
  }
}

function avgParseLatencyColumn(
  rows?: { avg_parse_latency?: number; max_parse_latency?: number }[]
): IColumn {
  const capacity = rows ? max(rows.map((v) => v.max_parse_latency)) ?? 0 : 0
  const key = 'avg_parse_latency'
  return {
    name: commonColumnName('parse_latency'),
    key,
    fieldName: key,
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    onRender: (rec) => {
      const tooltipContent = `
Mean: ${getValueFormat('ns')(rec.avg_parse_latency, 1)}
Max:  ${getValueFormat('ns')(rec.max_parse_latency, 1)}`
      return (
        <Tooltip title={<Pre>{tooltipContent.trim()}</Pre>}>
          <Bar
            textWidth={70}
            value={rec.avg_parse_latency}
            max={rec.max_parse_latency}
            capacity={capacity}
          >
            {getValueFormat('ns')(rec.avg_parse_latency, 1)}
          </Bar>
        </Tooltip>
      )
    },
  }
}

function avgCompileLatencyColumn(
  rows?: { avg_compile_latency?: number; max_compile_latency?: number }[]
): IColumn {
  const capacity = rows ? max(rows.map((v) => v.max_compile_latency)) ?? 0 : 0
  const key = 'avg_compile_latency'
  return {
    name: commonColumnName('compile_latency'),
    key,
    fieldName: key,
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    onRender: (rec) => {
      const tooltipContent = `
Mean: ${getValueFormat('ns')(rec.avg_compile_latency, 1)}
Max:  ${getValueFormat('ns')(rec.max_compile_latency, 1)}`
      return (
        <Tooltip title={<Pre>{tooltipContent.trim()}</Pre>}>
          <Bar
            textWidth={70}
            value={rec.avg_compile_latency}
            max={rec.max_compile_latency}
            capacity={capacity}
          >
            {getValueFormat('ns')(rec.avg_compile_latency, 1)}
          </Bar>
        </Tooltip>
      )
    },
  }
}

function avgCoprColumn(
  rows?: { avg_cop_process_time?: number; max_cop_process_time?: number }[]
): IColumn {
  const capacity = rows ? max(rows.map((v) => v.max_cop_process_time)) ?? 0 : 0
  const key = 'avg_cop_process_time'
  return {
    name: commonColumnName('process_time'),
    key,
    fieldName: key,
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    onRender: (rec) => {
      const tooltipContent = `
Mean: ${getValueFormat('ns')(rec.avg_cop_process_time, 1)}
Max:  ${getValueFormat('ns')(rec.max_cop_process_time, 1)}`
      return (
        <Tooltip title={<Pre>{tooltipContent.trim()}</Pre>}>
          <Bar
            textWidth={70}
            value={rec.avg_cop_process_time}
            max={rec.max_cop_process_time}
            capacity={capacity}
          >
            {getValueFormat('ns')(rec.avg_cop_process_time, 1)}
          </Bar>
        </Tooltip>
      )
    },
  }
}

function relatedSchemasColumn(
  _rows?: { related_schemas?: string }[] // used for type check only
): IColumn {
  return {
    name: commonColumnName('related_schemas'),
    key: 'related_schemas',
    minWidth: 160,
    maxWidth: 240,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
    onRender: (rec) => (
      <Tooltip title={rec.related_schemas}>
        <TextWrap>{rec.related_schemas}</TextWrap>
      </Tooltip>
    ),
  }
}

////////////////////////////////////////////////

export function statementsColumns(
  rows: StatementModel[],
  showFullSQL?: boolean
): IColumn[] {
  return [
    digestColumn(rows, showFullSQL),
    sumLatencyColumn(rows),
    avgMinMaxLatencyColumn(rows),
    execCountColumn(rows),
    avgMaxMemColumn(rows),
    errorsWarningsColumn(rows),
    avgParseLatencyColumn(rows),
    avgCompileLatencyColumn(rows),
    avgCoprColumn(rows),
    relatedSchemasColumn(rows),
    useColumn.useDummyColumn(),
  ]
}

export function planColumns(rows: StatementModel[]): IColumn[] {
  return [
    planDigestColumn(rows),
    sumLatencyColumn(rows),
    avgMinMaxLatencyColumn(rows),
    execCountColumn(rows),
    avgMaxMemColumn(rows),
    useColumn.useDummyColumn(),
  ]
}
