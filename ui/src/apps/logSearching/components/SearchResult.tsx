import client from '@/utils/client';
import { Table, Tooltip } from 'antd';
import moment from 'moment';
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Context } from "../store";
import { LogLevelMap, namingMap } from './util';

const { Column } = Table;

type LogPreview = {
  key: number
  time?: string
  level?: string
  component?: string
  log?: string
}

function logRender(log: string) {
  function trimString(str: string) {
    const len = 512
    return str.length > len ?
      str.substring(0, len - 3) + "..." :
      str
  }

  return (
    <Tooltip title={trimString(log)}>
      <div style={{
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis"
      }}>
        <span>{log}</span>
      </div>
    </Tooltip >
  )
}
interface Props {
  taskGroupID: number
}

export default function SearchResult({
  taskGroupID
}: Props) {
  const { store } = useContext(Context)
  const [logPreviews, setData] = useState<LogPreview[]>([])
  const { tasks } = store
  const { t } = useTranslation()

  useEffect(() => {
    function getComponentType(id: number | undefined) {
      const kind = tasks.find(task => {
        return task.id !== undefined && task.id === id
      })?.search_target?.kind
      return kind ? namingMap[kind] : undefined
    }

    async function getLogPreview() {
      if (!taskGroupID) {
        return
      }

      const res = await client.dashboard.logsTaskgroupsIdPreviewGet(taskGroupID)
      setData(res.data.map((value, index): LogPreview => {
        return {
          key: index,
          time: moment(value.time).format(),
          level: LogLevelMap[value.level ?? 0],
          component: getComponentType(value.task_id),
          log: value.message,
        }
      }))
    }

    getLogPreview()
  }, [taskGroupID, tasks])

  return (
    <div style={{ backgroundColor: "#FFFFFF" }}>
      <Table dataSource={logPreviews} size="middle" pagination={{ pageSize: 100 }}>
        <Column width={220} title={t('log_searching.preview.time')} dataIndex="time" key="time" />
        <Column width={80} title={t('log_searching.preview.level')} dataIndex="level" key="level" />
        <Column width={100} title={t('log_searching.preview.component')} dataIndex="component" key="component" />
        <Column ellipsis title={t('log_searching.preview.log')} dataIndex="log" key="log" render={logRender} />
      </Table>
    </div>
  )
}
