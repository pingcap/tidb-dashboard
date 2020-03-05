import client from "@/utils/client";
import { ClusterinfoClusterInfo, LogsearchCreateTaskGroupRequest, LogsearchSearchTarget } from "@/utils/dashboard_client";
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

// serverMap example:
// const serverMap: Map<string, LogsearchSearchTarget> = new Map([
//   [
//     `127.0.0.1:4000`, {
//       ip: "127.0.0.1",
//       port: 10080,
//       kind: "tidb"
//     }
//   ],
//   [
//     `127.0.0.1:20160`, {
//       ip: "127.0.0.1",
//       port: 20160,
//       kind: "tikv"
//     },
//   ],
//   [
//     `127.0.0.1:2379`, {
//       ip: "127.0.0.1",
//       port: 2379,
//       kind: "pd"
//     }
//   ]
// ])
function buildServerMap(info: ClusterinfoClusterInfo) {
  const serverMap = new Map<string, LogsearchSearchTarget>()
  info?.tidb?.nodes?.forEach(tidb => {
    const addr = `${tidb.ip}:${tidb.port}`
    const target: LogsearchSearchTarget = {
      ip: tidb.ip,
      port: tidb.status_port,
      kind: 'tidb'
    }
    serverMap.set(addr, target)
  })
  info?.tikv?.nodes?.forEach(tikv => {
    const addr = `${tikv.ip}:${tikv.port}`
    const target: LogsearchSearchTarget = {
      ip: tikv.ip,
      port: tikv.port,
      kind: 'tikv'
    }
    serverMap.set(addr, target)
  })
  info?.pd?.nodes?.forEach(pd => {
    const addr = `${pd.ip}:${pd.port}`
    const target: LogsearchSearchTarget = {
      ip: pd.ip,
      port: pd.port,
      kind: 'pd'
    }
    serverMap.set(addr, target)
  })
  return serverMap
}

function buildTreeData(serverMap: Map<string, LogsearchSearchTarget>) {
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
    .filter(kind => servers[kind].length > 0)
    .map(kind => ({
      title: namingMap[kind],
      value: kind,
      key: kind,
      children: servers[kind]
    }))
}

interface Props {
  taskGroupID: number
}

export default function SearchHeader({
  taskGroupID
}: Props) {
  const { store, dispatch } = useContext(Context)
  const { topology } = store
  const { t } = useTranslation()
  const history = useHistory()

  const [timeRange, setTimeRange] = useState<RangePickerValue>([])
  const [logLevel, setLogLevel] = useState<number>(3)
  const [components, setComponents] = useState<string[]>([])
  const [searchValue, setSearchValue] = useState<string>('')

  // useEffect(() => {
  //   dispatch({
  //     type: 'search_options', payload: {
  //       curTimeRange: timeRange,
  //       curLogLevel: logLevel,
  //       curComponents: components,
  //       curSearchValue: searchValue,
  //     }
  //   })
  // }, [timeRange, logLevel, components, searchValue])
  // don't add the dependent functions likes dispatch into the dependency array
  // it will cause the infinite loop

  useEffect(() => {
    async function fetchData() {
      let res = await client.dashboard.topologyAllGet()
      const serverMap = buildServerMap(res.data)
      dispatch({ type: 'topology', payload: serverMap })
      if (!taskGroupID) {
        return
      }
      res = await client.dashboard.logsTaskgroupsIdGet(taskGroupID)
      const { task_group, tasks } = res.data
      const { start_time, end_time, levels, patterns } = task_group?.search_request
      const startTime = start_time ? moment(start_time) : null
      const endTime = end_time ? moment(end_time) : null
      setTimeRange([startTime, endTime] as RangePickerValue)
      setLogLevel(levels.length > 0 ? levels[0] : 3)
      setSearchValue(patterns.join(' '))
      setComponents(tasks?.map(task => {
        let component = ''
        for (let [addr, target] of serverMap.entries()) {
          if (target.ip === task.search_target?.ip
            && target.port === task.search_target?.port) {
            component = addr
            break
          }
        }
        return component
      }))
    }
    fetchData()
  }, [])

  async function createTaskGroup() {
    // TODO: check select at least one component

    const targets: LogsearchSearchTarget[] = []
    components.forEach(address => {
      const target = topology.get(address)
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
              <Form.Item label={t('log_searching.common.time_range')} labelCol={{ span: 4 }}>
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
              <Form.Item label={t('log_searching.common.log_level')} labelCol={{ span: 4 }}>
                <Select value={logLevel} style={{ width: 100 }} onChange={handleLogLevelChange}>
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
              <Form.Item label={t('log_searching.common.components')} labelCol={{ span: 4 }}
                validateStatus={components.length > 0 ? "" : "error"}>
                <TreeSelect
                  value={components}
                  treeData={buildTreeData(topology)}
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
              <Form.Item label={t('log_searching.common.keywords')} labelCol={{ span: 4 }}>
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
