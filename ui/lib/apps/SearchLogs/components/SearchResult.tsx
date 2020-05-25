import { Alert } from 'antd'
import moment from 'moment'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import client, { LogsearchTaskModel, ModelRequestTargetNode } from '@lib/client'
import { Card, CardTableV2 } from '@lib/components'
import Log from './Log'
import { DATE_TIME_FORMAT, LogLevelMap, namingMap } from '../utils'

import styles from './Styles.module.css'

type LogPreview = {
  key: number
  time?: string
  level?: string
  component?: ModelRequestTargetNode | undefined
  log?: string
}

function componentRender({ component: target }) {
  if (target === undefined) {
    return ''
  }
  return (
    <div>
      {target.kind ? namingMap[target.kind] : ''} {target.ip}
    </div>
  )
}

function Row({ renderer, props }) {
  const [expanded, setExpanded] = useState(false)
  const handleClick = useCallback(() => {
    setExpanded((v) => !v)
  }, [])
  return (
    <div onClick={handleClick} className={styles.logRow}>
      {renderer({ ...props, item: { ...props.item, expanded } })}
    </div>
  )
}

interface Props {
  patterns: string[]
  taskGroupID: number
  tasks: LogsearchTaskModel[]
}

export default function SearchResult({ patterns, taskGroupID, tasks }: Props) {
  const [logPreviews, setData] = useState<LogPreview[]>([])
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    function getComponent(id: number | undefined) {
      return tasks.find((task) => {
        return task.id !== undefined && task.id === id
      })?.target
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
    if (tasks.length > 0 && taskGroupID !== tasks[0].task_group_id) {
      setLoading(true)
    }
    getLogPreview()
  }, [taskGroupID, tasks])

  const renderRow = useCallback((props, defaultRender) => {
    if (!props) {
      return null
    }
    return <Row renderer={defaultRender!} props={props} />
  }, [])

  const columns = [
    {
      name: t('search_logs.preview.time'),
      key: 'time',
      fieldName: 'time',
      minWidth: 150,
      maxWidth: 200,
    },
    {
      name: t('search_logs.preview.level'),
      key: 'level',
      fieldName: 'level',
      minWidth: 60,
      maxWidth: 60,
    },
    {
      name: t('search_logs.preview.component'),
      key: 'component',
      minWidth: 100,
      maxWidth: 100,
      onRender: componentRender,
    },
    {
      name: t('search_logs.preview.log'),
      key: 'log',
      minWidth: 200,
      maxWidth: 400,
      isResizable: false,
      onRender: ({ log, expanded }) => (
        <Log patterns={patterns} log={log} expanded={expanded} />
      ),
    },
  ]

  return (
    <>
      {!loading && (
        <Card noMarginTop>
          <Alert message={t('search_logs.page.tip')} type="info" showIcon />
        </Card>
      )}
      <CardTableV2
        cardNoMarginTop
        loading={loading}
        columns={columns}
        items={logPreviews || []}
        onRenderRow={renderRow}
        extendLastColumn
      />
    </>
  )
}
