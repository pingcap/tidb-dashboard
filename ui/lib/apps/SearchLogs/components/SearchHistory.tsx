import client from '@lib/client'
import { LogsearchTaskGroupModel } from '@lib/client'
import { Head, CardTableV2, DateTime } from '@lib/components'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { Badge, Button } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LogLevelText } from './utils'
import {
  Selection,
  SelectionMode,
} from 'office-ui-fabric-react/lib/DetailsList'

function componentRender({ target_stats: stats }) {
  // FIXME: Extract common util
  const r: Array<string> = []
  if (stats?.num_tidb_nodes) {
    r.push(`${stats.num_tidb_nodes} TiDB`)
  }
  if (stats?.num_tikv_nodes) {
    r.push(`${stats.num_tikv_nodes} TiKV`)
  }
  if (stats?.num_pd_nodes) {
    r.push(`${stats.num_pd_nodes} PD`)
  }
  return <span>{r.join(', ')}</span>
}

function timeRender({ search_request }: LogsearchTaskGroupModel) {
  return (
    <span>
      {search_request?.start_time && (
        <DateTime.Calendar unixTimestampMs={search_request?.start_time} />
      )}
      {' ~ '}
      {search_request?.end_time && (
        <DateTime.Calendar unixTimestampMs={search_request?.end_time} />
      )}
    </span>
  )
}

function levelRender({ search_request: request }: LogsearchTaskGroupModel) {
  return LogLevelText[request?.min_level!]
}

function patternRender({ search_request: request }: LogsearchTaskGroupModel) {
  return (request?.patterns ?? []).join(' ')
}

export default function SearchHistory() {
  const [taskGroups, setTaskGroups] = useState<LogsearchTaskGroupModel[]>([])
  const [selectedRowKeys, setRowKeys] = useState<string[]>([])

  const { t } = useTranslation()

  useEffect(() => {
    async function getData() {
      const res = await client.getInstance().logsTaskgroupsGet()
      setTaskGroups(res.data)
    }

    getData()
  }, [])

  function stateRender({ state }: LogsearchTaskGroupModel) {
    switch (state) {
      case 1:
        return (
          <Badge status="processing" text={t('search_logs.history.running')} />
        )
      case 2:
        return (
          <Badge status="success" text={t('search_logs.history.finished')} />
        )
      default:
        return
    }
  }

  function actionRender(taskGroup: LogsearchTaskGroupModel) {
    if (taskGroup.id === 0) {
      return
    }
    return (
      <Link to={`/search_logs/detail/${taskGroup.id}`}>
        {t('search_logs.history.detail')}
      </Link>
    )
  }

  async function handleDeleteSelected() {
    for (const taskGroupID of selectedRowKeys) {
      await client.getInstance().logsTaskgroupsIdDelete(taskGroupID)
    }
    const res = await client.getInstance().logsTaskgroupsGet()
    setTaskGroups(res.data)
  }

  async function handleDeleteAll() {
    const allKeys = taskGroups.map((taskGroup) => taskGroup.id)
    for (const key of allKeys) {
      if (key === undefined) {
        continue
      }
      await client.getInstance().logsTaskgroupsIdDelete(String(key))
    }
    const res = await client.getInstance().logsTaskgroupsGet()
    setTaskGroups(res.data)
  }

  const rowSelection = new Selection({
    onSelectionChanged: () => {
      const items = rowSelection.getSelection() as LogsearchTaskGroupModel[]
      setRowKeys(items.map((item) => item.id!.toString()))
    },
  })

  const columns = [
    {
      name: t('search_logs.common.time_range'),
      key: 'time',
      minWidth: 200,
      maxWidth: 300,
      onRender: timeRender,
    },
    {
      name: t('search_logs.preview.level'),
      key: 'level',
      minWidth: 70,
      maxWidth: 120,
      onRender: levelRender,
    },
    {
      name: t('search_logs.history.instances'),
      key: 'target_stats',
      minWidth: 100,
      maxWidth: 250,
      onRender: componentRender,
    },
    {
      name: t('search_logs.common.keywords'),
      key: 'keywords',
      minWidth: 100,
      maxWidth: 200,
      onRender: patternRender,
    },
    {
      name: t('search_logs.history.status'),
      key: 'state',
      minWidth: 100,
      maxWidth: 150,
      onRender: stateRender,
    },
    {
      name: t('search_logs.history.action'),
      key: 'action',
      minWidth: 100,
      maxWidth: 200,
      onRender: actionRender,
    },
  ]

  return (
    <div>
      <Head
        title={t('search_logs.nav.history')}
        back={
          <Link to={`/search_logs`}>
            <ArrowLeftOutlined /> {t('search_logs.nav.search_logs')}
          </Link>
        }
        titleExtra={
          <>
            <Button
              type="danger"
              onClick={handleDeleteSelected}
              disabled={selectedRowKeys.length < 1}
              style={{ marginRight: 16 }}
            >
              {t('search_logs.history.delete_selected')}
            </Button>
            <Button type="danger" onClick={handleDeleteAll}>
              {t('search_logs.history.delete_all')}
            </Button>
          </>
        }
      />
      <CardTableV2
        columns={columns}
        items={taskGroups || []}
        selection={rowSelection}
        selectionMode={SelectionMode.multiple}
        style={{ marginTop: 0 }}
      />
    </div>
  )
}
