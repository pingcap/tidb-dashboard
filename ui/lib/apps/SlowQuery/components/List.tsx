import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Select, Space, Tooltip, Input, Checkbox } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import { useSessionStorageState, useLocalStorageState } from '@umijs/hooks'
import { Card, ColumnsSelector, IColumnKeys } from '@lib/components'
import client, { SlowqueryBase } from '@lib/client'
import TimeRangeSelector, {
  TimeRange,
  getDefTimeRange,
} from './TimeRangeSelector'
import SlowQueriesTable from './SlowQueriesTable'

import styles from './List.module.less'
import dayjs from 'dayjs'

const { Option } = Select
const { Search } = Input

const VISIBLE_COLUMN_KEYS = 'slow_query_visible_column_keys'
const SHOW_FULL_SQL = 'slow_query_show_full_sql'
const SEARCH_OPTIONS_SESSION_KEY = 'slow_query_search_options'
const LIMITS = [100, 200, 500, 1000]

export interface ISearchOptions {
  timeRange: TimeRange
  schemas: string[]
  searchText: string
  orderBy: string
  desc: boolean
  limit: number
}

export function getDefSearchOptions(): ISearchOptions {
  return {
    timeRange: getDefTimeRange(),
    schemas: [],
    searchText: '',
    orderBy: 'Time',
    desc: true,
    limit: 100,
  }
}

const defColumnKeys: IColumnKeys = {
  sql: true,
  Time: true,
  Query_time: true,
  Mem_max: true,
}

function List() {
  const { t } = useTranslation()

  const [searchOptions, setSearchOptions] = useSessionStorageState(
    SEARCH_OPTIONS_SESSION_KEY,
    getDefSearchOptions()
  )

  const [loading, setLoading] = useState(true)
  const [refreshTimes, setRefreshTimes] = useState(0)
  const [allSchemas, setAllSchemas] = useState<string[]>([])
  const [slowQueryList, setSlowQueryList] = useState<SlowqueryBase[]>([])

  const [columns, setColumns] = useState<IColumn[]>([])
  const [visibleColumnKeys, setVisibleColumnKeys] = useLocalStorageState(
    VISIBLE_COLUMN_KEYS,
    defColumnKeys
  )
  const [showFullSQL, setShowFullSQL] = useLocalStorageState(
    SHOW_FULL_SQL,
    false
  )

  useEffect(() => {
    async function getSchemas() {
      const res = await client.getInstance().statementsSchemasGet()
      setAllSchemas(res?.data || [])
    }
    getSchemas()
  }, [])

  useEffect(() => {
    async function getSlowQueryList() {
      setLoading(true)
      const recentMins = searchOptions.timeRange.recent
      if (recentMins > 0) {
        // beginTime & endTime is fixed value,
        // so update them to the time range from now
        const now = dayjs().unix()
        const beginTime = now - recentMins * 60
        searchOptions.timeRange = {
          recent: recentMins,
          begin_time: beginTime,
          end_time: now,
        }
      }
      const res = await client
        .getInstance()
        .slowQueryListGet(
          searchOptions.schemas,
          searchOptions.desc,
          '',
          searchOptions.limit,
          searchOptions.timeRange.end_time,
          searchOptions.timeRange.begin_time,
          searchOptions.orderBy,
          [],
          searchOptions.searchText
        )
      setLoading(false)
      setSlowQueryList(res.data || [])
    }
    getSlowQueryList()
  }, [searchOptions, refreshTimes])

  return (
    <ScrollablePane style={{ height: '100vh' }}>
      <Card>
        <div className={styles.header}>
          <Space size="middle" className={styles.search_options}>
            <TimeRangeSelector
              value={searchOptions.timeRange}
              onChange={(timeRange) =>
                setSearchOptions({ ...searchOptions, timeRange })
              }
            />
            <Select
              value={searchOptions.schemas}
              mode="multiple"
              allowClear
              placeholder={t('statement.pages.overview.toolbar.select_schemas')}
              style={{ minWidth: 200 }}
              onChange={(schemas) =>
                setSearchOptions({ ...searchOptions, schemas })
              }
            >
              {allSchemas.map((item) => (
                <Option value={item} key={item}>
                  {item}
                </Option>
              ))}
            </Select>
            <Search
              defaultValue={searchOptions.searchText}
              onSearch={(searchText) =>
                setSearchOptions({ ...searchOptions, searchText })
              }
            />
            <Select
              value={searchOptions.limit}
              style={{ width: 150 }}
              onChange={(limit) =>
                setSearchOptions({ ...searchOptions, limit })
              }
            >
              {LIMITS.map((item) => (
                <Option value={item} key={item}>
                  Limit {item}
                </Option>
              ))}
            </Select>
          </Space>
          <Space size="middle" className={styles.right_actions}>
            {columns.length > 0 && (
              <ColumnsSelector
                columns={columns}
                visibleColumnKeys={visibleColumnKeys}
                resetColumnKeys={defColumnKeys}
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
              <ReloadOutlined
                onClick={() => setRefreshTimes((prev) => prev + 1)}
              />
            </Tooltip>
          </Space>
        </div>
      </Card>
      <SlowQueriesTable
        loading={loading}
        slowQueries={slowQueryList}
        orderBy={searchOptions.orderBy}
        desc={searchOptions.desc}
        showFullSQL={showFullSQL}
        onChangeSort={(orderBy, desc) =>
          setSearchOptions({
            ...searchOptions,
            orderBy,
            desc,
          })
        }
        onGetColumns={setColumns}
        visibleColumnKeys={visibleColumnKeys}
      />
    </ScrollablePane>
  )
}

export default List
