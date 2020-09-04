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
import {
  Bar,
  DateTime,
  HighlightSQL,
  TextWithInfo,
  TextWrap,
  IColumnKeys,
  Pre,
} from '@lib/components'

//////////////////////////////////////////

function ResultStatusBadge({ status }: { status: 'success' | 'error' }) {
  const { t } = useTranslation()
  return (
    <Badge status={status} text={t(`slow_query.common.status.${status}`)} />
  )
}

function commonColumnName(fieldName: string): any {
  return <TextWithInfo.TransKey transKey={`slow_query.fields.${fieldName}`} />
}

//////////////////////////////////////////
// Notice:
// The key field value in the following methods is case-sensitive
// They should keep the same as the column name in the slow query table
// Ref: pkg/apiserver/slowquery/queries.go SlowQuery struct

function sqlColumn(
  _rows?: { query?: string }[], // used for type check only
  showFullSQL?: boolean
): IColumn {
  return {
    name: commonColumnName('sql'),
    key: 'Query',
    fieldName: 'query',
    minWidth: 200,
    maxWidth: 500,
    onRender: (rec) =>
      showFullSQL ? (
        <TextWrap multiline>
          <HighlightSQL sql={rec.query} />
        </TextWrap>
      ) : (
        <Tooltip
          title={<HighlightSQL sql={rec.query} theme="dark" />}
          placement="right"
        >
          <TextWrap>
            <HighlightSQL sql={rec.query} compact />
          </TextWrap>
        </Tooltip>
      ),
  }
}

function digestColumn(
  _rows?: { digest?: string }[] // used for type check only
): IColumn {
  return textWithTooltipColumn('Digest')
}

function instanceColumn(
  _rows?: { instance?: string }[] // used for type check only
): IColumn {
  return textWithTooltipColumn('INSTANCE')
}

function dbColumn(
  _rows?: { db?: string }[] // used for type check only
): IColumn {
  return textWithTooltipColumn('DB')
}

function connectionIDColumn(
  _rows?: { connection_id?: number }[] // used for type check only
): IColumn {
  return {
    name: commonColumnName('connection_id'),
    key: 'Conn_ID',
    fieldName: 'connection_id',
    minWidth: 100,
    maxWidth: 120,
  }
}

function successColumn(
  _rows?: { success?: number }[] // used for type check only
): IColumn {
  return {
    name: commonColumnName('result'),
    key: 'Succ',
    fieldName: 'success',
    minWidth: 50,
    maxWidth: 100,
    onRender: (rec) => (
      <ResultStatusBadge status={rec.success === 1 ? 'success' : 'error'} />
    ),
  }
}

function timestampColumn(
  _rows?: { timestamp?: number }[] // used for type check only
): IColumn {
  const key = 'Time'
  return {
    name: commonColumnName('timestamp'),
    key,
    fieldName: 'timestamp',
    minWidth: 100,
    maxWidth: 150,
    columnActionsMode: ColumnActionsMode.clickable,
    onRender: (rec) => (
      <TextWrap>
        <DateTime.Calendar unixTimestampMs={rec.timestamp * 1000} />
      </TextWrap>
    ),
  }
}

function queryTimeColumn(rows?: { query_time?: number }[]): IColumn {
  return singleNumColumn('Query_time', 's', rows)
}

function parseTimeColumn(rows?: { parse_time?: number }[]): IColumn {
  return singleNumColumn('Parse_time', 's', rows)
}

function compileTimeColumn(rows?: { compile_time?: number }[]): IColumn {
  return singleNumColumn('Compile_time', 's', rows)
}

function processTimeColumn(rows?: { process_time?: number }[]): IColumn {
  return singleNumColumn('Process_time', 's', rows)
}

function memoryColumn(rows?: { mem_max?: number }[]): IColumn {
  return singleNumColumn('Mem_max', 'bytes', rows)
}

function txnStartTsColumn(
  _rows?: { txn_start_ts?: number }[] // used for type check only
): IColumn {
  return textWithTooltipColumn('Txn_start_ts')
}

function isInternalColumn(
  _rows?: { is_internal?: number }[] // used for type check only
): IColumn {
  return {
    name: commonColumnName('is_internal'),
    key: 'Is_internal',
    fieldName: 'is_internal',
    minWidth: 50,
    maxWidth: 100,
    onRender: (rec) => (rec.is_internal === 1 ? 'Yes' : 'No'),
  }
}

