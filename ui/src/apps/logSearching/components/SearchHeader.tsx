import client from "@/utils/client";
import { ClusterinfoClusterInfo, LogsearchCreateTaskGroupRequest, LogsearchSearchTarget, LogsearchTaskGroupResponse } from "@/utils/dashboard_client";
import { Card, Col, DatePicker, Form, Row, Select, TreeSelect } from "antd";
import { RangePickerValue } from "antd/lib/date-picker/interface";
import Search from "antd/lib/input/Search";
import { TreeNode } from "antd/lib/tree-select";
import moment from 'moment';
import React, { ChangeEvent, useContext, useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { useHistory } from "react-router-dom";
import { Context } from "../store";
import { AllLogLevel, namingMap, Component, parseClusterInfo, parseSearchingParams } from "./util";

const { SHOW_CHILD } = TreeSelect;
const { RangePicker } = DatePicker
const { Option } = Select;

function buildTreeData(components: Component[]) {
  const servers = {
    tidb: [],
    tikv: [],
    pd: []
  }

  components.forEach(item => {
    const serverType = item.kind
    if (!(serverType in servers)) {
      return
    }
    const addr = item.addr()
    servers[serverType].push({
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
  const { components: allComponents } = store
  const { t } = useTranslation()
  const history = useHistory()

  const [timeRange, setTimeRange] = useState<RangePickerValue>([])
  const [logLevel, setLogLevel] = useState<number>(3)
  const [selectedComponents, setComponents] = useState<string[]>([])
  const [searchValue, setSearchValue] = useState<string>('')

  useEffect(() => {
    async function fetchData() {
      const res = await client.dashboard.topologyAllGet()
      const allComponents = parseClusterInfo(res.data)
      dispatch({ type: 'components', payload: allComponents })
      if (!taskGroupID) {
        return
      }
      const res2 = await client.dashboard.logsTaskgroupsIdGet(taskGroupID)
      const { timeRange, logLevel, components, searchValue } = parseSearchingParams(res2.data, allComponents)
      setTimeRange(timeRange)
      setLogLevel(logLevel === 0 ? 3 : logLevel)
      setComponents(components.map(item => item.addr()))
      setSearchValue(searchValue)
    }
    fetchData()
  }, [])

  async function createTaskGroup() {
    // TODO: check select at least one component
    const targets: LogsearchSearchTarget[] = allComponents.filter(item =>
      selectedComponents.some(addr => addr === item.addr())
    ).map(item => ({
      ip: item.ip,
      port: item.grpcPort(),
      kind: item.kind,
    }))

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
                validateStatus={selectedComponents.length > 0 ? "" : "error"}>
                <TreeSelect
                  value={selectedComponents}
                  treeData={buildTreeData(allComponents)}
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
