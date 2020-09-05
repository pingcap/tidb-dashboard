import { Badge, Tooltip } from 'antd'
import { max } from 'lodash'
import {
  IColumn,
  ColumnActionsMode,
} from 'office-ui-fabric-react/lib/DetailsList'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { getValueFormat } from '@baurine/grafana-value-formats'

import { SlowquerySlowQuery } from '@lib/client'
import { Bar, IColumnKeys, Pre } from '@lib/components'
import {
  commonColumnName,
  numWithBarColumn,
  textWithTooltipColumn,
  timestampColumn,
  sqlTextColumn,
} from '@lib/utils/tableColumns'

//////////////////////////////////////////

function ResultStatusBadge({ status }: { status: 'success' | 'error' }) {
  const { t } = useTranslation()
  return (
    <Badge status={status} text={t(`slow_query.common.status.${status}`)} />
  )
}

//////////////////////////////////////////
const TRANS_KEY_PREFIX = 'slow_query.fields'

function sqlColumn(
  _rows?: { query?: string }[], // used for type check only
  showFullSQL?: boolean
): IColumn {
  const column = sqlTextColumn(TRANS_KEY_PREFIX, 'query', showFullSQL)
  column.name = commonColumnName(TRANS_KEY_PREFIX, 'sql')
  return column
}

function connectionIDColumn(
  _rows?: { connection_id?: number }[] // used for type check only
): IColumn {
  return {
    name: commonColumnName(TRANS_KEY_PREFIX, 'connection_id'),
    key: 'connection_id',
    fieldName: 'connection_id',
    minWidth: 100,
    maxWidth: 120,
  }
}

function successColumn(
  _rows?: { success?: number }[] // used for type check only
): IColumn {
  return {
    name: commonColumnName(TRANS_KEY_PREFIX, 'result'),
    key: 'success',
    fieldName: 'success',
    minWidth: 50,
    maxWidth: 100,
    onRender: (rec) => (
      <ResultStatusBadge status={rec.success === 1 ? 'success' : 'error'} />
    ),
  }
}

function isInternalColumn(
  _rows?: { is_internal?: number }[] // used for type check only
): IColumn {
  return {
    name: commonColumnName(TRANS_KEY_PREFIX, 'is_internal'),
    key: 'Is_internal',
    fieldName: 'is_internal',
    minWidth: 50,
    maxWidth: 100,
    onRender: (rec) => (rec.is_internal === 1 ? 'Yes' : 'No'),
  }
}

////////////////////////////////////////////////
// util methods

function avgP90MaxColumn(columnNamePrefix: string, rows?: any[]): IColumn {
  const avgFiledName = `${columnNamePrefix}_avg`
  const p90FiledName = `${columnNamePrefix}_p90`
  const maxFiledName = `${columnNamePrefix}_max`
  const capacity = rows ? max(rows.map((v) => v[maxFiledName])) ?? 0 : 0
  return {
    name: commonColumnName(TRANS_KEY_PREFIX, avgFiledName),
    key: avgFiledName,
    fieldName: avgFiledName,
    minWidth: 140,
    maxWidth: 200,
    columnActionsMode: ColumnActionsMode.clickable,
    onRender: (rec) => {
      const tooltipContent = `
Mean: ${getValueFormat('ns')(rec[avgFiledName], 1)}
P90:  ${getValueFormat('ns')(rec[p90FiledName], 1)}
Max:  ${getValueFormat('ns')(rec[maxFiledName], 1)}`
      return (
        <Tooltip title={<Pre>{tooltipContent.trim()}</Pre>}>
          <Bar
            textWidth={70}
            value={rec[avgFiledName]}
            max={rec[maxFiledName]}
            min={rec[p90FiledName]}
            capacity={capacity}
          >
            {getValueFormat('ns')(rec[avgFiledName], 1)}
          </Bar>
        </Tooltip>
      )
    },
  }
}

//////////////////////////////////////////

export function slowQueryColumns(
  rows: SlowquerySlowQuery[],
  showFullSQL?: boolean
): IColumn[] {
  return [
    sqlColumn(rows, showFullSQL),
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'digest'),
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'instance'),
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'db'),
    connectionIDColumn(rows),
    timestampColumn(TRANS_KEY_PREFIX, 'timestamp'),
    numWithBarColumn(TRANS_KEY_PREFIX, 'query_time', 's', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'parse_time', 's', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'compile_time', 's', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'process_time', 's', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'mem_max', 'bytes', rows),
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'txn_start_ts'),
    successColumn(rows),
    // basic
    isInternalColumn(rows),
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'index_names'),
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'stats'),
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'backoff_types'),
    // connection
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'user'),
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'host'),
    // time
    numWithBarColumn(TRANS_KEY_PREFIX, 'wait_time', 'ns', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'backoff_time', 'ns', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'get_commit_ts_time', 'ns', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'local_latch_wait_time', 'ns', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'prewrite_time', 'ns', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'commit_time', 'ns', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'commit_backoff_time', 'ns', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'resolve_lock_time', 'ns', rows),
    // cop
    avgP90MaxColumn('cop_proc', rows),
    avgP90MaxColumn('cop_wait', rows),
    // transaction
    numWithBarColumn(TRANS_KEY_PREFIX, 'write_keys', 'short', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'write_size', 'bytes', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'prewrite_region', 'short', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'txn_retry', 'short', rows),
    // cop?
    numWithBarColumn(TRANS_KEY_PREFIX, 'request_count', 'short', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'process_keys', 'short', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'total_keys', 'short', rows),
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'cop_proc_addr'),
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'cop_wait_addr'),
  ]
}

//////////////////////////////////////////
export const SLOW_QUERY_COLUMN_REFS: { [key: string]: string[] } = {
  cop_proc: ['cop_proc_avg', 'cop_proc_p90', 'cop_proc_max'],
  cop_wait: ['cop_wait_avg', 'cop_wait_p90', 'cop_wait_max'],
}

export const DEF_SLOW_QUERY_COLUMN_KEYS: IColumnKeys = {
  query: true,
  timestamp: true,
  query_time: true,
  mem_max: true,
}
