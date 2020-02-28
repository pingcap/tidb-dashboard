import client from "@/utils/client";
import { LogsearchCreateTaskGroupRequest, LogsearchSearchTarget, ClusterinfoClusterInfo } from "@/utils/dashboard_client";
import { Card, Col, DatePicker, Form, Row, Select, TreeSelect } from "antd";
import { RangePickerValue } from "antd/lib/date-picker/interface";
import Search from "antd/lib/input/Search";
import { TreeNode } from "antd/lib/tree-select";
import moment from 'moment';
import React, { ChangeEvent, useContext, useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { useHistory } from "react-router-dom";
import { Context } from "../store";
import { AllLogLevel, namingMap } from "./util";

const { SHOW_CHILD } = TreeSelect;
const { RangePicker } = DatePicker
const { Option } = Select;

const mockIP = '192.168.1.8'

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
  // const serverMap = new Map<string, LogsearchSearchTarget>()
  // info?.tidb?.nodes?.forEach(tidb => {
  //   const addr = `${tidb.ip}:${tidb.port}`
  //   const target :LogsearchSearchTarget = {
  //     ip: tidb.ip,
  //     port: tidb.status_port,
  //     kind: 'tidb'
  //   }
  //   serverMap.set(addr, target)
  // })
  // info?.tikv?.nodes?.forEach(tikv => {
  //   const addr = `${tikv.ip}:${tikv.port}`
  //   const target :LogsearchSearchTarget = {
  //     ip: tikv.ip,
  //     port: tikv.status_port,
  //     kind: 'tidb'
  //   }
  //   serverMap.set(addr, target)
  // })
  // info?.pd?.nodes?.forEach(pd => {
  //   const addr = `${pd.ip}:${pd.port}`
  //   const target :LogsearchSearchTarget = {
  //     ip: pd.ip,
  //     port: pd.port,
  //     kind: 'tidb'
  //   }
  //   serverMap.set(addr, target)
  // })
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
  const { t } = useTranslation()
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

  useEffect(() => {
    (async function() {
      const res = await client.dashboard.topologyGet()
      console.log(res.data)
    }())
  }, [])
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
              <Form.Item label={t('logs.common.time_range')} labelCol={{ span: 4 }}>
                <RangePicker
                  value={timeRange}
                  showTime={{
                    defaultValue: [moment('00:00:00', 'HH:mm:ss'), moment('11:59:59', 'HH:mm:ss')],
                  }}
                  format="YYYY-MM-DD HH:mm:ss"
                  style={{ width: 400 }}
                  onChange={handleTimeRangeChange}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={t('logs.common.log_level')} labelCol={{ span: 4 }}>
                <Select value={logLevel} style={{ width: 100 }} onChange={handleLogLevelChange}>
                  <Option value={1}>Debug</Option>
                  <Option value={2}>Info</Option>
                  <Option value={3}>Warn</Option>
                  <Option value={4}>Trace</Option>
                  <Option value={5}>Critical</Option>
                  <Option value={6}>Error</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={t('logs.common.components')} labelCol={{ span: 4 }}
                validateStatus={components.length > 0 ? "" : "error"}>
                <TreeSelect
                  value={components}
                  treeData={buildTreeData(serverMap)}
                  placeholder={t('logs.common.components_placeholder')}
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
              <Form.Item label={t('logs.common.keywords')} labelCol={{ span: 4 }}>
                <Search
                  value={searchValue}
                  placeholder={t('logs.common.keywords_placeholder')}
                  enterButton={t('logs.common.search')}
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