import React, { useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import ReactJson from 'react-json-view'
import { Table, Typography } from 'antd'

import { SlowqueryModel } from '@lib/client'
import { valueColumns, timeValueColumns } from '@lib/utils/tableColumns'
import { CardTabs, CardTable } from '@lib/components'

import { tabBasicItems } from './DetailTabBasic'
import { tabTimeItems } from './DetailTabTime'
import { tabCoprItems } from './DetailTabCopr'
import { tabTxnItems } from './DetailTabTxn'
import { useSchemaColumns } from '../../utils/useSchemaColumns'
import { SlowQueryContext } from '../../context'

type SlowqueryModelWithSessionConnectAttrs = SlowqueryModel & {
  session_connect_attrs?: string | null
}

type ReadPoolAggregate = {
  total?: number | string
  avg?: number | string
  max?: number | string
  min?: number | string
}

type ReadPoolTaskDetails = {
  tasks?: number | string
  poll_count?: ReadPoolAggregate
  dispatch_count?: ReadPoolAggregate
  task_wall_time?: ReadPoolAggregate
  queue_wait?: ReadPoolAggregate
  wake_wait?: ReadPoolAggregate
  fair_queue?: {
    enabled?: boolean
    waited_task_slices?: ReadPoolAggregate
  }
  poll_cpu?: ReadPoolAggregate
  poll_wall?: ReadPoolAggregate
}

type SlowqueryModelWithReadPool = SlowqueryModel & {
  read_pool_task_details?: ReadPoolTaskDetails | string | null
}

function getSessionConnectAttrsRaw(data: SlowqueryModel) {
  return (data as SlowqueryModelWithSessionConnectAttrs).session_connect_attrs
}

function parseSessionConnectAttrs(raw?: string | null) {
  if (!raw || raw === 'null') {
    return null
  }
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function parseReadPoolTaskDetails(
  data: SlowqueryModel
): ReadPoolTaskDetails | null {
  const raw = (data as SlowqueryModelWithReadPool).read_pool_task_details
  if (!raw) return null
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw) as ReadPoolTaskDetails
  } catch {
    return null
  }
}

function readPoolValue(value?: number | string) {
  return value === undefined || value === null || value === '' ? '—' : value
}

function ReadPoolDetails({ data }: { data: SlowqueryModel }) {
  const { t } = useTranslation()
  const details = parseReadPoolTaskDetails(data)
  if (!details) return null

  const aggregateRows = [
    ['poll_count', details.poll_count],
    ['dispatch_count', details.dispatch_count],
    ['task_wall_time', details.task_wall_time],
    ['queue_wait', details.queue_wait],
    ['wake_wait', details.wake_wait],
    ['waited_task_slices', details.fair_queue?.waited_task_slices],
    ['poll_cpu', details.poll_cpu],
    ['poll_wall', details.poll_wall]
  ] as const

  const rows = aggregateRows
    .filter(([, value]) => value != null)
    .map(([metric, value]) => ({
      key: metric,
      metric: t(`slow_query.detail.read_pool.metrics.${metric}`),
      total: readPoolValue(value?.total),
      avg: readPoolValue(value?.avg),
      max: readPoolValue(value?.max),
      min: readPoolValue(value?.min)
    }))

  return (
    <div style={{ marginTop: 24 }}>
      <Typography.Title level={5} style={{ marginBottom: 12 }}>
        {t('slow_query.detail.read_pool.title')}
      </Typography.Title>
      <Typography.Text type="secondary">
        {t('slow_query.detail.read_pool.tasks', {
          count: readPoolValue(details.tasks)
        })}
        {details.fair_queue?.enabled !== undefined &&
          ` · ${t('slow_query.detail.read_pool.fair_queue', {
            enabled: details.fair_queue.enabled
              ? t('slow_query.detail.read_pool.enabled')
              : t('slow_query.detail.read_pool.disabled')
          })}`}
      </Typography.Text>
      <Table
        style={{ marginTop: 12 }}
        size="small"
        pagination={false}
        rowKey="key"
        dataSource={rows}
        columns={[
          {
            title: t('slow_query.detail.read_pool.metric'),
            dataIndex: 'metric',
            key: 'metric'
          },
          {
            title: t('slow_query.detail.read_pool.total'),
            dataIndex: 'total',
            key: 'total'
          },
          {
            title: t('slow_query.detail.read_pool.avg'),
            dataIndex: 'avg',
            key: 'avg'
          },
          {
            title: t('slow_query.detail.read_pool.max'),
            dataIndex: 'max',
            key: 'max'
          },
          {
            title: t('slow_query.detail.read_pool.min'),
            dataIndex: 'min',
            key: 'min'
          }
        ]}
      />
    </div>
  )
}

