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
// Notice:
// The key field value in the following methods is case-sensitive
// They should keep the same as the column name in the slow query table
// Ref: pkg/apiserver/slowquery/queries.go SlowQuery struct
const TRANS_KEY_PREFIX = 'slow_query.fields'

function sqlColumn(
  _rows?: { query?: string }[], // used for type check only
  showFullSQL?: boolean
): IColumn {
  const column = sqlTextColumn(TRANS_KEY_PREFIX, 'Query', showFullSQL)
  column.name = commonColumnName(TRANS_KEY_PREFIX, 'sql')
  return column
}

function connectionIDColumn(
  _rows?: { connection_id?: number }[] // used for type check only
): IColumn {
  return {
    name: commonColumnName(TRANS_KEY_PREFIX, 'connection_id'),
    key: 'Conn_ID',
    fieldName: 'connection_id',
    minWidth: 100,
    maxWidth: 120,
  }
}

function _timestampColumn(
  _rows?: { timestamp?: number }[] // used for type check only
): IColumn {
  const column = timestampColumn(TRANS_KEY_PREFIX, 'timestamp')
  column.key = 'Time'
  return column
}

function successColumn(
  _rows?: { success?: number }[] // used for type check only
): IColumn {
  return {
    name: commonColumnName(TRANS_KEY_PREFIX, 'result'),
    key: 'Succ',
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
  const avgFiledName = `${columnNamePrefix}_avg`.toLowerCase()
  const p90FiledName = `${columnNamePrefix}_p90`.toLowerCase()
  const maxFiledName = `${columnNamePrefix}_max`.toLowerCase()
  const capacity = rows ? max(rows.map((v) => v[maxFiledName])) ?? 0 : 0
  return {
    name: commonColumnName(TRANS_KEY_PREFIX, avgFiledName),
    key: `${columnNamePrefix}_avg`,
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
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'Digest'),
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'INSTANCE'),
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'DB'),
    connectionIDColumn(rows),
    _timestampColumn(rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'Query_time', 's', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'Parse_time', 's', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'Compile_time', 's', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'Process_time', 's', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'Mem_max', 'bytes', rows),
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'Txn_start_ts'),
    successColumn(rows),
    // detail
    sqlTextColumn(TRANS_KEY_PREFIX, 'Prev_stmt', showFullSQL),
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'Plan'),
    // basic
    isInternalColumn(rows),
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'Index_names'),
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'Stats'),
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'Backoff_types'),
    // connection
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'User'),
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'Host'),
    // time
    numWithBarColumn(TRANS_KEY_PREFIX, 'Wait_time', 'ns', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'backoff_time', 'ns', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'Get_commit_ts_time', 'ns', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'Local_latch_wait_time', 'ns', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'Prewrite_time', 'ns', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'Commit_time', 'ns', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'Commit_backoff_time', 'ns', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'Resolve_lock_time', 'ns', rows),
    // cop
    avgP90MaxColumn('Cop_proc', rows),
    avgP90MaxColumn('Cop_wait', rows),
    // transaction
    numWithBarColumn(TRANS_KEY_PREFIX, 'Write_keys', 'short', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'Write_size', 'bytes', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'Prewrite_region', 'short', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'Txn_retry', 'short', rows),
    // cop?
    numWithBarColumn(TRANS_KEY_PREFIX, 'Request_count', 'short', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'Process_keys', 'short', rows),
    numWithBarColumn(TRANS_KEY_PREFIX, 'Total_keys', 'short', rows),
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'Cop_proc_addr'),
    textWithTooltipColumn(TRANS_KEY_PREFIX, 'Cop_wait_addr'),
  ]
}

//////////////////////////////////////////
// Notice:
// The keys in the following object are case-senstive.
// They should keep the same as the column name in the slow query table
// Ref: pkg/apiserver/slowquery/queries.go SlowQuery struct
export const SLOW_QUERY_COLUMN_REFS: { [key: string]: string[] } = {
  Cop_proc: ['Cop_proc_avg', 'Cop_proc_p90', 'Cop_proc_max'],
  Cop_wait: ['Cop_wait_avg', 'Cop_wait_p90', 'Cop_wait_max'],
}

export const DEF_SLOW_QUERY_COLUMN_KEYS: IColumnKeys = {
  Query: true,
  Time: true,
  Query_time: true,
  Mem_max: true,
}
