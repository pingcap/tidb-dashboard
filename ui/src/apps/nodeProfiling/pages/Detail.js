import client, { DASHBOARD_API_URL } from '@/utils/client'
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Table, Button, Icon, Form, Skeleton, Progress } from 'antd'
import { useTranslation } from 'react-i18next'

const columns = [
  {
    title: 'Node',
    key: 'node',
    dataIndex: 'address',
    width: 200,
  },
  {
    title: 'Kind',
    key: 'kind',
    dataIndex: 'target_kind',
    width: 100,
  },
  {
    title: 'Status',
    key: 'status',
    render: (text, record) => {
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
        return record.error
      } else {
        return (
          <Icon type="check-circle" theme="twoTone" twoToneColor="#52c41a" />
        )
      }
    },
  },
]

function mapData(data) {
  data.tasks_status.forEach(task => {
    task.key = task.id
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
        const res = await client.dashboard.profilingGroupStatusGroupIdGet(id)
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

  return (
    <Card bordered={false}>
      {isLoading ? (
        <Skeleton active title={false} paragraph={{ rows: 5 }} />
      ) : (
        <Form>
          <Form.Item>
            <Button
              disabled={isRunning}
              type="primary"
              href={`${DASHBOARD_API_URL}/profiling/group/download/${id}`}
              target="_blank"
            >
              {t('node_profiling.detail.download')}
            </Button>
          </Form.Item>
          <Form.Item>
            <Table columns={columns} dataSource={data.tasks_status} />
          </Form.Item>
        </Form>
      )}
    </Card>
  )
}
