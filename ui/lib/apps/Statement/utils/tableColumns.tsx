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
import { Bar, Pre, TextWrap, IColumnKeys } from '@lib/components'
import {
  commonColumnName,
  numWithBarColumn,
  textWithTooltipColumn,
  timestampColumn,
  sqlTextColumn,
} from '@lib/utils/tableColumns'

///////////////////////////////////////
// statements order list in local by fieldName of IColumn
// slow query order list in backend by key of IColumn
const TRANS_KEY_PREFIX = 'statement.fields'

function planCountColumn(
  _rows?: { plan_count?: number }[] // used for type check only
): IColumn {
  return {
    name: commonColumnName(TRANS_KEY_PREFIX, 'plan_count'),
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
    name: commonColumnName(TRANS_KEY_PREFIX, 'plan_digest'),
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

function digestTextColumn(
  _rows?: { digest_text?: string }[], // used for type check only
  showFullSQL?: boolean
): IColumn {
  return sqlTextColumn(TRANS_KEY_PREFIX, 'digest_text', showFullSQL)
}

function sumLatencyColumn(rows?: { sum_latency?: number }[]): IColumn {
  return numWithBarColumn(TRANS_KEY_PREFIX, 'sum_latency', 'ns', rows)
}

function avgMinMaxLatencyColumn(
  rows?: { max_latency?: number; min_latency?: number; avg_latency?: number }[]
): IColumn {
  const capacity = rows ? max(rows.map((v) => v.max_latency)) ?? 0 : 0
  const key = 'avg_latency'
  return {
    name: commonColumnName(TRANS_KEY_PREFIX, key),
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
  return numWithBarColumn(TRANS_KEY_PREFIX, 'exec_count', 'short', rows)
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
    name: commonColumnName(TRANS_KEY_PREFIX, 'errors_warnings'),
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

function avgTotalWaitColumn(rows?: any[]): IColumn {
  return avgMaxColumn(
    'avg_wait_time',
    'max_wait_time',
    'total_wait_time',
    'ns',
    rows
  )
}

function avgBackoffColumn(rows?: any[]): IColumn {
  return avgMaxColumn(
    'avg_backoff_time',
    'max_backoff_time',
    'backoff_time',
    'ns',
    rows
  )
}

function avgWriteKeysColumn(rows?: any[]): IColumn {
  return avgMaxColumn(
    'avg_write_keys',
    'max_write_keys',
    'avg_write_keys',
    'short',
    rows
  )
}

function avgProcessedKeysColumn(rows?: any[]): IColumn {
  return avgMaxColumn(
    'avg_processed_keys',
    'max_processed_keys',
    'avg_processed_keys',
    'short',
    rows
  )
}

function avgTotalKeysColumn(rows?: any[]): IColumn {
  return avgMaxColumn(
    'avg_total_keys',
    'max_total_keys',
    'avg_total_keys',
    'short',
    rows
  )
}

function avgPreWriteColumn(rows?: any[]): IColumn {
  return avgMaxColumn(
    'avg_prewrite_time',
    'max_prewrite_time',
    'prewrite_time',
    'ns',
    rows
  )
}

function avgCommitColumn(rows?: any[]): IColumn {
  return avgMaxColumn(
    'avg_commit_time',
    'max_commit_time',
    'commit_time',
    'ns',
    rows
  )
}

function avgGetCommitTsColumn(rows?: any[]): IColumn {
  return avgMaxColumn(
    'avg_get_commit_ts_time',
    'max_get_commit_ts_time',
    'get_commit_ts_time',
    'ns',
    rows
  )
}

function avgCommitBackoffColumn(rows?: any[]): IColumn {
  return avgMaxColumn(
    'avg_commit_backoff_time',
    'max_commit_backoff_time',
    'commit_backoff_time',
    'ns',
    rows
  )
}

function avgResolveLockColumn(rows?: any[]): IColumn {
  return avgMaxColumn(
    'avg_resolve_lock_time',
    'max_resolve_lock_time',
    'resolve_lock_time',
    'ns',
    rows
  )
}

function avgLocalLatchWaitColumn(rows?: any[]): IColumn {
  return avgMaxColumn(
    'avg_local_latch_wait_time',
    'max_local_latch_wait_time',
    'local_latch_wait_time',
    'ns',
    rows
  )
}

function avgWriteSizeColumn(rows?: any[]): IColumn {
  return avgMaxColumn(
    'avg_write_size',
    'max_write_size',
    'avg_write_size',
    'bytes',
    rows
  )
}

function avgPreWriteRegionsColumn(rows?: any[]): IColumn {
  return avgMaxColumn(
    'avg_prewrite_regions',
    'max_prewrite_regions',
    'avg_prewrite_regions',
    'short',
    rows
  )
}

function avgTxnRetryColumn(rows?: any[]): IColumn {
  return avgMaxColumn(
    'avg_txn_retry',
    'max_txn_retry',
    'avg_txn_retry',
    'short',
    rows
  )
}

function relatedSchemasColumn(
  _rows?: { related_schemas?: string }[] // used for type check only
): IColumn {
  return {
    name: commonColumnName(TRANS_KEY_PREFIX, 'related_schemas'),
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
  columnName: string,
  unit: string,
  rows?: any[]
): IColumn {
  const capacity = rows ? max(rows.map((v) => v[maxKey])) ?? 0 : 0
  const key = avgKey
  return {
    name: commonColumnName(TRANS_KEY_PREFIX, columnName),
    key,
    fieldName: key,
    minWidth: 140,
    maxWidth: 200,
    columnActionsMode: ColumnActionsMode.clickable,
    onRender: (rec) => {
      const formatFn = getValueFormat(unit)
      const mean =
        unit === 'short'
          ? formatFn(rec[avgKey], 0, 1)
          : formatFn(rec[avgKey], 1)
      const max =
        unit === 'short'
          ? formatFn(rec[maxKey], 0, 1)
          : formatFn(rec[maxKey], 1)
      const tooltipContent = `
Mean: ${mean}
Max:  ${max}`
      return (
        <Tooltip title={<Pre>{tooltipContent.trim()}</Pre>}>
          <Bar
            textWidth={70}
            value={rec[avgKey]}
            max={rec[maxKey]}
            capacity={capacity}
          >
            {mean}
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
    digestTextColumn(rows, showFullSQL),
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'digest'),
    sumLatencyColumn(rows),
    avgMinMaxLatencyColumn(rows),
    execCountColumn(rows),
    planCountColumn(rows),
    avgMaxMemColumn(rows),
    errorsWarningsColumn(rows),
    avgParseLatencyColumn(rows),
    avgCompileLatencyColumn(rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'sum_cop_task_num', 'short', rows),
    avgCoprColumn(rows),
    avgCopWaitColumn(rows),
    avgTotalProcessColumn(rows),
    avgTotalWaitColumn(rows),
    avgBackoffColumn(rows),
    avgWriteKeysColumn(rows),
    avgProcessedKeysColumn(rows),
    avgTotalKeysColumn(rows),
    avgPreWriteColumn(rows),
    avgCommitColumn(rows),
    avgGetCommitTsColumn(rows),
    avgCommitBackoffColumn(rows),
    avgResolveLockColumn(rows),
    avgLocalLatchWaitColumn(rows),
    avgWriteSizeColumn(rows),
    avgPreWriteRegionsColumn(rows),
    avgTxnRetryColumn(rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'sum_backoff_times', 'short', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'avg_affected_rows', 'short', rows),

    timestampColumn(TRANS_KEY_PREFIX, 'first_seen'),
    timestampColumn(TRANS_KEY_PREFIX, 'last_seen'),
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'sample_user'),

    sqlTextColumn(TRANS_KEY_PREFIX, 'query_sample_text', showFullSQL),
    sqlTextColumn(TRANS_KEY_PREFIX, 'prev_sample_text', showFullSQL),

    textWithTooltipColumn(TRANS_KEY_PREFIX, 'schema_name'),
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'table_names'),
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'index_names'),

    textWithTooltipColumn(TRANS_KEY_PREFIX, 'plan_digest'),
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'plan'),

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

  avg_wait_time: ['avg_wait_time', 'max_wait_time'],
  avg_backoff_time: ['avg_backoff_time', 'max_backoff_time'],
  avg_write_keys: ['avg_write_keys', 'max_write_keys'],
  avg_processed_keys: ['avg_processed_keys', 'max_processed_keys'],
  avg_total_keys: ['avg_total_keys', 'max_total_keys'],
  avg_prewrite_time: ['avg_prewrite_time', 'max_prewrite_time'],
  avg_commit_time: ['avg_commit_time', 'max_commit_time'],
  avg_get_commit_ts_time: ['avg_get_commit_ts_time', 'max_get_commit_ts_time'],
  avg_commit_backoff_time: [
    'avg_commit_backoff_time',
    'max_commit_backoff_time',
  ],
  avg_resolve_lock_time: ['avg_resolve_lock_time', 'max_resolve_lock_time'],
  avg_local_latch_wait_time: [
    'avg_local_latch_wait_time',
    'max_local_latch_wait_time',
  ],
  avg_write_size: ['avg_write_size', 'max_write_size'],
  avg_prewrite_regions: ['avg_prewrite_regions', 'max_prewrite_regions'],
  avg_txn_retry: ['avg_txn_retry', 'max_txn_retry'],

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
