import { Badge, Tooltip } from 'antd'
import { max } from 'lodash'
import {
  ColumnActionsMode,
  IColumn,
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
} from '@lib/components'
import { dummyColumn } from '@lib/utils/tableColumns'

function ResultStatusBadge({ status }: { status: 'success' | 'error' }) {
  const { t } = useTranslation()
  return (
    <Badge status={status} text={t(`slow_query.common.status.${status}`)} />
  )
}

function commonColumnName(fieldName: string): any {
  return (
    <TextWithInfo.TransKey
      transKey={`slow_query.common.columns.${fieldName}`}
    />
  )
}

// temporary not used
// function connectionIDColumn(
//   _rows?: { connection_id?: number }[] // used for type check only
// ): IColumn {
//   return {
//     name: commonColumnName('connection_id'),
//     key: 'connection_id',
//     fieldName: 'connection_id',
//     minWidth: 100,
//     maxWidth: 120,
//     isResizable: true,
//     columnActionsMode: ColumnActionsMode.disabled,
//   }
// }

function sqlColumn(
  _rows?: { query?: string }[], // used for type check only
  showFullSQL?: boolean
): IColumn {
  return {
    name: commonColumnName('sql'),
    key: 'sql',
    fieldName: 'sql',
    minWidth: 200,
    maxWidth: 500,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
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
  return {
    name: commonColumnName('digest'),
    key: 'Digest',
    fieldName: 'digest',
    minWidth: 100,
    maxWidth: 150,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
    onRender: (rec) => (
      <Tooltip title={rec.digest}>
        <TextWrap>{rec.digest}</TextWrap>
      </Tooltip>
    ),
  }
}

function instanceColumn(
  _rows?: { instance?: string }[] // used for type check only
): IColumn {
  return {
    name: commonColumnName('instance'),
    key: 'instance',
    fieldName: 'instance',
    minWidth: 100,
    maxWidth: 150,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
    onRender: (rec) => (
      <Tooltip title={rec.instance}>
        <TextWrap>{rec.instance}</TextWrap>
      </Tooltip>
    ),
  }
}

function dbColumn(
  _rows?: { db?: string }[] // used for type check only
): IColumn {
  return {
    name: commonColumnName('db'),
    key: 'DB',
    fieldName: 'db',
    minWidth: 100,
    maxWidth: 150,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
    onRender: (rec) => (
      <Tooltip title={rec.db}>
        <TextWrap>{rec.db}</TextWrap>
      </Tooltip>
    ),
  }
}

function successColumn(
  _rows?: { success?: number }[] // used for type check only
): IColumn {
  // !! Don't call `useTranslation()` directly to avoid this method become the custom hook
  // !! So we can use this inside the useMemo(), useEffect() and useState(()=>{...})
  // const { t } = useTranslation()
  return {
    name: commonColumnName('result'),
    key: 'Succ',
    fieldName: 'success',
    minWidth: 100,
    maxWidth: 150,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
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
    isResizable: true,
    onRender: (rec) => (
      <TextWrap>
        <DateTime.Calendar unixTimestampMs={rec.timestamp * 1000} />
      </TextWrap>
    ),
  }
}

function queryTimeColumn(rows?: { query_time?: number }[]): IColumn {
  const capacity = rows ? max(rows.map((v) => v.query_time)) ?? 0 : 0
  const key = 'Query_time'
  return {
    name: commonColumnName('query_time'),
    key,
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

function parseTimeColumn(rows?: { parse_time?: number }[]): IColumn {
  const capacity = rows ? max(rows.map((v) => v.parse_time)) ?? 0 : 0
  const key = 'Parse_time'
  return {
    name: commonColumnName('parse_time'),
    key,
    fieldName: 'parse_time',
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    onRender: (rec) => (
      <Bar textWidth={70} value={rec.parse_time} capacity={capacity}>
        {getValueFormat('s')(rec.parse_time, 1)}
      </Bar>
    ),
  }
}

function compileTimeColumn(rows?: { compile_time?: number }[]): IColumn {
  const capacity = rows ? max(rows.map((v) => v.compile_time)) ?? 0 : 0
  const key = 'Compile_time'
  return {
    name: commonColumnName('compile_time'),
    key,
    fieldName: 'compile_time',
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    onRender: (rec) => (
      <Bar textWidth={70} value={rec.compile_time} capacity={capacity}>
        {getValueFormat('s')(rec.compile_time, 1)}
      </Bar>
    ),
  }
}

function processTimeColumn(rows?: { process_time?: number }[]): IColumn {
  const capacity = rows ? max(rows.map((v) => v.process_time)) ?? 0 : 0
  const key = 'Process_time'
  return {
    name: commonColumnName('process_time'),
    key,
    fieldName: 'process_time',
    minWidth: 140,
    maxWidth: 200,
    isResizable: true,
    onRender: (rec) => (
      <Bar textWidth={70} value={rec.process_time} capacity={capacity}>
        {getValueFormat('s')(rec.process_time, 1)}
      </Bar>
    ),
  }
}

function memoryColumn(rows?: { memory_max?: number }[]): IColumn {
  const capacity = rows ? max(rows.map((v) => v.memory_max)) ?? 0 : 0
  const key = 'Mem_max'
  return {
    name: commonColumnName('memory_max'),
    key,
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

function txnStartTsColumn(
  _rows?: { txn_start_ts?: number }[] // used for type check only
): IColumn {
  return {
    name: commonColumnName('txn_start_ts'),
    key: 'Txn_start_ts',
    fieldName: 'txn_start_ts',
    minWidth: 100,
    maxWidth: 150,
    isResizable: true,
    columnActionsMode: ColumnActionsMode.disabled,
    onRender: (rec) => (
      <Tooltip title={rec.txn_start_ts}>
        <TextWrap>{rec.txn_start_ts}</TextWrap>
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
    successColumn(rows),
    timestampColumn(rows),
    queryTimeColumn(rows),
    parseTimeColumn(rows),
    compileTimeColumn(rows),
    processTimeColumn(rows),
    memoryColumn(rows),
    txnStartTsColumn(rows),
    dummyColumn(),
  ]
}
