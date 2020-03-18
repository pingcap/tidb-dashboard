import client from '@/utils/client';
import { LogsearchSearchTarget, LogsearchTaskGroupResponse } from '@/utils/dashboard_client';
import { Button, Table, Tag } from 'antd';
import { RangePickerValue } from 'antd/lib/date-picker/interface';
import { Moment } from 'moment';
import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { LogLevelMap, parseSearchingParams, ServerType, DATE_TIME_FORMAT } from './utils';

const { Column } = Table;

type History = {
  key: number
  time?: RangePickerValue
  level?: string
  components?: LogsearchSearchTarget[]
  keywords?: string
  size?: string
  state?: string
  action?: number
}

function componentRender(targets: LogsearchSearchTarget[]) {
  const tidb = targets.filter(item => item.kind === ServerType.TiDB)
  const tikv = targets.filter(item => item.kind === ServerType.TiKV)
  const pd = targets.filter(item => item.kind === ServerType.PD)

  return (
    <span>
      {tidb.length > 0 && (<Tag>{tidb.length} TiDB</Tag>)}
      {tikv.length > 0 && (<Tag>{tikv.length} TiKV</Tag>)}
      {pd.length > 0 && (<Tag>{pd.length} PD</Tag>)}
    </span>
  )
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
      const res = await client.dashboard.logsTaskgroupsGet()
      setTaskGroups(res.data)
    }
    getData()
  }, [])

  function actionRender(taskGroupID: number) {
    if (taskGroupID === 0) {
      return
    }
    async function handleDelete() {
      await client.dashboard.logsTaskgroupsIdDelete(taskGroupID)
      const res = await client.dashboard.logsTaskgroupsGet()
      setTaskGroups(res.data)
    }
    return (
      <span>
        <Button type="link">
          <Link to={`/log/search/detail/${taskGroupID}`}>
            {t('log_searching.history.detail')}
          </Link>
        </Button>
        <Button type="link" onClick={handleDelete}>
          {t('log_searching.history.delete')}
        </Button>
      </span>
    )
  }

  async function handleDeleteSelected() {
    for (const key of selectedRowKeys) {
      const taskGroupID = key as number
      await client.dashboard.logsTaskgroupsIdDelete(taskGroupID)
      const res = await client.dashboard.logsTaskgroupsGet()
      setTaskGroups(res.data)
    }
  }

  async function handleDeleteAll() {
    const allKeys = taskGroups.map(taskGroup => taskGroup.task_group?.id)
    for (const key of allKeys) {
      if (key === undefined) {
        continue
      }
      await client.dashboard.logsTaskgroupsIdDelete(key)
    }
    const res = await client.dashboard.logsTaskgroupsGet()
    setTaskGroups(res.data)
  }

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedRowKeys: string[] | number[]) => {
      setRowKeys(selectedRowKeys)
    },
  }

  const descriptionArray = [
    t('log_searching.history.running'),
    t('log_searching.history.finished'),
  ]

  const historyList: History[] = taskGroups.map(taskGroup => {
    const { timeRange, logLevel, components, searchValue } = parseSearchingParams(taskGroup)
    const taskGroupID = taskGroup.task_group?.id || 0
    const state = descriptionArray[(taskGroup.task_group?.state || 1) - 1]
    return {
      key: taskGroupID,
      time: timeRange,
      level: LogLevelMap[logLevel],
      components: components,
      keywords: searchValue,
      state: state,
      action: taskGroupID
    }
  })

  return (
    <div style={{ backgroundColor: "#FFFFFF" }}>
      <div style={{ padding: 16 }}>
        <Button type="danger" onClick={handleDeleteSelected} disabled={selectedRowKeys.length < 1} style={{ marginRight: 16 }}>{t('log_searching.history.delete_selected')}</Button>
        <Button type="danger" onClick={handleDeleteAll} >{t('log_searching.history.delete_all')}</Button>
      </div>
      <Table dataSource={historyList} rowSelection={rowSelection} pagination={{ pageSize: 100 }}>
        <Column width={400} title={t('log_searching.common.time_range')} dataIndex="time" key="time" render={timeRender} />
        <Column title={t('log_searching.preview.level')} dataIndex="level" key="level" />
        <Column width={230} title={t('log_searching.preview.component')} dataIndex="components" key="components" render={componentRender} />
        <Column title={t('log_searching.common.keywords')} dataIndex="keywords" key="keywords" />
        <Column title={t('log_searching.history.state')} dataIndex="state" key="state" />
        <Column title={t('log_searching.history.action')} dataIndex="action" key="action" render={actionRender} />
      </Table>
    </div>
  )
}
