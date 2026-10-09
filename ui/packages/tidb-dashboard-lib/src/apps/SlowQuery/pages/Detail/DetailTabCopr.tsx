import React from 'react'
import { Tooltip, Typography } from 'antd'
import { TFunction } from 'react-i18next'
import { getValueFormat } from '@baurine/grafana-value-formats'

import { SlowqueryModel } from '@lib/client'
import { Pre, ValueWithTooltip } from '@lib/components'
import {
  parseReadPoolTaskDetails,
  ReadPoolAggregate
} from './readPoolTaskDetails'

function readPoolValue(value?: number | string) {
  if (value === undefined || value === '') return '—'
  return typeof value === 'number'
    ? getValueFormat('short')(value, 0, 1)
    : value
}

type ReadPoolMetric = readonly [string, ReadPoolAggregate | undefined]

function readPoolStats(aggregate: ReadPoolAggregate, t: TFunction) {
  return (['total', 'avg', 'max', 'min'] as const)
    .filter((key) => aggregate[key] !== undefined)
    .map(
      (key) => `${t(`slow_query.detail.read_pool.${key}`)}: ${aggregate[key]}`
    )
    .join('\n')
}

function readPoolSummary(
  metrics: ReadPoolMetric[],
  t: TFunction,
  key: string,
  prefix?: string
) {
  const summary = prefix ? [prefix] : []
  const stats = prefix ? [prefix] : []
  for (const [metric, aggregate] of metrics) {
    if (!aggregate) continue
    const label = t(`slow_query.fields.read_pool_${metric}`)
    summary.push(`${label}: ${readPoolValue(aggregate.total)}`)
    stats.push(`${label}\n${readPoolStats(aggregate, t)}`)
  }
  if (!summary.length) return undefined
  return (
    <Tooltip
      title={<Pre>{stats.join('\n\n')}</Pre>}
      trigger={['hover', 'focus']}
      overlayStyle={{ maxWidth: 520 }}
    >
      <span
        tabIndex={0}
        data-e2e={key}
        style={{
          display: 'block',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {summary.join(' · ')}
      </span>
    </Tooltip>
  )
}

/** Keep pool counters and timings in at most two native Coprocessor detail rows. */
export function tabReadPoolItems(data: SlowqueryModel, t: TFunction) {
  const details = parseReadPoolTaskDetails(data.read_pool_task_details)
  if (!details) return []

  const counters: ReadPoolMetric[] = [
    ['poll_count', details.poll_count],
    ['dispatch_count', details.dispatch_count],
    ['waited_task_slices', details.fair_queue?.waited_task_slices]
  ]
  const timings: ReadPoolMetric[] = [
    ['queue_wait', details.queue_wait],
    ['wake_wait', details.wake_wait],
    ['poll_cpu', details.poll_cpu],
    ['poll_wall', details.poll_wall]
  ]
  const fairQueue = details.fair_queue?.enabled
  const fairQueueSummary =
    fairQueue === undefined
      ? undefined
      : `${t('slow_query.fields.read_pool_fair_queue')}: ${t(
          `slow_query.detail.read_pool.${fairQueue ? 'enabled' : 'disabled'}`
        )}`
  const items = [
    {
      key: 'read_pool_tasks',
      keyDisplay: (
        <Typography.Text>
          {t('slow_query.fields.read_pool_tasks')}
        </Typography.Text>
      ),
      value: (
        <Tooltip title={details.tasks}>
          <span>{readPoolValue(details.tasks)}</span>
        </Tooltip>
      ),
      description: readPoolSummary(
        counters,
        t,
        'read_pool_counters_summary',
        fairQueueSummary
      ),
      indentLevel: 0
    }
  ]
  if (details.task_wall_time || timings.some(([, aggregate]) => aggregate)) {
    items.push({
      key: 'read_pool_task_wall_time',
      keyDisplay: (
        <span>{t('slow_query.fields.read_pool_task_wall_time')}</span>
      ),
      value: (
        <Tooltip
          title={
            details.task_wall_time && (
              <Pre>{readPoolStats(details.task_wall_time, t)}</Pre>
            )
          }
          trigger={['hover', 'focus']}
        >
          <span tabIndex={0} data-e2e="read_pool_task_wall_time_value">
            {readPoolValue(details.task_wall_time?.total)}
          </span>
        </Tooltip>
      ),
      description: readPoolSummary(timings, t, 'read_pool_timings_summary'),
      indentLevel: 1
    })
  }
  return items
}

export const tabCoprItems = (data: SlowqueryModel) => [
  {
    key: 'request_count',
    value: <ValueWithTooltip.Short value={data.request_count} />
  },
  {
    key: 'process_keys',
    value: <ValueWithTooltip.Short value={data.process_keys} />
  },
  {
    key: 'total_keys',
    value: <ValueWithTooltip.Short value={data.total_keys} />
  },
  {
    key: 'cop_proc_addr',
    value: data.cop_proc_addr
  },
  {
    key: 'cop_wait_addr',
    value: data.cop_wait_addr
  },
  {
    key: 'rocksdb_block_cache_hit_count',
    value: <ValueWithTooltip.Short value={data.rocksdb_block_cache_hit_count} />
  },
  {
    key: 'rocksdb_block_read_byte',
    value: <ValueWithTooltip.ScaledBytes value={data.rocksdb_block_read_byte} />
  },
  {
    key: 'rocksdb_block_read_count',
    value: <ValueWithTooltip.Short value={data.rocksdb_block_read_count} />
  },
  {
    key: 'rocksdb_delete_skipped_count',
    value: <ValueWithTooltip.Short value={data.rocksdb_delete_skipped_count} />
  },
  {
    key: 'rocksdb_key_skipped_count',
    value: <ValueWithTooltip.Short value={data.rocksdb_key_skipped_count} />
  },
  {
    key: 'unpacked_bytes_sent_tikv_total',
    value: (
      <ValueWithTooltip.ScaledBytes
        value={data.unpacked_bytes_sent_tikv_total}
      />
    )
  },
  {
    key: 'unpacked_bytes_received_tikv_total',
    value: (
      <ValueWithTooltip.ScaledBytes
        value={data.unpacked_bytes_received_tikv_total}
      />
    )
  },
  {
    key: 'unpacked_bytes_sent_tikv_cross_zone',
    value: (
      <ValueWithTooltip.ScaledBytes
        value={data.unpacked_bytes_sent_tikv_cross_zone}
      />
    )
  },
  {
    key: 'unpacked_bytes_received_tikv_cross_zone',
    value: (
      <ValueWithTooltip.ScaledBytes
        value={data.unpacked_bytes_received_tikv_cross_zone}
      />
    )
  },
  {
    key: 'unpacked_bytes_sent_tiflash_total',
    value: (
      <ValueWithTooltip.ScaledBytes
        value={data.unpacked_bytes_sent_tiflash_total}
      />
    )
  },
  {
    key: 'unpacked_bytes_received_tiflash_total',
    value: (
      <ValueWithTooltip.ScaledBytes
        value={data.unpacked_bytes_received_tiflash_total}
      />
    )
  },
  {
    key: 'unpacked_bytes_sent_tiflash_cross_zone',
    value: (
      <ValueWithTooltip.ScaledBytes
        value={data.unpacked_bytes_sent_tiflash_cross_zone}
      />
    )
  },
  {
    key: 'unpacked_bytes_received_tiflash_cross_zone',
    value: (
      <ValueWithTooltip.ScaledBytes
        value={data.unpacked_bytes_received_tiflash_cross_zone}
      />
    )
  },
  {
    key: 'ia_remote_read_segment_size',
    value: (
      <ValueWithTooltip.ScaledBytes value={data.ia_remote_read_segment_size} />
    )
  }
]
