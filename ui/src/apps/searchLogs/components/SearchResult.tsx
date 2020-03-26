import client from '@pingcap-incubator/dashboard_client'
import {
  LogsearchSearchTarget,
  LogsearchTaskModel,
} from '@pingcap-incubator/dashboard_client'
import { Card } from '@pingcap-incubator/dashboard_components'
import { Alert, Skeleton, Table, Tooltip } from 'antd'
import moment from 'moment'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DATE_TIME_FORMAT, LogLevelMap, namingMap } from './utils'
import styles from './SearchResult.module.css'

const { Column } = Table

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
    <div>
      {target.kind ? namingMap[target.kind] : ''} {target.ip}
    </div>
  )
}

function logRender(log: string) {
  function trimString(str: string) {
    const len = 512
    return str.length > len ? str.substring(0, len - 3) + '...' : str
  }

  return (
    <Tooltip title={trimString(log)}>
      <div
        style={{
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
      >
        <span>{log}</span>
      </div>
    </Tooltip>
  )
}

interface Props {
  taskGroupID: number
  tasks: LogsearchTaskModel[]
}

export default function SearchResult({ taskGroupID, tasks }: Props) {
  const [logPreviews, setData] = useState<LogPreview[]>([])
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    function getComponent(id: number | undefined) {
      return tasks.find((task) => {
        return task.id !== undefined && task.id === id
      })?.search_target
    }

    async function getLogPreview() {
      if (!taskGroupID) {
        return
      }

      const res = await client
        .getInstance()
        .logsTaskgroupsIdPreviewGet(taskGroupID + '')
      setData(
        res.data.map(
          (value, index): LogPreview => {
            return {
              key: index,
              time: moment(value.time).format(DATE_TIME_FORMAT),
              level: LogLevelMap[value.level ?? 0],
              component: getComponent(value.task_id),
              log: value.message,
            }
          }
        )
      )
      setLoading(false)
    }
    if (
      !loading &&
      tasks.length > 0 &&
      taskGroupID !== tasks[0].task_group_id
    ) {
      setLoading(true)
    }
    getLogPreview()
  }, [loading, taskGroupID, tasks])

  return (
    <Card>
      {loading && <Skeleton active />}
      {!loading && (
        <>
          <Alert
            message={t('search_logs.page.tip')}
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
          <Table
            dataSource={logPreviews}
            size="middle"
            pagination={{ pageSize: 100 }}
            className={styles.resultTable}
          >
            <Column
              width={180}
              title={t('search_logs.preview.time')}
              dataIndex="time"
              key="time"
            />
            <Column
              width={80}
              title={t('search_logs.preview.level')}
              dataIndex="level"
              key="level"
            />
            <Column
              width={150}
              title={t('search_logs.preview.component')}
              dataIndex="component"
              key="component"
              render={componentRender}
            />
            <Column
              ellipsis
              title={t('search_logs.preview.log')}
              dataIndex="log"
              key="log"
              render={logRender}
            />
          </Table>
        </>
      )}
    </Card>
  )
}
