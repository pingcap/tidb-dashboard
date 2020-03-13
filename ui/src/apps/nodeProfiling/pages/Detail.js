import client, { DASHBOARD_API_URL } from '@/utils/client'
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Badge, Progress } from 'antd'
import { useTranslation } from 'react-i18next'
import CardTable from '@/components/CardTable'

function mapData(data) {
  data.tasks_status.forEach(task => {
    if (task.state === 1) {
      let task_elapsed_secs = data.server_time - task.started_at
      let progress =
        task_elapsed_secs / data.task_group_status.profile_duration_secs
      if (progress > 0.99) {
        progress = 0.99
      }
      if (progress < 0) {
        progress = 0
      }
      task.progress = progress
    }
  })
  return data
}

export default function Page() {
  const { id } = useParams()
  const [isLoading, setIsLoading] = useState(true)
  const [isRunning, setIsRunning] = useState(true)
  const [data, setData] = useState([])
  const { t } = useTranslation()

  useEffect(() => {
    let t = null
    async function fetchData() {
      try {
        const res = await client.dashboard.getProfilingGroupDetail(id)
        if (res.data.task_group_status.state === 2) {
          setIsRunning(false)
          if (t !== null) {
            clearInterval(t)
          }
        }
        setData(mapData(res.data))
      } catch (ex) {}
      setIsLoading(false)
    }
    t = setInterval(() => fetchData(), 1000)
    fetchData()
    return () => {
      if (t !== null) {
        clearInterval(t)
      }
    }
  }, [id])

  async function handleDownload() {
    const res = await client.dashboard.getProfilingGroupDownloadToken(id)
    const token = res.data
    if (!token) {
      return
    }
    window.location = `${DASHBOARD_API_URL}/profiling/group/download?token=${token}`
  }

  const columns = [
    {
      title: t('node_profiling.detail.table.columns.node'),
      key: 'node',
      dataIndex: 'target.display_name',
      width: 200,
    },
    {
      title: t('node_profiling.detail.table.columns.kind'),
      key: 'kind',
      dataIndex: 'target.kind',
      width: 100,
    },
    {
      title: t('node_profiling.detail.table.columns.status'),
      key: 'status',
      render: (_, record) => {
        if (record.state === 1) {
          return (
            <div style={{ width: 200 }}>
              <Progress
                percent={Math.round(record.progress * 100)}
                size="small"
                width={200}
              />
            </div>
          )
        } else if (record.state === 0) {
          return <Badge status="error" text={record.error} />
        } else {
          return (
            <Badge
              status="success"
              text={t('node_profiling.detail.table.status.finished')}
            />
          )
        }
      },
    },
  ]

  return (
    <CardTable
      loading={isLoading}
      columns={columns}
      dataSource={data.tasks_status}
      rowKey="id"
      title={t('node_profiling.detail.table.title')}
      cardExtra={
        <Button disabled={isRunning} type="primary" onClick={handleDownload}>
          {t('node_profiling.detail.download')}
        </Button>
      }
    />
  )
}
