import { Table } from 'antd';
import React, { useState, useEffect, useContext } from "react";
import client from '@/utils/client';
import { Context } from "../store";
import moment from 'moment'

const { Column } = Table;

type LogPreview = {
  key: number
  time?: string
  level?: string
  component?: string
  log?: string
}

const LogLevelMap = {
  0: 'Unknown',
  1: 'Debug',
  2: 'Info',
  3: 'Warn',
  4: 'Trace',
  5: 'Critical',
  6: 'Error'
}

export default function SearchResult() {
  const { store } = useContext(Context)
  const [logPreviews, setData] = useState<LogPreview[]>([])
  const { taskGroupID } = store

  useEffect(() => {
    async function getLogPreivew() {
      if (!taskGroupID) {
        return
      }
      const res = await client.dashboard.logsTaskgroupsIdPreviewGet(taskGroupID)
      setData(res.data.map((value, index): LogPreview => {
        return {
          key: index,
          time: moment(value.time).format(),
          level: LogLevelMap[value.level ?? 0],
          component: 'TiDB',
          log: value.message,
        }
      }))
    }

    getLogPreivew()
  }, [taskGroupID])

  return (
    <Table dataSource={logPreviews}>
      <Column width={220} title="Time" dataIndex="time" key="time" />
      <Column width={100} title="Level" dataIndex="level" key="level" />
      <Column width={120} title="Component" dataIndex="component" key="component" />
      <Column ellipsis title="Log" dataIndex="log" key="log" />
    </Table>
  )
}