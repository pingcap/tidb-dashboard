import { Tooltip } from 'antd'
import { max } from 'lodash'
import {
  ColumnActionsMode,
  IColumn,
} from 'office-ui-fabric-react/lib/DetailsList'
import React from 'react'
import { orange, red } from '@ant-design/colors'

import { StatementModel } from '@lib/client'
import { Bar, Pre } from '@lib/components'
import {
  TableColumnFactory,
  formatVal,
  IColumnWithSourceFields,
} from '@lib/utils/tableColumnFactory'

///////////////////////////////////////
// statements order list in local by fieldName of IColumn
// slow query order list in backend by key of IColumn
const TRANS_KEY_PREFIX = 'statement.fields'

function avgMinMaxLatencyColumn(
  tcf: TableColumnFactory,
  rows?: { max_latency?: number; min_latency?: number; avg_latency?: number }[]
): IColumn {
  return tcf.bar.multiple(
    {
      bars: [
        { mean: 'avg_latency' },
        { max: 'max_latency' },
        { min: 'min_latency' },
      ],
    },
    'ns',
    rows
  )
}

function errorsWarningsColumn(
  tcf: TableColumnFactory,
  rows?: { sum_errors?: number; sum_warnings?: number }[]
): IColumnWithSourceFields {
  const capacity = rows
    ? max(rows.map((v) => v.sum_errors! + v.sum_warnings!)) ?? 0
    : 0
  const key = 'sum_errors'
  return {
    name: tcf.columnName('errors_warnings'),
    key,
    fieldName: key,
    sourceFields: ['sum_errors', 'sum_warnings'],
    minWidth: 140,
    maxWidth: 200,
    columnActionsMode: ColumnActionsMode.clickable,
    onRender: (rec) => {
      const errorsFmtVal = formatVal(rec.sum_errors, 'short')
      const warningsFmtVal = formatVal(rec.sum_warnings, 'short')
      const tooltipContent = `
Errors:   ${errorsFmtVal}
Warnings: ${warningsFmtVal}`
      return (
        <Tooltip title={<Pre>{tooltipContent.trim()}</Pre>}>
          <Bar
            textWidth={70}
            value={[rec.sum_errors, rec.sum_warnings]}
            colors={[red[4], orange[4]]}
            capacity={capacity}
          >
            {`${errorsFmtVal} / ${warningsFmtVal}`}
          </Bar>
        </Tooltip>
      )
    },
  }
}

////////////////////////////////////////////////
// util methods

function avgMaxColumn<T>(
  tcf: TableColumnFactory,
  avgKey: keyof T,
  maxKey: keyof T,
  displayTransKey: string,
  unit: string,
  rows?: T[]
): IColumn {
  return tcf.bar.multiple(
    {
      displayTransKey,
      bars: [{ mean: avgKey }, { max: maxKey }],
    },
    unit,
    rows
  )
}

////////////////////////////////////////////////

