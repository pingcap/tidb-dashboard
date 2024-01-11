import { Badge } from 'antd'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { SlowqueryModel } from '@lib/client'
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

export const derivedFields = {
  cop_proc_avg: [
    { tooltipPrefix: 'mean', fieldName: 'cop_proc_avg' },
    { tooltipPrefix: 'max', fieldName: 'cop_proc_max' },
    { tooltipPrefix: 'p90', fieldName: 'cop_proc_p90' }
  ],
  cop_wait_avg: [
    { tooltipPrefix: 'mean', fieldName: 'cop_wait_avg' },
    { tooltipPrefix: 'max', fieldName: 'cop_wait_max' },
    { tooltipPrefix: 'p90', fieldName: 'cop_wait_p90' }
  ]
}

//////////////////////////////////////////

export function slowQueryColumns(
  rows: SlowqueryModel[],
  tableSchemaColumns: string[],
  showFullSQL?: boolean
): IColumn[] {
  const tcf = new TableColumnFactory(TRANS_KEY_PREFIX, tableSchemaColumns)
  return tcf.columns([
    tcf.sqlText('query', showFullSQL, rows),
    tcf.textWithTooltip('digest', rows),
    tcf.textWithTooltip('instance', rows),
    tcf.textWithTooltip('db', rows),
    tcf.textWithTooltip('connection_id', rows),
    tcf.timestamp('timestamp', rows),

    tcf.bar.single('query_time', 's', rows),
    tcf.bar.single('parse_time', 's', rows),
    tcf.bar.single('compile_time', 's', rows),
    tcf.bar.single('process_time', 's', rows),
    tcf.bar.single('memory_max', 'bytes', rows),
    tcf.bar.single('disk_max', 'bytes', rows),

    tcf.textWithTooltip('txn_start_ts', rows),
    // success columnn
    tcf.textWithTooltip('success', rows).patchConfig({
      name: 'result',
      minWidth: 50,
      maxWidth: 100,
      onRender: (rec) => (
        <ResultStatusBadge status={rec.success === 1 ? 'success' : 'error'} />
      )
    }),

    // basic
    // is_internal column
    tcf.textWithTooltip('is_internal', rows).patchConfig({
      minWidth: 50,
      maxWidth: 100,
      onRender: (rec) => (rec.is_internal === 1 ? 'Yes' : 'No')
    }),
    tcf.textWithTooltip('index_names', rows),
    tcf.textWithTooltip('stats', rows),
    tcf.textWithTooltip('backoff_types', rows),
    // connection
    tcf.textWithTooltip('user', rows),
    tcf.textWithTooltip('host', rows),
    // time
    tcf.bar.single('wait_time', 's', rows),
    tcf.bar.single('backoff_time', 's', rows),
    tcf.bar.single('get_commit_ts_time', 's', rows),
    tcf.bar.single('local_latch_wait_time', 's', rows),
    tcf.bar.single('prewrite_time', 's', rows),
    tcf.bar.single('commit_time', 's', rows),
    tcf.bar.single('commit_backoff_time', 's', rows),
    tcf.bar.single('resolve_lock_time', 's', rows),
    // cop
    tcf.bar.multiple({ sources: derivedFields.cop_proc_avg }, 's', rows),
    tcf.bar.multiple({ sources: derivedFields.cop_wait_avg }, 's', rows),
    // transaction
    tcf.bar.single('write_keys', 'short', rows),
    tcf.bar.single('write_size', 'bytes', rows),
    tcf.bar.single('prewrite_region', 'short', rows),
    tcf.bar.single('txn_retry', 'short', rows),
    // cop?
    tcf.bar.single('request_count', 'short', rows),
    tcf.bar.single('process_keys', 'short', rows),
    tcf.bar.single('total_keys', 'short', rows),
    tcf.textWithTooltip('cop_proc_addr', rows),
    tcf.textWithTooltip('cop_wait_addr', rows),
    // rocksdb
    tcf.bar.single('rocksdb_delete_skipped_count', 'short', rows).patchConfig({
      minWidth: 220,
      maxWidth: 250
    }),
    tcf.bar.single('rocksdb_key_skipped_count', 'short', rows).patchConfig({
      minWidth: 220,
      maxWidth: 250
    }),
    tcf.bar.single('rocksdb_block_cache_hit_count', 'short', rows).patchConfig({
      minWidth: 220,
      maxWidth: 250
    }),
    tcf.bar.single('rocksdb_block_read_count', 'short', rows).patchConfig({
      minWidth: 220,
      maxWidth: 250
    }),
    tcf.bar.single('rocksdb_block_read_byte', 'bytes', rows).patchConfig({
      minWidth: 220,
      maxWidth: 250
    }),
    // resource control
    tcf.bar.single('ru', 'none', rows),
    tcf.textWithTooltip('resource_group', rows),
    tcf.bar.single('time_queued_by_rc', 's', rows)
  ])
}
