import React, { useState, useEffect } from 'react'
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
  MultiSelect,
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
    queryOptions,
    setQueryOptions,
    orderOptions,
    changeOrder,
    refresh,

    loadingSlowQueries,
    slowQueries,

    errorMsg,
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

  useEffect(() => {
    async function getSchemas() {
      const res = await client.getInstance().statementsSchemasGet()
      setAllSchemas(res?.data || [])
    }
    getSchemas()
  }, [])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Card>
        <Toolbar>
          <Space>
            <TimeRangeSelector
              value={queryOptions.timeRange}
              onChange={(timeRange) =>
                setQueryOptions({ ...queryOptions, timeRange })
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

      <div style={{ height: '100%', position: 'relative' }}>
        <ScrollablePane>
          <SlowQueriesTable
            cardNoMarginTop
            loading={loadingSlowQueries}
            errorMsg={errorMsg}
            slowQueries={slowQueries}
            orderBy={orderOptions.orderBy}
            desc={orderOptions.desc}
            showFullSQL={showFullSQL}
            visibleColumnKeys={visibleColumnKeys}
            onGetColumns={setColumns}
            onChangeOrder={changeOrder}
          />
        </ScrollablePane>
      </div>
    </div>
  )
}

export default List
