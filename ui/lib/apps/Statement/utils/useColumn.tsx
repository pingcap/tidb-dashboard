import React from 'react'
import {
  IColumn,
  ColumnActionsMode,
} from 'office-ui-fabric-react/lib/DetailsList'
import { red, orange } from '@ant-design/colors'
import { TextWithInfo, HighlightSQL, TextWrap, Bar, Pre } from '@lib/components'
import { Tooltip } from 'antd'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { max } from 'lodash'

function useCommonColumnName(fieldName: string): any {
  return <TextWithInfo.TransKey transKey={`statement.fields.${fieldName}`} />
}

export function usePlanDigestColumn(
  _rows?: { plan_digest?: string }[] // used for type check only
): IColumn {
  return {
    name: useCommonColumnName('plan_digest'),
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

export function useDigestColumn(
  _rows?: { digest_text?: string }[], // used for type check only
  showFullSQL?: boolean
): IColumn {
  return {
    name: useCommonColumnName('digest_text'),
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

export function useSumLatencyColumn(
  rows?: { sum_latency?: number }[]
): IColumn {
  const capacity = rows ? max(rows.map((v) => v.sum_latency)) ?? 0 : 0
  return {
    name: useCommonColumnName('sum_latency'),
    key: 'sum_latency',
    fieldName: 'sum_latency',
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
    onRender: (rec) => (
      <Bar textWidth={70} value={rec.sum_latency} capacity={capacity}>
        {getValueFormat('ns')(rec.sum_latency, 1)}
      </Bar>
    ),
  }
}

export function useAvgMinMaxLatencyColumn(
  rows?: { max_latency?: number; min_latency?: number; avg_latency?: number }[]
): IColumn {
  const capacity = rows ? max(rows.map((v) => v.max_latency)) ?? 0 : 0
  return {
    name: useCommonColumnName('avg_latency'),
    key: 'avg_latency',
    fieldName: 'avg_latency',
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
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

export function useExecCountColumn(rows?: { exec_count?: number }[]): IColumn {
  const capacity = rows ? max(rows.map((v) => v.exec_count)) ?? 0 : 0
  return {
    name: useCommonColumnName('exec_count'),
    key: 'exec_count',
    fieldName: 'exec_count',
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
    onRender: (rec) => (
      <Bar textWidth={70} value={rec.exec_count} capacity={capacity}>
        {getValueFormat('short')(rec.exec_count, 0, 1)}
      </Bar>
    ),
  }
}

export function useAvgMaxMemColumn(
  rows?: { avg_mem?: number; max_mem?: number }[]
): IColumn {
  const capacity = rows ? max(rows.map((v) => v.max_mem)) ?? 0 : 0
  return {
    name: useCommonColumnName('avg_mem'),
    key: 'avg_mem',
    fieldName: 'avg_mem',
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
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

export function useErrorsWarningsColumn(
  rows?: { sum_errors?: number; sum_warnings?: number }[]
): IColumn {
  const capacity = rows
    ? max(rows.map((v) => v.sum_errors! + v.sum_warnings!)) ?? 0
    : 0
  return {
    name: useCommonColumnName('errors_warnings'),
    key: 'sum_errors',
    fieldName: 'sum_errors',
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
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

export function useAvgParseLatencyColumn(
  rows?: { avg_parse_latency?: number; max_parse_latency?: number }[]
): IColumn {
  const capacity = rows ? max(rows.map((v) => v.max_parse_latency)) ?? 0 : 0
  return {
    name: useCommonColumnName('parse_latency'),
    key: 'avg_parse_latency',
    fieldName: 'avg_parse_latency',
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
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

export function useAvgCompileLatencyColumn(
  rows?: { avg_compile_latency?: number; max_compile_latency?: number }[]
): IColumn {
  const capacity = rows ? max(rows.map((v) => v.max_compile_latency)) ?? 0 : 0
  return {
    name: useCommonColumnName('compile_latency'),
    key: 'avg_compile_latency',
    fieldName: 'avg_compile_latency',
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
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
export function useAvgCoprColumn(
  rows?: { avg_cop_process_time?: number; max_cop_process_time?: number }[]
): IColumn {
  const capacity = rows ? max(rows.map((v) => v.max_cop_process_time)) ?? 0 : 0
  return {
    name: useCommonColumnName('process_time'),
    key: 'avg_cop_process_time',
    fieldName: 'avg_cop_process_time',
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
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

export function useRelatedSchemasColumn(
  _rows?: { related_schemas?: string }[] // used for type check only
): IColumn {
  return {
    name: useCommonColumnName('related_schemas'),
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
