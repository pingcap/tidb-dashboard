import client from '@pingcap-incubator/dashboard_client'
import {
  LogsearchSearchTarget,
  LogsearchTaskGroupResponse,
} from '@pingcap-incubator/dashboard_client'
import { CardTable, Head } from '@pingcap-incubator/dashboard_components'
import { Badge, Button, Icon, Table } from 'antd'
import { RangePickerValue } from 'antd/lib/date-picker/interface'
import { Moment } from 'moment'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  DATE_TIME_FORMAT,
  LogLevelMap,
  parseSearchingParams,
  ServerType,
} from './utils'

const { Column } = Table

type History = {
  key: number
  time?: RangePickerValue
  level?: string
  components?: LogsearchSearchTarget[]
  keywords?: string
  size?: string
  state?: number
  action?: number
}

function componentRender(targets: LogsearchSearchTarget[]) {
  const tidb = targets.filter((item) => item.kind === ServerType.TiDB)
  const tikv = targets.filter((item) => item.kind === ServerType.TiKV)
  const pd = targets.filter((item) => item.kind === ServerType.PD)
  const r: Array<string> = []
  if (tidb.length > 0) {
    r.push(`${tidb.length} TiDB`)
  }
  if (tikv.length > 0) {
    r.push(`${tikv.length} TiKV`)
  }
  if (pd.length > 0) {
    r.push(`${pd.length} PD`)
  }
  return <span>{r.join(', ')}</span>
}

function formatTime(time: Moment | null | undefined): string {
  if (!time) {
    return ''
  }
  return time.format(DATE_TIME_FORMAT)
}

function timeRender(timeRange: RangePickerValue): string {
  if (!timeRange[0] || !timeRange[1]) {
    return ''
  }
  return `${formatTime(timeRange[0])} ~ ${formatTime(timeRange[1])}`
}

export default function SearchHistory() {
  const [taskGroups, setTaskGroups] = useState<LogsearchTaskGroupResponse[]>([])
  const [selectedRowKeys, setRowKeys] = useState<string[] | number[]>([])

  const { t } = useTranslation()

  useEffect(() => {
    async function getData() {
      const res = await client.getInstance().logsTaskgroupsGet()
      setTaskGroups(res.data)
    }
    getData()
  }, [])

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

  function actionRender(taskGroupID: number) {
    if (taskGroupID === 0) {
      return
    }
    return (
      <Link to={`/search_logs/detail/${taskGroupID}`}>
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
    const allKeys = taskGroups.map((taskGroup) => taskGroup.task_group?.id)
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
    onChange: (selectedRowKeys: string[] | number[]) => {
      setRowKeys(selectedRowKeys)
    },
  }

  const historyList: History[] = taskGroups.map((taskGroup) => {
    const {
      timeRange,
      logLevel,
      components,
      searchValue,
    } = parseSearchingParams(taskGroup)
    const taskGroupID = taskGroup.task_group?.id || 0
    return {
      key: taskGroupID,
      time: timeRange,
      level: LogLevelMap[logLevel],
      components: components,
      keywords: searchValue,
      state: taskGroup.task_group?.state,
      action: taskGroupID,
    }
  })

  return (
    <div>
      <Head
        title={t('search_logs.nav.history')}
        back={
          <Link to={`/search_logs`}>
            <Icon type="arrow-left" /> {t('search_logs.nav.search_logs')}
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
          dataSource={historyList}
          rowSelection={rowSelection}
          pagination={{ pageSize: 100 }}
          style={{ marginTop: 0 }}
        >
          <Column
            width={400}
            title={t('search_logs.common.time_range')}
            dataIndex="time"
            key="time"
            render={timeRender}
          />
          <Column
            title={t('search_logs.preview.level')}
            dataIndex="level"
            key="level"
          />
          <Column
            width={230}
            title={t('search_logs.preview.component')}
            dataIndex="components"
            key="components"
            render={componentRender}
          />
          <Column
            title={t('search_logs.common.keywords')}
            dataIndex="keywords"
            key="keywords"
          />
          <Column
            title={t('search_logs.history.state')}
            dataIndex="state"
            key="state"
            render={stateRender}
          />
          <Column
            title={t('search_logs.history.action')}
            dataIndex="action"
            key="action"
            render={actionRender}
          />
        </CardTable>
      </div>
    </div>
  )
}
