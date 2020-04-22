import client from '@lib/client'
import {
  UtilsRequestTargetStatistics,
  LogsearchSearchLogRequest,
  LogsearchTaskGroupModel,
} from '@lib/client'
import { CardTable, Head } from '@lib/components'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { Badge, Button, Table } from 'antd'
import { RangeValue } from 'rc-picker/lib/interface'
import moment, { Moment } from 'moment'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { DATE_TIME_FORMAT, LogLevelMap } from './utils'

const { Column } = Table

function componentRender(stats: UtilsRequestTargetStatistics) {
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

function timeRender(request: LogsearchSearchLogRequest): string {
  const startTime = request.start_time ? moment(request.start_time) : null
  const endTime = request.end_time ? moment(request.end_time) : null
  const timeRange = [startTime, endTime] as RangeValue<moment.Moment>
  if (!timeRange?.[0] || !timeRange?.[1]) {
    return ''
  }
  return `${formatTime(timeRange[0])} ~ ${formatTime(timeRange[1])}`
}

export default function SearchHistory() {
  const [taskGroups, setTaskGroups] = useState<LogsearchTaskGroupModel[]>([])
  const [selectedRowKeys, setRowKeys] = useState<string[] | number[]>([])

  const { t } = useTranslation()

  useEffect(() => {
    async function getData() {
      const res = await client.getInstance().logsTaskgroupsGet()
      setTaskGroups(res.data)
    }

    getData()
  }, [])

  function levelRender(request: LogsearchSearchLogRequest) {
    return LogLevelMap[request.min_level!]
  }

  function patternRender(request: LogsearchSearchLogRequest) {
    return request.patterns && request.patterns.length > 0
      ? request.patterns.join(' ')
      : ''
  }

  function stateRender(state: number | undefined) {
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
    for (const key of selectedRowKeys) {
      const taskGroupID = key as number
      await client.getInstance().logsTaskgroupsIdDelete(taskGroupID + '')
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

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedRowKeys: any[]) => {
      setRowKeys(selectedRowKeys)
    },
  }

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
      <div style={{ backgroundColor: '#FFFFFF' }}>
        <CardTable
          dataSource={taskGroups}
          rowSelection={rowSelection}
          pagination={{ pageSize: 100 }}
          style={{ marginTop: 0 }}
        >
          <Column
            width={400}
            title={t('search_logs.common.time_range')}
            dataIndex="search_request"
            key="time"
            render={timeRender}
          />
          <Column
            title={t('search_logs.preview.level')}
            dataIndex="search_request"
            key="level"
            render={levelRender}
          />
          <Column
            width={230}
            title={t('search_logs.preview.component')}
            dataIndex="target_stats"
            key="target_stats"
            render={componentRender}
          />
          <Column
            title={t('search_logs.common.keywords')}
            dataIndex="search_request"
            key="keywords"
            render={patternRender}
          />
          <Column
            title={t('search_logs.history.state')}
            dataIndex="state"
            key="state"
            render={stateRender}
          />
          <Column
            title={t('search_logs.history.action')}
            key="action"
            render={actionRender}
          />
        </CardTable>
      </div>
    </div>
  )
}
