import React, { useState, useContext, useMemo } from 'react'
import {
  Space,
  Tooltip,
  Drawer,
  Button,
  Checkbox,
  Result,
  Input,
  Dropdown,
  Menu,
  Alert,
  message
} from 'antd'
import {
  LoadingOutlined,
  SettingOutlined,
  ExportOutlined,
  MenuOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons'
import { useURLTimeRange } from '@lib/hooks/useURLTimeRange'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { useTranslation } from 'react-i18next'
import { CacheContext } from '@lib/utils/useCache'
import {
  Card,
  ColumnsSelector,
  Toolbar,
  MultiSelect,
  TimeRangeSelector,
  DateTime,
  toTimeRangeValue,
  IColumnKeys,
  LimitTimeRange
} from '@lib/components'
import { useVersionedLocalStorageState } from '@lib/utils/useVersionedLocalStorageState'
import { StatementsTable } from '../../components'
import StatementSettingForm from './StatementSettingForm'
import useStatementTableController, {
  DEF_STMT_COLUMN_KEYS,
  DEF_STMT_QUERY_OPTIONS
} from '../../utils/useStatementTableController'
import styles from './List.module.less'
import { useDebounceFn, useMemoizedFn } from 'ahooks'
import { useDeepCompareChange } from '@lib/utils/useChange'
import { StatementModel } from '@lib/client'
import { isDistro } from '@lib/utils/distro'
import { StatementContext } from '../../context'
import { telemetry as stmtTelmetry } from '../../utils/telemetry'

const STMT_VISIBLE_COLUMN_KEYS = 'statement.visible_column_keys'
const STMT_SHOW_FULL_SQL = 'statement.show_full_sql'

function getDataTimeRange(
  list?: StatementModel[]
): [number, number] | undefined {
  if (!list || list?.length === 0) {
    return
  }
  let min = list[0].summary_begin_time ?? 0
  let max = list[0].summary_end_time ?? 0
  for (const item of list) {
    if ((item.summary_begin_time ?? 0) < min) {
      min = item.summary_begin_time ?? 0
    }
    if ((item.summary_end_time ?? 0) > max) {
      max = item.summary_end_time ?? 0
    }
  }
  if (min === 0 || max === 0) {
    return
  }
  return [min, max]
}

export default function StatementsOverview() {
  const { t } = useTranslation()

  const ctx = useContext(StatementContext)

  const cacheMgr = useContext(CacheContext)

  const [showSettings, setShowSettings] = useState(false)
  const [visibleColumnKeys, setVisibleColumnKeys] =
    useVersionedLocalStorageState(STMT_VISIBLE_COLUMN_KEYS, {
      defaultValue: DEF_STMT_COLUMN_KEYS
    })
  const [showFullSQL, setShowFullSQL] = useVersionedLocalStorageState(
    STMT_SHOW_FULL_SQL,
    { defaultValue: false }
  )
  const [downloading, setDownloading] = useState(false)

  const { timeRange, setTimeRange } = useURLTimeRange()

  const controller = useStatementTableController({
    cacheMgr,
    showFullSQL,
    fetchSchemas: ctx?.cfg.showDBFilter,
    fetchGroups: ctx?.cfg.showResourceGroupFilter,
    fetchConfig: ctx?.cfg.showConfig,
    initialQueryOptions: {
      ...DEF_STMT_QUERY_OPTIONS,
      visibleColumnKeys,
      timeRange
    },
    ds: ctx!.ds
  })
  function updateVisibleColumnKeys(v: IColumnKeys) {
    setVisibleColumnKeys(v)
    stmtTelmetry.changeVisibleColumns(v)

    if (!v[controller.orderOptions.orderBy]) {
      controller.resetOrder()
    }
  }

  function menuItemClick({ key }) {
    switch (key) {
      case 'export':
        const hide = message.loading(
          t('statement.pages.overview.toolbar.exporting') + '...',
          0
        )
        downloadCSV().finally(hide)
        stmtTelmetry.export()
        break
    }
  }

  const dropdownMenu = (
    <Menu onClick={menuItemClick}>
      <Menu.Item
        key="export"
        disabled={downloading}
        icon={<ExportOutlined />}
        data-e2e="statement_export_btn"
      >
        {downloading
          ? t('statement.pages.overview.toolbar.exporting')
          : t('statement.pages.overview.toolbar.export')}
      </Menu.Item>
    </Menu>
  )

  const [filterSchema, setFilterSchema] = useState<string[]>(
    controller.queryOptions.schemas
  )
  const [filterGroup, setFilterGroup] = useState<string[]>(
    controller.queryOptions.groups
  )
  const [filterStmtType, setFilterStmtType] = useState<string[]>(
    controller.queryOptions.stmtTypes
  )
  const [filterText, setFilterText] = useState<string>(
    controller.queryOptions.searchText
  )

  const sendQueryNow = useMemoizedFn(() => {
    cacheMgr?.clear()
    controller.setQueryOptions({
      timeRange,
      schemas: filterSchema,
      groups: filterGroup,
      stmtTypes: filterStmtType,
      searchText: filterText,
      visibleColumnKeys
    })
    stmtTelmetry.search()
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
    filterGroup,
    filterStmtType,
    filterText,
    visibleColumnKeys
  ])

  const downloadCSV = useMemoizedFn(async () => {
    // use last effective query options
    const timeRangeValue = toTimeRangeValue(controller.queryOptions.timeRange)
    try {
      setDownloading(true)
      const res = await ctx!.ds.statementsDownloadTokenPost({
        begin_time: timeRangeValue[0],
        end_time: timeRangeValue[1],
        fields: '*',
        schemas: controller.queryOptions.schemas,
        resource_groups: controller.queryOptions.groups,
        stmt_types: controller.queryOptions.stmtTypes,
        text: controller.queryOptions.searchText
      })
      const token = res.data
      if (token) {
        window.location.href = `${
          ctx!.cfg.apiPathBase
        }/statements/download?token=${token}`
      }
    } finally {
      setDownloading(false)
    }
  })

  const dataTimeRange = useMemo(() => {
    return getDataTimeRange(controller.data?.list)
  }, [controller.data])

  return (
    <div className={styles.list_container}>
      <Card noMarginBottom>
        <Toolbar className={styles.list_toolbar} data-e2e="statement_toolbar">
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
              <TimeRangeSelector
                value={timeRange}
                onChange={(t) => {
                  setTimeRange(t)
                  stmtTelmetry.changeTimeRange(t)
                }}
                data-e2e="statement_time_range_selector"
              />
            )}
            {(ctx?.cfg.showDBFilter ?? true) && (
              <MultiSelect.Plain
                placeholder={t(
                  'statement.pages.overview.toolbar.schemas.placeholder'
                )}
                selectedValueTransKey="statement.pages.overview.toolbar.schemas.selected"
                columnTitle={t(
                  'statement.pages.overview.toolbar.schemas.columnTitle'
                )}
                value={filterSchema}
                style={{ width: 150 }}
                onChange={(d) => {
                  setFilterSchema(d)
                  stmtTelmetry.changeDatabases()
                }}
                items={controller.allSchemas}
                data-e2e="execution_database_name"
              />
            )}

            {(ctx?.cfg.showResourceGroupFilter ?? true) &&
              controller.allGroups?.length > 1 && (
                <MultiSelect.Plain
                  placeholder={t(
                    'statement.pages.overview.toolbar.resource_groups.placeholder'
                  )}
                  selectedValueTransKey="statement.pages.overview.toolbar.resource_groups.selected"
                  columnTitle={t(
                    'statement.pages.overview.toolbar.resource_groups.columnTitle'
                  )}
                  value={filterGroup}
                  style={{ width: 150 }}
                  onChange={(d) => {
                    setFilterGroup(d)
                  }}
                  items={controller.allGroups}
                  data-e2e="resource_group_name_select"
                />
              )}
            <MultiSelect.Plain
              placeholder={t(
                'statement.pages.overview.toolbar.statement_types.placeholder'
              )}
              selectedValueTransKey="statement.pages.overview.toolbar.statement_types.selected"
              columnTitle={t(
                'statement.pages.overview.toolbar.statement_types.columnTitle'
              )}
              value={filterStmtType}
              style={{ width: 150 }}
              onChange={(v) => {
                setFilterStmtType(v)
                stmtTelmetry.changeStmtTypes()
              }}
              items={controller.allStmtTypes}
              data-e2e="statement_types"
            />
            <Input.Search
              value={filterText}
              onChange={(e) => {
                setFilterText(e.target.value)
                stmtTelmetry.changeSearchText()
              }}
              onSearch={sendQueryNow}
              placeholder={t(
                'statement.pages.overview.toolbar.keyword.placeholder'
              )}
              data-e2e="sql_statements_search"
              enterButton={t('statement.pages.overview.toolbar.query')}
            />
            {controller.isLoading && (
              <LoadingOutlined data-e2e="statement_refresh" />
            )}
          </Space>
          <Space>
            {controller.availableColumnsInTable.length > 0 && (
              <ColumnsSelector
                columns={controller.availableColumnsInTable}
                visibleColumnKeys={visibleColumnKeys}
                defaultVisibleColumnKeys={DEF_STMT_COLUMN_KEYS}
                onChange={updateVisibleColumnKeys}
                foot={
                  <Checkbox
                    checked={showFullSQL}
                    onChange={(e) => {
                      setShowFullSQL(e.target.checked)
                      stmtTelmetry.toggleShowFullSQL(e.target.checked)
                    }}
                    data-e2e="statement_show_full_sql"
                  >
                    {t(
                      'statement.pages.overview.toolbar.select_columns.show_full_sql'
                    )}
                  </Checkbox>
                }
              />
            )}
            {(ctx?.cfg.showConfig ?? true) && (
              <Tooltip
                mouseEnterDelay={0}
                mouseLeaveDelay={0}
                title={t('statement.settings.title')}
                placement="bottom"
              >
                <SettingOutlined
                  onClick={() => {
                    setShowSettings(true)
                    stmtTelmetry.openSetting()
                  }}
                  data-e2e="statement_setting"
                />
              </Tooltip>
            )}
            {(ctx?.cfg.enableExport ?? true) && (
              <Dropdown overlay={dropdownMenu} placement="bottomRight">
                <div
                  style={{ cursor: 'pointer' }}
                  data-e2e="statement_export_menu"
                >
                  <MenuOutlined />
                </div>
              </Dropdown>
            )}
            {!isDistro() && (ctx!.cfg.showHelp ?? true) && (
              <Tooltip
                mouseEnterDelay={0}
                mouseLeaveDelay={0}
                title={t('statement.settings.help')}
                placement="bottom"
              >
                <QuestionCircleOutlined
                  onClick={() => {
                    window.open(t('statement.settings.help_url'), '_blank')
                    stmtTelmetry.openHelp()
                  }}
                />
              </Tooltip>
            )}
          </Space>
        </Toolbar>
      </Card>

      <div style={{ height: 16 }} />

      {controller.isEnabled ? (
        <div
          style={{ height: '100%', position: 'relative' }}
          data-e2e="statements_table"
        >
          <ScrollablePane>
            {controller.isDataLoadedSlowly && (ctx?.cfg.instantQuery ?? true) && (
              <Card noMarginBottom noMarginTop>
                <Alert
                  message={t('statement.pages.overview.slow_load_info')}
                  type="info"
                  showIcon
                />
              </Card>
            )}
            <Card noMarginBottom noMarginTop>
              <p className="ant-form-item-extra">
                {dataTimeRange && (ctx?.cfg.showActualTimeRange ?? true) && (
                  <div>
                    {t('statement.pages.overview.actual_range')}
                    <DateTime.Calendar
                      unixTimestampMs={dataTimeRange[0] * 1000}
                    />
                    {' ~ '}
                    <DateTime.Calendar
                      unixTimestampMs={dataTimeRange[1] * 1000}
                    />
                  </div>
                )}
                {(controller.data?.list.length ?? 0) > 0 && (
                  <div>
                    {t('statement.pages.overview.result_count', {
                      n: controller.data?.list.length
                    })}
                  </div>
                )}
              </p>
            </Card>
            <StatementsTable cardNoMarginTop controller={controller} />
          </ScrollablePane>
        </div>
      ) : (
        <Result
          title={t('statement.settings.disabled_result.title')}
          subTitle={t('statement.settings.disabled_result.sub_title')}
          extra={
            <Space>
              <Button type="primary" onClick={() => setShowSettings(true)}>
                {t('statement.settings.open_setting')}
              </Button>
              {!isDistro() && (
                <Button
                  onClick={() => {
                    window.open(t('statement.settings.help_url'), '_blank')
                    stmtTelmetry.openHelp()
                  }}
                >
                  {t('statement.settings.help')}
                </Button>
              )}
            </Space>
          }
        />
      )}

      <Drawer
        title={t('statement.settings.title')}
        width={300}
        closable={true}
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        destroyOnClose={true}
      >
        <StatementSettingForm
          onClose={() => setShowSettings(false)}
          onConfigUpdated={sendQueryNow}
          getStatementConfig={ctx!.ds.statementsConfigGet}
          updateStatementConfig={ctx!.ds.statementsConfigPost}
        />
      </Drawer>
    </div>
  )
}