export function statementColumns(
  rows: StatementModel[],
  showFullSQL?: boolean
): IColumnWithSourceFields[] {
  const tcf = new TableColumnFactory(TRANS_KEY_PREFIX)

  return [
    tcf.sqlText('digest_text', showFullSQL, rows),
    tcf.textWithTooltip('digest', rows),
    tcf.bar.single('sum_latency', 'ns', rows),
    avgMinMaxLatencyColumn(tcf, rows),
    tcf.bar.single('exec_count', 'short', rows),
    {
      ...tcf.textWithTooltip('plan_count', rows),
      minWidth: 100,
      maxWidth: 300,
      columnActionsMode: ColumnActionsMode.clickable,
    },
    avgMaxColumn(tcf, 'avg_mem', 'max_mem', 'avg_mem', 'bytes', rows),
    errorsWarningsColumn(tcf, rows),
    avgMaxColumn(
      tcf,
      'avg_parse_latency',
      'max_parse_latency',
      'parse_latency',
      'ns',
      rows
    ),
    avgMaxColumn(
      tcf,
      'avg_compile_latency',
      'max_compile_latency',
      'compile_latency',
      'ns',
      rows
    ),
    tcf.bar.single('sum_cop_task_num', 'short', rows),
    avgMaxColumn(
      tcf,
      'avg_cop_process_time',
      'max_cop_process_time',
      'process_time',
      'ns',
      rows
    ),
    avgMaxColumn(
      tcf,
      'avg_cop_wait_time',
      'max_cop_wait_time',
      'wait_time',
      'ns',
      rows
    ),
    avgMaxColumn(
      tcf,
      'avg_process_time',
      'max_process_time',
      'total_process_time',
      'ns',
      rows
    ),
    avgMaxColumn(
      tcf,
      'avg_wait_time',
      'max_wait_time',
      'total_wait_time',
      'ns',
      rows
    ),
    avgMaxColumn(
      tcf,
      'avg_backoff_time',
      'max_backoff_time',
      'backoff_time',
      'ns',
      rows
    ),
    avgMaxColumn(
      tcf,
      'avg_write_keys',
      'max_write_keys',
      'avg_write_keys',
      'short',
      rows
    ),
    avgMaxColumn(
      tcf,
      'avg_processed_keys',
      'max_processed_keys',
      'avg_processed_keys',
      'short',
      rows
    ),
    avgMaxColumn(
      tcf,
      'avg_total_keys',
      'max_total_keys',
      'avg_total_keys',
      'short',
      rows
    ),
    avgMaxColumn(
      tcf,
      'avg_prewrite_time',
      'max_prewrite_time',
      'prewrite_time',
      'ns',
      rows
    ),
    avgMaxColumn(
      tcf,
      'avg_commit_time',
      'max_commit_time',
      'commit_time',
      'ns',
      rows
    ),
    avgMaxColumn(
      tcf,
      'avg_get_commit_ts_time',
      'max_get_commit_ts_time',
      'get_commit_ts_time',
      'ns',
      rows
    ),
    avgMaxColumn(
      tcf,
      'avg_commit_backoff_time',
      'max_commit_backoff_time',
      'commit_backoff_time',
      'ns',
      rows
    ),
    avgMaxColumn(
      tcf,
      'avg_resolve_lock_time',
      'max_resolve_lock_time',
      'resolve_lock_time',
      'ns',
      rows
    ),
    avgMaxColumn(
      tcf,
      'avg_local_latch_wait_time',
      'max_local_latch_wait_time',
      'local_latch_wait_time',
      'ns',
      rows
    ),
    avgMaxColumn(
      tcf,
      'avg_write_size',
      'max_write_size',
      'avg_write_size',
      'bytes',
      rows
    ),
    avgMaxColumn(
      tcf,
      'avg_prewrite_regions',
      'max_prewrite_regions',
      'avg_prewrite_regions',
      'short',
      rows
    ),
    avgMaxColumn(
      tcf,
      'avg_txn_retry',
      'max_txn_retry',
      'avg_txn_retry',
      'short',
      rows
    ),

    tcf.bar.single('sum_backoff_times', 'short', rows),
    tcf.bar.single('avg_affected_rows', 'short', rows),

    tcf.timestamp('first_seen', rows),
    tcf.timestamp('last_seen', rows),
    tcf.textWithTooltip('sample_user', rows),

    tcf.sqlText('query_sample_text', showFullSQL, rows),
    tcf.sqlText('prev_sample_text', showFullSQL, rows),

    tcf.textWithTooltip('schema_name', rows),
    tcf.textWithTooltip('table_names', rows),
    tcf.textWithTooltip('index_names', rows),

    tcf.textWithTooltip('plan_digest', rows),

    {
      ...tcf.textWithTooltip('related_schemas', rows),
      minWidth: 160,
      maxWidth: 240,
      sourceFields: ['table_names'],
    },
  ]
}

export function planColumns(rows: StatementModel[]): IColumn[] {
  const tcf = new TableColumnFactory(TRANS_KEY_PREFIX)

  return [
    {
      ...tcf.textWithTooltip('plan_digest'),
      minWidth: 100,
      maxWidth: 300,
    },
    tcf.bar.single('sum_latency', 'ns', rows),
    avgMinMaxLatencyColumn(tcf, rows),
    tcf.bar.single('exec_count', 'short', rows),
    avgMaxColumn(tcf, 'avg_mem', 'max_mem', 'avg_mem', 'bytes', rows),
  ]
}
