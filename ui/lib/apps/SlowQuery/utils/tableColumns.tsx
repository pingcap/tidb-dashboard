import { Badge } from 'antd'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { SlowquerySlowQuery } from '@lib/client'
import { IColumnKeys } from '@lib/components'
import {
  TableColumnFactory,
  commonColumnName,
} from '@lib/utils/tableColumnFactory'

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

//////////////////////////////////////////

export function slowQueryColumns(
  rows: SlowquerySlowQuery[],
  showFullSQL?: boolean
): IColumn[] {
  const columnFactory = new TableColumnFactory(TRANS_KEY_PREFIX)
  return [
    columnFactory.sqlText('query', showFullSQL),
    columnFactory.textWithTooltip('digest'),
    columnFactory.textWithTooltip('instance'),
    columnFactory.textWithTooltip('db'),
    columnFactory.textWithTooltip('connection_id'),
    columnFactory.timestamp('timestamp'),

    columnFactory.bar.single('query_time', 's', rows),
    columnFactory.bar.single('parse_time', 's', rows),
    columnFactory.bar.single('compile_time', 's', rows),
    columnFactory.bar.single('process_time', 's', rows),
    columnFactory.bar.single('memory_max', 'bytes', rows),

    columnFactory.textWithTooltip('txn_start_ts'),
    successColumn(rows),
    // basic
    isInternalColumn(rows),
    columnFactory.textWithTooltip('index_names'),
    columnFactory.textWithTooltip('stats'),
    columnFactory.textWithTooltip('backoff_types'),
    // connection
    columnFactory.textWithTooltip('user'),
    columnFactory.textWithTooltip('host'),
    // time
    columnFactory.bar.single('wait_time', 'ns', rows),
    columnFactory.bar.single('backoff_time', 'ns', rows),
    columnFactory.bar.single('get_commit_ts_time', 'ns', rows),
    columnFactory.bar.single('local_latch_wait_time', 'ns', rows),
    columnFactory.bar.single('prewrite_time', 'ns', rows),
    columnFactory.bar.single('commit_time', 'ns', rows),
    columnFactory.bar.single('commit_backoff_time', 'ns', rows),
    columnFactory.bar.single('resolve_lock_time', 'ns', rows),
    // cop
    columnFactory.bar.multiple(
      'ns',
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
      rows
    ),
    columnFactory.bar.multiple(
      'ns',
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
      rows
    ),
    // transaction
    columnFactory.bar.single('write_keys', 'short', rows),
    columnFactory.bar.single('write_size', 'bytes', rows),
    columnFactory.bar.single('prewrite_region', 'short', rows),
    columnFactory.bar.single('txn_retry', 'short', rows),
    // cop?
    columnFactory.bar.single('request_count', 'short', rows),
    columnFactory.bar.single('process_keys', 'short', rows),
    columnFactory.bar.single('total_keys', 'short', rows),
    columnFactory.textWithTooltip('cop_proc_addr'),
    columnFactory.textWithTooltip('cop_wait_addr'),
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
