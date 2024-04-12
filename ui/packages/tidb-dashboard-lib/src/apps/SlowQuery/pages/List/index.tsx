import React, { useContext, useState, useMemo } from 'react'
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
  Tag
} from 'antd'
import {
  LoadingOutlined,
  ExportOutlined,
  MenuOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
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
import { CacheContext } from '@lib/utils/useCache'
import SlowQueriesTable from '../../components/SlowQueriesTable'
import useSlowQueryTableController, {
  DEF_SLOW_QUERY_COLUMN_KEYS,
  DEF_SLOW_QUERY_OPTIONS
} from '../../utils/useSlowQueryTableController'
import { useDebounceFn, useMemoizedFn } from 'ahooks'
import { useDeepCompareChange } from '@lib/utils/useChange'
import { isDistro } from '@lib/utils/distro'
import { SlowQueryContext } from '../../context'
import { Link } from 'react-router-dom'
import { useSlowQueryListUrlState } from '../../utils/list-url-state'
import { useQuery } from '@tanstack/react-query'
import { getSelectedFields } from '@lib/utils/tableColumnFactory'
import { derivedFields, slowQueryColumns } from '../../utils/tableColumns'

import styles from './List.module.less'
import { LIMITS } from '../../utils/helpers'

const { Option } = Select

function useDbsData() {
  const ctx = useContext(SlowQueryContext)
  const { timeRange } = useSlowQueryListUrlState()

  const query = useQuery({
    queryKey: ['slow_query', 'dbs', timeRange],
    queryFn: () => {
      return ctx?.ds
        .infoListDatabases({ handleError: 'custom' })
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
    }
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

function useSlowqueryListData() {
  const ctx = useContext(SlowQueryContext)

  const {
    timeRange,
    dbs,
    order,
    digest,
    visibleColumnKeys,
    limit,
    ruGroups,
    term
  } = useSlowQueryListUrlState()
  console.log('visible colums', visibleColumnKeys)

  const timeRangeValue = toTimeRangeValue(timeRange)

  const actualVisibleColumnKeys = getSelectedFields(
    visibleColumnKeys,
    derivedFields
  ).join(',')

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
    }
  })
  return query
}

function List() {
  const { t } = useTranslation()

  const ctx = useContext(SlowQueryContext)

  // const cacheMgr = useContext(CacheContext)

  const {
    visibleColumnKeys,
    setVisibleColumnKeys,

    showFullSQL,
    setShowFullSQL,

    timeRange,
    setTimeRange,

    dbs,
    setDbs,

    ruGroups,
    setRuGroups,

    limit,
    setLimit,

    digest,
    setDigest,

    term,
    setTerm,

    order,
    setOrder,
    resetOrder
  } = useSlowQueryListUrlState()

  const { data: dbsData, isLoading: loadingDbs } = useDbsData()
  const { data: ruGroupsData, isLoading: loadingRuGroups } = useRuGroupsData()
  const { data: availableColumnsData, isLoading: loadingAvailableColumns } =
    useAvailableColumnsData()
  const {
    data: slowQueryData,
    refetch: refetchSlowQueryData,
    isLoading: loadingSlowQueryData
  } = useSlowqueryListData()
  const availableColumnsInTable = useMemo(
    () =>
      slowQueryColumns(
        slowQueryData ?? [],
        availableColumnsData ?? [],
        showFullSQL
      ),
    [slowQueryData, availableColumnsData, showFullSQL]
  )

  const [downloading, setDownloading] = useState(false)

  const isDataLoadedSlowly = false

  // const controller = useSlowQueryTableController({
  //   cacheMgr,
  //   showFullSQL,
  //   fetchSchemas: ctx?.cfg.showDBFilter,
  //   initialQueryOptions: {
  //     ...DEF_SLOW_QUERY_OPTIONS,
  //     timeRange,
  //     visibleColumnKeys
  //   },

  //   ds: ctx!.ds
  // })

  function updateVisibleColumnKeys(v: IColumnKeys) {
    setVisibleColumnKeys(v)
    // if (!v[controller.orderOptions.orderBy]) {
    //   controller.resetOrder()
    // }
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

  const sendQueryNow = useMemoizedFn(() => {
    refetchSlowQueryData()
  })

  // const sendQueryDebounced = useDebounceFn(sendQueryNow, {
  //   wait: 300
  // }).run

  // useDeepCompareChange(() => {
  //   if (
  //     ctx?.cfg.instantQuery === false ||
  //     controller.isDataLoadedSlowly || // if data was loaded slowly
  //     controller.isDataLoadedSlowly === null // or a request is not yet finished (which means slow network)..
  //   ) {
  //     // do not send requests on-the-fly.
  //     return
  //   }
  //   sendQueryDebounced()
  // }, [
  //   timeRange,
  //   filterSchema,
  //   filterLimit,
  //   filterText,
  //   filterGroup,
  //   visibleColumnKeys
  // ])

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
                  <span>Slow Query Logs</span>
                  <span> | </span>
                  <Link to="/top_slowquery">Top SlowQueries </Link>
                </span>
                <Tag color="geekblue">beta</Tag>
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
            {ctx!.cfg.showDBFilter && (
              <MultiSelect.Plain
                placeholder={t('slow_query.toolbar.schemas.placeholder')}
                selectedValueTransKey="slow_query.toolbar.schemas.selected"
                columnTitle={t('slow_query.toolbar.schemas.columnTitle')}
                value={dbs}
                style={{ width: 150 }}
                onChange={setDbs}
                items={dbsData}
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
            {ctx!.cfg.showDigestFilter && (
              <Input
                value={digest}
                onChange={(e) => setDigest(e.target.value)}
                placeholder={t('slow_query.toolbar.digest.placeholder')}
                data-e2e="slow_query_digest"
              />
            )}
            <Input.Search
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onSearch={sendQueryNow}
              placeholder={t('slow_query.toolbar.keyword.placeholder')}
              data-e2e="slow_query_search"
              enterButton={t('slow_query.toolbar.query')}
            />
            {(loadingDbs || loadingRuGroups || loadingAvailableColumns) && (
              <LoadingOutlined />
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
            {isDataLoadedSlowly && (ctx?.cfg.instantQuery ?? true) && (
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
                <p className="ant-form-item-extra">
                  {t('slow_query.overview.result_count', {
                    n: slowQueryData?.length
                  })}
                </p>
              </Card>
            )}
            {/* <SlowQueriesTable cardNoMarginTop controller={controller} /> */}
            <CardTable
              cardNoMarginTop
              loading={loadingSlowQueryData}
              columns={availableColumnsInTable}
              items={slowQueryData ?? []}
              orderBy={order.col}
              desc={order.type === 'desc'}
              onChangeOrder={(col, desc) =>
                setOrder({ col, type: desc ? 'desc' : 'asc' })
              }
              // errors={controller.errors}
              visibleColumnKeys={visibleColumnKeys}
              // onRowClicked={handleRowClick}
              // clickedRowIndex={controller.getClickedItemIndex()}
              // getKey={getKey}
              data-e2e="detail_tabs_slow_query"
            />
          </ScrollablePane>
        </div>
      )}
    </div>
  )
}

export default List
