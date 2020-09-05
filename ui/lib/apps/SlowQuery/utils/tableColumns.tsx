import { Badge } from 'antd'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { SlowquerySlowQuery } from '@lib/client'
import { IColumnKeys } from '@lib/components'
import { TableColumnFactory } from '@lib/utils/tableColumnFactory'

//////////////////////////////////////////

function ResultStatusBadge({ status }: { status: 'success' | 'error' }) {
  const { t } = useTranslation()
  return (
    <Badge status={status} text={t(`slow_query.common.status.${status}`)} />
  )
}

//////////////////////////////////////////
const TRANS_KEY_PREFIX = 'slow_query.fields'

function successColumn(
  tcf: TableColumnFactory,
  _rows?: { success?: number }[] // used for type check only
): IColumn {
  return {
    name: tcf.columnName('result'),
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
  tcf: TableColumnFactory,
  _rows?: { is_internal?: number }[] // used for type check only
): IColumn {
  const fieldName = 'is_internal'
  return {
    name: tcf.columnName(fieldName),
    key: fieldName,
    fieldName: fieldName,
    minWidth: 50,
    maxWidth: 100,
    onRender: (rec) => (rec.is_internal === 1 ? 'Yes' : 'No'),
  }
}

//////////////////////////////////////////

export function slowQueryColumns(
  rows: SlowquerySlowQuery[],
  showFullSQL?: boolean
): IColumn[] {
  const tcf = new TableColumnFactory(TRANS_KEY_PREFIX)
  return [
    tcf.sqlText('query', showFullSQL),
    tcf.textWithTooltip('digest'),
    tcf.textWithTooltip('instance'),
    tcf.textWithTooltip('db'),
    tcf.textWithTooltip('connection_id'),
    tcf.timestamp('timestamp'),

    tcf.bar.single('query_time', 's', rows),
    tcf.bar.single('parse_time', 's', rows),
    tcf.bar.single('compile_time', 's', rows),
    tcf.bar.single('process_time', 's', rows),
    tcf.bar.single('memory_max', 'bytes', rows),

    tcf.textWithTooltip('txn_start_ts'),
    successColumn(tcf, rows),
    // basic
    isInternalColumn(tcf, rows),
    tcf.textWithTooltip('index_names'),
    tcf.textWithTooltip('stats'),
    tcf.textWithTooltip('backoff_types'),
    // connection
    tcf.textWithTooltip('user'),
    tcf.textWithTooltip('host'),
    // time
    tcf.bar.single('wait_time', 'ns', rows),
    tcf.bar.single('backoff_time', 'ns', rows),
    tcf.bar.single('get_commit_ts_time', 'ns', rows),
    tcf.bar.single('local_latch_wait_time', 'ns', rows),
    tcf.bar.single('prewrite_time', 'ns', rows),
    tcf.bar.single('commit_time', 'ns', rows),
    tcf.bar.single('commit_backoff_time', 'ns', rows),
    tcf.bar.single('resolve_lock_time', 'ns', rows),
    // cop
    tcf.bar.multiple(
      {
        avg: { fieldName: 'cop_proc_avg', tooltipPrefix: 'Mean:' },
        max: {
          fieldName: 'cop_proc_max',
          tooltipPrefix: 'Max: ',
        },
        min: {
          fieldName: 'cop_proc_p90',
          tooltipPrefix: 'P90: ',
        },
      },
      'ns',
      rows
    ),
    tcf.bar.multiple(
      {
        avg: { fieldName: 'cop_wait_avg', tooltipPrefix: 'Mean:' },
        max: {
          fieldName: 'cop_wait_max',
          tooltipPrefix: 'Max: ',
        },
        min: {
          fieldName: 'cop_wait_p90',
          tooltipPrefix: 'P90: ',
        },
      },
      'ns',
      rows
    ),
    // transaction
    tcf.bar.single('write_keys', 'short', rows),
    tcf.bar.single('write_size', 'bytes', rows),
    tcf.bar.single('prewrite_region', 'short', rows),
    tcf.bar.single('txn_retry', 'short', rows),
    // cop?
    tcf.bar.single('request_count', 'short', rows),
    tcf.bar.single('process_keys', 'short', rows),
    tcf.bar.single('total_keys', 'short', rows),
    tcf.textWithTooltip('cop_proc_addr'),
    tcf.textWithTooltip('cop_wait_addr'),
  ]
}

//////////////////////////////////////////
export const SLOW_QUERY_COLUMN_REFS: { [key: string]: string[] } = {
  cop_proc_avg: ['cop_proc_avg', 'cop_proc_p90', 'cop_proc_max'],
  cop_wait_avg: ['cop_wait_avg', 'cop_wait_p90', 'cop_wait_max'],
}

export const DEF_SLOW_QUERY_COLUMN_KEYS: IColumnKeys = {
  query: true,
  timestamp: true,
  query_time: true,
  memory_max: true,
}
