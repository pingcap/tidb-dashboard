import React, { useContext, useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Select,
  Space,
  Input,
  Checkbox,
  message,
  Menu,
  Dropdown,
  Alert,
  Tooltip,
  Result,
  Tag,
  Button,
  Form
} from 'antd'
import { useMemoizedFn } from 'ahooks'
import { Link, useNavigate } from 'react-router-dom'
import {
  LoadingOutlined,
  ExportOutlined,
  MenuOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { useQuery } from '@tanstack/react-query'
import { CSVLink } from 'react-csv'

import {
  Card,
  ColumnsSelector,
  TimeRangeSelector,
  Toolbar,
  MultiSelect,
  toTimeRangeValue,
  IColumnKeys,
  LimitTimeRange,
  CardTable
} from '@lib/components'
import { useVersionedLocalStorageState } from '@lib/utils/useVersionedLocalStorageState'
import { getSelectedFields } from '@lib/utils/tableColumnFactory'
import { isDistro } from '@lib/utils/distro'
import openLink from '@lib/utils/openLink'

import {
  LIMITS,
  DEF_SLOW_QUERY_COLUMN_KEYS,
  SLOW_QUERY_VISIBLE_COLUMN_KEYS,
  SLOW_QUERY_SHOW_FULL_SQL,
  SLOW_DATA_LOAD_THRESHOLD
} from '../../utils/helpers'
import { SlowQueryContext } from '../../context'
import { useSlowQueryListUrlState } from '../../utils/list-url-state'
import { derivedFields, slowQueryColumns } from '../../utils/tableColumns'
import DownloadDBFileModal from './DownloadDBFileModal'

import styles from './List.module.less'
import { telemetry } from '../../utils/telemetry'

const { Option } = Select

function useDbsData() {
  const ctx = useContext(SlowQueryContext)
  const { timeRange } = useSlowQueryListUrlState()
  const timeRangeValue = toTimeRangeValue(timeRange)

  const query = useQuery({
    queryKey: ['slow_query', 'dbs', timeRange],
    queryFn: () => {
      // get database list from s3
      if (ctx?.cfg.showTopSlowQueryLink) {
        return ctx?.ds
          .getDatabaseList(timeRangeValue[0], timeRangeValue[1], {
            handleError: 'custom'
          })
          .then((res) => res.data)
      }

      // get database list from PD
      return ctx?.ds
        .getDatabaseList(0, 0, { handleError: 'custom' })
        .then((res) => res.data)
    },
    enabled: ctx?.cfg.showDBFilter
  })
  return query
}

function useRuGroupsData() {
  const ctx = useContext(SlowQueryContext)

  const query = useQuery({
    queryKey: ['slow_query', 'ru_groups'],
    queryFn: () => {
      return ctx?.ds
        .infoListResourceGroupNames({ handleError: 'custom' })
        .then((res) => res.data)
    },
    enabled: ctx?.cfg.showResourceGroupFilter
  })
  return query
}

function useAvailableColumnsData() {
  const ctx = useContext(SlowQueryContext)

  const query = useQuery({
    queryKey: ['slow_query', 'available_columns'],
    queryFn: () => {
      return ctx?.ds
        .slowQueryAvailableFieldsGet({ handleError: 'custom' })
        .then((res) => res.data.map((d) => d.toLowerCase()))
    }
  })
  return query
}

function useSlowqueryListData(visibleColumnKeys: IColumnKeys) {
  const ctx = useContext(SlowQueryContext)

  const { timeRange, dbs, order, digest, limit, ruGroups, term } =
    useSlowQueryListUrlState()

  const timeRangeValue = toTimeRangeValue(timeRange)

  const actualVisibleColumnKeys = useMemo(
    () => getSelectedFields(visibleColumnKeys, derivedFields).join(','),
    [visibleColumnKeys]
  )

  const [loadSlowly, setLoadSlowly] = useState(false)

  const query = useQuery({
    queryKey: [
      'slow_query',
      'list',
      timeRange,
      dbs,
      order,
      digest,
      visibleColumnKeys,
      limit,
      ruGroups,
      term
    ],
    queryFn: () => {
      const requestBeginAt = performance.now()
      return ctx?.ds
        .slowQueryListGet(
          timeRangeValue[0],
          dbs,
          order.type === 'desc',
          digest,
          timeRangeValue[1],
          actualVisibleColumnKeys,
          limit,
          order.col,
          [],
          ruGroups,
          term,
          { handleError: 'custom' }
        )
        .then((res) => res.data)
        .finally(() => {
          const elapsed = performance.now() - requestBeginAt
          const isLoadSlow = elapsed >= SLOW_DATA_LOAD_THRESHOLD
          setLoadSlowly(isLoadSlow)
        })
    },
    enabled: !loadSlowly,
    retry: false
  })
  return { query, loadSlowly }
}

function List() {
  const { t } = useTranslation()

  const ctx = useContext(SlowQueryContext)

  const {
    setQueryParams,

    timeRange,
    setTimeRange,

    dbs,
    setDbs,

    ruGroups,
    setRuGroups,

    limit,
    setLimit,

    digest,
    term,

    order,
    setOrder,
    resetOrder,

    rowIdx,
    setRowIdx
  } = useSlowQueryListUrlState()

  const [defDbs, _] = useState(dbs)
  const { data: dbsData, isFetching: fetchingDbs } = useDbsData()
  const finalDbs = useMemo(() => {
    if (dbsData && dbsData.length > 0) {
      return dbsData
    }
    return defDbs
  }, [defDbs, dbsData])

  const [visibleColumnKeys, setVisibleColumnKeys] =
    useVersionedLocalStorageState(SLOW_QUERY_VISIBLE_COLUMN_KEYS, {
      defaultValue: DEF_SLOW_QUERY_COLUMN_KEYS
    })
  const [showFullSQL, setShowFullSQL] = useVersionedLocalStorageState(
    SLOW_QUERY_SHOW_FULL_SQL,
    { defaultValue: false }
  )

  const [downloadModalVisible, setDownloadModalVisible] = useState(false)

  const { data: ruGroupsData, isFetching: fetchingRuGroups } = useRuGroupsData()
  const { data: availableColumnsData, isFetching: fetchingAvailableColumns } =
    useAvailableColumnsData()
  const {
    query: {
      data: slowQueryData,
      refetch: refetchSlowQueryData,
      isFetching: fetchingSlowQueryData,
      error: slowQueryError
    },
    loadSlowly
  } = useSlowqueryListData(visibleColumnKeys)

  const availableColumnsInTable = useMemo(
    () =>
      slowQueryColumns(
        slowQueryData ?? [],
        availableColumnsData ?? [],
        showFullSQL
      ),
    [slowQueryData, availableColumnsData, showFullSQL]
  )
  const csvHeaders = availableColumnsInTable
    .filter((c) => visibleColumnKeys[c.key])
    .map((c) => ({
      label: c.key,
      key: c.key
    }))

  const [downloading, setDownloading] = useState(false)

  function updateVisibleColumnKeys(v: IColumnKeys) {
    setVisibleColumnKeys(v)
    if (!v[order.col]) {
      resetOrder()
    }
  }

  function menuItemClick({ key }) {
    switch (key) {
      case 'export':
        const hide = message.loading(
          t('slow_query.toolbar.exporting') + '...',
          0
        )
        downloadCSV().finally(hide)
        break
    }
  }

  const dropdownMenu = (
    <Menu onClick={menuItemClick}>
      <Menu.Item
        key="export"
        disabled={downloading}
        icon={<ExportOutlined />}
        data-e2e="slow_query_export_btn"
      >
        {downloading
          ? t('slow_query.toolbar.exporting')
          : t('slow_query.toolbar.export')}
      </Menu.Item>
    </Menu>
  )

  const downloadCSV = useMemoizedFn(async () => {
    // use last effective query options
    const timeRangeValue = toTimeRangeValue(timeRange)

    try {
      setDownloading(true)
      const res = await ctx!.ds.slowQueryDownloadTokenPost({
        fields: '*',
        begin_time: timeRangeValue[0],
        end_time: timeRangeValue[1],
        db: dbs,
        resource_group: ruGroups,
        text: term,
        orderBy: order.col,
        desc: order.type === 'desc',
        limit: 10000,
        digest: digest,
        plans: []
      })
      const token = res.data
      if (token) {
        window.location.href = `${
          ctx!.cfg.apiPathBase
        }/slow_query/download?token=${token}`
      }
    } finally {
      setDownloading(false)
    }
  })

  // only for clinic
  const clusterInfo = useMemo(() => {
    const infos: string[] = []
    if (ctx?.cfg.orgName) {
      infos.push(`Org: ${ctx?.cfg.orgName}`)
    }
    if (ctx?.cfg.clusterName) {
      infos.push(`Cluster: ${ctx?.cfg.clusterName}`)
    }
    return infos.join(' | ')
  }, [ctx?.cfg.orgName, ctx?.cfg.clusterName])

  const getKey = useCallback((row) => `${row.digest}_${row.timestamp}`, [])

  function handleFormSubmit(values: any) {
    telemetry.clickQueryButton()
    const { term, digest } = values
    setQueryParams({ term, digest })
    setTimeout(() => {
      // wrapped in setTimeout, to get the updated term and digest values
      refetchSlowQueryData()
    })
  }

  const navigate = useNavigate()
  const handleRowClick = useMemoizedFn(
    (rec, idx, ev: React.MouseEvent<HTMLElement>) => {
      telemetry.clickTableRow()
      ctx?.event?.selectSlowQueryItem(rec)
      setRowIdx(idx)
      openLink(
        `/slow_query/detail?digest=${rec.digest}&connection_id=${rec.connection_id}&timestamp=${rec.timestamp}`,
        ev,
        navigate
      )
    }
  )

  return (
    <div className={styles.list_container}>
      <Card noMarginBottom>
        {clusterInfo && (
          <div
            style={{
              marginBottom: 16,
              display: 'flex',
              flexDirection: 'row-reverse',
              justifyContent: 'space-between'
            }}
          >
            {clusterInfo}
            {ctx?.cfg.showTopSlowQueryLink && (
              <span>
                <span style={{ fontSize: 18, fontWeight: 600 }}>
                  <Link
                    to="/top_slowquery"
                    onClick={() => telemetry.clickTopSlowQueryTab()}
                  >
                    Top SlowQueries{' '}
                  </Link>
                  <Tag color="geekblue">beta</Tag>
                  <span>| </span>
                  <span>Slow Query Logs</span>
                </span>
              </span>
            )}
          </div>
        )}

        <Toolbar className={styles.list_toolbar} data-e2e="slow_query_toolbar">
          <Space>
            {ctx?.cfg.timeRangeSelector !== undefined ? (
              <LimitTimeRange
                value={timeRange}
                onChange={setTimeRange}
                recent_seconds={ctx.cfg.timeRangeSelector.recentSeconds}
                customAbsoluteRangePicker={true}
                onZoomOutClick={() => {}}
              />
            ) : (
              <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            )}

            {(ctx!.cfg.showDBFilter || defDbs.length > 0) && (
              <MultiSelect.Plain
                placeholder={t('slow_query.toolbar.schemas.placeholder')}
                selectedValueTransKey="slow_query.toolbar.schemas.selected"
                columnTitle={t('slow_query.toolbar.schemas.columnTitle')}
                value={dbs}
                style={{ width: 150 }}
                onChange={setDbs}
                items={finalDbs}
                data-e2e="execution_database_name"
              />
            )}

            {ctx!.cfg.showResourceGroupFilter &&
              (ruGroupsData ?? []).length > 1 && (
                <MultiSelect.Plain
                  placeholder={t(
                    'slow_query.toolbar.resource_groups.placeholder'
                  )}
                  selectedValueTransKey="slow_query.toolbar.resource_groups.selected"
                  columnTitle={t(
                    'slow_query.toolbar.resource_groups.columnTitle'
                  )}
                  value={ruGroups}
                  style={{ width: 180 }}
                  onChange={setRuGroups}
                  items={ruGroupsData}
                  data-e2e="resource_group_name_select"
                />
              )}

            <Select
              style={{ width: 150 }}
              value={limit}
              onChange={setLimit}
              data-e2e="slow_query_limit_select"
            >
              {LIMITS.map((item) => (
                <Option
                  value={item}
                  key={item}
                  data-e2e="slow_query_limit_option"
                >
                  Limit {item}
                </Option>
              ))}
            </Select>

            <Form
              layout="inline"
              initialValues={{ term, digest }}
              onFinish={handleFormSubmit}
            >
              {ctx!.cfg.showDigestFilter && (
                <Form.Item name="digest">
                  <Input
                    placeholder={t('slow_query.toolbar.digest.placeholder')}
                    data-e2e="slow_query_digest"
                  />
                </Form.Item>
              )}

              <Form.Item name="term">
                <Input
                  placeholder={t('slow_query.toolbar.keyword.placeholder')}
                  data-e2e="slow_query_search"
                />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit">
                  {t('slow_query.toolbar.query')}
                </Button>
              </Form.Item>
            </Form>

            {(fetchingDbs || fetchingRuGroups || fetchingAvailableColumns) && (
              <LoadingOutlined />
            )}

            {ctx!.cfg.showDownloadSlowQueryDBFile && (
              <Button
                type="link"
                onClick={() => setDownloadModalVisible(!downloadModalVisible)}
              >
                {t('slow_query.toolbar.download_db')}
              </Button>
            )}
          </Space>

          <Space>
            {availableColumnsInTable.length > 0 && (
              <ColumnsSelector
                columns={availableColumnsInTable}
                visibleColumnKeys={visibleColumnKeys}
                defaultVisibleColumnKeys={DEF_SLOW_QUERY_COLUMN_KEYS}
                onChange={updateVisibleColumnKeys}
                foot={
                  <Checkbox
                    checked={showFullSQL}
                    onChange={(e) => setShowFullSQL(e.target.checked)}
                    data-e2e="slow_query_show_full_sql"
                  >
                    {t('slow_query.toolbar.select_columns.show_full_sql')}
                  </Checkbox>
                }
              />
            )}

            {ctx!.cfg.enableExport && (
              <Dropdown overlay={dropdownMenu} placement="bottomRight">
                <div
                  style={{ cursor: 'pointer' }}
                  data-e2e="slow_query_export_menu"
                >
                  <MenuOutlined />
                </div>
              </Dropdown>
            )}

            {!isDistro() && (ctx!.cfg.showHelp ?? true) && (
              <Tooltip
                mouseEnterDelay={0}
                mouseLeaveDelay={0}
                title={t('slow_query.toolbar.help')}
                placement="bottom"
              >
                <QuestionCircleOutlined
                  onClick={() => {
                    window.open(t('slow_query.toolbar.help_url'), '_blank')
                  }}
                />
              </Tooltip>
            )}
          </Space>
        </Toolbar>
      </Card>

      <div style={{ height: 16 }} />

      {slowQueryData?.length === 0 ? (
        <Result title={t('slow_query.overview.empty_result')} />
      ) : (
        <div style={{ height: '100%', position: 'relative' }}>
          <ScrollablePane>
            {loadSlowly && (ctx?.cfg.instantQuery ?? true) && (
              <Card noMarginBottom noMarginTop>
                <Alert
                  message={t('slow_query.overview.slow_load_info')}
                  type="info"
                  showIcon
                />
              </Card>
            )}
            {(slowQueryData?.length ?? 0) > 0 && (
              <Card noMarginBottom noMarginTop>
                <div className="ant-form-item-extra">
                  {t('slow_query.overview.result_count', {
                    n: slowQueryData?.length
                  })}{' '}
                  <CSVLink
                    data={slowQueryData}
                    headers={csvHeaders}
                    filename="slowquery"
                  >
                    Download to CSV
                  </CSVLink>
                </div>
              </Card>
            )}
            <CardTable
              cardNoMarginTop
              loading={fetchingSlowQueryData}
              columns={availableColumnsInTable}
              items={slowQueryData ?? []}
              orderBy={order.col}
              desc={order.type === 'desc'}
              onChangeOrder={(col, desc) =>
                setOrder({ col, type: desc ? 'desc' : 'asc' })
              }
              errors={slowQueryError ? [slowQueryError] : []}
              visibleColumnKeys={visibleColumnKeys}
              onRowClicked={handleRowClick}
              clickedRowIndex={rowIdx}
              getKey={getKey}
              data-e2e="detail_tabs_slow_query"
            />
          </ScrollablePane>
        </div>
      )}
      {ctx!.cfg.showDownloadSlowQueryDBFile && (
        <DownloadDBFileModal
          visible={downloadModalVisible}
          setVisible={setDownloadModalVisible}
        />
      )}
    </div>
  )
}

export default List
