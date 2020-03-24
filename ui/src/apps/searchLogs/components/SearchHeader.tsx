import client from '@pingcap-incubator/dashboard_client'
import {
  LogsearchCreateTaskGroupRequest,
  LogsearchSearchTarget,
} from '@pingcap-incubator/dashboard_client'
import { Button, DatePicker, Form, Input, Select, TreeSelect } from 'antd'
import { RangePickerValue } from 'antd/lib/date-picker/interface'
import { TreeNode } from 'antd/lib/tree-select'
import moment from 'moment'
import React, { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useHistory } from 'react-router-dom'
import styles from './Styles.module.css'
import {
  AllLogLevel,
  getAddress,
  namingMap,
  parseClusterInfo,
  parseSearchingParams,
  ServerType,
  ServerTypeList,
} from './utils'

const { SHOW_CHILD } = TreeSelect
const { RangePicker } = DatePicker
const { Option } = Select

function buildTreeData(targets: LogsearchSearchTarget[]) {
  const servers = {
    [ServerType.TiDB]: [],
    [ServerType.TiKV]: [],
    [ServerType.PD]: [],
  }

  targets.forEach(item => {
    if (item.kind === undefined) {
      return
    }
    servers[item.kind].push(item)
  })

  return ServerTypeList.filter(kind => servers[kind].length > 0).map(kind => ({
    title: namingMap[kind],
    value: kind,
    key: kind,
    children: servers[kind].map((item: LogsearchSearchTarget) => {
      const addr = getAddress(item)
      return {
        title: addr,
        value: addr,
        key: addr,
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

  const [allTargets, setAllTargets] = useState<LogsearchSearchTarget[]>([])
  useEffect(() => {
    async function fetchData() {
      const res = await client.getInstance().topologyAllGet()
      const targets = parseClusterInfo(res.data)
      setAllTargets(targets)
      if (!taskGroupID) {
        return
      }
      const res2 = await client
        .getInstance()
        .logsTaskgroupsIdGet(taskGroupID + '')
      const {
        timeRange,
        logLevel,
        components,
        searchValue,
      } = parseSearchingParams(res2.data)
      setTimeRange(timeRange)
      setLogLevel(logLevel === 0 ? 3 : logLevel)
      setComponents(components.map(item => getAddress(item)))
      setSearchValue(searchValue)
    }
    fetchData()
  }, [])

  async function createTaskGroup() {
    // TODO: check select at least one component
    const searchTargets: LogsearchSearchTarget[] = allTargets.filter(item =>
      selectedComponents.some(addr => addr === getAddress(item))
    )

    let params: LogsearchCreateTaskGroupRequest = {
      search_targets: searchTargets,
      request: {
        start_time: timeRange?.[0]?.valueOf(), // unix millionsecond
        end_time: timeRange?.[1]?.valueOf(), // unix millionsecond
        min_level: logLevel,
        patterns: searchValue.split(/\s+/), // 'foo boo' => ['foo', 'boo']
      },
    }
    const result = await client.getInstance().logsTaskgroupPut(params)
    const id = result.data.task_group?.id
    if (!id) {
      // promp error here
      return
    }
    history.push('/search_logs/detail/' + id)
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

  function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    createTaskGroup()
  }

  function filterTreeNode(inputValue: string, treeNode: TreeNode): boolean {
    const name = treeNode.key as string
    return name.includes(inputValue)
  }

  return (
    <Form
      layout="inline"
      onSubmit={handleSearch}
      style={{ display: 'flex', flexWrap: 'wrap' }}
    >
      <Form.Item>
        <RangePicker
          value={timeRange}
          showTime={{
            defaultValue: [
              moment('00:00:00', 'HH:mm:ss'),
              moment('11:59:59', 'HH:mm:ss'),
            ],
          }}
          placeholder={[
            t('search_logs.common.start_time'),
            t('search_logs.common.end_time'),
          ]}
          format="YYYY-MM-DD HH:mm:ss"
          onChange={handleTimeRangeChange}
        />
      </Form.Item>
      <Form.Item>
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
      <Form.Item>
        <Input
          value={searchValue}
          placeholder={t('search_logs.common.keywords_placeholder')}
          onChange={handleSearchPatternChange}
          style={{ width: 300 }}
        />
      </Form.Item>
      <Form.Item
        className={styles.components}
        style={{ flex: 'auto', minWidth: 220 }}
        validateStatus={selectedComponents.length > 0 ? '' : 'error'}
      >
        <TreeSelect
          value={selectedComponents}
          treeData={buildTreeData(allTargets)}
          placeholder={t('search_logs.common.components_placeholder')}
          onChange={handleComponentChange}
          treeDefaultExpandAll={true}
          treeCheckable={true}
          showCheckedStrategy={SHOW_CHILD}
          allowClear
          filterTreeNode={filterTreeNode}
        />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit">
          {t('search_logs.common.search')}
        </Button>
      </Form.Item>
    </Form>
  )
}
