import client from '@/utils/client';
import { LogsearchSearchTarget, LogsearchTaskModel } from '@/utils/dashboard_client/api';
import { Spin, Table, Tooltip } from 'antd';
import moment from 'moment';
import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { DATE_TIME_FORMAT, LogLevelMap, namingMap } from './utils';

const { Column } = Table;

type LogPreview = {
  key: number
  time?: string
  level?: string
  component?: LogsearchSearchTarget | undefined
  log?: string
}

function componentRender(target: LogsearchSearchTarget | undefined) {
  if (target === undefined) {
    return ''
  }
  return (
    <div style={{ fontSize: "0.8em" }}>
      {target.kind ? namingMap[target.kind] : ''} {target.ip}
    </div>
  )
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
  tasks: LogsearchTaskModel[],
}

export default function SearchResult({
  taskGroupID,
  tasks,
}: Props) {
  const [logPreviews, setData] = useState<LogPreview[]>([])
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    function getComponent(id: number | undefined) {
      return tasks.find(task => {
        return task.id !== undefined && task.id === id
      })?.search_target
    }

    async function getLogPreview() {
      if (!taskGroupID) {
        return
      }

      const res = await client.dashboard.logsTaskgroupsIdPreviewGet(taskGroupID)
      setData(res.data.map((value, index): LogPreview => {
        return {
          key: index,
          time: moment(value.time).format(DATE_TIME_FORMAT),
          level: LogLevelMap[value.level ?? 0],
          component: getComponent(value.task_id),
          log: value.message,
        }
      }))
      setLoading(false)
    }
    if (!loading && tasks.length > 0 &&
      taskGroupID !== tasks[0].task_group_id) {
      setLoading(true)
    }
    getLogPreview()
  }, [taskGroupID, tasks])

  return (
    <div style={{
      backgroundColor: "#FFFFFF",
      textAlign: "center",
      minHeight: 400,
    }}>
      {loading && <Spin size="large" style={{ marginTop: 200 }} />}
      {!loading && (
        <Table dataSource={logPreviews} size="middle" pagination={{ pageSize: 100 }}>
          <Column width={150} title={t('log_searching.preview.time')} dataIndex="time" key="time" />
          <Column width={80} title={t('log_searching.preview.level')} dataIndex="level" key="level" />
          <Column width={100} title={t('log_searching.preview.component')} dataIndex="component" key="component" render={componentRender} />
          <Column ellipsis title={t('log_searching.preview.log')} dataIndex="log" key="log" render={logRender} />
        </Table>
      )}
    </div>
  )
}
