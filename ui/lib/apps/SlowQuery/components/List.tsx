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
import { buildQueryFn, parseQueryFn } from '@lib/utils/query'

const { Option } = Select
const { Search } = Input

export interface IPageQuery {
  curTimeRange?: TimeRange
  curSchemas?: string[]
  searchText?: string
  orderBy?: string
  desc?: boolean
  limit?: number
}

function tableColumns(
  rows: SlowqueryBase[],
  onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) => void,
  orderBy: string,
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
  const query = List.parseQuery(useLocation().search)

  const navigate = useNavigate()
  const { t } = useTranslation()

  const [curTimeRange, setCurTimeRange] = useState<TimeRange>(
    query.curTimeRange ?? DEF_TIME_RANGE
  )
  const [curSchemas, setCurSchemas] = useState<string[]>(query.curSchemas ?? [])
  const [schemas, setSchemas] = useState<string[]>([])
  const [searchText, setSearchText] = useState(query.searchText ?? '')
  const [orderBy, setOrderBy] = useState(query.orderBy ?? 'Time')
  const [desc, setDesc] = useState(query.desc ?? true)
  const [limit, setLimit] = useState(query.limit ?? 100)
  const [refreshTimes, setRefreshTimes] = useState(0)

  const [loading, setLoading] = useState(false)
  const [slowQueryList, setSlowQueryList] = useState<SlowqueryBase[]>([])

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
      setSlowQueryList(res.data || [])
    }
    getSlowQueryList()
    const qs = List.buildQuery({
      curTimeRange,
      curSchemas,
      orderBy,
      desc,
      searchText,
      limit,
    })
    navigate(`/slow_query?${qs}`)
  }, [
    curTimeRange,
    curSchemas,
    orderBy,
    desc,
    searchText,
    limit,
    refreshTimes,
    navigate,
  ])

  function handleTimeRangeChange(val: TimeRange) {
    setCurTimeRange(val)
  }

  const newColumns = tableColumns(
    slowQueryList || [],
    onColumnClick,
    orderBy,
    desc
  )

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
            <Search onSearch={handleSearch} />
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
        columns={newColumns}
        onRowClicked={handleRowClick}
      />
    </ScrollablePane>
  )
}

List.buildQuery = buildQueryFn<IPageQuery>()
List.parseQuery = parseQueryFn<IPageQuery>()

export default List
