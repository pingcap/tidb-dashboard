import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Select, Space, Tooltip, Input } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import { useSessionStorageState } from '@umijs/hooks'
import { Card, CardTableV2 } from '@lib/components'
import client, { SlowqueryBase } from '@lib/client'
import * as useColumn from '@lib/utils/useColumn'
import TimeRangeSelector, {
  TimeRange,
  DEF_TIME_RANGE,
} from './TimeRangeSelector'
import DetailPage from './Detail'
import * as useSlowQueryColumn from '../utils/useColumn'

import styles from './List.module.less'

const { Option } = Select
const { Search } = Input

const SEARCH_OPTIONS_SESSION_KEY = 'slow_query_search_options'
const LIMITS = [100, 200, 500, 1000]

type OrderBy = 'Query_time' | 'Mem_max' | 'Time'

export interface ISearchOptions {
  timeRange: TimeRange
  schemas: string[]
  searchText: string
  orderBy: OrderBy
  desc: boolean
  limit: number
}

const defSearchOptions: ISearchOptions = {
  timeRange: DEF_TIME_RANGE,
  schemas: [],
  searchText: '',
  orderBy: 'Time',
  desc: true,
  limit: 100,
}

function tableColumns(
  rows: SlowqueryBase[],
  onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) => void,
  orderBy: OrderBy,
  desc: boolean
): IColumn[] {
  return [
    useSlowQueryColumn.useSqlColumn(rows),
    {
      ...useSlowQueryColumn.useTimestampColumn(rows),
      isSorted: orderBy === 'Time',
      isSortedDescending: desc,
      onColumnClick: onColumnClick,
    },
    {
      ...useSlowQueryColumn.useQueryTimeColumn(rows),
      isSorted: orderBy === 'Query_time',
      isSortedDescending: desc,
      onColumnClick: onColumnClick,
    },
    {
      ...useSlowQueryColumn.useMemoryColumn(rows),
      isSorted: orderBy === 'Mem_max',
      isSortedDescending: desc,
      onColumnClick: onColumnClick,
    },
    useColumn.useDummyColumn(),
  ]
}

function List() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [searchOptions, setSearchOptions] = useSessionStorageState(
    SEARCH_OPTIONS_SESSION_KEY,
    defSearchOptions
  )

  const [loading, setLoading] = useState(true)
  const [refreshTimes, setRefreshTimes] = useState(0)
  const [allSchemas, setAllSchemas] = useState<string[]>([])
  const [slowQueryList, setSlowQueryList] = useState<SlowqueryBase[]>([])

  const columns = tableColumns(
    slowQueryList || [],
    onColumnClick,
    searchOptions.orderBy,
    searchOptions.desc
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
      const res = await client
        .getInstance()
        .slowQueryListGet(
          searchOptions.schemas,
          searchOptions.desc,
          searchOptions.limit,
          searchOptions.timeRange.end_time,
          searchOptions.timeRange.begin_time,
          searchOptions.orderBy,
          searchOptions.searchText
        )
      setLoading(false)
      setSlowQueryList(res.data || [])
    }
    getSlowQueryList()
  }, [searchOptions, refreshTimes])

  function onColumnClick(_ev: React.MouseEvent<HTMLElement>, column: IColumn) {
    if (column.key === searchOptions.orderBy) {
      setSearchOptions({
        ...searchOptions,
        desc: !searchOptions.desc,
      })
    } else {
      setSearchOptions({
        ...searchOptions,
        orderBy: column.key as OrderBy,
        desc: true,
      })
    }
  }

  function handleRowClick(rec) {
    const qs = DetailPage.buildQuery({
      digest: rec.digest,
      connectId: rec.connection_id,
      time: rec.timestamp,
    })
    navigate(`/slow_query/detail?${qs}`)
  }

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
            <Tooltip title={t('statement.pages.overview.toolbar.refresh')}>
              <ReloadOutlined
                onClick={() => setRefreshTimes((prev) => prev + 1)}
              />
            </Tooltip>
          </Space>
        </div>
      </Card>
      <CardTableV2
        loading={loading}
        items={slowQueryList || []}
        columns={columns}
        onRowClicked={handleRowClick}
      />
    </ScrollablePane>
  )
}

export default List
