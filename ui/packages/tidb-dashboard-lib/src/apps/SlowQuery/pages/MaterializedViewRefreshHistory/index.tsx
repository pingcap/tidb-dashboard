import React, { useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getValueFormat } from '@baurine/grafana-value-formats'
import {
  Badge,
  Button,
  Empty,
  Input,
  InputNumber,
  Popover,
  Space,
  Table,
  message
} from 'antd'

import {
  Card,
  CopyLink,
  LimitTimeRange,
  MultiSelect,
  TextWrap,
  TimeRange,
  Toolbar,
  toTimeRangeValue
} from '@lib/components'
import tz from '@lib/utils/timezone'

import {
  IMaterializedViewRefreshHistoryItem,
  SlowQueryContext
} from '../../context'

import styles from './index.module.less'
import dayjs from 'dayjs'

const DEFAULT_TIME_RANGE: TimeRange = {
  type: 'recent',
  value: 24 * 60 * 60
}

const MAX_RANGE_SECONDS = 30 * 24 * 60 * 60
const DEFAULT_PAGE_SIZE = 10
const STATUS_OPTIONS = ['success', 'failed', 'running']
const SCHEMA_SESSION_KEY = 'materialized_view.last_schema'

type MaterializedViewFilters = {
  timeRange: TimeRange
  schema: string
  materializedView: string
  status: string[]
  minDuration?: number
}

function getInitialSchema() {
  if (typeof window === 'undefined') {
    return ''
  }
  return sessionStorage.getItem(SCHEMA_SESSION_KEY) || ''
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-'
  }

  const date = dayjs(value)
  if (!date.isValid()) {
    return value
  }

  return date.utcOffset(tz.getTimeZone()).format('YYYY-MM-DD HH:mm:ss')
}

function StatusBadge({
  status
}: {
  status?: IMaterializedViewRefreshHistoryItem['refresh_status']
}) {
  const { t } = useTranslation()

  const badgeStatus =
    status === 'success'
      ? 'success'
      : status === 'failed'
      ? 'error'
      : status === 'running'
      ? 'processing'
      : 'default'

  return (
    <Badge
      status={badgeStatus as 'success' | 'error' | 'processing' | 'default'}
      text={t(`slow_query.materialized_view.status.${status ?? 'running'}`)}
    />
  )
}

