import client from '@/utils/client';
import { Table, Tooltip, Button } from 'antd';
import moment, { Moment } from 'moment';
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Context } from "../store";
import { LogLevelMap, Component, parseSearchingParams } from './util';
import { LogsearchTaskGroupResponse } from '@/utils/dashboard_client';

const { Column } = Table;

const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

type History = {
  key: number
  time?: string
  level?: number
  components?: Component[]
  keywords?: string
  size?: string
  state?: string
}

export default function SearchHistory() {
  const { store } = useContext(Context)
  const { components: allComponents } = store
  const [taskGroups, setTaskGroups] = useState<LogsearchTaskGroupResponse[]>([])
  const [selectedRowKeys, setRowKeys] = useState<string[] | number[]>([])

  const { t } = useTranslation()

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedRowKeys: string[] | number[]) => {
      setRowKeys(selectedRowKeys)
    },
  }

  function formatTime(time: Moment | null | undefined): string{
    if (!time) {
      return ''
    }
    return time.format(DATE_TIME_FORMAT)
  }

  const descriptionArray = [
    t('log_searching.history.running'),
    t('log_searching.history.finished'),
  ]

  const historyList: History[] = taskGroups.map(taskGroup => {
    const { timeRange, logLevel, components, searchValue } = parseSearchingParams(taskGroup, allComponents)

    const state = descriptionArray[(taskGroup.task_group?.state || 1) - 1]
    return {
      key: taskGroup.task_group?.id || 0,
      time: `${formatTime(timeRange[0])} ~ ${formatTime(timeRange[1])}`,
      level: LogLevelMap[logLevel],
      components: components,
      keywords: searchValue,
      state: state,
    }
  })

  return (
    <div style={{ backgroundColor: "#FFFFFF" }}>
      <Button type="primary" style={{ marginBottom: 16, marginTop: 16 }}>Delete Selected</Button>
      <Table dataSource={historyList} rowSelection={rowSelection} pagination={{ pageSize: 100 }}>
        <Column width={440} title="Time Range" dataIndex="time" key="time" />
        <Column title="Level" dataIndex="level" key="level" />
        <Column title="Components" dataIndex="components" key="components" />
        <Column title="Keywords" dataIndex="keywords" key="keywords" />
        <Column title="State" dataIndex="state" key="state" />
        <Column
          title="Action"
          key="action"
          render={(text, record) => (
            <span>
              <a>Detail</a>
              <a>Delete</a>
            </span>
          )}
        />
      </Table>
    </div>
  )
}
