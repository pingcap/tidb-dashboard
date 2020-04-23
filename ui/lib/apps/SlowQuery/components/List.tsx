import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Select, Space, Tooltip, Input } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import client, { SlowqueryBase } from '@lib/client'
import { Card, CardTableV2 } from '@lib/components'
import * as useColumn from '@lib/utils/useColumn'
import * as useSlowQueryColumn from '../utils/useColumn'
import DetailPage from './Detail'
import TimeRangeSelector, {
  TimeRange,
  DEF_TIME_RANGE,
} from './TimeRangeSelector'

import styles from './List.module.less'

const { Option } = Select
const { Search } = Input

const LIMITS = [100, 200, 500, 1000]
const SEARCH_OPTIONS_SESSION_KEY = 'slow_query_search_options'
type OrderBy = 'Query_time' | 'Mem_max' | 'Time'

const tableColumns = (
  rows: SlowqueryBase[],
  onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) => void,
  orderBy: OrderBy,
  desc: boolean
): IColumn[] => {
  return [
    useSlowQueryColumn.useSqlColumn(rows),
    useSlowQueryColumn.useTimestampColumn(rows),
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

export default function List() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [curTimeRange, setCurTimeRange] = useState<TimeRange>(DEF_TIME_RANGE)
  const [curSchemas, setCurSchemas] = useState<string[]>([])
  const [schemas, setSchemas] = useState<string[]>([])
  const [searchText, setSearchText] = useState('')
  const [orderBy, setOrderBy] = useState<OrderBy>('Query_time')
  const [desc, setDesc] = useState(true)
  const [limit, setLimit] = useState(100)
  const [refreshTimes, setRefreshTimes] = useState(0)

  const [loading, setLoading] = useState(true)
  const [slowQueryList, setSlowQueryList] = useState<SlowqueryBase[]>([])

  const [columns, setColumns] = useState<IColumn[]>([])

  useEffect(() => {
    setColumns(tableColumns(slowQueryList || [], onColumnClick, orderBy, desc))
    // eslint-disable-next-line
  }, [slowQueryList])

  useEffect(() => {
    async function getSchemas() {
      const res = await client.getInstance().statementsSchemasGet()
      setSchemas(res?.data || [])
    }
    getSchemas()
  }, [])

  useEffect(() => {
    function loadSearchOptions() {
      const content = sessionStorage.getItem(SEARCH_OPTIONS_SESSION_KEY)
      if (content !== null) {
        const searchOptions = JSON.parse(content)
        setCurTimeRange(searchOptions.curTimeRange)
        setCurSchemas(searchOptions.curSchemas)
        setSearchText(searchOptions.searchText)
        setLimit(searchOptions.limit)
        setOrderBy(searchOptions.orderBy)
        setDesc(searchOptions.desc)
      }
    }
    loadSearchOptions()
  }, [])

  useEffect(() => {
    function saveSearchOptions() {
      const searchOptions = JSON.stringify({
        curTimeRange,
        curSchemas,
        searchText,
        limit,
        orderBy,
        desc,
      })
      sessionStorage.setItem(SEARCH_OPTIONS_SESSION_KEY, searchOptions)
    }
    saveSearchOptions()
  }, [curTimeRange, curSchemas, searchText, limit, orderBy, desc])

  useEffect(() => {
    async function getSlowQueryList() {
      setLoading(true)
      const res = await client
        .getInstance()
        .slowQueryListGet(
          curSchemas,
          desc,
          limit,
          curTimeRange?.end_time,
          curTimeRange?.begin_time,
          orderBy,
          searchText
        )
      setLoading(false)
      setSlowQueryList(res?.data || [])
    }
    getSlowQueryList()
  }, [curTimeRange, curSchemas, orderBy, desc, searchText, limit, refreshTimes])

  function onColumnClick(_ev: React.MouseEvent<HTMLElement>, column: IColumn) {
    if (column.key === orderBy) {
      setDesc(!desc)
    } else {
      setOrderBy(column.key as OrderBy)
      setDesc(true)
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
              value={curTimeRange}
              onChange={setCurTimeRange}
            />
            <Select
              value={curSchemas}
              mode="multiple"
              allowClear
              placeholder={t('statement.pages.overview.toolbar.select_schemas')}
              style={{ minWidth: 200 }}
              onChange={setCurSchemas}
            >
              {schemas.map((item) => (
                <Option value={item} key={item}>
                  {item}
                </Option>
              ))}
            </Select>
            <Search
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Select value={limit} style={{ width: 150 }} onChange={setLimit}>
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
