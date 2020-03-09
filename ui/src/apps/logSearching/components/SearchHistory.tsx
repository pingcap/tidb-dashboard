import client from '@/utils/client';
import { LogsearchTaskGroupResponse } from '@/utils/dashboard_client';
import { Button, Table, Tag } from 'antd';
import { RangePickerValue } from 'antd/lib/date-picker/interface';
import { Moment } from 'moment';
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Context } from "../store";
import { Component, LogLevelMap, parseClusterInfo, parseSearchingParams } from './utils';

const { Column } = Table;

const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

type History = {
  key: number
  time?: RangePickerValue
  level?: string
  components?: Component[]
  keywords?: string
  size?: string
  state?: string
  action?: number
}

function componentRender(components: Component[]) {
  const tidb = components.filter(item => item.kind === 'tidb')
  const tikv = components.filter(item => item.kind === 'tikv')
  const pd = components.filter(item => item.kind === 'pd')
  return (
    <span>
      {tidb.length > 0 && (<Tag>{tidb.length} TiDB</Tag>)}
      {tikv.length > 0 && (<Tag>{tikv.length} TiKV</Tag>)}
      {pd.length > 0 && (<Tag>{pd.length} PD</Tag>)}
    </span>
  )
}

function formatTime(time: Moment | null | undefined): string {
  if (!time) {
    return ''
  }
  return time.format(DATE_TIME_FORMAT)
}

function timeRender(timeRange: RangePickerValue): string {
  if (!timeRange[0] || !timeRange[1]) {
    return ''
  }
  return `${formatTime(timeRange[0])} ~ ${formatTime(timeRange[1])}`
}

export default function SearchHistory() {
  const { store, dispatch } = useContext(Context)
  const { components: allComponents } = store
  const [taskGroups, setTaskGroups] = useState<LogsearchTaskGroupResponse[]>([])
  const [selectedRowKeys, setRowKeys] = useState<string[] | number[]>([])

  const { t } = useTranslation()

  useEffect(() => {
    async function getData() {
      const res = await client.dashboard.topologyAllGet()
      const allComponents = parseClusterInfo(res.data)
      dispatch({ type: 'components', payload: allComponents })
      const res1 = await client.dashboard.logsTaskgroupsGet()
      setTaskGroups(res1.data)
    }
    getData()
  }, [])

  function actionRender(taskGroupID: number) {
    if (taskGroupID === 0) {
      return
    }
    async function handleDelete() {
      await client.dashboard.logsTaskgroupsIdDelete(taskGroupID)
      const res = await client.dashboard.logsTaskgroupsGet()
      setTaskGroups(res.data)
    }
    return (
      <span>
        <Button type="link">
          <Link to={`/log/search/detail/${taskGroupID}`}>Detail</Link>
        </Button>
        <Button type="link" onClick={handleDelete}>
          Delete
        </Button>
      </span>
    )
  }

  async function handleDeleteSelected() {
    for (const key of selectedRowKeys) {
      const taskGroupID = key as number
      await client.dashboard.logsTaskgroupsIdDelete(taskGroupID)
      const res = await client.dashboard.logsTaskgroupsGet()
      setTaskGroups(res.data)
    }
  }

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedRowKeys: string[] | number[]) => {
      setRowKeys(selectedRowKeys)
    },
  }

  const descriptionArray = [
    t('log_searching.history.running'),
    t('log_searching.history.finished'),
  ]

  const historyList: History[] = taskGroups.map(taskGroup => {
    const { timeRange, logLevel, components, searchValue } = parseSearchingParams(taskGroup, allComponents)
    const taskGroupID = taskGroup.task_group?.id || 0
    const state = descriptionArray[(taskGroup.task_group?.state || 1) - 1]
    return {
      key: taskGroupID,
      time: timeRange,
      level: LogLevelMap[logLevel],
      components: components,
      keywords: searchValue,
      state: state,
      action: taskGroupID
    }
  })

  return (
    <div style={{ backgroundColor: "#FFFFFF" }}>
      <Button type="primary" style={{ marginBottom: 16, marginTop: 16 }} onClick={handleDeleteSelected}>Delete Selected</Button>
      <Table dataSource={historyList} rowSelection={rowSelection} pagination={{ pageSize: 100 }}>
        <Column width={400} title="Time Range" dataIndex="time" key="time" render={timeRender} />
        <Column title="Level" dataIndex="level" key="level" />
        <Column width={230} title="Components" dataIndex="components" key="components" render={componentRender} />
        <Column title="Keywords" dataIndex="keywords" key="keywords" />
        <Column title="State" dataIndex="state" key="state" />
        <Column title="Action" dataIndex="action" key="action" render={actionRender} />
      </Table>
    </div>
  )
}
