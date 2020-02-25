import React, { useState, useContext, useEffect, ChangeEvent } from "react";
import moment from 'moment';
import { Row, Col, DatePicker, TreeSelect, Select } from "antd";
import Search from "antd/lib/input/Search";
import { RangePickerValue } from "antd/lib/date-picker/interface";
import { LogsearchComponent, LogsearchTaskGroupCreateCommand } from "@/utils/dashboard_client";
import client from "@/utils/client";
import { Context } from "../store";

const { SHOW_CHILD } = TreeSelect;
const { RangePicker } = DatePicker
const { Option } = Select;

const demoComponent: LogsearchComponent = {
  ip: "192.168.1.8",
  port: "4000",
  server_type: "tidb",
  status_port: "10080"
}

const treeData = [
  {
    title: 'TiDB',
    value: '0-0',
    key: '0-0',
    children: [
      {
        title: '192.168.199.113:4000',
        value: '192.168.199.113:4000',
        key: '0-0-0',
      },
    ],
  },
  {
    title: 'PD',
    value: '0-2',
    key: '0-2',
    children: [
      {
        title: '192.168.199.113:2379',
        value: '192.168.199.113:2379',
        key: '0-2-0',
      },
    ],
  },
  {
    title: 'TiKV',
    value: '0-1',
    key: '0-1',
    children: [
      {
        title: '192.168.199.114:20160',
        value: '192.168.199.114:20160',
        key: '0-1-0',
      },
      {
        title: '192.168.199.115:20160',
        value: '192.168.199.115:20160',
        key: '0-1-1',
      },
      {
        title: '192.168.199.116:20160',
        value: '192.168.199.116:20160',
        key: '0-1-2',
      },
    ],
  },
];

const AllLogLevel = [1, 2, 3, 4, 5, 6]

export default function SearchHeader() {
  const { store, dispatch } = useContext(Context)
  const { searchOptions } = store

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

  function selectComponents(): LogsearchComponent[] {
    if (components.indexOf('192.168.199.113:4000') > -1) {
      return [demoComponent]
    }
    return []
  }

  async function createTaskGroup() {
    let params: LogsearchTaskGroupCreateCommand = {
      components: selectComponents(),
      request: {
        start_time: timeRange?.[0]?.valueOf(), // unix millionsecond
        end_time: timeRange?.[1]?.valueOf(), // unix millionsecond
        levels: AllLogLevel.slice(logLevel - 1), // 3 => [3,4,5,6]
        patterns: searchValue.split(/\s+/), // 'foo boo' => ['foo', 'boo']
      }
    }
    const result = await client.dashboard.logsTaskgroupsPost(params)
    // TODO: popup 成功
    console.log(result.data)
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
    treeData,
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
            <div style={{ display: "inline-block" }}>
            <Search
              value={searchValue}
              enterButton="Search"
              style={{ width: 500 }}
              onChange={handleSearchPatternChange}
              onSearch={handleSearch}
            />
          </div>
        </Col>
      </Row>
    </div>
  )
}