export default function DetailTabs({ data }: { data: SlowqueryModel }) {
  const ctx = useContext(SlowQueryContext)

  const { t } = useTranslation()
  const { schemaColumns } = useSchemaColumns(
    ctx!.ds.slowQueryAvailableFieldsGet
  )

  const tabs = useMemo(() => {
    const tbs = [
      {
        key: 'basic',
        title: t('slow_query.detail.tabs.basic'),
        content: () => {
          const items = tabBasicItems(data)
          const columns = valueColumns('slow_query.fields.')
          return (
            <CardTable
              cardNoMargin
              columns={columns}
              items={items}
              extendLastColumn
              data-e2e="details_list"
            />
          )
        }
      },
      {
        key: 'time',
        title: t('slow_query.detail.tabs.time'),
        content: () => {
          const items = tabTimeItems(data, t)
          const columns = timeValueColumns('slow_query.fields.', items)
          return (
            <CardTable
              cardNoMargin
              columns={columns}
              items={items}
              extendLastColumn
            />
          )
        }
      },
      {
        key: 'copr',
        title: t('slow_query.detail.tabs.copr'),
        content: () => {
          const columnsSet = new Set(schemaColumns)
          const items = tabCoprItems(data).filter((item) =>
            columnsSet.has(item.key)
          )
          const columns = valueColumns('slow_query.fields.')
          return (
            <>
              <CardTable
                cardNoMargin
                columns={columns}
                items={items}
                extendLastColumn
              />
              <ReadPoolDetails data={data} />
            </>
          )
        }
      },
      {
        key: 'txn',
        title: t('slow_query.detail.tabs.txn'),
        content: () => {
          const items = tabTxnItems(data)
          const columns = valueColumns('slow_query.fields.')
          return (
            <CardTable
              cardNoMargin
              columns={columns}
              items={items}
              extendLastColumn
            />
          )
        }
      }
    ]
    const hasSessionConnectAttrs = schemaColumns.includes(
      'session_connect_attrs'
    )
    const sessionConnectAttrsRaw = hasSessionConnectAttrs
      ? getSessionConnectAttrsRaw(data)
      : null
    const sessionConnectAttrs = parseSessionConnectAttrs(sessionConnectAttrsRaw)
    if (hasSessionConnectAttrs) {
      tbs.push({
        key: 'session_attrs',
        title: t('slow_query.detail.tabs.session_attrs'),
        content: () => {
          if (
            sessionConnectAttrs == null ||
            typeof sessionConnectAttrs === 'string'
          ) {
            return <pre>{sessionConnectAttrsRaw ?? 'null'}</pre>
          }
          return (
            <ReactJson
              src={sessionConnectAttrs as any}
              enableClipboard={false}
              displayObjectSize={false}
              displayDataTypes={false}
              name={false}
              iconStyle="circle"
              groupArraysAfterLength={10}
            />
          )
        }
      })
    } else if (data.warnings) {
      tbs.push({
        key: 'warnings',
        title: t('slow_query.detail.tabs.warnings'),
        content: () => {
          return (
            <ReactJson
              src={data.warnings! as any}
              enableClipboard={false}
              displayObjectSize={false}
              displayDataTypes={false}
              name={false}
              iconStyle="circle"
              groupArraysAfterLength={10}
            />
          )
        }
      })
    }
    return tbs
  }, [schemaColumns, data, t])
  return <CardTabs animated={false} tabs={tabs} />
}
