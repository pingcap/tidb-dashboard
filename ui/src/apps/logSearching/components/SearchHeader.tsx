import client from '@/utils/client'
import {
  LogsearchCreateTaskGroupRequest,
  UtilsRequestTargetNode,
} from '@/utils/dashboard_client'
import { Card, Col, DatePicker, Form, Row, Select, TreeSelect } from 'antd'
import { RangePickerValue } from 'antd/lib/date-picker/interface'
import Search from 'antd/lib/input/Search'
import { TreeNode } from 'antd/lib/tree-select'
import moment from 'moment'
import React, { ChangeEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useHistory } from 'react-router-dom'
import {
  AllLogLevel,
  namingMap,
  parseClusterInfo,
  parseSearchingParams,
} from './utils'

const { SHOW_CHILD } = TreeSelect
const { RangePicker } = DatePicker
const { Option } = Select

function buildTreeData(targets: UtilsRequestTargetNode[]) {
  const servers = {
    tidb: [],
    tikv: [],
    pd: [],
  }

  targets.forEach(item => {
    if (item.kind === undefined) {
      return
    }
    servers[item.kind].push(item)
  })

  return Object.keys(servers)
    .filter(kind => servers[kind].length > 0)
    .map(kind => ({
      title: namingMap[kind],
      value: kind,
      key: kind,
      children: servers[kind].map((item: UtilsRequestTargetNode) => {
        return {
          title: item.display_name,
          value: item.display_name,
          key: item.display_name,
        }
      }),
    }))
}

interface Props {
  taskGroupID: number
}

export default function SearchHeader({ taskGroupID }: Props) {
  const { t } = useTranslation()
  const history = useHistory()

  const [timeRange, setTimeRange] = useState<RangePickerValue>([])
  const [logLevel, setLogLevel] = useState<number>(3)
  const [selectedComponents, setComponents] = useState<string[]>([])
  const [searchValue, setSearchValue] = useState<string>('')

  const [allTargets, setAllTargets] = useState<UtilsRequestTargetNode[]>([])
  useEffect(() => {
    async function fetchData() {
      const res = await client.dashboard.topologyAllGet()
      const targets = parseClusterInfo(res.data)
      setAllTargets(targets)
      if (!taskGroupID) {
        return
      }
      const res2 = await client.dashboard.logsTaskgroupsIdGet(taskGroupID)
      const {
        timeRange,
        logLevel,
        components,
        searchValue,
      } = parseSearchingParams(res2.data)
      setTimeRange(timeRange)
      setLogLevel(logLevel === 0 ? 3 : logLevel)
      setComponents(components.map(item => item.display_name!))
      setSearchValue(searchValue)
    }
    fetchData()
  }, [])

  async function createTaskGroup() {
    // TODO: check select at least one component
    // FIXME: Use HashMap is more efficient
    const searchTargets: UtilsRequestTargetNode[] = allTargets.filter(item =>
      selectedComponents.some(addr => addr === item.display_name)
    )

    let params: LogsearchCreateTaskGroupRequest = {
      search_targets: searchTargets,
      request: {
        start_time: timeRange?.[0]?.valueOf(), // unix millionsecond
        end_time: timeRange?.[1]?.valueOf(), // unix millionsecond
        levels: AllLogLevel.slice(logLevel - 1), // 3 => [3,4,5,6]
        patterns: searchValue.split(/\s+/), // 'foo boo' => ['foo', 'boo']
      },
    }
    const result = await client.dashboard.logsTaskgroupPut(params)
    const id = result.data.task_group?.id
    if (!id) {
      // promp error here
      return
    }
    history.push('/log/search/detail/' + id)
  }

  function handleTimeRangeChange(value: RangePickerValue) {
    setTimeRange(value)
  }

  function handleLogLevelChange(value: number) {
    setLogLevel(value)
  }

  function handleComponentChange(values: string[]) {
    setComponents(values)
  }

  function handleSearchPatternChange(e: ChangeEvent<HTMLInputElement>) {
    setSearchValue(e.target.value)
  }

  function handleSearch(value: string) {
    setSearchValue(value)
    createTaskGroup()
  }

  function filterTreeNode(inputValue: string, treeNode: TreeNode): boolean {
    const name = treeNode.key as string
    return name.includes(inputValue)
  }

  return (
    <div>
      <Card>
        <Form labelAlign="right">
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label={t('log_searching.common.time_range')}
                labelCol={{ span: 4 }}
              >
                <RangePicker
                  value={timeRange}
                  showTime={{
                    defaultValue: [
                      moment('00:00:00', 'HH:mm:ss'),
                      moment('11:59:59', 'HH:mm:ss'),
                    ],
                  }}
                  format="YYYY-MM-DD HH:mm:ss"
                  style={{ width: 400 }}
                  onChange={handleTimeRangeChange}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={t('log_searching.common.log_level')}
                labelCol={{ span: 4 }}
              >
                <Select
                  value={logLevel}
                  style={{ width: 100 }}
                  onChange={handleLogLevelChange}
                >
                  <Option value={1}>DEBUG</Option>
                  <Option value={2}>INFO</Option>
                  <Option value={3}>WARN</Option>
                  <Option value={4}>TRACE</Option>
                  <Option value={5}>CRITICAL</Option>
                  <Option value={6}>ERROR</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={t('log_searching.common.components')}
                labelCol={{ span: 4 }}
                validateStatus={selectedComponents.length > 0 ? '' : 'error'}
              >
                <TreeSelect
                  value={selectedComponents}
                  treeData={buildTreeData(allTargets)}
                  placeholder={t('log_searching.common.components_placeholder')}
                  onChange={handleComponentChange}
                  treeDefaultExpandAll={true}
                  treeCheckable={true}
                  showCheckedStrategy={SHOW_CHILD}
                  allowClear
                  filterTreeNode={filterTreeNode}
                  style={{ width: 400 }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={t('log_searching.common.keywords')}
                labelCol={{ span: 4 }}
              >
                <Search
                  value={searchValue}
                  placeholder={t('log_searching.common.keywords_placeholder')}
                  enterButton={t('log_searching.common.search')}
                  style={{ width: 400 }}
                  onChange={handleSearchPatternChange}
                  onSearch={handleSearch}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  )
}
