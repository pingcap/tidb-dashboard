import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Select,
  Space,
  Tooltip,
  Input,
  Checkbox,
  message,
  Menu,
  Dropdown,
} from 'antd'
import {
  ReloadOutlined,
  LoadingOutlined,
  MenuOutlined,
  ExportOutlined,
} from '@ant-design/icons'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { useLocalStorageState } from 'ahooks'

import {
  Card,
  ColumnsSelector,
  TimeRangeSelector,
  Toolbar,
  MultiSelect,
} from '@lib/components'
import { CacheContext } from '@lib/utils/useCache'

import SlowQueriesTable from '../../components/SlowQueriesTable'
import useSlowQueryTableController, {
  DEF_SLOW_QUERY_COLUMN_KEYS,
} from '../../utils/useSlowQueryTableController'

const { Option } = Select
const { Search } = Input

const SLOW_QUERY_VISIBLE_COLUMN_KEYS = 'slow_query.visible_column_keys'
const SLOW_QUERY_SHOW_FULL_SQL = 'slow_query.show_full_sql'
const LIMITS = [100, 200, 500, 1000]

function List() {
  const { t } = useTranslation()

  const slowQueryCacheMgr = useContext(CacheContext)

  const [visibleColumnKeys, setVisibleColumnKeys] = useLocalStorageState(
    SLOW_QUERY_VISIBLE_COLUMN_KEYS,
    DEF_SLOW_QUERY_COLUMN_KEYS
  )
  const [showFullSQL, setShowFullSQL] = useLocalStorageState(
    SLOW_QUERY_SHOW_FULL_SQL,
    false
  )

  const controller = useSlowQueryTableController(
    slowQueryCacheMgr,
    visibleColumnKeys,
    showFullSQL
  )
  const {
    queryOptions,
    setQueryOptions,
    refresh,
    allSchemas,
    loadingSlowQueries,
    tableColumns,
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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Card>
        <Toolbar>
          <Space>
            <TimeRangeSelector
              value={queryOptions.timeRange}
              onChange={(timeRange) =>
                setQueryOptions({
                  ...queryOptions,
                  timeRange,
                })
              }
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
            <Search
              defaultValue={queryOptions.searchText}
              onSearch={(searchText) =>
                setQueryOptions({ ...queryOptions, searchText })
              }
            />
            <Select
              value={queryOptions.limit}
              style={{ width: 150 }}
              onChange={(limit) => setQueryOptions({ ...queryOptions, limit })}
            >
              {LIMITS.map((item) => (
                <Option value={item} key={item}>
                  Limit {item}
                </Option>
              ))}
            </Select>
          </Space>

          <Space>
            {tableColumns.length > 0 && (
              <ColumnsSelector
                columns={tableColumns}
                visibleColumnKeys={visibleColumnKeys}
                defaultVisibleColumnKeys={DEF_SLOW_QUERY_COLUMN_KEYS}
                onChange={setVisibleColumnKeys}
                foot={
                  <Checkbox
                    checked={showFullSQL}
                    onChange={(e) => setShowFullSQL(e.target.checked)}
                  >
                    {t(
                      'statement.pages.overview.toolbar.select_columns.show_full_sql'
                    )}
                  </Checkbox>
                }
              />
            )}
            <Tooltip title={t('statement.pages.overview.toolbar.refresh')}>
              {loadingSlowQueries ? (
                <LoadingOutlined />
              ) : (
                <ReloadOutlined onClick={refresh} />
              )}
            </Tooltip>
            <Dropdown overlay={dropdownMenu} placement="bottomRight">
              <div style={{ cursor: 'pointer' }}>
                <MenuOutlined />
              </div>
            </Dropdown>
          </Space>
        </Toolbar>
      </Card>

      <div style={{ height: '100%', position: 'relative' }}>
        <ScrollablePane>
          <SlowQueriesTable cardNoMarginTop controller={controller} />
        </ScrollablePane>
      </div>
    </div>
  )
}

export default List
