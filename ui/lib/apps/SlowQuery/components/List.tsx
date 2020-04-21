import React, { useState, useEffect, useRef } from 'react'
import { Select, Space, Tooltip, Input } from 'antd'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { useNavigate } from 'react-router-dom'
import { Card, CardTableV2 } from '@lib/components'
import TimeRangeSelector from './TimeRangeSelector'
import { useTranslation } from 'react-i18next'
import client, { StatementTimeRange, SlowqueryBase } from '@lib/client'
import { ReloadOutlined } from '@ant-design/icons'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import * as useSlowQueryColumn from '../utils/useColumn'

const { Option } = Select
const { Search } = Input

const tableColumns = (
  rows: SlowqueryBase[],
  onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) => void,
  orderBy: string,
  desc: boolean,
  showFullSQL?: boolean
): IColumn[] => {
  return [
    useSlowQueryColumn.useInstanceColumn(rows),
    useSlowQueryColumn.useConnectionIDColumn(rows),
    useSlowQueryColumn.useDigestColumn(rows, showFullSQL),
    useSlowQueryColumn.useEndTimeColumn(rows),
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
  ]
}

export default function List() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [orderBy, setOrderBy] = useState('Query_time')
  const [desc, setDesc] = useState(true)

  const [curSchemas, setCurSchemas] = useState<string[]>([])
  const [schemas, setSchemas] = useState<string[]>([])
  const [refreshTimes, setRefreshTimes] = useState(0)

  const [loading, setLoading] = useState(false)
  const [slowQueryList, setSlowQueryList] = useState<SlowqueryBase[]>([])

  // const {
  //   data: slowQueryList,
  //   isLoading: listLoading,
  //   sendRequest,
  // } = useClientRequest((cancelToken) => client.getInstance().slowqueryListGet())
  const [columns, setColumns] = useState<IColumn[]>([])

  useEffect(() => {
    setColumns(tableColumns(slowQueryList || [], onColumnClick, orderBy, desc))
    // eslint-disable-next-line
  }, [slowQueryList])

  useEffect(() => {
    async function getSlowQueryList() {
      setLoading(true)
      const res = await client
        .getInstance()
        .slowqueryListGet('', desc, 50, undefined, undefined, orderBy, '')
      setLoading(false)
      if (res?.data) {
        setSlowQueryList(res.data || [])
      }
    }
    getSlowQueryList()
  }, [orderBy, desc, refreshTimes])

  function handleTimeRangeChange(val: StatementTimeRange) {}

  function handleSchemaChange() {}

  function handleRowClick(rec) {
    navigate(`/slow_query/detail`)
  }

  function onColumnClick(_ev: React.MouseEvent<HTMLElement>, column: IColumn) {
    if (column.key === orderBy) {
      setDesc(!desc)
    } else {
      setOrderBy(column.key)
      setDesc(true)
    }
  }

  return (
    <ScrollablePane style={{ height: '100vh' }}>
      <Card>
        <div style={{ display: 'flex' }}>
          <Space size="middle">
            <TimeRangeSelector
              timeRanges={[]}
              onChange={handleTimeRangeChange}
            />
            <Select
              value={curSchemas}
              mode="multiple"
              allowClear
              placeholder={t('statement.pages.overview.toolbar.select_schemas')}
              style={{ minWidth: 200 }}
              onChange={handleSchemaChange}
            >
              {schemas.map((item) => (
                <Option value={item} key={item}>
                  {item}
                </Option>
              ))}
            </Select>
            <Search placeholder="包含文本" />
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
