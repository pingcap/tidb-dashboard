import client from '@pingcap-incubator/dashboard_client'
import {
  LogsearchCreateTaskGroupRequest,
  LogsearchSearchTarget,
} from '@pingcap-incubator/dashboard_client'
import { Button, DatePicker, Form, Input, Select, TreeSelect } from 'antd'
import { RangeValue } from 'rc-picker/lib/interface'
import { LegacyDataNode } from 'rc-tree-select/lib/interface'
import moment from 'moment'
import React, { ChangeEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useMount } from '@umijs/hooks'
import styles from './Styles.module.css'
import {
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

  targets.forEach((item) => {
    if (item.kind === undefined) {
      return
    }
    servers[item.kind].push(item)
  })

  return ServerTypeList.filter((kind) => servers[kind].length > 0).map(
    (kind) => ({
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
    })
  )
}

interface Props {
  taskGroupID: number
}

const LOG_LEVELS = ['debug', 'info', 'warn', 'trace', 'critical', 'error']

export default function SearchHeader({ taskGroupID }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [timeRange, setTimeRange] = useState<RangeValue<moment.Moment>>(null)
  const [logLevel, setLogLevel] = useState<number>(3)
  const [selectedComponents, setComponents] = useState<string[]>([])
  const [searchValue, setSearchValue] = useState<string>('')

  const [allTargets, setAllTargets] = useState<LogsearchSearchTarget[]>([])
  useMount(() => {
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
      setComponents(components.map((item) => getAddress(item)))
      setSearchValue(searchValue)
    }
    fetchData()
  })

  async function createTaskGroup() {
    // TODO: check select at least one component
    const searchTargets: LogsearchSearchTarget[] = allTargets.filter((item) =>
      selectedComponents.some((addr) => addr === getAddress(item))
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
    navigate('/search_logs/detail/' + id)
  }

  function handleTimeRangeChange(
    values: RangeValue<moment.Moment>,
    formatString: [string, string]
  ) {
    setTimeRange(values)
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

  function handleSearch() {
    createTaskGroup()
  }

  function filterTreeNode(
    inputValue: string,
    legacyDataNode?: LegacyDataNode
  ): boolean {
    const name = legacyDataNode?.key as string
    return name.includes(inputValue)
  }

  return (
    <Form
      id="search_form"
      layout="inline"
      onFinish={handleSearch}
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
          id="log_level_selector"
          value={logLevel}
          style={{ width: 100 }}
          onChange={handleLogLevelChange}
        >
          {LOG_LEVELS.map((val, idx) => (
            <Option key={val} value={idx + 1}>
              <div data-e2e={`level_${val}`}>{val.toUpperCase()}</div>
            </Option>
          ))}
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
        data-e2e="components_selector"
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
        <Button id="search_btn" type="primary" htmlType="submit">
          {t('search_logs.common.search')}
        </Button>
      </Form.Item>
    </Form>
  )
}
