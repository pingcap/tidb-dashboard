import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Select, Space, Tooltip, Input, Checkbox } from 'antd'
import { ReloadOutlined, LoadingOutlined } from '@ant-design/icons'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import { useLocalStorageState } from '@umijs/hooks'

import {
  Card,
  ColumnsSelector,
  IColumnKeys,
  TimeRangeSelector,
  Toolbar,
} from '@lib/components'
import client from '@lib/client'
import SlowQueriesTable from '../../components/SlowQueriesTable'
import useSlowQuery from '../../utils/useSlowQuery'

const { Option } = Select
const { Search } = Input

const VISIBLE_COLUMN_KEYS = 'slow_query.visible_column_keys'
const SHOW_FULL_SQL = 'slow_query.show_full_sql'
const LIMITS = [100, 200, 500, 1000]

export const defSlowQueryColumnKeys: IColumnKeys = {
  sql: true,
  Time: true,
  Query_time: true,
  Mem_max: true,
}

function List() {
  const { t } = useTranslation()

  const {
    savedQueryOptions,
    setSavedQueryOptions,
    loadingSlowQueries,
    slowQueries,
    refresh,
  } = useSlowQuery()

  const [allSchemas, setAllSchemas] = useState<string[]>([])

  const [columns, setColumns] = useState<IColumn[]>([])
  const [visibleColumnKeys, setVisibleColumnKeys] = useLocalStorageState(
    VISIBLE_COLUMN_KEYS,
    defSlowQueryColumnKeys
  )
  const [showFullSQL, setShowFullSQL] = useLocalStorageState(
    SHOW_FULL_SQL,
    false
  )

  const onChangeSort = useCallback((orderBy, desc) => {
    setSavedQueryOptions({
      ...savedQueryOptions,
      orderBy,
      desc,
    })
  }, [])

  useEffect(() => {
    async function getSchemas() {
      const res = await client.getInstance().statementsSchemasGet()
      setAllSchemas(res?.data || [])
    }
    getSchemas()
  }, [])

  return (
    <ScrollablePane style={{ height: '100vh' }}>
      <Card>
        <Toolbar>
          <Space>
            <TimeRangeSelector
              value={savedQueryOptions.timeRange}
              onChange={(timeRange) =>
                setSavedQueryOptions({ ...savedQueryOptions, timeRange })
              }
            />
            <Select
              value={savedQueryOptions.schemas}
              mode="multiple"
              allowClear
              placeholder={t('statement.pages.overview.toolbar.select_schemas')}
              style={{ minWidth: 200 }}
              onChange={(schemas) =>
                setSavedQueryOptions({ ...savedQueryOptions, schemas })
              }
            >
              {allSchemas.map((item) => (
                <Option value={item} key={item}>
                  {item}
                </Option>
              ))}
            </Select>
            <Search
              defaultValue={savedQueryOptions.searchText}
              onSearch={(searchText) =>
                setSavedQueryOptions({ ...savedQueryOptions, searchText })
              }
            />
            <Select
              value={savedQueryOptions.limit}
              style={{ width: 150 }}
              onChange={(limit) =>
                setSavedQueryOptions({ ...savedQueryOptions, limit })
              }
            >
              {LIMITS.map((item) => (
                <Option value={item} key={item}>
                  Limit {item}
                </Option>
              ))}
            </Select>
          </Space>

          <Space>
            {columns.length > 0 && (
              <ColumnsSelector
                columns={columns}
                visibleColumnKeys={visibleColumnKeys}
                resetColumnKeys={defSlowQueryColumnKeys}
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
          </Space>
        </Toolbar>
      </Card>

      <SlowQueriesTable
        loading={loadingSlowQueries}
        slowQueries={slowQueries}
        orderBy={savedQueryOptions.orderBy}
        desc={savedQueryOptions.desc}
        showFullSQL={showFullSQL}
        visibleColumnKeys={visibleColumnKeys}
        onGetColumns={setColumns}
        onChangeSort={onChangeSort}
      />
    </ScrollablePane>
  )
}

export default List
