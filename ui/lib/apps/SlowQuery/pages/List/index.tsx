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
  ExportOutlined,
  MenuOutlined,
} from '@ant-design/icons'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'

import {
  Card,
  ColumnsSelector,
  TimeRangeSelector,
  Toolbar,
  MultiSelect,
} from '@lib/components'
import { CacheContext } from '@lib/utils/useCache'
import { useLocalStorageState } from '@lib/utils/useLocalStorageState'

import SlowQueriesTable from '../../components/SlowQueriesTable'
import useSlowQueryTableController, {
  DEF_SLOW_QUERY_COLUMN_KEYS,
} from '../../utils/useSlowQueryTableController'

import styles from './List.module.less'

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
    DEF_SLOW_QUERY_COLUMN_KEYS,
    true
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
    const hide = message.loading(t('slow_query.toolbar.exporting') + '...', 0)
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
          ? t('slow_query.toolbar.exporting')
          : t('slow_query.toolbar.export')}
      </Menu.Item>
    </Menu>
  )

  return (
    <div className={styles.list_container}>
      <Card>
        <Toolbar className={styles.list_toolbar} data-e2e="slow_query_toolbar">
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
              placeholder={t('slow_query.toolbar.schemas.placeholder')}
              selectedValueTransKey="slow_query.toolbar.schemas.selected"
              columnTitle={t('slow_query.toolbar.schemas.columnTitle')}
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
              data-e2e="slow_query_search"
            />
            <Select
              value={queryOptions.limit}
              style={{ width: 150 }}
              onChange={(limit) => setQueryOptions({ ...queryOptions, limit })}
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
                    data-e2e="slow_query_show_full_sql"
                  >
                    {t('slow_query.toolbar.select_columns.show_full_sql')}
                  </Checkbox>
                }
              />
            )}
            <Tooltip title={t('slow_query.toolbar.refresh')} placement="bottom">
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
