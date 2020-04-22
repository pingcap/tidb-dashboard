import React, { useState, useEffect } from 'react'
import { Select, Space, Tooltip, Input } from 'antd'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { useNavigate, useLocation } from 'react-router-dom'
import { Card, CardTableV2 } from '@lib/components'
import TimeRangeSelector, {
  TimeRange,
  DEF_TIME_RANGE,
} from './TimeRangeSelector'
import { useTranslation } from 'react-i18next'
import client, { SlowqueryBase } from '@lib/client'
import { ReloadOutlined } from '@ant-design/icons'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import * as useSlowQueryColumn from '../utils/useColumn'
import DetailPage from './Detail'
import * as useColumn from '@lib/utils/useColumn'

const { Option } = Select
const { Search } = Input

function tableColumns(
  rows: SlowqueryBase[],
  onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) => void,
  orderBy: string,
  desc: boolean,
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

export default function List() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [curTimeRange, setCurTimeRange] = useState<TimeRange>(DEF_TIME_RANGE)
  const [curSchemas, setCurSchemas] = useState<string[]>([])
  const [schemas, setSchemas] = useState<string[]>([])
  const [searchText, setSearchText] = useState('')
  const [orderBy, setOrderBy] = useState('Time')
  const [desc, setDesc] = useState(true)
  const [limit, setLimit] = useState(100)
  const [refreshTimes, setRefreshTimes] = useState(0)

  const [loading, setLoading] = useState(false)
  const [slowQueryList, setSlowQueryList] = useState<SlowqueryBase[]>([])

  const [columns, setColumns] = useState<IColumn[]>(
    tableColumns(slowQueryList || [], onColumnClick, orderBy, desc)
  )

  // useEffect(() => {
  //   setColumns(tableColumns(slowQueryList || [], onColumnClick, orderBy, desc))
  //   // eslint-disable-next-line
  // }, [orderBy, desc])

  useEffect(() => {
    async function getSchemas() {
      const res = await client.getInstance().statementsSchemasGet()
      setSchemas(res?.data || [])
    }
    getSchemas()
  }, [])

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
      if (res?.data) {
        setSlowQueryList(res.data || [])
        setColumns(tableColumns(res.data || [], onColumnClick, orderBy, desc))
      }
    }
    getSlowQueryList()
  }, [curTimeRange, curSchemas, orderBy, desc, searchText, limit, refreshTimes])

  // TODO: refine
  const location = useLocation()
  useEffect(() => {
    if (location.search === '?from=detail') {
      // load
      const searchOptionsStr = localStorage.getItem('slow_query_search_options')
      if (searchOptionsStr !== null) {
        const searchOptions = JSON.parse(searchOptionsStr)
        setCurTimeRange(searchOptions.curTimeRange)
        setCurSchemas(searchOptions.curSchemas)
        setSearchText(searchOptions.searchText)
        setLimit(searchOptions.limit)
        setOrderBy(searchOptions.orderBy)
        setDesc(searchOptions.desc)
      }
    }
    // eslint-disable-next-line
  }, [])

  function handleTimeRangeChange(val: TimeRange) {
    setCurTimeRange(val)
  }

  function onColumnClick(_ev: React.MouseEvent<HTMLElement>, column: IColumn) {
    if (column.key === orderBy) {
      setDesc(!desc)
    } else {
      setOrderBy(column.key)
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

    // save search options
    const searchOptions = JSON.stringify({
      curTimeRange,
      curSchemas,
      orderBy,
      desc,
      searchText,
      limit,
    })
    localStorage.setItem('slow_query_search_options', searchOptions)
  }

  function handleSearch(value) {
    setSearchText(value)
  }

  return (
    <ScrollablePane style={{ height: '100vh' }}>
      <Card>
        <div style={{ display: 'flex' }}>
          <Space size="middle">
            <TimeRangeSelector
              value={curTimeRange}
              onChange={handleTimeRangeChange}
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
              onSearch={handleSearch}
            />
            <Select
              defaultValue="100"
              style={{ width: 150 }}
              onChange={(val) => setLimit(+val!)}
            >
              <Option value="100">Limit 100</Option>
              <Option value="200">Limit 200</Option>
              <Option value="500">Limit 500</Option>
              <Option value="1000">Limit 1000</Option>
            </Select>
          </Space>
          <div style={{ flex: 1 }} />
          <Space size="middle">
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
