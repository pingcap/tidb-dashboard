import client from "@/utils/client";
import { LogsearchCreateTaskGroupRequest, LogsearchSearchTarget } from "@/utils/dashboard_client";
import { Col, DatePicker, Row, Select, TreeSelect } from "antd";
import { RangePickerValue } from "antd/lib/date-picker/interface";
import Search from "antd/lib/input/Search";
import moment from 'moment';
import React, { ChangeEvent, useContext, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { Context } from "../store";
import { AllLogLevel, namingMap } from "./util";

const { SHOW_CHILD } = TreeSelect;
const { RangePicker } = DatePicker
const { Option } = Select;

const mockIP = '127.0.0.1'

const mockServerMap: Map<string, LogsearchSearchTarget> = new Map([
  [
    `${mockIP}:4000`, {
      ip: mockIP,
      port: 10080,
      kind: "tidb"
    }
  ],
  [
    `${mockIP}:20160`, {
      ip: mockIP,
      port: 20160,
      kind: "tikv"
    },
  ],
  [
    `${mockIP}:2379`, {
      ip: mockIP,
      port: 2379,
      kind: "pd"
    }
  ]
])

function buildServerMap() {
  // TODO: parse from topology
  return mockServerMap
}

function buildTreeData(serverMap: Map<string, LogsearchSearchTarget>) {
  // TODO: parse from topology
  const servers = {
    tidb: [],
    tikv: [],
    pd: []
  }

  serverMap.forEach((target, addr) => {
    const kind = target.kind ?? ''
    if (!(kind in servers)) {
      return
    }
    servers[kind].push({
      title: addr,
      value: addr,
      key: addr
    })
  })

  return Object.keys(servers)
    .filter(kind => servers[kind].length)
    .map(kind => ({
      title: namingMap[kind],
      value: kind,
      key: kind,
      children: servers[kind]
    }))
}

export default function SearchHeader() {
  const { store, dispatch } = useContext(Context)
  const { searchOptions } = store
  const history = useHistory()

  const [timeRange, setTimeRange] = useState<RangePickerValue>(searchOptions.curTimeRange)
  const [logLevel, setLogLevel] = useState<number>(searchOptions.curLogLevel)
  const [components, setComponents] = useState<string[]>(searchOptions.curComponents)
  const [searchValue, setSearchValue] = useState<string>(searchOptions.curSearchValue)

  useEffect(() => {
    dispatch({
      type: 'search_options', payload: {
        curTimeRange: timeRange,
        curLogLevel: logLevel,
        curComponents: components,
        curSearchValue: searchValue,
      }
    })
  }, [timeRange, logLevel, components, searchValue])
  // don't add the dependent functions likes dispatch into the dependency array
  // it will cause the infinite loop

  const serverMap = buildServerMap()

  async function createTaskGroup() {
    // TODO: 检查必须选择至少一个组件

    const targets: LogsearchSearchTarget[] = []
    components.forEach(address => {
      const target = serverMap.get(address)
      if (!target) {
        return
      }
      targets.push(target)
    })

    let params: LogsearchCreateTaskGroupRequest = {
      search_targets: targets,
      request: {
        start_time: timeRange?.[0]?.valueOf(), // unix millionsecond
        end_time: timeRange?.[1]?.valueOf(), // unix millionsecond
        levels: AllLogLevel.slice(logLevel - 1), // 3 => [3,4,5,6]
        patterns: searchValue.split(/\s+/), // 'foo boo' => ['foo', 'boo']
      }
    }
    const result = await client.dashboard.logsTaskgroupPut(params)
    dispatch({ type: 'task_group_id', payload: result.data.task_group?.id })
    history.push('/logsearch/detail')
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

  const tProps = {
    treeData: buildTreeData(serverMap),
    onChange: handleComponentChange,
    treeDefaultExpandAll: true,
    treeCheckable: true,
    showCheckedStrategy: SHOW_CHILD,
    style: {
      width: 500,
    },
  }

  return (
    <div>
      <Row gutter={[16, 16]} style={{ margin: 12 }}>
        <Col span={12}>
          时间范围：<RangePicker
            value={timeRange}
            showTime={{
              defaultValue: [moment('00:00:00', 'HH:mm:ss'), moment('11:59:59', 'HH:mm:ss')],
            }}
            format="YYYY-MM-DD HH:mm:ss"
            style={{ width: 500 }}
            onChange={handleTimeRangeChange}
          />
        </Col>
        <Col span={12}>日志级别：
          <Select value={logLevel} style={{ width: 200 }} onChange={handleLogLevelChange}>
            <Option value={1}>Debug</Option>
            <Option value={2}>Info</Option>
            <Option value={3}>Warn</Option>
            <Option value={4}>Trace</Option>
            <Option value={5}>Critical</Option>
            <Option value={6}>Error</Option>
          </Select>
        </Col>
        <Col span={12}>组件选择：
            <div style={{ display: "inline-block" }}>
            <TreeSelect value={components} {...tProps} />
          </div>
        </Col>
        <Col span={12}>
          关键字：
            <span>
            <Search
              value={searchValue}
              placeholder="可选，关键字以空格分割"
              enterButton="Search"
              style={{ width: 500, verticalAlign: "middle" }}
              onChange={handleSearchPatternChange}
              onSearch={handleSearch}
            />
          </span>
        </Col>
      </Row>
    </div>
  )
}