function copProcColumn(
  _rows?: {
    cop_proc_avg?: number
    cop_proc_p90?: number
    cop_proc_max?: number
  }[] // used for type check only
): IColumn {
  return avgP90MaxColumn('Cop_proc', _rows)
}

function copWaitColumn(
  _rows?: {
    cop_wait_avg?: number
    cop_wait_p90?: number
    cop_wait_max?: number
  }[] // used for type check only
): IColumn {
  return avgP90MaxColumn('Cop_wait', _rows)
}

////////////////////////////////////////////////
// util methods

// FIXME: duplicated with statement
// Move to utils tableColumns
function singleNumColumn(
  columnName: string, // case-sensitive
  unit: string,
  rows?: any[]
): IColumn {
  const objFieldName = columnName.toLowerCase()
  const capacity = rows ? max(rows.map((v) => v[objFieldName])) ?? 0 : 0
  return {
    name: commonColumnName(objFieldName),
    key: columnName,
    fieldName: objFieldName,
    minWidth: 140,
    maxWidth: 200,
    columnActionsMode: ColumnActionsMode.clickable,
    onRender: (rec) => {
      const formatFn = getValueFormat(unit)
      const fmtVal =
        unit === 'short'
          ? formatFn(rec[objFieldName], 0, 1)
          : formatFn(rec[objFieldName], 1)
      return (
        <Bar textWidth={70} value={rec[objFieldName]} capacity={capacity}>
          {fmtVal}
        </Bar>
      )
    },
  }
}

function textWithTooltipColumn(
  columnName: string // case-sensitive
): IColumn {
  const objFieldName = columnName.toLowerCase()
  return {
    name: commonColumnName(objFieldName),
    key: columnName,
    fieldName: objFieldName,
    minWidth: 100,
    maxWidth: 150,
    onRender: (rec) => (
      <Tooltip title={rec[objFieldName]}>
        <TextWrap>{rec[objFieldName]}</TextWrap>
      </Tooltip>
    ),
  }
}

function avgP90MaxColumn(columnNamePrefix: string, rows?: any[]): IColumn {
  const avgFiledName = `${columnNamePrefix}_avg`.toLowerCase()
  const p90FiledName = `${columnNamePrefix}_p90`.toLowerCase()
  const maxFiledName = `${columnNamePrefix}_max`.toLowerCase()
  const capacity = rows ? max(rows.map((v) => v[maxFiledName])) ?? 0 : 0
  return {
    name: commonColumnName(avgFiledName),
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
    digestColumn(rows),
    instanceColumn(rows),
    dbColumn(rows),
    connectionIDColumn(rows),
    timestampColumn(rows),
    queryTimeColumn(rows),
    parseTimeColumn(rows),
    compileTimeColumn(rows),
    processTimeColumn(rows),
    memoryColumn(rows),
    txnStartTsColumn(rows),
    successColumn(rows),
    // detail
    textWithTooltipColumn('Prev_stmt'),
    textWithTooltipColumn('Plan'),
    // basic
    isInternalColumn(rows),
    textWithTooltipColumn('Index_names'),
    textWithTooltipColumn('Stats'),
    textWithTooltipColumn('Backoff_types'),
    // connection
    textWithTooltipColumn('User'),
    textWithTooltipColumn('Host'),
    // time
    singleNumColumn('Wait_time', 'ns', rows),
    singleNumColumn('backoff_time', 'ns', rows),
    singleNumColumn('Get_commit_ts_time', 'ns', rows),
    singleNumColumn('Local_latch_wait_time', 'ns', rows),
    singleNumColumn('Prewrite_time', 'ns', rows),
    singleNumColumn('Commit_time', 'ns', rows),
    singleNumColumn('Commit_backoff_time', 'ns', rows),
    singleNumColumn('Resolve_lock_time', 'ns', rows),
    // cop
    copProcColumn(rows),
    copWaitColumn(rows),
    // transaction
    singleNumColumn('Write_keys', 'short', rows),
    singleNumColumn('Write_size', 'bytes', rows),
    singleNumColumn('Prewrite_region', 'short', rows),
    singleNumColumn('Txn_retry', 'short', rows),
    // cop?
    singleNumColumn('Request_count', 'short', rows),
    singleNumColumn('Process_keys', 'short', rows),
    singleNumColumn('Total_keys', 'short', rows),
    textWithTooltipColumn('Cop_proc_addr'),
    textWithTooltipColumn('Cop_wait_addr'),
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
