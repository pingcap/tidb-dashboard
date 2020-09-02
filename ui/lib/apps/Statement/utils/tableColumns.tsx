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
import {
  Bar,
  HighlightSQL,
  Pre,
  TextWithInfo,
  TextWrap,
  IColumnKeys,
} from '@lib/components'

function commonColumnName(fieldName: string): any {
  return <TextWithInfo.TransKey transKey={`statement.fields.${fieldName}`} />
}

function planCountColumn(
  _rows?: { plan_count?: number }[] // used for type check only
): IColumn {
  return {
    name: commonColumnName('plan_count'),
    key: 'plan_count',
    fieldName: 'plan_count',
    minWidth: 100,
    maxWidth: 300,
    columnActionsMode: ColumnActionsMode.clickable,
  }
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
    isMultiline: showFullSQL,
    onRender: (rec) =>
      showFullSQL ? (
        <TextWrap multiline>
          <HighlightSQL sql={rec.digest_text} />
        </TextWrap>
      ) : (
        <Tooltip
          title={<HighlightSQL sql={rec.digest_text} theme="dark" />}
          placement="right"
        >
          <TextWrap>
            <HighlightSQL sql={rec.digest_text} compact />
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
    columnActionsMode: ColumnActionsMode.clickable,
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
    columnActionsMode: ColumnActionsMode.clickable,
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
    columnActionsMode: ColumnActionsMode.clickable,
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
  return avgMaxColumn('avg_mem', 'max_mem', 'avg_mem', 'bytes', rows)
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
    columnActionsMode: ColumnActionsMode.clickable,
    onRender: (rec) => {
      const tooltipContent = `
Errors:   ${getValueFormat('short')(rec.sum_errors, 0, 1)}
Warnings: ${getValueFormat('short')(rec.sum_warnings, 0, 1)}`
      return (
        <Tooltip title={<Pre>{tooltipContent.trim()}</Pre>}>
          <Bar
            textWidth={70}
            value={[rec.sum_errors, rec.sum_warnings]}
            colors={[red[4], orange[4]]}
            capacity={capacity}
          >
            {getValueFormat('short')(rec.sum_errors, 0, 1)}
            {' / '}
            {getValueFormat('short')(rec.sum_warnings, 0, 1)}
          </Bar>
        </Tooltip>
      )
    },
  }
}

function avgParseLatencyColumn(
  rows?: { avg_parse_latency?: number; max_parse_latency?: number }[]
): IColumn {
  return avgMaxColumn(
    'avg_parse_latency',
    'max_parse_latency',
    'parse_latency',
    'ns',
    rows
  )
}

function avgCompileLatencyColumn(
  rows?: { avg_compile_latency?: number; max_compile_latency?: number }[]
): IColumn {
  return avgMaxColumn(
    'avg_compile_latency',
    'max_compile_latency',
    'compile_latency',
    'ns',
    rows
  )
}

function sumCopTaskNumColumn(_rows?: { sum_cop_task_num?: number }[]): IColumn {
  const key = 'sum_cop_task_num'
  return {
    name: commonColumnName(key),
    key,
    fieldName: key,
    minWidth: 100,
    maxWidth: 300,
    columnActionsMode: ColumnActionsMode.clickable,
  }
}

function avgCoprColumn(
  rows?: { avg_cop_process_time?: number; max_cop_process_time?: number }[]
): IColumn {
  return avgMaxColumn(
    'avg_cop_process_time',
    'max_cop_process_time',
    'process_time',
    'ns',
    rows
  )
}

function avgCopWaitColumn(
  rows?: { avg_cop_wait_time?: number; max_cop_wait_time?: number }[]
): IColumn {
  return avgMaxColumn(
    'avg_cop_wait_time',
    'max_cop_wait_time',
    'wait_time',
    'ns',
    rows
  )
}

function avgTotalProcessColumn(
  rows?: { avg_process_time?: number; max_process_time?: number }[]
): IColumn {
  return avgMaxColumn(
    'avg_process_time',
    'max_process_time',
    'total_process_time',
    'ns',
    rows
  )
}

function relatedSchemasColumn(
  _rows?: { related_schemas?: string }[] // used for type check only
): IColumn {
  return {
    name: commonColumnName('related_schemas'),
    key: 'related_schemas',
    minWidth: 160,
    maxWidth: 240,
    onRender: (rec) => (
      <Tooltip title={rec.related_schemas}>
        <TextWrap>{rec.related_schemas}</TextWrap>
      </Tooltip>
    ),
  }
}

////////////////////////////////////////////////
// util methods

function avgMaxColumn(
  avgKey: string,
  maxKey: string,
  columnNameKey: string,
  unit: string,
  rows?: any[]
): IColumn {
  const capacity = rows ? max(rows.map((v) => v[maxKey])) ?? 0 : 0
  const key = avgKey
  return {
    name: commonColumnName(columnNameKey),
    key,
    fieldName: key,
    minWidth: 140,
    maxWidth: 200,
    columnActionsMode: ColumnActionsMode.clickable,
    onRender: (rec) => {
      const tooltipContent = `
Mean: ${getValueFormat(unit)(rec[avgKey], 1)}
Max:  ${getValueFormat(unit)(rec[maxKey], 1)}`
      return (
        <Tooltip title={<Pre>{tooltipContent.trim()}</Pre>}>
          <Bar
            textWidth={70}
            value={rec[avgKey]}
            max={rec[maxKey]}
            capacity={capacity}
          >
            {getValueFormat(unit)(rec[avgKey], 1)}
          </Bar>
        </Tooltip>
      )
    },
  }
}

////////////////////////////////////////////////

export function statementColumns(
  rows: StatementModel[],
  showFullSQL?: boolean
): IColumn[] {
  return [
    digestColumn(rows, showFullSQL),
    sumLatencyColumn(rows),
    avgMinMaxLatencyColumn(rows),
    execCountColumn(rows),
    planCountColumn(rows),
    avgMaxMemColumn(rows),
    errorsWarningsColumn(rows),
    avgParseLatencyColumn(rows),
    avgCompileLatencyColumn(rows),
    sumCopTaskNumColumn(rows),
    avgCoprColumn(rows),
    avgCopWaitColumn(rows),
    avgTotalProcessColumn(rows),
    relatedSchemasColumn(rows),
  ]
}

export function planColumns(rows: StatementModel[]): IColumn[] {
  return [
    planDigestColumn(rows),
    sumLatencyColumn(rows),
    avgMinMaxLatencyColumn(rows),
    execCountColumn(rows),
    avgMaxMemColumn(rows),
  ]
}

////////////////////////////////////////////////

export const STMT_COLUMN_REFS: { [key: string]: string[] } = {
  avg_latency: ['avg_latency', 'min_latency', 'max_latency'],
  avg_mem: ['avg_mem', 'max_mem'],
  sum_errors: ['sum_errors', 'sum_warnings'],
  avg_parse_latency: ['avg_parse_latency', 'max_parse_latency'],
  avg_compile_latency: ['avg_compile_latency', 'max_compile_latency'],
  avg_cop_process_time: ['avg_cop_process_time', 'max_cop_process_time'],
  avg_cop_wait_time: ['avg_cop_wait_time', 'max_cop_wait_time'],
  avg_process_time: ['avg_process_time', 'max_process_time'],

  related_schemas: ['table_names'],
}

export const DEF_STMT_COLUMN_KEYS: IColumnKeys = {
  digest_text: true,
  sum_latency: true,
  avg_latency: true,
  exec_count: true,
  plan_count: true,
  related_schemas: true,
}