export default function MaterializedViewRefreshHistory() {
  const { t } = useTranslation()
  const ctx = useContext(SlowQueryContext)

  const pageTitle = t('slow_query.materialized_view.page_title')
  const cachedSchema = useMemo(() => getInitialSchema(), [])
  const initialFilters = useMemo<MaterializedViewFilters>(
    () => ({
      timeRange: DEFAULT_TIME_RANGE,
      schema: cachedSchema,
      materializedView: '',
      status: [],
      minDuration: undefined
    }),
    [cachedSchema]
  )

  const [filters, setFilters] = useState<MaterializedViewFilters>(initialFilters)
  const [appliedFilters, setAppliedFilters] =
    useState<MaterializedViewFilters>(initialFilters)
  const [hasSearched, setHasSearched] = useState(Boolean(cachedSchema))
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [orderBy, setOrderBy] = useState<'refresh_time' | 'refresh_duration_sec'>(
    'refresh_time'
  )
  const [isDesc, setIsDesc] = useState(true)

  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  const timeRangeValue = useMemo(
    () => toTimeRangeValue(appliedFilters.timeRange),
    [appliedFilters.timeRange]
  )

  const query = useQuery({
    queryKey: [
      'slow_query',
      'materialized_view',
      appliedFilters,
      hasSearched,
      page,
      pageSize,
      orderBy,
      isDesc
    ],
    queryFn: () => {
      return ctx!.ds.slowQueryMaterializedViewRefreshHistoryGet!(
        {
          begin_time: timeRangeValue[0],
          end_time: timeRangeValue[1],
          schema: appliedFilters.schema,
          materialized_view: appliedFilters.materializedView || undefined,
          status: appliedFilters.status,
          min_duration: appliedFilters.minDuration,
          page,
          page_size: pageSize,
          orderBy,
          desc: isDesc
        },
        {
          handleError: 'default'
        }
      ).then((res) => res.data)
    },
    enabled:
      hasSearched && !!ctx?.ds.slowQueryMaterializedViewRefreshHistoryGet
  })

  const columns = useMemo(
    () => [
      {
        title: t('slow_query.materialized_view.columns.refresh_job_id'),
        dataIndex: 'refresh_job_id',
        key: 'refresh_job_id',
        width: 180,
        render: (value: string) => <TextWrap>{value || '-'}</TextWrap>
      },
      {
        title: t('slow_query.materialized_view.columns.schema'),
        dataIndex: 'schema',
        key: 'schema',
        width: 160,
        render: (value: string) => <TextWrap>{value || '-'}</TextWrap>
      },
      {
        title: t('slow_query.materialized_view.columns.materialized_view'),
        dataIndex: 'materialized_view',
        key: 'materialized_view',
        width: 220,
        render: (value: string) => <TextWrap>{value || '-'}</TextWrap>
      },
      {
        title: t('slow_query.materialized_view.columns.refresh_start_time'),
        dataIndex: 'refresh_time',
        key: 'refresh_time',
        width: 190,
        sorter: true,
        sortOrder:
          orderBy === 'refresh_time' ? (isDesc ? 'descend' : 'ascend') : null,
        render: (value: string) => formatDateTime(value)
      },
      {
        title: t('slow_query.materialized_view.columns.duration'),
        dataIndex: 'duration',
        key: 'refresh_duration_sec',
        width: 130,
        sorter: true,
        sortOrder:
          orderBy === 'refresh_duration_sec'
            ? isDesc
              ? 'descend'
              : 'ascend'
            : null,
        render: (value: number | null) => {
          if (value === null || value === undefined) {
            return '-'
          }
          return getValueFormat('s')(value, 2)
        }
      },
      {
        title: t('slow_query.materialized_view.columns.refresh_status'),
        dataIndex: 'refresh_status',
        key: 'refresh_status',
        width: 140,
        render: (value: IMaterializedViewRefreshHistoryItem['refresh_status']) => (
          <StatusBadge status={value} />
        )
      },
      {
        title: t('slow_query.materialized_view.columns.refresh_rows'),
        dataIndex: 'refresh_rows',
        key: 'refresh_rows',
        width: 130,
        render: (value: number) => {
          if (value === null || value === undefined) {
            return '-'
          }
          return getValueFormat('short')(value, 0, 1)
        }
      },
      {
        title: t('slow_query.materialized_view.columns.refresh_read_tso'),
        dataIndex: 'refresh_read_tso',
        key: 'refresh_read_tso',
        width: 180,
        render: (value: string) => <TextWrap>{value || '-'}</TextWrap>
      },
      {
        title: t('slow_query.materialized_view.columns.failed_reason'),
        dataIndex: 'failed_reason',
        key: 'failed_reason',
        width: 320,
        render: (value: string | null) => {
          if (!value) {
            return '-'
          }

          return (
            <Popover
              placement="topLeft"
              content={
                <div className={styles.failed_reason_popover}>
                  <div className={styles.failed_reason_text}>{value}</div>
                  <div className={styles.failed_reason_copy}>
                    <CopyLink data={value} />
                  </div>
                </div>
              }
            >
              <div className={styles.failed_reason_cell}>
                <TextWrap>{value}</TextWrap>
              </div>
            </Popover>
          )
        }
      }
    ],
    [isDesc, orderBy, t]
  )

  function applyFilters() {
    const schema = filters.schema.trim()
    if (!schema) {
      message.error(t('slow_query.materialized_view.filters.schema.required'))
      return
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SCHEMA_SESSION_KEY, schema)
    }

    setPage(1)
    setHasSearched(true)
    setAppliedFilters({
      ...filters,
      schema,
      materializedView: filters.materializedView.trim()
    })
  }

  function handleTableChange(pagination, _filters, sorter) {
    const nextPageSize = pagination.pageSize || DEFAULT_PAGE_SIZE
    if (nextPageSize !== pageSize) {
      setPageSize(nextPageSize)
      setPage(1)
    } else {
      setPage(pagination.current || 1)
    }

    const sortInfo = Array.isArray(sorter) ? sorter[0] : sorter
    if (
      sortInfo?.columnKey === 'refresh_time' ||
      sortInfo?.columnKey === 'refresh_duration_sec'
    ) {
      setOrderBy(sortInfo.columnKey)
      setIsDesc(sortInfo.order !== 'ascend')
      return
    }

    setOrderBy('refresh_time')
    setIsDesc(true)
  }

  return (
    <div className={styles.page_container}>
      <Card noMarginBottom title={pageTitle}>
        <Toolbar
          className={styles.page_toolbar}
          data-e2e="materialized_view_toolbar"
        >
          <Space>
            <Input
              placeholder={t(
                'slow_query.materialized_view.filters.schema.placeholder'
              )}
              value={filters.schema}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, schema: e.target.value }))
              }
              style={{ width: 160 }}
            />

            <Input
              placeholder={t(
                'slow_query.materialized_view.filters.materialized_view.placeholder'
              )}
              value={filters.materializedView}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  materializedView: e.target.value
                }))
              }
              style={{ width: 180 }}
            />

            <LimitTimeRange
              value={filters.timeRange}
              onChange={(timeRange) =>
                setFilters((prev) => ({ ...prev, timeRange }))
              }
              recent_seconds={[
                60 * 60,
                6 * 60 * 60,
                12 * 60 * 60,
                24 * 60 * 60,
                7 * 24 * 60 * 60,
                30 * 24 * 60 * 60
              ]}
              customAbsoluteRangePicker={true}
              onZoomOutClick={() => {}}
              timeRangeLimit={MAX_RANGE_SECONDS}
            />

            <MultiSelect.Plain
              placeholder={t(
                'slow_query.materialized_view.filters.status.placeholder'
              )}
              selectedValueTransKey="slow_query.materialized_view.filters.status.selected"
              columnTitle={t(
                'slow_query.materialized_view.filters.status.column_title'
              )}
              value={filters.status}
              onChange={(status) => setFilters((prev) => ({ ...prev, status }))}
              items={STATUS_OPTIONS}
              style={{ width: 160 }}
            />

            <InputNumber
              min={0}
              precision={2}
              placeholder={t(
                'slow_query.materialized_view.filters.duration.placeholder'
              )}
              value={filters.minDuration}
              onChange={(minDuration) =>
                setFilters((prev) => ({
                  ...prev,
                  minDuration:
                    minDuration === null ? undefined : Number(minDuration)
                }))
              }
              style={{ width: 180 }}
            />

            <Button type="primary" onClick={applyFilters}>
              {t('slow_query.materialized_view.filters.query')}
            </Button>
          </Space>
          <Space>
            <span className={styles.timezone_label}>
              {t('slow_query.materialized_view.timezone', {
                timezone: dayjs().format('UTCZ')
              })}
            </span>
          </Space>
        </Toolbar>
      </Card>

      <Card noMarginTop className={styles.table_card}>
        {hasSearched ? (
          <Table
            rowKey={(row: IMaterializedViewRefreshHistoryItem) =>
              `${row.refresh_job_id || ''}_${row.refresh_time || ''}`
            }
            columns={columns}
            dataSource={query.data?.items ?? []}
            loading={query.isLoading || query.isFetching}
            onChange={handleTableChange}
            pagination={{
              current: page,
              pageSize,
              total: query.data?.total ?? 0,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              showTotal: (total) =>
                t('slow_query.materialized_view.pagination.total', { total })
            }}
            size="small"
            scroll={{ x: 1700 }}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('slow_query.materialized_view.empty_before_query')}
          />
        )}
      </Card>
    </div>
  )
}
