import React, { useState, useEffect } from 'react'
import { Select, Space, Tooltip, Input } from 'antd'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { useNavigate } from 'react-router-dom'
import { Card, CardTableV2 } from '@lib/components'
import TimeRangeSelector from './TimeRangeSelector'
import { useTranslation } from 'react-i18next'
import client, { StatementTimeRange, SlowqueryBase } from '@lib/client'
import { ReloadOutlined } from '@ant-design/icons'
import { useClientRequest } from '@lib/utils/useClientRequest'
import {
  IColumn,
  ColumnActionsMode,
} from 'office-ui-fabric-react/lib/DetailsList'
import * as useSlowQueryColumn from '../utils/useColumn'

const { Option } = Select
const { Search } = Input

const tableColumns = (
  rows: SlowqueryBase[],
  showFullSQL?: boolean
): IColumn[] => {
  return [
    useSlowQueryColumn.useInstanceColumn(rows),
    useSlowQueryColumn.useConnectionIDColumn(rows),
    useSlowQueryColumn.useDigestColumn(rows, showFullSQL),
    useSlowQueryColumn.useEndTimeColumn(rows),
    useSlowQueryColumn.useQueryTimeColumn(rows),
    useSlowQueryColumn.useMemoryColumn(rows),
  ]
}

export default function List() {
  const [curSchemas, setCurSchemas] = useState<string[]>([])
  const [schemas, setSchemas] = useState<string[]>([])
  const [refreshTimes, setRefreshTimes] = useState(0)
  const navigate = useNavigate()

  const { t } = useTranslation()

  const {
    data: slowQueryList,
    isLoading: listLoading,
  } = useClientRequest((cancelToken) => client.getInstance().slowqueryListGet())
  const [columns, setColumns] = useState<IColumn[]>([])

  useEffect(() => {
    setColumns(tableColumns(slowQueryList || []))
  }, [slowQueryList])

  function handleTimeRangeChange(val: StatementTimeRange) {}

  function handleSchemaChange() {}

  function handleRowClick(rec) {
    navigate(`/slow_query/detail`)
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
        loading={listLoading}
        items={slowQueryList || []}
        columns={columns}
        onRowClicked={handleRowClick}
      />
    </ScrollablePane>
  )
}
