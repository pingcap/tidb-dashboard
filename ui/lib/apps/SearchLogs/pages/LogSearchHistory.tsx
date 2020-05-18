import { Badge, Button } from 'antd'
import moment, { Moment } from 'moment'
import {
  Selection,
  SelectionMode,
} from 'office-ui-fabric-react/lib/DetailsList'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { RangeValue } from 'rc-picker/lib/interface'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'

import client, { LogsearchTaskGroupModel } from '@lib/client'
import { CardTableV2, Head } from '@lib/components'
import { DATE_TIME_FORMAT, LogLevelMap } from '../utils'

function componentRender({ target_stats: stats }) {
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

function formatTime(time: Moment | null | undefined): string {
  if (!time) {
    return ''
  }
  return time.format(DATE_TIME_FORMAT)
}

function timeRender({ search_request: request }) {
  const startTime = request.start_time ? moment(request.start_time) : null
  const endTime = request.end_time ? moment(request.end_time) : null
  const timeRange = [startTime, endTime] as RangeValue<moment.Moment>
  if (!timeRange?.[0] || !timeRange?.[1]) {
    return ''
  }
  return `${formatTime(timeRange[0])} ~ ${formatTime(timeRange[1])}`
}

export default function LogSearchingHistory() {
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

  function levelRender({ search_request: request }) {
    return LogLevelMap[request.min_level!]
  }

  function patternRender({ search_request: request }) {
    return request.patterns && request.patterns.length > 0
      ? request.patterns.join(' ')
      : ''
  }

  function stateRender({ state }) {
    if (state === undefined || state < 1) {
      return
    }
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
      const res = await client.getInstance().logsTaskgroupsGet()
      setTaskGroups(res.data)
    }
  }

  async function handleDeleteAll() {
    const allKeys = taskGroups.map((taskGroup) => taskGroup.id)
    for (const key of allKeys) {
      if (key === undefined) {
        continue
      }
      await client.getInstance().logsTaskgroupsIdDelete(key + '')
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
      maxWidth: 400,
      onRender: timeRender,
    },
    {
      name: t('search_logs.preview.level'),
      key: 'level',
      minWidth: 100,
      maxWidth: 200,
      onRender: levelRender,
    },
    {
      name: t('search_logs.preview.component'),
      key: 'target_stats',
      minWidth: 150,
      maxWidth: 230,
      onRender: componentRender,
    },
    {
      name: t('search_logs.common.keywords'),
      key: 'keywords',
      minWidth: 150,
      maxWidth: 230,
      onRender: patternRender,
    },
    {
      name: t('search_logs.history.state'),
      key: 'state',
      minWidth: 150,
      maxWidth: 230,
      onRender: stateRender,
    },
    {
      name: t('search_logs.history.action'),
      key: 'action',
      minWidth: 150,
      maxWidth: 230,
      onRender: actionRender,
    },
  ]

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
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
      <div style={{ height: '100%', position: 'relative' }}>
        <ScrollablePane>
          <CardTableV2
            cardNoMarginTop
            columns={columns}
            items={taskGroups || []}
            selection={rowSelection}
            selectionMode={SelectionMode.multiple}
          />
        </ScrollablePane>
      </div>
    </div>
  )
}
