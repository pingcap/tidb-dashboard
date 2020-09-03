import { Badge, Tooltip } from 'antd'
import { max } from 'lodash'
import {
  IColumn,
  ColumnActionsMode,
} from 'office-ui-fabric-react/lib/DetailsList'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { getValueFormat } from '@baurine/grafana-value-formats'

import { SlowqueryBase } from '@lib/client'
import {
  Bar,
  DateTime,
  HighlightSQL,
  TextWithInfo,
  TextWrap,
  IColumnKeys,
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
    fieldName: 'query', // fieldName is used for sort
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

//////////////////////////////////////////

export function slowQueryColumns(
  rows: SlowqueryBase[],
  showFullSQL?: boolean
): IColumn[] {
  return [
    sqlColumn(rows, showFullSQL),
    digestColumn(rows),
    instanceColumn(rows),
    dbColumn(rows),
    timestampColumn(rows),
    queryTimeColumn(rows),
    parseTimeColumn(rows),
    compileTimeColumn(rows),
    processTimeColumn(rows),
    memoryColumn(rows),
    txnStartTsColumn(rows),
    successColumn(rows),
  ]
}

//////////////////////////////////////////
// Notice:
// The keys in the following object are case-senstive.
// They should keep the same as the column name in the slow query table
// Ref: pkg/apiserver/slowquery/queries.go SlowQuery struct

export const DEF_SLOW_QUERY_COLUMN_KEYS: IColumnKeys = {
  Query: true,
  Time: true,
  Query_time: true,
  Mem_max: true,
}
