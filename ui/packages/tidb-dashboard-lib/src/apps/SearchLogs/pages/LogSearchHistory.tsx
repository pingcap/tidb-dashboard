import { LogsearchTaskGroupModel } from '@lib/client'
import { Head, CardTable, DateTime } from '@lib/components'
import { ArrowLeftOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { Badge, Button, Modal, Space } from 'antd'
import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Selection,
  SelectionMode
} from 'office-ui-fabric-react/lib/DetailsList'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { LogLevelText } from '../utils'
import { SearchLogsContext } from '../context'

function componentRender({ target_stats: stats, t }) {
  // FIXME: Extract common util
  const r: Array<string> = []
  if (stats?.num_tidb_nodes) {
    r.push(`${stats.num_tidb_nodes} ${t('distro.tidb')}`)
  }
  if (stats?.num_tikv_nodes) {
    r.push(`${stats.num_tikv_nodes} ${t('distro.tikv')}`)
  }
  if (stats?.num_pd_nodes) {
    r.push(`${stats.num_pd_nodes} ${t('distro.pd')}`)
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

export default function LogSearchingHistory() {
  const ctx = useContext(SearchLogsContext)

  const [taskGroups, setTaskGroups] = useState<LogsearchTaskGroupModel[]>([])
  const [selectedRowKeys, setRowKeys] = useState<string[]>([])

  const { t } = useTranslation()

  useEffect(() => {
    async function getData() {
      const res = await ctx!.ds.logsTaskgroupsGet()
      setTaskGroups(res.data)
    }

    getData()
  }, [ctx])

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
      <Link to={`/search_logs/detail?id=${taskGroup.id}`}>
        {t('search_logs.history.detail')}
      </Link>
    )
  }

  async function handleDeleteSelected() {
    Modal.confirm({
      title: t('search_logs.history.delete_confirm_title'),
      icon: <ExclamationCircleOutlined />,
      content: t('search_logs.history.delete_selected_confirm_content'),
      okText: t('search_logs.history.delete'),
      cancelText: t('search_logs.common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        for (const taskGroupID of selectedRowKeys) {
          await ctx!.ds.logsTaskgroupsIdDelete(taskGroupID)
        }
        const res = await ctx!.ds.logsTaskgroupsGet()
        setTaskGroups(res.data)
      }
    })
  }

  async function handleDeleteAll() {
    Modal.confirm({
      title: t('search_logs.history.delete_confirm_title'),
      icon: <ExclamationCircleOutlined />,
      content: t('search_logs.history.delete_all_confirm_content'),
      okText: t('search_logs.history.delete'),
      cancelText: t('search_logs.common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        const allKeys = taskGroups.map((taskGroup) => taskGroup.id)
        for (const key of allKeys) {
          if (key === undefined) {
            continue
          }
          await ctx!.ds.logsTaskgroupsIdDelete(String(key))
        }
        const res = await ctx!.ds.logsTaskgroupsGet()
        setTaskGroups(res.data)
      }
    })
  }

  const rowSelection = new Selection({
    onSelectionChanged: () => {
      const items = rowSelection.getSelection() as LogsearchTaskGroupModel[]
      setRowKeys(items.map((item) => item.id!.toString()))
    }
  })

  const columns = [
    {
      name: t('search_logs.common.time_range'),
      key: 'time',
      minWidth: 200,
      maxWidth: 300,
      onRender: timeRender
    },
    {
      name: t('search_logs.preview.level'),
      key: 'level',
      minWidth: 70,
      maxWidth: 120,
      onRender: levelRender
    },
    {
      name: t('search_logs.history.instances'),
      key: 'target_stats',
      minWidth: 100,
      maxWidth: 250,
      onRender: (p) => componentRender({ ...p, t })
    },
    {
      name: t('search_logs.common.keywords'),
      key: 'keywords',
      minWidth: 100,
      maxWidth: 200,
      onRender: patternRender
    },
    {
      name: t('search_logs.history.status'),
      key: 'state',
      minWidth: 100,
      maxWidth: 150,
      onRender: stateRender
    },
    {
      name: t('search_logs.history.action'),
      key: 'action',
      minWidth: 100,
      maxWidth: 200,
      onRender: actionRender
    }
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
          <Space>
            <Button
              danger
              onClick={handleDeleteSelected}
              disabled={selectedRowKeys.length === 0}
            >
              {t('search_logs.history.delete_selected')}
            </Button>
            <Button
              danger
              onClick={handleDeleteAll}
              disabled={taskGroups?.length === 0}
            >
              {t('search_logs.history.delete_all')}
            </Button>
          </Space>
        }
      />
      <div style={{ height: '100%', position: 'relative' }}>
        <ScrollablePane>
          <CardTable
            cardNoMarginTop
            cardNoMarginBottom
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
