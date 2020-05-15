import client from '@lib/client'
import { ModelRequestTargetNode, LogsearchTaskModel } from '@lib/client'
import { CardTableV2 } from '@lib/components'
import { Alert } from 'antd'
import moment from 'moment'
import React, { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { DATE_TIME_FORMAT, LogLevelMap, namingMap } from './utils'
import Log from './Log'

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
      onRender: ({ log, expanded }) => <Log log={log} expanded={expanded} />,
    },
  ]
  return (
    <>
      {!loading && (
        <Alert
          message={t('search_logs.page.tip')}
          type="info"
          showIcon
          style={{ marginLeft: 48, marginRight: 48 }}
        />
      )}
      <CardTableV2
        loading={loading}
        columns={columns}
        items={logPreviews || []}
        style={{ marginTop: 0 }}
        onRenderRow={renderRow}
        extendLastColumn
      />
    </>
  )
}
