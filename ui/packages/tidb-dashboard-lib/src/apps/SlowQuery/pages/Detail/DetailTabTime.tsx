import React from 'react'
import { SlowqueryModel } from '@lib/client'
import { Typography } from 'antd'
import { TFunction } from 'react-i18next'

export const tabTimeItems = (data: SlowqueryModel, t: TFunction) => {
  return [
    {
      key: 'query_time2',
      keyDisplay: (
        <Typography.Text strong>
          {t('slow_query.fields.query_time2')}
        </Typography.Text>
      ),
      value: data.query_time! * 10e8,
      indentLevel: 0
    },
    {
      key: 'parse_time',
      value: data.parse_time! * 10e8,
      indentLevel: 1
    },
    {
      key: 'compile_time',
      value: data.compile_time! * 10e8,
      indentLevel: 1
    },
    {
      key: 'rewrite_time',
      value: data.rewrite_time! * 10e8,
      indentLevel: 2
    },
    {
      key: 'preproc_subqueries_time',
      value: data.preproc_subqueries_time! * 10e8,
      indentLevel: 3
    },
    {
      key: 'optimize_time',
      value: data.optimize_time! * 10e8,
      indentLevel: 2
    },
    {
      key: 'cop_time',
      value: data.cop_time! * 10e8,
      indentLevel: 1
    },
    {
      key: 'wait_time',
      value: data.wait_time! * 10e8,
      indentLevel: 2
    },
    {
      key: 'process_time',
      value: data.process_time! * 10e8,
      indentLevel: 2
    },
    {
      key: 'local_latch_wait_time',
      value: data.local_latch_wait_time! * 10e8,
      indentLevel: 1
    },
    {
      key: 'lock_keys_time',
      value: data.lock_keys_time! * 10e8,
      indentLevel: 1
    },
    {
      key: 'resolve_lock_time',
      value: data.resolve_lock_time! * 10e8,
      indentLevel: 1
    },
    {
      key: 'wait_ts',
      value: data.wait_ts! * 10e8,
      indentLevel: 1
    },
    {
      key: 'get_commit_ts_time',
      value: data.get_commit_ts_time! * 10e8,
      indentLevel: 1
    },
    {
      key: 'prewrite_time',
      value: data.prewrite_time! * 10e8,
      indentLevel: 1
    },
    {
      key: 'commit_time',
      value: data.commit_time! * 10e8,
      indentLevel: 1
    },
    {
      key: 'backoff_time',
      value: data.backoff_time! * 10e8,
      indentLevel: 1
    },
    {
      key: 'commit_backoff_time',
      value: data.commit_backoff_time! * 10e8,
      indentLevel: 1
    },
    {
      key: 'exec_retry_time',
      value: data.exec_retry_time! * 10e8,
      indentLevel: 1
    },
    {
      key: 'write_sql_response_total',
      value: data.write_sql_response_total! * 10e8,
      indentLevel: 1
    },
    {
      key: 'wait_prewrite_binlog_time',
      value: data.wait_prewrite_binlog_time! * 10e8,
      indentLevel: 1
    },
    {
      key: 'time_queued_by_rc',
      value: data.time_queued_by_rc! * 10e8,
      indentLevel: 1
    }
  ]
}
