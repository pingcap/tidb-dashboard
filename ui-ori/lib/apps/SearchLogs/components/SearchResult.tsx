import client from '@lib/client'
import { ModelRequestTargetNode, LogsearchTaskModel } from '@lib/client'
import { CardTable, Card, TextWrap } from '@lib/components'
import { Alert, Tooltip } from 'antd'
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { InstanceKindName } from '@lib/utils/instanceTable'
import dayjs from 'dayjs'

import { LogLevelText } from '../utils'
import Log from './Log'

import styles from './Styles.module.less'

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
    <TextWrap>
      {target.kind ? InstanceKindName[target.kind] : '?'}{' '}
      <Tooltip title={target.display_name}>
        <span>{target.display_name}</span>
      </Tooltip>
    </TextWrap>
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

      try {
        const res = await client
          .getInstance()
          .logsTaskgroupsIdPreviewGet(taskGroupID + '')
        setData(
          res.data.map((value, index): LogPreview => {
            return {
              key: index,
              time: dayjs(value.time).format('YYYY-MM-DD HH:mm:ss (z)'),
              level: LogLevelText[value.level ?? 0],
              component: getComponent(value.task_id),
              log: value.message,
            }
          })
        )
      } finally {
        setLoading(false)
      }
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

  const columns = useMemo(
    () => [
      {
        name: t('search_logs.preview.time'),
        key: 'time',
        fieldName: 'time',
        minWidth: 120,
        maxWidth: 180,
      },
      {
        name: t('search_logs.preview.level'),
        key: 'level',
        fieldName: 'level',
        minWidth: 40,
        maxWidth: 80,
      },
      {
        name: t('search_logs.preview.component'),
        key: 'component',
        minWidth: 40,
        maxWidth: 120,
        onRender: componentRender,
      },
      {
        name: t('search_logs.preview.log'),
        key: 'log',
        minWidth: 200,
        onRender: ({ log, expanded }) => (
          <Log patterns={patterns} log={log} expanded={expanded} />
        ),
      },
    ],
    [t, patterns]
  )

  return (
    <div data-e2e="log_search_result">
      {!loading && (
        <Card noMarginTop>
          <Alert message={t('search_logs.page.tip')} type="info" showIcon />
        </Card>
      )}
      <CardTable
        cardNoMarginTop
        loading={loading}
        columns={columns}
        items={logPreviews || []}
        onRenderRow={renderRow}
        extendLastColumn
        hideLoadingWhenNotEmpty
      />
    </div>
  )
}
