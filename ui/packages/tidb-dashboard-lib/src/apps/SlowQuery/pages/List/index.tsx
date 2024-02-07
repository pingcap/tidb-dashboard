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
  Result
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
  LimitTimeRange
} from '@lib/components'
import { useURLTimeRange } from '@lib/hooks/useURLTimeRange'
import { CacheContext } from '@lib/utils/useCache'
import { useVersionedLocalStorageState } from '@lib/utils/useVersionedLocalStorageState'
import SlowQueriesTable from '../../components/SlowQueriesTable'
import useSlowQueryTableController, {
  DEF_SLOW_QUERY_COLUMN_KEYS,
  DEF_SLOW_QUERY_OPTIONS
} from '../../utils/useSlowQueryTableController'
import styles from './List.module.less'
import { useDebounceFn, useMemoizedFn } from 'ahooks'
import { useDeepCompareChange } from '@lib/utils/useChange'
import { isDistro } from '@lib/utils/distro'
import { SlowQueryContext } from '../../context'

const { Option } = Select

const SLOW_QUERY_VISIBLE_COLUMN_KEYS = 'slow_query.visible_column_keys'
const SLOW_QUERY_SHOW_FULL_SQL = 'slow_query.show_full_sql'
const LIMITS = [100, 200, 500, 1000]

function List() {
  const { t } = useTranslation()

  const ctx = useContext(SlowQueryContext)

  const cacheMgr = useContext(CacheContext)

  const [visibleColumnKeys, setVisibleColumnKeys] =
    useVersionedLocalStorageState(SLOW_QUERY_VISIBLE_COLUMN_KEYS, {
      defaultValue: DEF_SLOW_QUERY_COLUMN_KEYS
    })
  const [showFullSQL, setShowFullSQL] = useVersionedLocalStorageState(
    SLOW_QUERY_SHOW_FULL_SQL,
    { defaultValue: false }
  )
  const [downloading, setDownloading] = useState(false)

  const { timeRange, setTimeRange } = useURLTimeRange()

  const controller = useSlowQueryTableController({
    cacheMgr,
    showFullSQL,
    fetchSchemas: ctx?.cfg.showDBFilter,
    initialQueryOptions: {
      ...DEF_SLOW_QUERY_OPTIONS,
      timeRange,
      visibleColumnKeys
    },

    ds: ctx!.ds
  })

  function updateVisibleColumnKeys(v: IColumnKeys) {
    setVisibleColumnKeys(v)
    if (!v[controller.orderOptions.orderBy]) {
      controller.resetOrder()
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

  const [filterSchema, setFilterSchema] = useState<string[]>(
    controller.queryOptions.schemas
  )
  const [filterLimit, setFilterLimit] = useState<number>(
    controller.queryOptions.limit
  )
  const [filterDigest, setFilterDigest] = useState<string>(
    controller.queryOptions.digest
  )
  const [filterText, setFilterText] = useState<string>(
    controller.queryOptions.searchText
  )
  const [filterGroup, setFilterGroup] = useState<string[]>(
    controller.queryOptions.groups
  )

  const sendQueryNow = useMemoizedFn(() => {
    cacheMgr?.clear()
    controller.setQueryOptions({
      timeRange,
      schemas: filterSchema,
      limit: filterLimit,
      searchText: filterText,
      visibleColumnKeys,
      digest: filterDigest,
      plans: [],
      groups: filterGroup
    })
  })

  const sendQueryDebounced = useDebounceFn(sendQueryNow, {
    wait: 300
  }).run

  useDeepCompareChange(() => {
    if (
      ctx?.cfg.instantQuery === false ||
      controller.isDataLoadedSlowly || // if data was loaded slowly
      controller.isDataLoadedSlowly === null // or a request is not yet finished (which means slow network)..
    ) {
      // do not send requests on-the-fly.
      return
    }
    sendQueryDebounced()
  }, [
    timeRange,
    filterSchema,
    filterLimit,
    filterText,
    filterGroup,
    visibleColumnKeys
  ])

  const downloadCSV = useMemoizedFn(async () => {
    // use last effective query options
    const timeRangeValue = toTimeRangeValue(controller.queryOptions.timeRange)
    try {
      setDownloading(true)
      const res = await ctx!.ds.slowQueryDownloadTokenPost({
        fields: '*',
        begin_time: timeRangeValue[0],
        end_time: timeRangeValue[1],
        db: controller.queryOptions.schemas,
        resource_group: controller.queryOptions.groups,
        text: controller.queryOptions.searchText,
        orderBy: controller.orderOptions.orderBy,
        desc: controller.orderOptions.desc,
        limit: 10000,
        digest: filterDigest,
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
          <div style={{ marginBottom: 8, textAlign: 'right' }}>
            {clusterInfo}
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
                value={filterSchema}
                style={{ width: 150 }}
                onChange={setFilterSchema}
                items={controller.allSchemas}
                data-e2e="execution_database_name"
              />
            )}
            {ctx!.cfg.showResourceGroupFilter &&
              controller.allGroups?.length > 1 && (
                <MultiSelect.Plain
                  placeholder={t(
                    'slow_query.toolbar.resource_groups.placeholder'
                  )}
                  selectedValueTransKey="slow_query.toolbar.resource_groups.selected"
                  columnTitle={t(
                    'slow_query.toolbar.resource_groups.columnTitle'
                  )}
                  value={filterGroup}
                  style={{ width: 150 }}
                  onChange={setFilterGroup}
                  items={controller.allGroups}
                  data-e2e="resource_group_name_select"
                />
              )}
            <Select
              style={{ width: 150 }}
              value={filterLimit}
              onChange={setFilterLimit}
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
                value={filterDigest}
                onChange={(e) => setFilterDigest(e.target.value)}
                placeholder={t('slow_query.toolbar.digest.placeholder')}
                data-e2e="slow_query_digest"
              />
            )}
            <Input.Search
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              onSearch={sendQueryNow}
              placeholder={t('slow_query.toolbar.keyword.placeholder')}
              data-e2e="slow_query_search"
              enterButton={t('slow_query.toolbar.query')}
            />
            {controller.isLoading && <LoadingOutlined />}
          </Space>
          <Space>
            {controller.availableColumnsInTable.length > 0 && (
              <ColumnsSelector
                columns={controller.availableColumnsInTable}
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

      {controller.data?.length === 0 ? (
        <Result title={t('slow_query.overview.empty_result')} />
      ) : (
        <div style={{ height: '100%', position: 'relative' }}>
          <ScrollablePane>
            {controller.isDataLoadedSlowly && (ctx?.cfg.instantQuery ?? true) && (
              <Card noMarginBottom noMarginTop>
                <Alert
                  message={t('slow_query.overview.slow_load_info')}
                  type="info"
                  showIcon
                />
              </Card>
            )}
            {(controller.data?.length ?? 0) > 0 && (
              <Card noMarginBottom noMarginTop>
                <p className="ant-form-item-extra">
                  {t('slow_query.overview.result_count', {
                    n: controller.data?.length
                  })}
                </p>
              </Card>
            )}
            <SlowQueriesTable cardNoMarginTop controller={controller} />
          </ScrollablePane>
        </div>
      )}
    </div>
  )
}

export default List
