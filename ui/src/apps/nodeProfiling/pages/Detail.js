import client, { DASHBOARD_API_URL } from '@/utils/client'
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Table, Button, Icon } from 'antd'

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
    dataIndex: 'component',
    width: 100,
  },
  {
    title: 'Status',
    key: 'status',
    render: (text, record) => {
      if (record.state === 1) {
        return <Icon type="loading" />
      } else if (record.state === 0) {
        return record.error
      } else {
        const url = `${DASHBOARD_API_URL}/profiling/single/download/${record.id}`
        return (
          <span>
            <Icon type="check-circle" theme="twoTone" twoToneColor="#52c41a" />{' '}
            <a href={url} target="_blank">
              Download
            </a>
          </span>
        )
      }
    },
  },
]

export default function Page() {
  const { id } = useParams()
  const [isRunning, setIsRunning] = useState(true)
  const [data, setData] = useState([])

  useEffect(() => {
    let t = null
    async function fetchData() {
      const res = await client.dashboard.profilingGroupStatusGroupIdGet(id)
      if (res.data.task_group_status.state === 2) {
        setIsRunning(false)
        if (t !== null) {
          clearInterval(t)
        }
      }
      setData(res.data)
    }
    t = setInterval(() => fetchData(), 1000)
    return () => {
      if (t !== null) {
        clearInterval(t)
      }
    }
  }, [])

  return (
    <Card bordered={false}>
      <Button
        loading={isRunning}
        type="primary"
        href={`${DASHBOARD_API_URL}/profiling/group/download/${id}`}
        target="_blank"
      >
        Download All
      </Button>
      <Table columns={columns} dataSource={data.tasks_status} />
    </Card>
  )
}
