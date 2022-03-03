import React, { useState, useContext } from 'react'
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
  message,
} from 'antd'
import {
  ReloadOutlined,
  LoadingOutlined,
  SettingOutlined,
  ExportOutlined,
  MenuOutlined,
} from '@ant-design/icons'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { useTranslation } from 'react-i18next'

import { CacheContext } from '@lib/utils/useCache'
import { Card, ColumnsSelector, Toolbar, MultiSelect } from '@lib/components'
import { useLocalStorageState } from '@lib/utils/useLocalStorageState'

import { StatementsTable } from '../../components'
import StatementSettingForm from './StatementSettingForm'
import TimeRangeSelector from './TimeRangeSelector'
import useStatementTableController, {
  DEF_STMT_COLUMN_KEYS,
} from '../../utils/useStatementTableController'

import styles from './List.module.less'

const { Search } = Input

const STMT_VISIBLE_COLUMN_KEYS = 'statement.visible_column_keys'
const STMT_SHOW_FULL_SQL = 'statement.show_full_sql'

export default function StatementsOverview() {
  const { t } = useTranslation()

  const statementCacheMgr = useContext(CacheContext)

  const [showSettings, setShowSettings] = useState(false)
  const [visibleColumnKeys, setVisibleColumnKeys] = useLocalStorageState(
    STMT_VISIBLE_COLUMN_KEYS,
    DEF_STMT_COLUMN_KEYS,
    true
  )
  const [showFullSQL, setShowFullSQL] = useLocalStorageState(
    STMT_SHOW_FULL_SQL,
    false
  )

  const controller = useStatementTableController(
    statementCacheMgr,
    visibleColumnKeys,
    showFullSQL
  )
  const {
    queryOptions,
    setQueryOptions,
    refresh,
    enable,
    allTimeRanges,
    allSchemas,
    allStmtTypes,
    loadingStatements,
    tableColumns,
    isTimeRangeOutdated,

    downloadCSV,
    downloading,
  } = controller

  function exportCSV() {
    const hide = message.loading(
      t('statement.pages.overview.toolbar.exporting') + '...',
      0
    )
    downloadCSV().finally(hide)
  }

  function menuItemClick({ key }) {
    switch (key) {
      case 'export':
        exportCSV()
        break
    }
  }

  const dropdownMenu = (
    <Menu onClick={menuItemClick}>
      <Menu.Item key="export" disabled={downloading} icon={<ExportOutlined />}>
        {downloading
          ? t('statement.pages.overview.toolbar.exporting')
          : t('statement.pages.overview.toolbar.export')}
      </Menu.Item>
    </Menu>
  )

  return (
    <div className={styles.list_container}>
      <Card>
        <Toolbar className={styles.list_toolbar} data-e2e="statement_toolbar">
          <Space>
            <TimeRangeSelector
              value={queryOptions.timeRange}
              timeRanges={allTimeRanges}
              onChange={(timeRange) =>
                setQueryOptions({
                  ...queryOptions,
                  timeRange,
                })
              }
              data-e2e="statement_time_range_selector"
            />
            <MultiSelect.Plain
              placeholder={t(
                'statement.pages.overview.toolbar.schemas.placeholder'
              )}
              selectedValueTransKey="statement.pages.overview.toolbar.schemas.selected"
              columnTitle={t(
                'statement.pages.overview.toolbar.schemas.columnTitle'
              )}
              value={queryOptions.schemas}
              style={{ width: 150 }}
              onChange={(schemas) =>
                setQueryOptions({
                  ...queryOptions,
                  schemas,
                })
              }
              items={allSchemas}
            />
            <MultiSelect.Plain
              placeholder={t(
                'statement.pages.overview.toolbar.statement_types.placeholder'
              )}
              selectedValueTransKey="statement.pages.overview.toolbar.statement_types.selected"
              columnTitle={t(
                'statement.pages.overview.toolbar.statement_types.columnTitle'
              )}
              value={queryOptions.stmtTypes}
              style={{ width: 150 }}
              onChange={(stmtTypes) =>
                setQueryOptions({
                  ...queryOptions,
                  stmtTypes,
                })
              }
              items={allStmtTypes}
            />
            <Search
              defaultValue={queryOptions.searchText}
              onSearch={(searchText) =>
                setQueryOptions({ ...queryOptions, searchText })
              }
              data-e2e="sql_statements_search"
            />
          </Space>

          <Space>
            {tableColumns.length > 0 && (
              <ColumnsSelector
                columns={tableColumns}
                visibleColumnKeys={visibleColumnKeys}
                defaultVisibleColumnKeys={DEF_STMT_COLUMN_KEYS}
                onChange={setVisibleColumnKeys}
                foot={
                  <Checkbox
                    checked={showFullSQL}
                    onChange={(e) => setShowFullSQL(e.target.checked)}
                    data-e2e="statement_show_full_sql"
                  >
                    {t(
                      'statement.pages.overview.toolbar.select_columns.show_full_sql'
                    )}
                  </Checkbox>
                }
              />
            )}
            {enable && (
              <RefreshTooltip isOutdated={isTimeRangeOutdated}>
                {loadingStatements ? (
                  <LoadingOutlined data-e2e="statement_refresh" />
                ) : (
                  <ReloadOutlined
                    onClick={refresh}
                    data-e2e="statement_refresh"
                  />
                )}
              </RefreshTooltip>
            )}
            <Tooltip title={t('statement.settings.title')} placement="bottom">
              <SettingOutlined
                onClick={() => setShowSettings(true)}
                data-e2e="statement_setting"
              />
            </Tooltip>
            <Dropdown overlay={dropdownMenu} placement="bottomRight">
              <div style={{ cursor: 'pointer' }}>
                <MenuOutlined />
              </div>
            </Dropdown>
          </Space>
        </Toolbar>
      </Card>

      {enable ? (
        <div
          style={{ height: '100%', position: 'relative' }}
          data-e2e="statements_table"
        >
          <ScrollablePane>
            <StatementsTable cardNoMarginTop controller={controller} />
          </ScrollablePane>
        </div>
      ) : (
        <Result
          title={t('statement.settings.disabled_result.title')}
          subTitle={t('statement.settings.disabled_result.sub_title')}
          extra={
            <Button type="primary" onClick={() => setShowSettings(true)}>
              {t('statement.settings.open_setting')}
            </Button>
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
          onConfigUpdated={refresh}
        />
      </Drawer>
    </div>
  )
}

function RefreshTooltip({ isOutdated, children }) {
  const { t } = useTranslation()
  return isOutdated ? (
    <Tooltip
      arrowPointAtCenter
      title={t('statement.pages.overview.toolbar.refresh_outdated')}
      visible={isOutdated}
      placement="bottomLeft"
    >
      {children}
    </Tooltip>
  ) : (
    <Tooltip
      title={t('statement.pages.overview.toolbar.refresh')}
      placement="bottom"
    >
      {children}
    </Tooltip>
  )
}
