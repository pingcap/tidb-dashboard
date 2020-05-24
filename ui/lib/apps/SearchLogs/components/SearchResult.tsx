import client from '@lib/client'
import { ModelRequestTargetNode, LogsearchTaskModel } from '@lib/client'
import { CardTableV2 } from '@lib/components'
import { Alert } from 'antd'
import moment from 'moment'
import React, { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { LogLevelText, namingMap } from './utils'
import Log from './Log'

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
              time: moment(value.time).format('YYYY-MM-DD HH:mm:ss'),
              level: LogLevelText[value.level ?? 0],
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

  const columns = useMemo(
    () => [
      {
        name: t('search_logs.preview.time'),
        key: 'time',
        fieldName: 'time',
        minWidth: 160,
        maxWidth: 300,
      },
      {
        name: t('search_logs.preview.level'),
        key: 'level',
        fieldName: 'level',
        minWidth: 60,
        maxWidth: 120,
      },
      {
        name: t('search_logs.preview.component'),
        key: 'component',
        minWidth: 120,
        maxWidth: 200,
        onRender: componentRender,
      },
      {
        name: t('search_logs.preview.log'),
        key: 'log',
        minWidth: 500,
        onRender: ({ log }) => <Log log={log} />,
      },
    ],
    [t]
  )

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
      />
    </>
  )
}
