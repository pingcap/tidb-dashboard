import client from '@lib/client'
import {
  LogsearchCreateTaskGroupRequest,
  ModelRequestTargetNode,
} from '@lib/client'
import { Button, Form, Input, Select, TreeSelect } from 'antd'
import { LegacyDataNode } from 'rc-tree-select/lib/interface'
import React, { ChangeEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useMount } from '@umijs/hooks'
import styles from './Styles.module.css'
import {
  namingMap,
  NodeKind,
  NodeKindList,
  // parseClusterInfo,
  parseSearchingParams,
} from './utils'
import {
  TimeRangeSelector,
  TimeRange,
  DEF_TIME_RANGE,
  calcTimeRange,
} from '@lib/components'

const { SHOW_CHILD } = TreeSelect
const { Option } = Select

function buildTreeData(targets: ModelRequestTargetNode[]) {
  const servers = {
    [NodeKind.TiDB]: [],
    [NodeKind.TiKV]: [],
    [NodeKind.PD]: [],
    [NodeKind.TiFlash]: [],
  }

  targets.forEach((item) => {
    if (item === undefined || item.kind === undefined) {
      return
    }
    servers[item.kind].push(item)
  })

  return NodeKindList.filter((kind) => servers[kind].length > 0).map(
    (kind) => ({
      title: namingMap[kind],
      value: kind,
      key: kind,
      children: servers[kind].map((item: ModelRequestTargetNode) => {
        const addr = item.display_name!
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
  taskGroupID?: number
}

const LOG_LEVELS = ['debug', 'info', 'warn', 'trace', 'critical', 'error']

export default function SearchHeader({ taskGroupID }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [timeRange, setTimeRange] = useState<TimeRange>(DEF_TIME_RANGE)
  const [logLevel, setLogLevel] = useState(2)
  const [selectedComponents, setComponents] = useState<string[]>([])
  const [searchValue, setSearchValue] = useState('')
  const [allTargets, setAllTargets] = useState<ModelRequestTargetNode[]>([])

  useMount(() => {
    async function fetchData() {
      const res = {} as any
      // const res = await client.getInstance().topologyAllGet()
      // const targets = parseClusterInfo(res.data)
      const targets = [] as any
      setAllTargets(targets)
      setComponents(targets.map((item) => item.display_name!))
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
      setLogLevel(logLevel === 0 ? 2 : logLevel)
      setComponents(components.map((item) => item.display_name ?? ''))
      setSearchValue(searchValue)
    }
    fetchData()
  })

  async function createTaskGroup() {
    // TODO: check select at least one component
    const targets: ModelRequestTargetNode[] = allTargets.filter((item) =>
      selectedComponents.some((addr) => addr === item.display_name ?? '')
    )

    const [startTime, endTime] = calcTimeRange(timeRange)
    const params: LogsearchCreateTaskGroupRequest = {
      targets: targets,
      request: {
        start_time: startTime * 1000, // unix millionsecond
        end_time: endTime * 1000, // unix millionsecond
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

  function handleTimeRangeChange(value: TimeRange) {
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
        <TimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} />
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
