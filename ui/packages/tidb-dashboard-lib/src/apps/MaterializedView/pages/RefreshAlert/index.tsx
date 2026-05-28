import React, { useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Button, Input, Result, Space, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

import {
  Card,
  DatePicker,
  MultiSelect,
  TextWrap,
  Toolbar
} from '@lib/components'
import tz from '@lib/utils/timezone'

import {
  IMaterializedViewRefreshAlertItem,
  MaterializedViewContext
} from '../../context'
import HeaderTabs from '../HeaderTabs'
import styles from '../RefreshHistory/index.module.less'

const DEFAULT_PAGE_SIZE = 10
const DATABASES_LOCAL_STORAGE_KEY = 'materialized_view.last_databases'

type RefreshAlertFilters = {
  databases: string[]
  materializedView: string
  lastSuccessTime?: dayjs.Dayjs | null
}

function normalizeDatabases(databases: string[]) {
  const databaseSet = new Set<string>()
  return databases.reduce<string[]>((allDatabases, database) => {
    const normalizedDatabase = database.trim()
    if (
      normalizedDatabase.length === 0 ||
      databaseSet.has(normalizedDatabase)
    ) {
      return allDatabases
    }
    databaseSet.add(normalizedDatabase)
    allDatabases.push(normalizedDatabase)
    return allDatabases
  }, [])
}

function getInitialDatabases() {
  if (typeof window === 'undefined') {
    return []
  }

  const cachedDatabases = localStorage.getItem(DATABASES_LOCAL_STORAGE_KEY)
  if (cachedDatabases) {
    try {
      const databases = JSON.parse(cachedDatabases)
      if (Array.isArray(databases)) {
        return normalizeDatabases(databases.map((database) => String(database)))
      }
    } catch {
      return []
    }
  }
  return []
}

function persistDatabases(databases: string[]) {
  if (typeof window === 'undefined') {
    return
  }

  if (databases.length === 0) {
    localStorage.removeItem(DATABASES_LOCAL_STORAGE_KEY)
    return
  }

  localStorage.setItem(DATABASES_LOCAL_STORAGE_KEY, JSON.stringify(databases))
}

function normalizeFilters(nextFilters: RefreshAlertFilters) {
  return {
    ...nextFilters,
    databases: normalizeDatabases(nextFilters.databases),
    materializedView: nextFilters.materializedView.trim()
  }
}

function areFiltersEqual(
  left: RefreshAlertFilters,
  right: RefreshAlertFilters
) {
  return (
    JSON.stringify(left.databases) === JSON.stringify(right.databases) &&
    left.materializedView === right.materializedView &&
    (left.lastSuccessTime?.unix() ?? null) ===
      (right.lastSuccessTime?.unix() ?? null)
  )
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

function formatAlertType(value?: string | null) {
  const normalizedValue = value?.trim().toLowerCase()
  if (normalizedValue === 'warning') {
    return 'Warning'
  }
  if (normalizedValue === 'overdue') {
    return 'Overdue'
  }
  return '-'
}

function formatRefreshFailed(value?: string | null) {
  return value?.trim().toLowerCase() === 'yes' ? 'Yes' : '-'
}

export default function RefreshAlert() {
  const { t } = useTranslation()
  const ctx = useContext(MaterializedViewContext)

  const pageTitle = t('materialized_view.page_title_alert')
  const cachedDatabases = useMemo(() => getInitialDatabases(), [])
  const initialFilters = useMemo<RefreshAlertFilters>(
    () => ({
      databases: cachedDatabases,
      materializedView: '',
      lastSuccessTime: null
    }),
    [cachedDatabases]
  )

  const [filters, setFilters] = useState<RefreshAlertFilters>(initialFilters)
  const [appliedFilters, setAppliedFilters] =
    useState<RefreshAlertFilters>(initialFilters)
  const [hasSearched, setHasSearched] = useState(
    Boolean(cachedDatabases.length)
  )
  const [defDbs] = useState(cachedDatabases)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [orderBy, setOrderBy] = useState<'last_success_time' | 'update_time'>(
    'update_time'
  )
  const [isDesc, setIsDesc] = useState(true)

  const { data: dbsData } = useQuery({
    queryKey: ['materialized_view', 'dbs'],
    queryFn: () =>
      ctx!.ds.getDatabaseList({ handleError: 'custom' }).then((res) => res.data)
  })

  const finalDbs = useMemo(() => {
    if (dbsData && dbsData.length > 0) {
      return dbsData
    }
    return defDbs
  }, [dbsData, defDbs])

  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  const query = useQuery({
    queryKey: [
      'materialized_view',
      'alert',
      appliedFilters.databases,
      appliedFilters.materializedView,
      appliedFilters.lastSuccessTime?.unix(),
      hasSearched,
      page,
      pageSize,
      orderBy,
      isDesc
    ],
    queryFn: () => {
      return ctx!.ds
        .materializedViewRefreshAlertGet(
          {
            schema:
              appliedFilters.databases.length > 0
                ? appliedFilters.databases
                : undefined,
            materialized_view: appliedFilters.materializedView || undefined,
            last_success_time:
              appliedFilters.lastSuccessTime?.unix() || undefined,
            page,
            page_size: pageSize,
            orderBy,
            desc: isDesc
          },
          {
            handleError: 'default'
          }
        )
        .then((res) => res.data)
    },
    enabled: hasSearched
  })

  function commitFilters(
    nextFilters: RefreshAlertFilters,
    forceRefresh = false
  ) {
    const normalizedFilters = normalizeFilters(nextFilters)
    const shouldRefetch =
      forceRefresh &&
      hasSearched &&
      page === 1 &&
      areFiltersEqual(normalizedFilters, appliedFilters)

    setFilters(normalizedFilters)
    setPage(1)
    persistDatabases(normalizedFilters.databases)

    if (normalizedFilters.databases.length === 0) {
      setHasSearched(false)
      return
    }

    setHasSearched(true)
    setAppliedFilters(normalizedFilters)

    if (shouldRefetch) {
      void query.refetch()
    }
  }

  function applyFilters(forceRefresh = false) {
    commitFilters(filters, forceRefresh)
  }

  const columns = useMemo<ColumnsType<IMaterializedViewRefreshAlertItem>>(
    () => [
      {
        title: t('materialized_view.columns.schema'),
        dataIndex: 'schema',
        key: 'schema',
        width: 160,
        render: (value: string) => <TextWrap>{value || '-'}</TextWrap>
      },
      {
        title: t('materialized_view.columns.materialized_view'),
        dataIndex: 'materialized_view',
        key: 'materialized_view',
        width: 220,
        render: (value: string) => <TextWrap>{value || '-'}</TextWrap>
      },
      {
        title: t('materialized_view.columns.materialized_view_id'),
        dataIndex: 'materialized_view_id',
        key: 'materialized_view_id',
        width: 180,
        render: (value: string) => <TextWrap>{value || '-'}</TextWrap>
      },
      {
        title: t('materialized_view.columns.last_success_time'),
        dataIndex: 'last_success_time',
        key: 'last_success_time',
        width: 190,
        sorter: true,
        sortOrder:
          orderBy === 'last_success_time'
            ? isDesc
              ? 'descend'
              : 'ascend'
            : undefined,
        render: (value: string | null) => formatDateTime(value)
      },
      {
        title: t('materialized_view.columns.alert_type'),
        dataIndex: 'alert_type',
        key: 'alert_type',
        width: 130,
        render: (value: string | null) => formatAlertType(value)
      },
      {
        title: t('materialized_view.columns.refresh_failed'),
        dataIndex: 'refresh_failed',
        key: 'refresh_failed',
        width: 140,
        render: (value: string | null) => formatRefreshFailed(value)
      },
      {
        title: t('materialized_view.columns.update_time'),
        dataIndex: 'update_time',
        key: 'update_time',
        width: 190,
        sorter: true,
        sortOrder:
          orderBy === 'update_time'
            ? isDesc
              ? 'descend'
              : 'ascend'
            : undefined,
        render: (value: string | null) => formatDateTime(value)
      }
    ],
    [isDesc, orderBy, t]
  )

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
      sortInfo?.columnKey === 'last_success_time' ||
      sortInfo?.columnKey === 'update_time'
    ) {
      setOrderBy(sortInfo.columnKey)
      setIsDesc(sortInfo.order !== 'ascend')
      return
    }

    setOrderBy('update_time')
    setIsDesc(true)
  }

  return (
    <div className={styles.list_container}>
      <Card
        noMarginBottom
        title={<HeaderTabs active="alert" />}
        extra={
          <span className={styles.timezone_label}>
            {t('materialized_view.timezone', {
              timezone: dayjs().format('UTCZ')
            })}
          </span>
        }
      >
        <Toolbar
          className={styles.list_toolbar}
          data-e2e="materialized_view_alert_toolbar"
        >
          <Space>
            <MultiSelect.Plain
              placeholder={t('materialized_view.filters.databases.placeholder')}
              selectedValueTransKey="materialized_view.filters.databases.selected"
              columnTitle={t(
                'materialized_view.filters.databases.column_title'
              )}
              value={filters.databases}
              style={{ width: 160 }}
              onChange={(databases) => {
                const nextFilters = { ...filters, databases }
                commitFilters(nextFilters)
              }}
              items={finalDbs}
            />

            <Input
              placeholder={t(
                'materialized_view.filters.materialized_view.placeholder'
              )}
              value={filters.materializedView}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  materializedView: e.target.value
                }))
              }
              onBlur={() => applyFilters()}
              onPressEnter={() => applyFilters(true)}
              style={{ width: 160 }}
            />

            <DatePicker
              showTime
              allowClear
              value={filters.lastSuccessTime}
              placeholder={t(
                'materialized_view.filters.last_success_time.placeholder'
              )}
              onChange={(lastSuccessTime) => {
                const nextFilters = { ...filters, lastSuccessTime }
                commitFilters(nextFilters)
              }}
              style={{ width: 220 }}
            />

            <Button type="primary" onClick={() => applyFilters(true)}>
              {t('materialized_view.filters.query')}
            </Button>
          </Space>
        </Toolbar>
      </Card>

      <div style={{ height: 16 }} />

      {hasSearched ? (
        query.data?.items?.length === 0 &&
        !query.isLoading &&
        !query.isFetching ? (
          <Card noMarginTop noMarginBottom className={styles.table_card}>
            <Result title={t('materialized_view.empty_alert_result')} />
          </Card>
        ) : (
          <Card noMarginTop noMarginBottom className={styles.table_card}>
            <Table
              className={styles.history_table}
              rowKey={(row: IMaterializedViewRefreshAlertItem) =>
                `${row.schema || ''}_${row.materialized_view_id || ''}_${
                  row.update_time || ''
                }`
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
                  t('materialized_view.pagination.total', { total })
              }}
              size="small"
              scroll={{ x: 1210 }}
            />
          </Card>
        )
      ) : (
        <Card noMarginTop noMarginBottom className={styles.table_card}>
          <Result title={t('materialized_view.empty_alert_before_query')} />
        </Card>
      )}
    </div>
  )
}
