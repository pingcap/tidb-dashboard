import client from '@/utils/client';
import { Table, Tooltip } from 'antd';
import moment from 'moment';
import React, { useContext, useEffect, useState } from "react";
import { Context } from "../store";
import { namingMap, LogLevelMap } from './util';

const { Column } = Table;

type LogPreview = {
  key: number
  time?: string
  level?: string
  component?: string
  log?: string
}

function logRender(log: string) {
  return (
    <Tooltip title={log}>
      <span>{log}</span>
    </Tooltip>
  )
}

export default function SearchResult() {
  const { store } = useContext(Context)
  const [logPreviews, setData] = useState<LogPreview[]>([])
  const { taskGroupID, tasks } = store

  useEffect(() => {
    function getCompoentType(id: number | undefined) {
      const kind = tasks.find(task => {
        return task.id !== undefined && task.id === id
      })?.search_target?.kind
      return kind ? namingMap[kind] : undefined
    }

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
          component: getCompoentType(value.task_id),
          log: value.message,
        }
      }))
    }

    getLogPreivew()
  }, [taskGroupID, tasks])

  return (
    <Table dataSource={logPreviews}>
      <Column width={220} title="Time" dataIndex="time" key="time" />
      <Column width={100} title="Level" dataIndex="level" key="level" />
      <Column width={120} title="Component" dataIndex="component" key="component" />
      <Column ellipsis title="Log" dataIndex="log" key="log" render={logRender} />
    </Table>
  )
}